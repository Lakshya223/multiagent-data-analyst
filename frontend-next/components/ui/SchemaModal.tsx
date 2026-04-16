"use client";
import { useState } from "react";

const TABLES = [
  {
    id: "transactions",
    name: "transaction_data",
    bqId: "lakshya-agenticai.retail.transaction_data",
    rows: "~3 million rows",
    range: "Jan 1 – Jul 30, 2025",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-400",
    description: "Order and item-level purchase data from Velora stores and online channels.",
    columns: [
      { name: "AMPERITY_ID", type: "STRING", desc: "Unique customer UUID" },
      { name: "ORDER_ID", type: "STRING", desc: "Unique hashed order identifier" },
      { name: "ORDER_DATETIME", type: "TIMESTAMP", desc: "Date and time order was placed (UTC)" },
      { name: "ITEM_QUANTITY", type: "INTEGER", desc: "Units of product in this line item" },
      { name: "ITEM_REVENUE", type: "FLOAT", desc: "Revenue after discounts (multiply by quantity)" },
      { name: "ITEM_LIST_PRICE", type: "FLOAT", desc: "Original listed price before discounts" },
      { name: "ITEM_DISCOUNT_AMOUNT", type: "FLOAT", desc: "Absolute discount applied" },
      { name: "ITEM_DISCOUNT_PERCENT", type: "FLOAT", desc: "Discount % (e.g. 0.40 = 40%)" },
      { name: "IS_RETURN", type: "BOOLEAN", desc: "TRUE if this line item was returned" },
      { name: "IS_CANCELLATION", type: "BOOLEAN", desc: "TRUE if this line item was cancelled" },
      { name: "PURCHASE_CHANNEL", type: "STRING", desc: "Channel through which the purchase was made — probe values before filtering" },
      { name: "PURCHASE_BRAND", type: "STRING", desc: "Brand banner where the purchase was made — probe values before filtering" },
      { name: "PAYMENT_METHOD", type: "STRING", desc: "MASTERCARD, VISA, DEBIT CARD, etc." },
      { name: "STORE_ID", type: "INTEGER", desc: "Physical store identifier" },
      { name: "STORE_NAME", type: "STRING", desc: "Store location name (e.g. ANAHEIM O5)" },
      { name: "LOYALTY_ID", type: "STRING", desc: "Loyalty ID — null means non-loyalty customer" },
      { name: "CUSTOMER_ID", type: "STRING", desc: "Hashed internal customer ID" },
      { name: "IS_INTERNATIONAL", type: "STRING", desc: "International order flag (STRING, not BOOLEAN)" },
      { name: "PRODUCT_CATEGORY", type: "STRING", desc: "High-level category (MEN'S, WOMENS, etc.)" },
      { name: "PRODUCT_BRAND", type: "STRING", desc: "Brand of the product" },
      { name: "PRODUCT_GENDER", type: "STRING", desc: "Gender target (mens, womens)" },
      { name: "PRODUCT_COLOR", type: "STRING", desc: "Color of the product" },
      { name: "PRODUCT_SIZE", type: "STRING", desc: "Size of the product" },
      { name: "EMP_INDICATOR", type: "BOOLEAN", desc: "TRUE if transaction made by an employee" },
    ],
    notes: [
      "Revenue = ITEM_QUANTITY × ITEM_REVENUE (never use ITEM_REVENUE alone)",
      "LOYALTY_ID IS NULL → non-loyalty; IS NOT NULL → loyalty member",
      "IS_INTERNATIONAL is STRING — probe values before using in WHERE clause",
      "Many columns are null in sample — probe with SELECT DISTINCT before filtering",
    ],
  },
  {
    id: "clickstream",
    name: "clickstream_session_data",
    bqId: "lakshya-agenticai.retail.clickstream_session_data",
    rows: "~3 million rows",
    range: "Jan 2 – Jan 11, 2025",
    color: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-400",
    description: "Web session-level browsing data: cart, checkout, and purchase events per visit.",
    columns: [
      { name: "SESSION_UUID", type: "STRING", desc: "Unique session identifier" },
      { name: "DATE_FILTER", type: "TIMESTAMP", desc: "Session date (truncated to midnight UTC)" },
      { name: "CART_FLAG", type: "INTEGER", desc: "1 if item added to cart, 0 otherwise" },
      { name: "CHECKOUT_FLAG", type: "INTEGER", desc: "1 if checkout reached, 0 otherwise" },
      { name: "ORDER_FLAG", type: "INTEGER", desc: "1 if purchase completed, 0 otherwise" },
      { name: "DEVICE_TYPE", type: "STRING", desc: "computer, mobile, tablet" },
      { name: "OPERATING_SYSTEM", type: "STRING", desc: "windows, iOS, android, etc." },
      { name: "BROWSER_NAME", type: "STRING", desc: "chrome, safari, firefox, etc." },
      { name: "REF_DOMAIN", type: "STRING", desc: "Referring domain (e.g. facebook.com)" },
      { name: "LOGGED_ON", type: "STRING", desc: "anonymous or logged-in" },
      { name: "CUSTOMER_ID", type: "INTEGER", desc: "Internal ID (-1 = anonymous visitor)" },
      { name: "SESSION_ATTRIBUTION_CHANNEL", type: "STRING", desc: "Marketing channel (social, email, paid search)" },
      { name: "SESSION_ATTRIBUTION_CAMPAIGN", type: "STRING", desc: "Campaign credited for session" },
      { name: "VISIT_NUM", type: "INTEGER", desc: "Visit number for this visitor (1 = first visit)" },
      { name: "LANDING_PAGE_URL", type: "STRING", desc: "Entry page URL including UTM params" },
      { name: "IS_IN_APP_FLAG", type: "BOOLEAN", desc: "TRUE if session from mobile app" },
    ],
    notes: [
      "CART_FLAG, CHECKOUT_FLAG, ORDER_FLAG are INTEGER — use SUM() or AVG(), NOT = TRUE",
      "CUSTOMER_ID = -1 means anonymous; filter with CUSTOMER_ID > 0 for identified users",
      "Funnel: cart → checkout → order (each is a subset of the previous)",
    ],
  },
  {
    id: "email",
    name: "email_data",
    bqId: "lakshya-agenticai.retail.email_data",
    rows: "~5 million rows",
    range: "Jan 1 – Feb 27, 2025",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-400",
    description: "Email campaign engagement data: one row per subscriber per send.",
    columns: [
      { name: "SUBSCRIBERKEY", type: "STRING", desc: "Subscriber email address (unique key)" },
      { name: "SENDID", type: "INTEGER", desc: "Unique ID for each email send/blast" },
      { name: "CAMPAIGN", type: "STRING", desc: "Campaign name/code (e.g. CYBERSUNDAYCYR)" },
      { name: "SENT_TIME", type: "TIMESTAMP", desc: "UTC timestamp when email was sent" },
      { name: "SUBJECT", type: "STRING", desc: "Email subject line shown to recipient" },
      { name: "IS_OPEN", type: "BOOLEAN", desc: "TRUE if recipient opened the email" },
      { name: "IS_CLICK", type: "BOOLEAN", desc: "TRUE if recipient clicked a link" },
      { name: "IS_BOUNCE", type: "BOOLEAN", desc: "TRUE if email bounced (hard or soft)" },
      { name: "IS_UNSUB", type: "BOOLEAN", desc: "TRUE if recipient unsubscribed" },
      { name: "OPEN_TIME", type: "TIMESTAMP", desc: "Timestamp of first open" },
      { name: "CLICK_TIME", type: "TIMESTAMP", desc: "Timestamp of click event" },
      { name: "CLICK_URL", type: "STRING", desc: "Full URL of the link clicked" },
      { name: "REF_SEGMENT", type: "STRING", desc: "Audience segment targeted (MCRO, FULLNP, FULL)" },
      { name: "REF_LOYALTY", type: "STRING", desc: "Loyalty tier targeted (NLOY = non-loyalty)" },
      { name: "REF_CATEGORY", type: "STRING", desc: "Category code for the campaign" },
      { name: "FROMNAME", type: "STRING", desc: "Sender display name (e.g. Velora)" },
      { name: "PUB_DATE", type: "INTEGER", desc: "Publication date in MMDDYY format" },
    ],
    notes: [
      "IS_OPEN, IS_CLICK, IS_BOUNCE, IS_UNSUB are BOOLEAN — use COUNTIF() not SUM()",
      "One row per subscriber per send — same subscriber appears across campaigns",
      "Tables cannot be JOINed — query each independently",
    ],
  },
];

