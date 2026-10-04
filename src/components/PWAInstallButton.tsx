import React, { useState } from 'react';
import { Download, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 transition active:scale-95"
      >
        <Download className="w-3.5 h-3.5" />
        <span>アプリをインストール</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
        >
          <Share className="w-3.5 h-3.5" />
          <span>ホーム画面に追加</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-2xl text-slate-100">
              <h3 className="text-base font-bold text-white">iPhone / iPad での追加方法</h3>
              <div className="mt-3 space-y-2 text-xs text-slate-300 leading-relaxed">
                <p>1. Safari の下部メニューにある「共有」アイコン（四角から矢印）をタップします。</p>
                <p>2. メニューを下にスクロールして「ホーム画面に追加」をタップします。</p>
                <p>3. 右上の「追加」をタップすると、アプリとしてホーム画面から起動できるようになります。</p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-slate-800 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
