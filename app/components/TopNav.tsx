import { Link } from 'react-router';
import React from 'react';

interface TopNavProps {
  title?: React.ReactNode;
  subtitle?: string;
  rightContent?: React.ReactNode;
}

export function TopNav({ title, subtitle, rightContent }: TopNavProps) {
  return (
    <header className="w-full mb-2 flex flex-col gap-2 shrink-0">
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-neutral-200 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 hover:border-red-700 rounded-md transition-colors"
        >
          <span>←</span> Volver al Dashboard
        </Link>
        {rightContent && <div className="flex items-center gap-2">{rightContent}</div>}
      </div>

      {title && (
        <div className="mt-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-neutral-400 mt-0.5">{subtitle}</p>}
        </div>
      )}
    </header>
  );
}
