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
    [comparisonId, generateUploadUrl, addDocument]
  );

  const handleFiles = useCallback(
    async (newFiles: FileList) => {
      const pdfFiles = Array.from(newFiles).filter((f) =>
        ACCEPTED_TYPES.includes(f.type)
      );

      if (pdfFiles.length === 0) return;

      const newUploadedFiles: UploadedFile[] = pdfFiles.map((file) => ({
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
      onFilesReady(allStorageIds);
    },
    [files, comparisonId, uploadFile, onFilesReady]
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

  const allComplete = files.length >= 2 && files.every((f) => f.status === "complete");

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : disabled
              ? "border-muted bg-muted/20 cursor-not-allowed"
              : "border-muted-foreground/25 hover:border-primary/50 cursor-pointer"
        }`}
        onClick={() => {
          if (disabled) return;
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "application/pdf,image/png,image/jpeg,image/webp";
          input.multiple = true;
          input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) handleFiles(files);
          };
          input.click();
        }}
      >
        <Upload className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">
          {disabled
            ? "Select a contact first"
            : "Drag and drop quote files here"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {disabled ? "" : "or click to browse. PDFs and images accepted. Upload at least 2 quotes."}
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
          {files.length < 2 && (
            <p className="text-xs text-muted-foreground">
              Upload at least 2 quote files to compare.
            </p>
          )}
          {allComplete && (
            <p className="text-xs text-green-600">
              All files uploaded. Ready to process.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
