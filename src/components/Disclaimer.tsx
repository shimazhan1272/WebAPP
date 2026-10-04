import React from 'react';
import { AlertCircle } from 'lucide-react';
import { DISCLAIMER_TEXT } from '../utils/constants';

export const Disclaimer: React.FC = () => {
  return (
    <footer className="mt-8 pt-6 pb-10 border-t border-slate-800 text-slate-500 text-xs text-center space-y-2">
      <div className="flex items-start justify-center gap-2 max-w-2xl mx-auto px-4 leading-relaxed">
        <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-slate-400 text-left sm:text-center">
          {DISCLAIMER_TEXT}
        </p>
      </div>
      <div className="text-[11px] text-slate-600">
        ボートレースAI予想 Web App · Plackett-Luce 統計モデル
      </div>
    </footer>
  );
};
