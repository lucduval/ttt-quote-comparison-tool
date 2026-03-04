"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, File, X, CheckCircle2 } from "lucide-react";

interface UploadedFile {
  file: File;
  storageId?: Id<"_storage">;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  error?: string;
}

interface FileUploadProps {
  comparisonId: Id<"comparisons"> | null;
  onFilesReady: (storageIds: Id<"_storage">[]) => void;
  disabled?: boolean;
  role?: "current_policy" | "new_quote";
  maxFiles?: number;
  label?: string;
  hint?: string;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

export function FileUpload({
  comparisonId,
  onFilesReady,
  disabled,
  role,
  maxFiles,
  label,
  hint,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const addDocument = useMutation(api.documents.addDocument);

  const uploadFile = useCallback(
    async (uploadedFile: UploadedFile, index: number) => {
      if (!comparisonId) return;

      try {
        setFiles((prev) =>
          prev.map((f, i) =>
            i === index ? { ...f, status: "uploading" as const, progress: 10 } : f
          )
        );

        const uploadUrl = await generateUploadUrl();

        setFiles((prev) =>
          prev.map((f, i) => (i === index ? { ...f, progress: 30 } : f))
        );

        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": uploadedFile.file.type },
          body: uploadedFile.file,
        });

        if (!result.ok) throw new Error("Upload failed");

        const { storageId } = await result.json();

        setFiles((prev) =>
          prev.map((f, i) => (i === index ? { ...f, progress: 70 } : f))
        );

        await addDocument({
          comparisonId,
          fileName: uploadedFile.file.name,
          storageId,
          mimeType: uploadedFile.file.type || "application/pdf",
          documentRole: role,
        });

        setFiles((prev) =>
          prev.map((f, i) =>
            i === index
              ? { ...f, storageId, status: "complete" as const, progress: 100 }
              : f
          )
        );

        return storageId;
      } catch (error) {
        setFiles((prev) =>
          prev.map((f, i) =>
            i === index
              ? {
                  ...f,
                  status: "error" as const,
                  error: error instanceof Error ? error.message : "Upload failed",
                }
              : f
          )
        );
        return null;
      }
    },
    [comparisonId, generateUploadUrl, addDocument, role]
  );

  const handleFiles = useCallback(
    async (newFiles: FileList) => {
      const pdfFiles = Array.from(newFiles).filter((f) =>
        ACCEPTED_TYPES.includes(f.type)
      );

      if (pdfFiles.length === 0) return;

      // Enforce maxFiles limit
      const remaining = maxFiles ? maxFiles - files.length : pdfFiles.length;
      const filesToAdd = pdfFiles.slice(0, remaining);
      if (filesToAdd.length === 0) return;

      const newUploadedFiles: UploadedFile[] = filesToAdd.map((file) => ({
        file,
        progress: 0,
        status: "pending" as const,
      }));

      const startIndex = files.length;
      setFiles((prev) => [...prev, ...newUploadedFiles]);

      if (!comparisonId) return;

      const results = await Promise.all(
        newUploadedFiles.map((f, i) => uploadFile(f, startIndex + i))
      );

      const validIds = results.filter(Boolean) as Id<"_storage">[];
      const allStorageIds = [
        ...files
          .filter((f) => f.storageId)
          .map((f) => f.storageId as Id<"_storage">),
        ...validIds,
      ];

      // Remove successfully uploaded files from local state — they will appear
      // in the "Previously uploaded" list pulled from the database.
      setFiles((prev) => prev.filter((f) => f.status !== "complete"));

      onFilesReady(allStorageIds);
    },
    [files, comparisonId, uploadFile, onFilesReady, maxFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const atMaxFiles = maxFiles !== undefined && files.length >= maxFiles;
  const isDropDisabled = disabled || atMaxFiles;

  const dropLabel = label ?? "Drag and drop quote files here";
  const dropHint =
    hint ??
    (maxFiles === 1
      ? "or click to browse. PDF or image accepted."
      : "or click to browse. PDFs and images accepted.");

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!isDropDisabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : isDropDisabled
              ? "border-muted bg-muted/20 cursor-not-allowed"
              : "border-muted-foreground/25 hover:border-primary/50 cursor-pointer"
        }`}
        onClick={() => {
          if (isDropDisabled) return;
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "application/pdf,image/png,image/jpeg,image/webp";
          input.multiple = maxFiles !== 1;
          input.onchange = (e) => {
            const selectedFiles = (e.target as HTMLInputElement).files;
            if (selectedFiles) handleFiles(selectedFiles);
          };
          input.click();
        }}
      >
        <Upload className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">
          {disabled
            ? "Select a contact first"
            : atMaxFiles
              ? "File uploaded"
              : dropLabel}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {!disabled && !atMaxFiles ? dropHint : ""}
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((uploadedFile, index) => (
            <Card key={index}>
              <CardContent className="flex items-center gap-3 p-3">
                <File className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{uploadedFile.file.name}</p>
                  {uploadedFile.status === "uploading" && (
                    <Progress value={uploadedFile.progress} className="h-1 mt-1" />
                  )}
                  {uploadedFile.status === "error" && (
                    <p className="text-xs text-destructive mt-1">
                      {uploadedFile.error}
                    </p>
                  )}
                </div>
                {uploadedFile.status === "complete" && (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
