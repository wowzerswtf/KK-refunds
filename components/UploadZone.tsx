'use client';

import { useCallback, useState } from 'react';

interface UploadZoneProps {
  onFileSelect: (file: File, preview: { rows: number; fileName: string }) => void;
}

export default function UploadZone({ onFileSelect }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      onFileSelect(file, { rows: Math.max(0, lines.length - 1), fileName: file.name });
    };
    reader.readAsText(file);
  }, [onFileSelect]);

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed p-12 text-center transition-all cursor-pointer ${
        dragging
          ? 'border-[#00d4ff] bg-[#00d4ff]/5'
          : 'border-white/20 hover:border-white/40 bg-[#111118]'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      onClick={() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) handleFile(file);
        };
        input.click();
      }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#2563eb]/20 to-[#00d4ff]/20 flex items-center justify-center">
          <svg className="h-8 w-8 text-[#00d4ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-medium text-white">
            Drop your Konnektive CSV export here
          </p>
          <p className="mt-1 text-sm text-gray-400">
            or click to browse — accepts .csv files only
          </p>
        </div>
      </div>
    </div>
  );
}
