"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Copy, Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface EmailPreviewProps {
  emailDraft: string;
}

/**
 * Strips all markdown formatting so the copied text pastes cleanly into
 * Outlook, Gmail, or any plain-text email client.
 */
function stripMarkdownForEmail(markdown: string): string {
  return (
    markdown
      .replace(/^#{1,6}\s+(.+)$/gm, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/^\|[\s\-:|]+\|.*$/gm, "")
      .replace(/^\|(.+)\|$/gm, (_match, content: string) => {
        const cells = content
          .split("|")
          .map((c) => c.trim())
          .filter((c) => c.length > 0);
        return cells.join("    ");
      })
      .replace(/[ \t]+$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

// ─── HTML email conversion ──────────────────────────────────────────────────

const EMAIL_STYLES = {
  wrap: 'font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#222;line-height:1.5;max-width:700px;',
  h2: 'font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;margin:14px 0 2px;text-transform:uppercase;letter-spacing:0.05em;',
  p: 'font-family:Arial,Helvetica,sans-serif;font-size:13px;margin:4px 0;line-height:1.5;',
  hr: 'border:none;border-top:1px solid #ccc;margin:10px 0;',
  table: 'border-collapse:collapse;width:100%;margin:8px 0;font-size:13px;font-family:Arial,Helvetica,sans-serif;',
  th: 'border:1px solid #bbb;padding:6px 10px;text-align:left;background:#f0f0f0;font-weight:600;white-space:nowrap;',
  td: 'border:1px solid #bbb;padding:6px 10px;vertical-align:top;',
  ul: 'margin:4px 0;padding-left:20px;',
  li: 'font-family:Arial,Helvetica,sans-serif;font-size:13px;margin:2px 0;',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineFormat(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

/** Splits a space-padded line into columns using 2+ consecutive spaces as a delimiter. */
function splitColumns(line: string): string[] {
  return line
    .trim()
    .split(/\s{2,}/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

/**
 * Looks ahead from index `start` and returns consecutive lines that look like
 * a column-aligned table (each line has 2+ whitespace-separated columns that
 * mirror the column count of the first line).
 */
function detectTableBlock(lines: string[], start: number): string[] {
  const firstCols = splitColumns(lines[start]);
  if (firstCols.length < 2) return [];

  const block: string[] = [lines[start]];
  for (let j = start + 1; j < lines.length; j++) {
    const line = lines[j];
    if (line.trim() === "") break;
    if (/^[-=]{3,}\s*$/.test(line.trim())) break;
    const cols = splitColumns(line);
    // Allow rows with slightly fewer columns (last columns may be absent)
    if (cols.length >= 2 && cols.length <= firstCols.length + 1) {
      block.push(line);
    } else {
      break;
    }
  }
  // Require at least header + 1 data row to be worth rendering as a table
  return block.length >= 2 ? block : [];
}

function renderPlainTextTable(tableLines: string[]): string {
  const headers = splitColumns(tableLines[0]);
  let html = `<table style="${EMAIL_STYLES.table}"><thead><tr>`;
  for (const h of headers) {
    html += `<th style="${EMAIL_STYLES.th}">${escapeHtml(h)}</th>`;
  }
  html += "</tr></thead><tbody>";
  for (let r = 1; r < tableLines.length; r++) {
    const cells = splitColumns(tableLines[r]);
    html += "<tr>";
    for (let c = 0; c < headers.length; c++) {
      html += `<td style="${EMAIL_STYLES.td}">${escapeHtml(cells[c] ?? "")}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  return html;
}

/** Renders a markdown table block (lines starting/ending with |) to HTML. */
function renderMarkdownTable(tableLines: string[]): string {
  const parseRow = (line: string) =>
    line
      .split("|")
      .filter((_, i, a) => i > 0 && i < a.length - 1)
      .map((c) => c.trim());

  const isSeparator = (line: string) => /^\|[\s\-:|]+\|/.test(line.trim());

  let html = `<table style="${EMAIL_STYLES.table}"><thead>`;
  let headerDone = false;

  for (const line of tableLines) {
    if (isSeparator(line)) {
      html += "</thead><tbody>";
      headerDone = true;
      continue;
    }
    const cells = parseRow(line);
    if (!headerDone) {
      html += "<tr>";
      for (const c of cells) {
        html += `<th style="${EMAIL_STYLES.th}">${inlineFormat(c)}</th>`;
      }
      html += "</tr>";
    } else {
      html += "<tr>";
      for (const c of cells) {
        html += `<td style="${EMAIL_STYLES.td}">${inlineFormat(c)}</td>`;
      }
      html += "</tr>";
    }
  }
  if (!headerDone) html += "</thead><tbody>";
  html += "</tbody></table>";
  return html;
}

/**
 * Converts an email draft (plain-text or markdown) into HTML with inline styles
 * so it pastes correctly into Outlook, Gmail, and other email clients.
 */
function toEmailHtml(draft: string): string {
  const lines = draft.split("\n");
  const parts: string[] = [];
  let i = 0;
  let inList = false;

  const closeList = () => {
    if (inList) {
      parts.push("</ul>");
      inList = false;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // ── Blank line ──────────────────────────────────────────────────────────
    if (line.trim() === "") {
      closeList();
      parts.push("<br>");
      i++;
      continue;
    }

    // ── Markdown table block ─────────────────────────────────────────────────
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      closeList();
      const block: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        block.push(lines[i]);
        i++;
      }
      parts.push(renderMarkdownTable(block));
      continue;
    }

    // ── Divider line ─────────────────────────────────────────────────────────
    if (/^[-=]{4,}\s*$/.test(line.trim())) {
      closeList();
      parts.push(`<hr style="${EMAIL_STYLES.hr}">`);
      i++;
      continue;
    }

    // ── Markdown heading (#) ─────────────────────────────────────────────────
    const mdHeading = line.match(/^(#{1,3})\s+(.+)$/);
    if (mdHeading) {
      closeList();
      parts.push(`<p style="${EMAIL_STYLES.h2}">${inlineFormat(mdHeading[2])}</p>`);
      i++;
      continue;
    }

    // ── ALL CAPS heading (plain-text convention) ──────────────────────────────
    // Line starts with an uppercase letter, has no lowercase, and is >50%
    // alphabetic (excludes currency/number-only lines like "R1,334.40").
    const _trimmed = line.trim();
    const _alphaCount = (_trimmed.match(/[A-Za-z]/g) ?? []).length;
    const isAllCapsHeading =
      _trimmed.length >= 6 &&
      /^[A-Z]/.test(_trimmed) &&
      !/[a-z]/.test(_trimmed) &&
      _alphaCount / _trimmed.length > 0.5;
    if (isAllCapsHeading) {
      closeList();
      parts.push(`<p style="${EMAIL_STYLES.h2}">${escapeHtml(line.trim())}</p>`);
      i++;
      continue;
    }

    // ── Bullet point ─────────────────────────────────────────────────────────
    if (/^[-•]\s+/.test(line.trim())) {
      if (!inList) {
        parts.push(`<ul style="${EMAIL_STYLES.ul}">`);
        inList = true;
      }
      const content = line.trim().replace(/^[-•]\s+/, "");
      parts.push(`<li style="${EMAIL_STYLES.li}">${inlineFormat(content)}</li>`);
      i++;
      continue;
    }

    // ── Plain-text table block (space-padded columns) ─────────────────────────
    const tableBlock = detectTableBlock(lines, i);
    if (tableBlock.length >= 2) {
      closeList();
      parts.push(renderPlainTextTable(tableBlock));
      i += tableBlock.length;
      continue;
    }

    // ── Regular paragraph line ────────────────────────────────────────────────
    closeList();
    parts.push(`<p style="${EMAIL_STYLES.p}">${inlineFormat(line)}</p>`);
    i++;
  }

  closeList();

  return `<div style="${EMAIL_STYLES.wrap}">${parts.join("")}</div>`;
}

export function EmailPreview({ emailDraft }: EmailPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDraft, setEditedDraft] = useState(emailDraft);

  const handleCopy = async () => {
    const source = isEditing ? editedDraft : emailDraft;
    const plainText = stripMarkdownForEmail(source);
    const htmlContent = toEmailHtml(source);

    try {
      // Prefer rich copy: HTML retains table structure in Outlook / Gmail
      if (typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([htmlContent], { type: "text/html" }),
            "text/plain": new Blob([plainText], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
      setCopied(true);
      toast.success("Email copied — paste directly into Outlook or Gmail");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback to plain text if ClipboardItem write is blocked
      try {
        await navigator.clipboard.writeText(plainText);
        setCopied(true);
        toast.success("Email copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Failed to copy to clipboard");
      }
    }
  };

  const handleEdit = () => {
    setEditedDraft(stripMarkdownForEmail(emailDraft));
    setIsEditing(true);
  };

  const handleDone = () => {
    setIsEditing(false);
  };

  const handleDiscard = () => {
    setEditedDraft(emailDraft);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Email Draft
          </CardTitle>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDiscard}
                  className="gap-2"
                >
                  <X className="h-3.5 w-3.5" />
                  Discard
                </Button>
                <Button variant="default" size="sm" onClick={handleDone} className="gap-2">
                  Done
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="gap-2"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
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
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <>
            <Textarea
              value={editedDraft}
              onChange={(e) => setEditedDraft(e.target.value)}
              className="min-h-[500px] font-mono text-sm resize-y"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Editing plain text — paste directly into Outlook, Gmail, or any email client.
            </p>
          </>
        ) : (
          <>
            <div className="rounded-lg border bg-muted/30 p-4 max-h-[600px] overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children, ...props }) => (
                    <table className="w-full border-collapse text-sm my-3" {...props}>
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
                  hr: (props) => <hr className="my-3 border-border" {...props} />,
                }}
              >
                {emailDraft}
              </ReactMarkdown>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Preview only — "Copy to Clipboard" copies rich HTML so tables and
              headings paste correctly into Outlook, Gmail, and Apple Mail.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
