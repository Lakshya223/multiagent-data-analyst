"use client";
import React from "react";

// ─── Inline renderer ──────────────────────────────────────────────────────────
// Converts **bold**, *italic*, and bare text to React nodes within a single line.
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match **bold** or *italic*
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2] !== undefined) {
      parts.push(<strong key={m.index}>{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      parts.push(<em key={m.index}>{m[3]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// ─── Table renderer ───────────────────────────────────────────────────────────
function renderTable(rows: string[]): React.ReactNode {
  const parsed = rows.map((r) =>
    r
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0)
  );
  // Filter out separator rows like |---|---|
  const dataRows = parsed.filter((cols) =>
    cols.some((c) => !/^[-\s:]+$/.test(c))
  );
  if (dataRows.length === 0) return null;
  const [header, ...body] = dataRows;
  return (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            {header.map((h, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap border-b border-gray-200"
              >
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((cols, ri) => (
            <tr key={ri} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
              {cols.map((c, ci) => (
                <td key={ci} className="px-3 py-1.5 text-gray-600 whitespace-nowrap">
                  {renderInline(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Block renderer ───────────────────────────────────────────────────────────
// Processes the full text line by line and returns a list of React block elements.
// compact=true → uniform text-xs sizing (for use inside small cards)
export function parseMarkdown(text: string, compact = false): React.ReactNode[] {
  const prose = compact ? "text-xs text-gray-600" : "text-sm text-gray-700";
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Blank line → skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // ── Heading ## or ###
    const h3 = line.match(/^###\s+(.*)/);
    if (h3) {
      nodes.push(
        <h3 key={i} className={`${compact ? "text-xs" : "text-sm"} font-bold text-gray-800 mt-3 mb-1`}>
          {renderInline(h3[1])}
        </h3>
      );
      i++;
      continue;
    }
    const h2 = line.match(/^##\s+(.*)/);
    if (h2) {
      nodes.push(
        <h2 key={i} className={`${compact ? "text-sm" : "text-base"} font-bold text-gray-900 mt-3 mb-1`}>
          {renderInline(h2[1])}
        </h2>
      );
      i++;
      continue;
    }
    const h1 = line.match(/^#\s+(.*)/);
    if (h1) {
      nodes.push(
        <h1 key={i} className={`${compact ? "text-sm" : "text-lg"} font-bold text-gray-900 mt-3 mb-1`}>
          {renderInline(h1[1])}
        </h1>
      );
      i++;
      continue;
    }

    // ── Table — collect consecutive | lines
    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const table = renderTable(tableLines);
      if (table) nodes.push(<React.Fragment key={`tbl-${i}`}>{table}</React.Fragment>);
      continue;
    }

    // ── Unordered list  (* or -)
    if (line.match(/^[\*\-]\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[\*\-]\s+/)) {
        items.push(lines[i].replace(/^[\*\-]\s+/, ""));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-0.5 my-1">
          {items.map((item, idx) => (
            <li key={idx} className={`${prose} leading-relaxed`}>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // ── Ordered list (1. 2. ...) — skip blank lines between items to avoid reset
    if (line.match(/^\d+\.\s+/)) {
      const items: string[] = [];
      while (i < lines.length) {
        const curr = lines[i];
        if (curr.match(/^\d+\.\s+/)) {
          items.push(curr.replace(/^\d+\.\s+/, ""));
          i++;
        } else if (
          curr.trim() === "" &&
          i + 1 < lines.length &&
          lines[i + 1].match(/^\d+\.\s+/)
        ) {
          // blank line between numbered items — skip but keep collecting
          i++;
        } else {
          break;
        }
      }
      nodes.push(
        <ol key={`ol-${i}`} className="list-decimal list-outside pl-5 space-y-0.5 my-1">
          {items.map((item, idx) => (
            <li key={idx} className={`${prose} leading-relaxed`}>
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // ── Horizontal rule
    if (line.match(/^---+$/)) {
      nodes.push(<hr key={i} className="border-gray-200 my-2" />);
      i++;
      continue;
    }

    // ── Metadata label pattern: "Label:* value" (e.g. "Supporting Evidence:* ...")
    const metaMatch = line.match(/^(.+?):\*\s+(.*)/);
    if (metaMatch) {
      const label = metaMatch[1];
      const value = metaMatch[2].trim();
      const isConfidence = ["High", "Medium", "Low"].includes(value);
      nodes.push(
        <div key={i} className="flex items-center flex-wrap gap-1.5 my-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            {label}
          </span>
          {isConfidence ? (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                value === "High"
                  ? "bg-green-50 text-green-700"
                  : value === "Medium"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {value}
            </span>
          ) : (
            <span className={`${prose} leading-relaxed`}>{renderInline(value)}</span>
          )}
        </div>
      );
      i++;
      continue;
    }

    // ── Default: paragraph
    nodes.push(
      <p key={i} className={`${prose} leading-relaxed`}>
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return nodes;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MarkdownText({
  text,
  className = "",
  compact = false,
}: {
  text: string;
  className?: string;
  compact?: boolean;
}) {
  const nodes = parseMarkdown(text, compact);
  return <div className={`markdown-body ${className}`}>{nodes}</div>;
}
