'use client';
import { useState } from 'react';

interface CommentLike {
  id: number;
  content: string;
}

export function CommentList({ comments }: { comments: CommentLike[] }) {
  if (comments.length === 0) return null;

  return (
    <ul className="mt-2 space-y-2">
      {comments.map(comment => (
        <li key={comment.id} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-[11px] font-semibold text-amber-700">コメント</p>
          <p className="mt-1 text-sm font-bold leading-relaxed text-amber-950 break-words">
            {comment.content}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function CommentInput({ onSubmit, onCancel }: { onSubmit: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState('');

  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        autoFocus
        value={text}
        onChange={event => setText(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Escape') onCancel();
        }}
        placeholder="メモを追加..."
        className="flex-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium outline-none focus:border-amber-400"
      />
      <button
        onClick={() => {
          if (text.trim()) onSubmit(text);
        }}
        disabled={!text.trim()}
        className="shrink-0 rounded-xl bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-30"
      >
        追加
      </button>
      <button onClick={onCancel} className="shrink-0 px-1 py-2 text-sm text-slate-400 hover:text-slate-600">
        ✕
      </button>
    </div>
  );
}

export function BubbleIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
