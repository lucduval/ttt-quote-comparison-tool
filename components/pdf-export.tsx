"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PdfExportProps {
  title: string;
  emailDraft: string;
  contactName: string;
}

type PdfNode =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; segments: TextSegment[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "hr" };

type TextSegment = { text: string; bold: boolean };

function parseMarkdownToPdfNodes(markdown: string): PdfNode[] {
  const nodes: PdfNode[] = [];
  const lines = markdown.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (line.trim() === "---" || line.trim() === "***" || line.trim() === "___") {
      nodes.push({ type: "hr" });
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (headingMatch) {
      nodes.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].replace(/\*\*/g, ""),
      });
      i++;
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?[\s-:|]+\|/.test(lines[i + 1])) {
      const headers = line
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        rows.push(
          lines[i]
            .split("|")
            .map((c) => c.trim())
            .filter(Boolean)
        );
        i++;
      }
      nodes.push({ type: "table", headers, rows });
      continue;
    }

    const ulMatch = line.match(/^[\s]*[-*]\s+(.*)/);
    if (ulMatch) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*[-*]\s+/, ""));
        i++;
      }
      nodes.push({ type: "list", ordered: false, items });
      continue;
    }

    const olMatch = line.match(/^[\s]*\d+\.\s+(.*)/);
    if (olMatch) {
      const items: string[] = [];
      while (i < lines.length && /^[\s]*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*\d+\.\s+/, ""));
        i++;
      }
      nodes.push({ type: "list", ordered: true, items });
      continue;
    }

    if (line.startsWith("**") && line.endsWith("**") && !line.slice(2, -2).includes("**")) {
      nodes.push({
        type: "heading",
        level: 3,
        text: line.slice(2, -2),
      });
      i++;
      continue;
    }

    const segments = parseBoldSegments(line);
    nodes.push({ type: "paragraph", segments });
    i++;
  }

  return nodes;
}

function parseBoldSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      segments.push({ text: part.slice(2, -2), bold: true });
    } else if (part) {
      segments.push({ text: part, bold: false });
    }
  }
  return segments;
}

export function PdfExport({ title, emailDraft, contactName }: PdfExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = async () => {
    setIsGenerating(true);
    try {
      const { pdf, Document, Page, Text, View, StyleSheet } = await import(
        "@react-pdf/renderer"
      );

      const styles = StyleSheet.create({
        page: {
          padding: 40,
          fontSize: 10,
          fontFamily: "Helvetica",
          lineHeight: 1.5,
        },
        header: {
          fontSize: 16,
          fontFamily: "Helvetica-Bold",
          marginBottom: 4,
        },
        subheader: {
          fontSize: 10,
          color: "#666",
          marginBottom: 20,
        },
        divider: {
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
          marginVertical: 12,
        },
        h1: {
          fontSize: 14,
          fontFamily: "Helvetica-Bold",
          marginTop: 14,
          marginBottom: 6,
        },
        h2: {
          fontSize: 12,
          fontFamily: "Helvetica-Bold",
          marginTop: 12,
          marginBottom: 4,
        },
        h3: {
          fontSize: 11,
          fontFamily: "Helvetica-Bold",
          marginTop: 10,
          marginBottom: 4,
        },
        paragraph: {
          fontSize: 10,
          lineHeight: 1.6,
          marginBottom: 4,
        },
        bold: {
          fontFamily: "Helvetica-Bold",
        },
        tableContainer: {
          marginVertical: 8,
          borderWidth: 1,
          borderColor: "#d1d5db",
        },
        tableRow: {
          flexDirection: "row" as const,
          borderBottomWidth: 1,
          borderBottomColor: "#d1d5db",
        },
        tableHeaderRow: {
          flexDirection: "row" as const,
          borderBottomWidth: 1,
          borderBottomColor: "#d1d5db",
          backgroundColor: "#f3f4f6",
        },
        tableCell: {
          flex: 1,
          padding: 4,
          fontSize: 9,
        },
        tableCellBold: {
          flex: 1,
          padding: 4,
          fontSize: 9,
          fontFamily: "Helvetica-Bold",
        },
        listItem: {
          flexDirection: "row" as const,
          marginBottom: 2,
          paddingLeft: 8,
        },
        listBullet: {
          width: 12,
          fontSize: 10,
        },
        listText: {
          flex: 1,
          fontSize: 10,
          lineHeight: 1.6,
        },
        footer: {
          position: "absolute" as const,
          bottom: 30,
          left: 40,
          right: 40,
          textAlign: "center" as const,
          fontSize: 8,
          color: "#999",
        },
      });

      const nodes = parseMarkdownToPdfNodes(emailDraft);

      const renderTextSegments = (segments: TextSegment[]) =>
        segments.map((seg, j) =>
          seg.bold ? (
            <Text key={j} style={styles.bold}>
              {seg.text}
            </Text>
          ) : (
            <Text key={j}>{seg.text}</Text>
          )
        );

      const PdfDocument = () => (
        <Document>
          <Page size="A4" style={styles.page}>
            <Text style={styles.header}>{title}</Text>
            <Text style={styles.subheader}>
              Prepared for {contactName} |{" "}
              {new Date().toLocaleDateString("en-ZA", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
            <View style={styles.divider} />

            {nodes.map((node, i) => {
              switch (node.type) {
                case "heading": {
                  const hStyle =
                    node.level === 1
                      ? styles.h1
                      : node.level === 2
                        ? styles.h2
                        : styles.h3;
                  return (
                    <Text key={i} style={hStyle}>
                      {node.text}
                    </Text>
                  );
                }
                case "paragraph":
                  return (
                    <Text key={i} style={styles.paragraph}>
                      {renderTextSegments(node.segments)}
                    </Text>
                  );
                case "table":
                  return (
                    <View key={i} style={styles.tableContainer}>
                      <View style={styles.tableHeaderRow}>
                        {node.headers.map((h, hi) => (
                          <Text key={hi} style={styles.tableCellBold}>
                            {h}
                          </Text>
                        ))}
                      </View>
                      {node.rows.map((row, ri) => (
                        <View
                          key={ri}
                          style={[
                            styles.tableRow,
                            ri === node.rows.length - 1
                              ? { borderBottomWidth: 0 }
                              : {},
                          ]}
                        >
                          {row.map((cell, ci) => (
                            <Text key={ci} style={styles.tableCell}>
                              {cell}
                            </Text>
                          ))}
                        </View>
                      ))}
                    </View>
                  );
                case "list":
                  return (
                    <View key={i}>
                      {node.items.map((item, li) => (
                        <View key={li} style={styles.listItem}>
                          <Text style={styles.listBullet}>
                            {node.ordered ? `${li + 1}.` : "•"}
                          </Text>
                          <Text style={styles.listText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  );
                case "hr":
                  return <View key={i} style={styles.divider} />;
                default:
                  return null;
              }
            })}

            <Text style={styles.footer}>
              Generated by QuoteCompare |{" "}
              {new Date().toLocaleDateString("en-ZA")}
            </Text>
          </Page>
        </Document>
      );

      const blob = await pdf(<PdfDocument />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_comparison.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("PDF downloaded");
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isGenerating}
      className="gap-2"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="h-3.5 w-3.5" />
          Download PDF
        </>
      )}
    </Button>
  );
}
