"use client";

const VALUES = Array.from({ length: 11 }, (_, i) => i);

export default function ScaleButtons({
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  value: number | null;
  onChange: (value: number) => void;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <div>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
        {VALUES.map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`flex h-16 items-center justify-center rounded-2xl text-2xl font-semibold transition active:scale-95 ${
                selected
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-900 ring-1 ring-slate-200"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between text-sm text-slate-500">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
