'use client';
import React from 'react';

export interface MonthOption {
  key: string;
  label: string;
}

interface Props {
  options: MonthOption[]; // oldest first
  selectedKey: string;
  onSelect: (key: string) => void;
  note?: React.ReactNode;
}

const navButton = 'px-4 py-1.5 rounded-xl bg-white/20 text-sm font-bold';

// Header month picker: previous / next buttons plus a dropdown to jump to any month.
export default function MonthSelector({ options, selectedKey, onSelect, note }: Props) {
  const index = options.findIndex(o => o.key === selectedKey);
  const prev = index > 0 ? options[index - 1] : null;
  const next = index >= 0 && index < options.length - 1 ? options[index + 1] : null;
  const selected = options[index];

  return (
    <div className="flex items-center justify-between pb-4">
      <button
        onClick={() => prev && onSelect(prev.key)}
        disabled={!prev}
        className={`${navButton} active:scale-95 transition-transform disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        ← 前月
      </button>
      <div className="text-center">
        {/* The native select sits invisibly over the label so tapping it opens the month list */}
        <label className="relative inline-flex items-center gap-1 cursor-pointer">
          <span className="text-2xl font-black">{selected?.label}</span>
          <span className="text-sm opacity-70">▾</span>
          <select
            value={selectedKey}
            onChange={e => onSelect(e.target.value)}
            aria-label="月を選択"
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          >
            {[...options].reverse().map(o => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </label>
        {note && <p className="text-xs opacity-60">{note}</p>}
      </div>
      <button
        onClick={() => next && onSelect(next.key)}
        disabled={!next}
        className={`${navButton} active:scale-95 transition-transform disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        翌月 →
      </button>
    </div>
  );
}
