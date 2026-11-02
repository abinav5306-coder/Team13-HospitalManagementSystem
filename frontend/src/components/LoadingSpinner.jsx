import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ text = 'Loading data...', fullScreen = false }) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs flex flex-col items-center justify-center z-50">
        <div className="p-6 bg-white rounded-2xl shadow-xl flex flex-col items-center gap-3 border border-slate-100">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-700 font-['Plus_Jakarta_Sans']">{text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
      <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
      <span className="text-xs font-medium tracking-wide">{text}</span>
    </div>
  );
}
