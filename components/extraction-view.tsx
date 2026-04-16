"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, AlertCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentStatus {
  _id: string;
  fileName: string;
  extractionStatus?: string;
  ocrPageCount?: number;
  extractedData?: unknown;
}

interface LogLine {
  text: string;
  type: "info" | "success" | "error" | "scan" | "found";
  docId: string;
  timestamp: number;
}

interface ExtractionViewProps {
  documents: DocumentStatus[];
}

function getStatusIcon(status?: string) {
  switch (status) {
    case "scanning":
    case "analyzing":
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />;
    case "done":
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    case "failed":
      return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
    default:
      return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function getStatusLabel(status?: string) {
  switch (status) {
    case "pending":
      return "Waiting...";
    case "scanning":
      return "Running OCR...";
    case "analyzing":
      return "Analyzing structure...";
    case "done":
      return "Extraction complete";
    case "failed":
      return "Failed";
    default:
      return "Queued";
  }
}

export function ExtractionView({ documents }: ExtractionViewProps) {
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const [typedLines, setTypedLines] = useState<LogLine[]>([]);
  const consoleRef = useRef<HTMLDivElement>(null);
  const prevStatusRef = useRef<Map<string, string>>(new Map());

  // Track status changes and generate log lines
  useEffect(() => {
    const prev = prevStatusRef.current;

    for (const doc of documents) {
      const prevStatus = prev.get(doc._id);
      const currStatus = doc.extractionStatus;

      if (prevStatus === currStatus) continue;

      const shortName =
        doc.fileName.length > 35
          ? doc.fileName.slice(0, 32) + "..."
          : doc.fileName;

      const newLines: LogLine[] = [];

      if (currStatus === "scanning" && prevStatus !== "scanning") {
        newLines.push({
          text: `> Scanning ${shortName}...`,
          type: "scan",
          docId: doc._id,
          timestamp: Date.now(),
        });
      }

      if (currStatus === "analyzing") {
        if (doc.ocrPageCount) {
          newLines.push({
            text: `  OCR complete — ${doc.ocrPageCount} page${doc.ocrPageCount !== 1 ? "s" : ""} extracted`,
            type: "success",
            docId: doc._id,
            timestamp: Date.now(),
          });
        }
        newLines.push({
          text: `  Analyzing document structure...`,
          type: "info",
          docId: doc._id,
          timestamp: Date.now() + 1,
        });
      }

      if (currStatus === "done" && doc.extractedData) {
        const data = doc.extractedData as Record<string, unknown>;
        const sections = (data.sections ?? []) as Array<Record<string, unknown>>;
        const insurer = (data.insurerName as string) || "Unknown";
        const sectionNames = sections
          .map((s) => s.sectionName as string)
          .filter(Boolean);

        newLines.push({
          text: `  Found ${sections.length} section${sections.length !== 1 ? "s" : ""}: ${sectionNames.join(", ")}`,
          type: "found",
          docId: doc._id,
          timestamp: Date.now(),
        });

        const totalPoints = sections.reduce(
          (sum, s) => sum + ((s.pointCount as number) || 0),
          0
        );
        newLines.push({
          text: `  [${insurer}] ${totalPoints} data points extracted`,
          type: "success",
          docId: doc._id,
          timestamp: Date.now() + 1,
        });
      }

      if (currStatus === "failed") {
        newLines.push({
          text: `  Failed to extract ${shortName}`,
          type: "error",
          docId: doc._id,
          timestamp: Date.now(),
        });
      }

      if (newLines.length > 0) {
        setLogLines((prev) => [...prev, ...newLines]);
      }

      prev.set(doc._id, currStatus ?? "");
    }
  }, [documents]);

  // Typewriter reveal — add lines one at a time with a delay
  useEffect(() => {
    if (logLines.length <= typedLines.length) return;

    const nextIndex = typedLines.length;
    const delay = logLines[nextIndex].type === "scan" ? 300 : 150;

    const timer = setTimeout(() => {
      setTypedLines(logLines.slice(0, nextIndex + 1));
    }, delay);

    return () => clearTimeout(timer);
  }, [logLines, typedLines]);

  // Auto-scroll console
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [typedLines]);

  const allDone = documents.every(
    (d) => d.extractionStatus === "done" || d.extractionStatus === "failed"
  );
  const someActive = documents.some(
    (d) => d.extractionStatus === "scanning" || d.extractionStatus === "analyzing"
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {someActive && <Loader2 className="h-4 w-4 animate-spin" />}
            {allDone && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            Document Extraction
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {documents.filter((d) => d.extractionStatus === "done").length}/
            {documents.length} complete
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Document status pills */}
        <div className="flex flex-wrap gap-2">
          {documents.map((doc) => (
            <div
              key={doc._id}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border",
                doc.extractionStatus === "done" &&
                  "bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300",
                doc.extractionStatus === "failed" &&
                  "bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300",
                (doc.extractionStatus === "scanning" ||
                  doc.extractionStatus === "analyzing") &&
                  "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300",
                (!doc.extractionStatus || doc.extractionStatus === "pending") &&
                  "bg-muted border-border text-muted-foreground"
              )}
            >
              {getStatusIcon(doc.extractionStatus)}
              <span className="truncate max-w-[140px]">
                {doc.fileName.length > 20
                  ? doc.fileName.slice(0, 17) + "..."
                  : doc.fileName}
              </span>
              <span className="text-[10px] opacity-70">
                {getStatusLabel(doc.extractionStatus)}
              </span>
            </div>
          ))}
        </div>

        {/* Console output */}
        <div
          ref={consoleRef}
          className="bg-zinc-950 rounded-lg p-4 font-mono text-xs leading-relaxed max-h-64 overflow-y-auto"
        >
          {typedLines.length === 0 && someActive && (
            <span className="text-zinc-500">Initializing extraction...</span>
          )}
          {typedLines.map((line, i) => (
            <div
              key={i}
              className={cn(
                "whitespace-pre-wrap",
                line.type === "scan" && "text-blue-400",
                line.type === "info" && "text-zinc-400",
                line.type === "success" && "text-green-400",
                line.type === "found" && "text-amber-400",
                line.type === "error" && "text-red-400"
              )}
            >
              {line.text}
              {/* Blinking cursor on the last line if still processing */}
              {i === typedLines.length - 1 && !allDone && (
                <span className="animate-pulse text-zinc-500"> _</span>
              )}
            </div>
          ))}
          {allDone && typedLines.length > 0 && (
            <div className="text-green-400 mt-2">
              {"> "}Extraction complete.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
