"use client";
import { useState } from "react";
import { SqlResult, TableData } from "@/types";

function QueryBlock({
  query,
  tableData,
  index,
  total,
}: {
  query: string;
  tableData: TableData | null;
  index: number;
  total: number;
}) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* SQL header */}
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        {total > 1 && (
          <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 uppercase tracking-wider">
            Query {index + 1}
          </span>
        )}
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          SQL
        </span>
      </div>

      {/* SQL code */}
      <pre className="px-4 py-3 text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed bg-white border-b border-gray-100">
        {query}
      </pre>

      {/* Data table toggle header */}
      {tableData && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Results
              </span>
              <span className="text-[10px] text-gray-400">
                {tableData.rows.length} rows · {tableData.columns.length} columns
              </span>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9CA3AF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Collapsible table */}
          <div
            className="overflow-hidden transition-all duration-300"
            style={{ maxHeight: expanded ? "480px" : "0px" }}
          >
            <div className="overflow-auto thin-scroll" style={{ maxHeight: "480px" }}>
              <table className="w-full text-xs">
                <thead className="sticky top-0">
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {tableData.columns.map((col) => (
                      <th
                        key={col}
                        className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                    >
                      {tableData.columns.map((col) => (
                        <td
                          key={col}
                          className="px-4 py-2.5 text-gray-600 whitespace-nowrap"
                        >
                          {String(row[col] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!tableData && (
        <div className="px-4 py-3 text-xs text-gray-400 italic">
          Query returned no data.
        </div>
      )}
    </div>
  );
}

export default function DataTab({ sqlResults = [] }: { sqlResults?: SqlResult[] }) {
  if (sqlResults.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-gray-400">No data yet.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto thin-scroll p-6 space-y-4">
      {sqlResults.map((item, i) => (
        <QueryBlock
          key={i}
          query={item.query}
          tableData={item.tableData}
          index={i}
          total={sqlResults.length}
        />
      ))}
    </div>
  );
}
