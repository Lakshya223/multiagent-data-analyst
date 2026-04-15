"use client";

export default function ChartsTab({ chartUrls }: { chartUrls: string[] }) {
  if (chartUrls.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-gray-400">No charts yet.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto thin-scroll p-6">
      <div className="grid grid-cols-1 gap-6">
        {chartUrls.map((url, i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${url}`}
              alt={`Chart ${i + 1}`}
              className="w-full object-contain"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
