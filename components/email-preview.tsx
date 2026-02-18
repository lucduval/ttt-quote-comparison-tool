"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface EmailPreviewProps {
  emailDraft: string;
}

export function EmailPreview({ emailDraft }: EmailPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(emailDraft);
      setCopied(true);
      toast.success("Email copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Email Draft
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy to Clipboard
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border bg-muted/30 p-4 max-h-96 overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ children, ...props }) => (
                <table
                  className="w-full border-collapse text-sm my-3"
                  {...props}
                >
                  {children}
                </table>
              ),
              th: ({ children, ...props }) => (
                <th
                  className="border border-border bg-muted px-3 py-1.5 text-left font-medium"
                  {...props}
                >
                  {children}
                </th>
              ),
              td: ({ children, ...props }) => (
                <td className="border border-border px-3 py-1.5" {...props}>
                  {children}
                </td>
              ),
              p: ({ children, ...props }) => (
                <p className="my-2 leading-relaxed" {...props}>
                  {children}
                </p>
              ),
              strong: ({ children, ...props }) => (
                <strong className="font-semibold" {...props}>
                  {children}
                </strong>
              ),
              ul: ({ children, ...props }) => (
                <ul className="my-2 ml-4 list-disc space-y-1" {...props}>
                  {children}
                </ul>
              ),
              ol: ({ children, ...props }) => (
                <ol className="my-2 ml-4 list-decimal space-y-1" {...props}>
                  {children}
                </ol>
              ),
              h1: ({ children, ...props }) => (
                <h1 className="text-lg font-bold mt-4 mb-2" {...props}>
                  {children}
                </h1>
              ),
              h2: ({ children, ...props }) => (
                <h2 className="text-base font-bold mt-3 mb-2" {...props}>
                  {children}
                </h2>
              ),
              h3: ({ children, ...props }) => (
                <h3 className="text-sm font-bold mt-3 mb-1" {...props}>
                  {children}
                </h3>
              ),
              hr: (props) => (
                <hr className="my-3 border-border" {...props} />
              ),
            }}
          >
            {emailDraft}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