export default function SchemaModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState(TABLES[0].id);
  const table = TABLES.find((t) => t.id === activeTab)!;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-[15px] font-semibold text-gray-900">Database Schema</p>
            <p className="text-[12px] text-gray-400 mt-0.5">BigQuery</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 pb-0 shrink-0">
          {TABLES.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                activeTab === t.id
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${t.dot}`} />
              {t.name}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto thin-scroll px-5 py-4">
          {/* Table meta */}
          <div className={`rounded-xl border px-4 py-3 mb-4 ${table.color}`}>
            <p className="text-[11px] font-mono font-semibold mb-1">{table.bqId}</p>
            <p className="text-[12px] leading-relaxed mb-2">{table.description}</p>
            <div className="flex gap-4">
              <span className="text-[11px] font-semibold">{table.rows}</span>
              <span className="text-[11px] opacity-70">{table.range}</span>
            </div>
          </div>

          {/* Columns */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Columns</p>
          <div className="rounded-xl border border-gray-100 overflow-hidden mb-4">
            <table className="w-full text-[12px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 w-44">Column</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 w-24">Type</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Description</th>
                </tr>
              </thead>
              <tbody>
                {table.columns.map((col, i) => (
                  <tr key={col.name} className={`border-t border-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}>
                    <td className="px-3 py-1.5 font-mono text-gray-800 text-[11px] whitespace-nowrap">{col.name}</td>
                    <td className="px-3 py-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">{col.type}</span>
                    </td>
                    <td className="px-3 py-1.5 text-gray-500 leading-snug">{col.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Join note */}
          <div className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[12px] text-red-600">
            <span className="font-semibold">Join limitation:</span> The three tables do not share a common key and should be queried independently. Cross-table JOINs will return 0 rows.
          </div>
        </div>
      </div>
    </div>
  );
}
