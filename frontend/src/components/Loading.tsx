import React from 'react';

export default function Loading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-6">
      <div className="animate-pulse text-slate-500">{message}</div>
    </div>
  );
}
