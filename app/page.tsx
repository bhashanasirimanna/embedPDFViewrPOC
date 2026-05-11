'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  StoredDocument,
  getDocuments,
  saveDocument,
  deleteDocument,
} from '@/lib/documentStorage';
import { formatBytes, formatDate } from '@/lib/utils';

const PDFIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <text x="8" y="17" fontSize="3" fontWeight="bold" fill="currentColor">
      PDF
    </text>
  </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

export default function Home() {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string>('');
  const [toast, setToast] = useState<string>('');

  useEffect(() => {
    setDocuments(getDocuments());
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2000);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setError('');

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please upload a valid PDF file');
      return;
    }

    // Validate file size (50 MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50 MB');
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;

      const newDoc: StoredDocument = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        uploadedAt: Date.now(),
        base64,
      };

      saveDocument(newDoc);
      setDocuments(getDocuments());
      showToast('Uploaded successfully');
    };

    reader.readAsDataURL(file);
  };

  const handleDelete = (id: string) => {
    deleteDocument(id);
    setDocuments(getDocuments());
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section A: Upload Area */}
        <div className="mb-12">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
              dragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400'
            }`}
          >
            <div className="flex flex-col items-center gap-4">
              <PDFIcon className="w-16 h-16 text-red-500" />
              <p className="text-lg text-gray-700">
                Drag & drop a PDF or click to browse
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileInput}
                className="hidden"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors"
              >
                Select File
              </label>
            </div>
          </div>

          {error && <p className="text-red-500 mt-2 text-center">{error}</p>}
        </div>

        {/* Section B: Documents List */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Documents</h2>
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
              {documents.length}
            </span>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12">
              <PDFIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">
                No documents yet. Upload your first PDF.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="relative mb-4">
                    <PDFIcon className="w-12 h-12 text-red-500 mx-auto" />
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="absolute top-0 right-0 text-gray-400 hover:text-red-700 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>

                  <h3 className="font-semibold text-gray-900 truncate text-sm mb-2">
                    {doc.name}
                  </h3>

                  <div className="space-y-1 text-xs text-gray-600 mb-4">
                    <p>{formatBytes(doc.size)}</p>
                    <p>{formatDate(doc.uploadedAt)}</p>
                  </div>

                  <Link
                    href={`/doc?link=${doc.id}`}
                    className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors text-sm text-center"
                  >
                    Open
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
