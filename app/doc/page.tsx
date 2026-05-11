"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getDocument } from "@/lib/documentStorage";

const PDFViewer = dynamic(
  () =>
    import("@embedpdf/react-pdf-viewer").then((m) => ({
      default: m.PDFViewer,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f3f4f6',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: '4px solid #2563eb',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    ),
  },
);

const LoadingSpinner = () => (
  <div className="flex items-center justify-center w-full h-full">
    <div className="animate-spin border-4 border-blue-600 border-t-transparent rounded-full w-10 h-10" />
  </div>
);

function DocPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const docId = searchParams.get("link");
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!docId) {
      setError(true);
      setLoading(false);
      return;
    }

    try {
      const doc = getDocument(docId);
      if (!doc) {
        setError(true);
        setLoading(false);
        return;
      }

      setPdfDataUri(doc.base64);
    } catch (err) {
      console.error("Error loading PDF:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [docId]);

  if (error || (!loading && !docId)) {
    return (
      <div className="flex items-center justify-center w-full h-dvh bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Document not found
          </h1>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  if (loading || !pdfDataUri) {
    return (
      <div className="w-full h-dvh flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  // Get origin safely for absolute WASM URL
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // LocalStorage helper functions
  const getStorageKey = (id: string) => `pdf-annotations-${id}`;
  
  const saveAnnotationsToStorage = (annotations: any) => {
    try {
      const storageKey = getStorageKey(docId!);
      localStorage.setItem(storageKey, JSON.stringify(annotations));
    } catch (err) {
      console.error('[PDF Storage] Failed to save annotations:', err);
    }
  };

  const loadAnnotationsFromStorage = () => {
    try {
      const storageKey = getStorageKey(docId!);
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const annotations = JSON.parse(stored);
        let validAnnotations: any[] = [];
        if (Array.isArray(annotations)) {
          validAnnotations = annotations.filter((a: any) => a && (a.id || a.uuid));
        }
        return validAnnotations;
      }
      return [];
    } catch (err) {
      try {
        const storageKey = getStorageKey(docId!);
        localStorage.removeItem(storageKey);
      } catch (e) {}
      return [];
    }
  };

  const handleViewerReady = (registry: any) => {
    let allAnnotations: any[] = [];
    let currentDocumentId: string = '';

    if (registry.plugins.has('annotation')) {
      const annotationPlugin = registry.plugins.get('annotation');

      const restoreSavedAnnotations = async () => {
        try {
          let savedAnnotations = loadAnnotationsFromStorage();
          const validAnnotations = (savedAnnotations || []).filter((a: any) => a && a.id && a.pageIndex !== undefined);
          
          if (validAnnotations.length > 0) {
            for (const ann of validAnnotations) {
              const existingIndex = allAnnotations.findIndex((a) => a.id === ann.id);
              const annotationWithCorrectDocId = {
                ...ann,
                documentId: currentDocumentId,
              };
              if (existingIndex >= 0) {
                allAnnotations[existingIndex] = annotationWithCorrectDocId;
              } else {
                allAnnotations.push(annotationWithCorrectDocId);
              }
            }
            
            let importedWithPlugin = false;
            if (annotationPlugin && typeof (annotationPlugin as any).importAnnotations === 'function') {
              try {
                const items = validAnnotations.map((a: any) => ({ annotation: { ...a, documentId: currentDocumentId } }));
                await (annotationPlugin as any).importAnnotations(items);
                importedWithPlugin = true;
              } catch (impErr: any) {
                console.warn('[PDF Viewer] importAnnotations failed:', impErr?.message || impErr);
              }
            }

            if (!importedWithPlugin) {
              let storeReady = !!registry.store?.dispatch;
              if (!storeReady) {
                for (let attempt = 0; attempt < 5; attempt++) {
                  await new Promise((r) => setTimeout(r, 200));
                  if (registry.store?.dispatch) { storeReady = true; break; }
                }
              }
              if (storeReady) {
                try {
                  for (const annotation of validAnnotations) {
                    try {
                      const docIdToUse = currentDocumentId;
                      const annotationToCreate = {
                        ...annotation,
                        documentId: docIdToUse,
                      };

                      await registry.store.dispatch({
                        type: 'ANNOTATION/CREATE_ANNOTATION',
                        payload: {
                          documentId: docIdToUse,
                          pageIndex: annotation.pageIndex,
                          annotation: annotationToCreate,
                        },
                      });

                      await registry.store.dispatch({
                        type: 'ANNOTATION/COMMIT',
                        payload: {
                          documentId: docIdToUse,
                          committedUids: [annotation.id],
                        },
                      });
                    } catch (err: any) {
                      console.error('[PDF Viewer] Error processing annotation:', err?.message, err);
                    }
                  }
                  
                  if (validAnnotations.length > 0) {
                    const firstAnnotationPage = validAnnotations[0].pageIndex || 0;
                    if (registry.plugins.has('viewport')) {
                      const viewportPlugin = registry.plugins.get('viewport');
                      try {
                        if (typeof (viewportPlugin as any).goToPage === 'function') {
                          await (viewportPlugin as any).goToPage(firstAnnotationPage);
                        }
                      } catch (e: any) {}
                    }
                  }
                  
                  try {
                    const target =
                      document.querySelector('canvas') ||
                      document.querySelector('[role="document"]') ||
                      document.querySelector('[class*="pdf"]') ||
                      document.querySelector('[class*="viewer"]') ||
                      document.body;

                    if (target && typeof (target as HTMLElement).click === 'function') {
                      try {
                        (target as HTMLElement).focus?.();
                      } catch {}
                      try {
                        (target as HTMLElement).click();
                      } catch (err: any) {}
                    } else {
                      const ev = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window,
                        clientX: 750,
                        clientY: 400,
                      });
                      document.body.dispatchEvent(ev);
                    }
                  } catch (e: any) {}

                  try {
                    if (annotationPlugin && typeof annotationPlugin.render === 'function') {
                      annotationPlugin.render();
                    }
                    if (registry.plugins.has('render')) {
                      const renderPlugin = registry.plugins.get('render');
                      if (typeof (renderPlugin as any).invalidate === 'function') {
                        (renderPlugin as any).invalidate();
                      }
                      if (typeof (renderPlugin as any).draw === 'function') {
                        (renderPlugin as any).draw();
                      }
                    }
                  } catch (e: any) {}
                } catch (err: any) {
                  console.error('[PDF Viewer] Error during restoration:', err?.message, err);
                }
              }
            }
          }
        } catch (err: any) {
          console.error('[PDF Viewer] Error in restoreSavedAnnotations:', err?.message);
        }
      };

      if (registry.store) {
        registry.store.subscribe((state: any) => {
          if (state && state.type && state.type.includes('ANNOTATION')) {
            const action = state.type;
            const payload = state.payload;

            if (payload && payload.documentId) {
              currentDocumentId = payload.documentId;
            }
            
            if (action === 'ANNOTATION/CREATE_ANNOTATION' && payload) {
              const annotation = payload.annotation;
              const annotationToSave = {
                ...(annotation || {}),
                pageIndex: payload.pageIndex !== undefined ? payload.pageIndex : annotation?.pageIndex,
                ...Object.keys(payload).reduce((acc: any, key: string) => {
                  if (key !== 'annotation' && key !== 'pageIndex') {
                    acc[key] = payload[key];
                  }
                  return acc;
                }, {}),
              };
              
              if (annotationToSave.id) {
                const existingIndex = allAnnotations.findIndex((a) => a.id === annotationToSave.id);
                if (existingIndex >= 0) {
                  allAnnotations[existingIndex] = annotationToSave;
                } else {
                  allAnnotations.push(annotationToSave);
                }
              }
            }
            
            if (action === 'ANNOTATION/COMMIT') {
              if (allAnnotations.length > 0) {
                saveAnnotationsToStorage(allAnnotations);
              }
            }
            
            if (action === 'ANNOTATION/DELETE_ANNOTATION' && payload && payload.id) {
              allAnnotations = allAnnotations.filter((a) => a.id !== payload.id);
              saveAnnotationsToStorage(allAnnotations);
            }
            
            if (
              action === 'ANNOTATION/PATCH_ANNOTATION' || 
              action === 'ANNOTATION/UPDATE_ANNOTATION'
            ) {
              if (payload && payload.id) {
                const annotationId = payload.id;
                const existingIndex = allAnnotations.findIndex((a) => a.id === annotationId);
                
                if (existingIndex >= 0) {
                  const patch = payload.patch || {};
                  allAnnotations[existingIndex] = {
                    ...allAnnotations[existingIndex],
                    ...patch,
                    id: annotationId,
                  };
                  saveAnnotationsToStorage(allAnnotations);
                }
              } else if (payload && payload.annotation) {
                const annotation = payload.annotation;
                const existingIndex = allAnnotations.findIndex((a) => a.id === annotation.id);
                if (existingIndex >= 0) {
                  allAnnotations[existingIndex] = annotation;
                  saveAnnotationsToStorage(allAnnotations);
                }
              }
            }
          }
        });
      }

      requestAnimationFrame(() => {
        setTimeout(() => {
          restoreSavedAnnotations();
        }, 50);
      });
    }
  };

  return (
    <>
      <div
        style={{
          height: '100dvh',
          width: '100vw',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <PDFViewer
          style={{
            flex: 1,
            overflow: 'hidden',
          }}
          onReady={handleViewerReady}
          config={{
            src: pdfDataUri,
            theme: { preference: 'light' },
            // Ensure absolute URL is available on the very first render of the client component
            wasmUrl: `${origin}/embedpdf/embedpdf-engine.wasm`,
            worker: true,
          } as any}
        />
      </div>
    </>
  );
}

export default function DocPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DocPageContent />
    </Suspense>
  );
}
