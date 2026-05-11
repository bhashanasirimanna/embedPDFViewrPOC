export interface StoredDocument {
  id: string;
  name: string;
  size: number;
  uploadedAt: number;
  base64: string;
}

const STORAGE_KEY = 'pdf_vault_docs';

export function getDocuments(): StoredDocument[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    console.error('Failed to retrieve documents from localStorage');
    return [];
  }
}

export function saveDocument(doc: StoredDocument): void {
  if (typeof window === 'undefined') return;

  try {
    const documents = getDocuments();
    documents.push(doc);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  } catch {
    console.error('Failed to save document to localStorage');
  }
}

export function deleteDocument(id: string): void {
  if (typeof window === 'undefined') return;

  try {
    const documents = getDocuments();
    const filtered = documents.filter((doc) => doc.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    console.error('Failed to delete document from localStorage');
  }
}

export function getDocument(id: string): StoredDocument | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    const documents = getDocuments();
    return documents.find((doc) => doc.id === id);
  } catch {
    console.error('Failed to get document from localStorage');
    return undefined;
  }
}

export function base64ToObjectUrl(base64: string): string {
  // Parse the data URI
  const parts = base64.split(',');
  const bstr = atob(parts[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }

  const blob = new Blob([u8arr], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}
