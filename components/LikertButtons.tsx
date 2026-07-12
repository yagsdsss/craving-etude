"use client";

export default function LikertButtons({
  value,
  onChange,
  min = 1,
  max = 7,
}: {
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="flex gap-1.5">
      {values.map((n) => {
        const selected = value === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition ${
              selected
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300"
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
