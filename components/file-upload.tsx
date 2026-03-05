"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Upload, File, X, CheckCircle2, Building2, ArrowUpCircle, RotateCcw, AlertCircle } from "lucide-react";

const UPLOAD_TIMEOUT_MS = 60_000; // 60 s before we give up

interface StagedFile {
  file: File;
  storageId?: Id<"_storage">;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  error?: string;
  insurerName: string;
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
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Always-current ref so upload callbacks read the latest insurer name
  const filesRef = useRef<StagedFile[]>(files);
  filesRef.current = files;

  // One AbortController per staged-file index so we can cancel mid-upload
  const abortControllersRef = useRef<Map<number, AbortController>>(new Map());

  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const addDocument = useMutation(api.documents.addDocument);

  const uploadOne = useCallback(
    async (index: number) => {
      if (!comparisonId) return null;
      const staged = filesRef.current[index];
      if (!staged || staged.status !== "pending") return null;

      // Fresh AbortController for this attempt
      const controller = new AbortController();
      abortControllersRef.current.set(index, controller);

      // Timeout: abort if the upload takes longer than UPLOAD_TIMEOUT_MS
      const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

      try {
        setFiles((prev) =>
          prev.map((f, i) =>
            i === index ? { ...f, status: "uploading" as const, progress: 10 } : f
          )
        );

        const uploadUrl = await generateUploadUrl();
        if (controller.signal.aborted) throw new Error("Upload cancelled");

        setFiles((prev) =>
          prev.map((f, i) => (i === index ? { ...f, progress: 30 } : f))
        );

        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": staged.file.type },
          body: staged.file,
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Upload failed");
        const { storageId } = await res.json();

        setFiles((prev) =>
          prev.map((f, i) => (i === index ? { ...f, progress: 70 } : f))
        );

        // Read insurer name from ref at the moment addDocument is called
        const nameAtUpload = filesRef.current[index]?.insurerName.trim();

        await addDocument({
          comparisonId,
          fileName: staged.file.name,
          storageId,
          mimeType: staged.file.type || "application/pdf",
          documentRole: role,
          insurerName: nameAtUpload || undefined,
        });

        setFiles((prev) =>
          prev.map((f, i) =>
            i === index
              ? { ...f, storageId, status: "complete" as const, progress: 100 }
              : f
          )
        );

        return storageId as Id<"_storage">;
      } catch (err) {
        const isCancelled =
          err instanceof DOMException && err.name === "AbortError";
        // If the user dismissed the file while uploading, don't set error state
        // (removeStaged already cleaned up the array)
        if (!filesRef.current[index]) return null;

        setFiles((prev) =>
          prev.map((f, i) =>
            i === index
              ? {
                  ...f,
                  status: "error" as const,
                  progress: 0,
                  error: isCancelled ? "Upload timed out — please retry" : (err instanceof Error ? err.message : "Upload failed"),
                }
              : f
          )
        );
        return null;
      } finally {
        clearTimeout(timeoutId);
        abortControllersRef.current.delete(index);
      }
    },
    [comparisonId, generateUploadUrl, addDocument, role]
  );

  const finishUploads = useCallback(
    (newIds: Id<"_storage">[]) => {
      // Collect all already-complete storageIds + new ones
      const existingIds = filesRef.current
        .filter((f) => f.storageId && f.status === "complete")
        .map((f) => f.storageId as Id<"_storage">);

      // Remove completed files from local staging area
      setFiles((prev) => prev.filter((f) => f.status !== "complete"));

      onFilesReady([...existingIds, ...newIds]);
    },
    [onFilesReady]
  );

  // For current_policy: auto-upload immediately (no name needed)
  // For new_quote: stage first, user fills in name, then clicks Upload per file
  const handleFiles = useCallback(
    async (newFiles: FileList) => {
      const accepted = Array.from(newFiles).filter((f) =>
        ACCEPTED_TYPES.includes(f.type)
      );
      if (accepted.length === 0) return;

      const remaining = maxFiles ? maxFiles - files.length : accepted.length;
      const toAdd = accepted.slice(0, remaining);
      if (toAdd.length === 0) return;

      const staged: StagedFile[] = toAdd.map((file) => ({
        file,
        progress: 0,
        status: "pending" as const,
        insurerName: "",
      }));

      const startIndex = files.length;

      // Update the ref BEFORE calling uploadOne so it can read the new files
      // even though the React state update is still pending.
      const nextFiles = [...files, ...staged];
      filesRef.current = nextFiles;
      setFiles(nextFiles);

      // new_quote: wait for explicit per-file upload
      if (role === "new_quote") return;

      // current_policy and others: auto-upload immediately
      if (!comparisonId) return;
      const results = await Promise.all(
        staged.map((_, i) => uploadOne(startIndex + i))
      );
      const validIds = results.filter(Boolean) as Id<"_storage">[];
      finishUploads(validIds);
    },
    [files, comparisonId, role, maxFiles, uploadOne, finishUploads]
  );

  const handleUploadOne = async (index: number) => {
    const id = await uploadOne(index);
    if (id) finishUploads([id]);
  };

  const removeStaged = (index: number) => {
    // Abort any in-flight upload for this slot
    abortControllersRef.current.get(index)?.abort();
    abortControllersRef.current.delete(index);
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Reset an errored file back to "pending" so it can be retried
  const retryStaged = (index: number) => {
    setFiles((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, status: "pending" as const, progress: 0, error: undefined } : f
      )
    );
  };

  const updateName = (index: number, name: string) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, insurerName: name } : f))
    );
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled || atMaxFiles) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const atMaxFiles = maxFiles !== undefined && files.length >= maxFiles;
  const isDropDisabled = disabled || atMaxFiles;
  const dropLabel = label ?? "Drag and drop quote files here";
  const dropHint =
    hint ??
    (maxFiles === 1
      ? "or click to browse. PDF or image accepted."
      : "or click to browse. PDFs and images accepted.");

  return (
    <div className="space-y-3">
      {/* Drop zone */}
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
            const selected = (e.target as HTMLInputElement).files;
            if (selected) handleFiles(selected);
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

      {/* Staged files */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, index) => (
            <div
              key={index}
              className="rounded-lg border bg-card p-3 space-y-2"
            >
              {/* File row */}
              <div className="flex items-center gap-3">
                <File className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{f.file.name}</p>
                  {f.status === "uploading" && (
                    <Progress value={f.progress} className="h-1 mt-1" />
                  )}
                  {f.status === "error" && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
                      <p className="text-xs text-destructive">{f.error}</p>
                    </div>
                  )}
                </div>

                {/* Status indicators */}
                {f.status === "complete" && (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                )}

                {/* Retry button (error state) */}
                {f.status === "error" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                    title="Retry upload"
                    onClick={(e) => {
                      e.stopPropagation();
                      retryStaged(index);
                      // For current_policy auto-upload on retry
                      if (role !== "new_quote") handleUploadOne(index);
                    }}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}

                {/* Always-visible dismiss button — also cancels in-flight uploads */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                  title={f.status === "uploading" ? "Cancel upload" : "Remove"}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeStaged(index);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {/* Insurer name + Upload button for new_quote staged files */}
              {role === "new_quote" && (f.status === "pending" || f.status === "error") && (
                <div className="flex items-center gap-2 pl-7">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="Insurer name (optional)"
                    value={f.insurerName}
                    onChange={(e) => updateName(index, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUploadOne(index);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-7 text-xs flex-1"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUploadOne(index);
                    }}
                    disabled={!comparisonId}
                  >
                    <ArrowUpCircle className="h-3 w-3" />
                    Upload
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
