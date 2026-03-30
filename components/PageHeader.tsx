'use client';
import React from 'react';

interface Props {
  isAlert?: boolean;
  noPadBottom?: boolean;
  children: React.ReactNode;
}

export default function PageHeader({ isAlert = false, noPadBottom = false, children }: Props) {
  return (
    <header
      className={`sticky top-0 z-30 transition-colors duration-300 ${
        isAlert ? 'bg-red-600' : 'bg-slate-900'
      } text-white px-4 pt-5 ${noPadBottom ? '' : 'pb-4'} shadow-lg`}
    >
      <div className="max-w-xl mx-auto">{children}</div>
    </header>
  );
}
