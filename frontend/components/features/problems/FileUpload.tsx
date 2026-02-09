"use client";

import { UploadCloud, X, FileText, Image as ImageIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface FileUploadProps {
  label: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
  accept?: string;
}

export default function FileUpload({
  label,
  files,
  onFilesChange,
  accept = ".jpg,.png,.pdf,.heic",
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming) return;
      const newFiles = Array.from(incoming);
      onFilesChange([...files, ...newFiles]);
    },
    [files, onFilesChange],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const removeFile = useCallback(
    (index: number) => {
      const next = files.filter((_, i) => i !== index);
      onFilesChange(next);
    },
    [files, onFilesChange],
  );

  const isImage = (file: File) => file.type.startsWith("image/");

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
          isDragOver
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
        }`}
      >
        <UploadCloud
          className={`h-8 w-8 ${isDragOver ? "text-blue-500" : "text-gray-400"}`}
        />
        <p className="text-sm text-gray-500">
          ドラッグ&ドロップ または{" "}
          <span className="font-medium text-blue-600">クリックして選択</span>
        </p>
        <p className="text-xs text-gray-400">JPG, PNG, PDF, HEIC</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Preview grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {files.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="relative group rounded-lg border border-gray-200 bg-white p-2"
            >
              {isImage(file) ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="h-24 w-full rounded object-contain"
                />
              ) : (
                <div className="flex h-24 w-full flex-col items-center justify-center gap-1 text-gray-400">
                  <FileText className="h-8 w-8" />
                  <span className="text-xs truncate max-w-full px-1">
                    {file.name}
                  </span>
                </div>
              )}

              {/* Remove button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(idx);
                }}
                className="absolute -right-2 -top-2 hidden group-hover:flex items-center justify-center h-6 w-6 rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
