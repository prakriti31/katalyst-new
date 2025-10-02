/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string; // replace/add your env variables here
  // Add other VITE_... variables here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
