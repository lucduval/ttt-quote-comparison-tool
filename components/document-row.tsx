"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { File as FileIcon, CheckCircle2, Building2, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DocumentRowProps {
  id: Id<"documents">;
  fileName: string;
  insurerName?: string;
  showInsurerName?: boolean;
  onRemoved?: () => void;
}

export function DocumentRow({
  id,
  fileName,
  insurerName,
  showInsurerName = false,
  onRemoved,
}: DocumentRowProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(insurerName ?? "");
  const [isDeleting, setIsDeleting] = useState(false);

  const removeDocument = useMutation(api.documents.removeDocument);
  const updateInsurerName = useMutation(api.documents.updateInsurerName);

  const handleSaveName = async () => {
    try {
      await updateInsurerName({
        id,
        insurerName: nameValue.trim() || undefined,
      });
      setIsEditingName(false);
    } catch {
      toast.error("Failed to update insurer name");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await removeDocument({ id });
      onRemoved?.();
    } catch {
      toast.error("Failed to remove document");
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2 transition-opacity",
        isDeleting && "opacity-50 pointer-events-none"
      )}
    >
      {/* File name row */}
      <div className="flex items-center gap-3">
        <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-sm truncate flex-1">{fileName}</p>
        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={isDeleting}
          title="Remove file"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Insurer name row (for new quotes) */}
      {showInsurerName && (
        <div className="flex items-center gap-2 pl-7">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {isEditingName ? (
            <>
              <Input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") {
                    setNameValue(insurerName ?? "");
                    setIsEditingName(false);
                  }
                }}
                onBlur={handleSaveName}
                placeholder="Insurer name (optional)"
                className="h-7 text-xs flex-1"
                autoFocus
              />
            </>
          ) : (
            <button
              className="flex items-center gap-1.5 group flex-1 text-left"
              onClick={() => setIsEditingName(true)}
            >
              <span
                className={cn(
                  "text-xs",
                  nameValue ? "text-foreground" : "text-muted-foreground italic"
                )}
              >
                {nameValue || "Add insurer name…"}
              </span>
              <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
