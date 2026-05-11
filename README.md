# PDF Vault (EmbedPDFViewer POC)

A Next.js Proof-of-Concept for an inline, fully-functional PDF Viewer with annotation features. This application lets users upload, manage, and view their PDF documents directly in the browser—saving all data and annotations locally.

## Features

- 📄 **PDF Upload & Management**: Drag and drop PDF uploads with instant feedback.
- 👁 **Embedded PDF Viewer**: Seamlessly view PDFs within the browser using `@embedpdf/react-pdf-viewer`.
- 📝 **Annotations Support**: Create, read, and delete annotations on PDFs. Annotations persist across sessions.
- 💾 **Local Storage**: All documents (Base64 encoded) and annotations are securely stored in the browser's `localStorage`—no backend required.
- ⚡ **Next.js App Router**: Built with industry-standard performant architecture on Next.js 16.

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **PDF Viewer:** `@embedpdf/react-pdf-viewer`

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed along with a package manager such as `npm`, `yarn`, `pnpm`, or `bun`.

### Installation

1. Clone or download the repository.
2. Install the necessary dependencies:

```bash
npm install
```

### Running the Application

To start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```text
├── app
│   ├── page.tsx           # Home page (Upload and list documents)
│   ├── doc
│   │   └── page.tsx       # PDF viewer pane with Annotations handling
│   ├── layout.tsx         # Global layout
│   └── globals.css        # Tailwind imports
├── lib
│   ├── documentStorage.ts # localStorage helper for Base64 PDFs
│   └── utils.ts           # Shared utilities (file size formatting, dates)
├── public
│   └── embedpdf           # Static WebAssembly & worker files required by the PDF viewer
└── package.json           # Dependencies and scripts -> App entry
```

## How It Works

1. **Upload**: Users navigate to the home route (`/`) and drop a PDF file. The file is encoded in Base64 format and saved to local storage. 
2. **View Documents**: Clicking a document redirects the user to `/doc?link=<ID>`.
3. **Rendering & Annotations**: `@embedpdf/react-pdf-viewer` is lazy-loaded (dynamic import) so Next.js handles it cleanly as a client-side component. Annotations are stored separately in `localStorage` under `pdf-annotations-<ID>`.
