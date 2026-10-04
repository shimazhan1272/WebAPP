import React from 'react';
import { Clock, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { RaceInfo, PredictionResult } from '../types/boatrace';

interface ResultHeaderProps {
  race: RaceInfo;
  prediction: PredictionResult;
}

export const ResultHeader: React.FC<ResultHeaderProps> = ({ race, prediction }) => {
  const [now, setNow] = React.useState<number>(() => Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const status = React.useMemo<'finished' | 'imminent' | 'normal'>(() => {
    if (!race.closedAt) return 'normal';
    try {
      const targetTime = new Date(`${race.date}T${race.closedAt}:00+09:00`).getTime();
      const diff = targetTime - now;
      if (diff < 0) return 'finished';
      if (diff <= 10 * 60 * 1000) return 'imminent';
      return 'normal';
    } catch {
      return 'normal';
    }
  }, [race.date, race.closedAt, now]);

  return (
    <div className="space-y-2">
      {/* メインヘッダー */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-sky-400">{race.stadiumName}ボートレース場</span>
              <span aria-hidden="true" className="text-slate-600">/</span>
              <span
                className={
                  status === 'imminent'
                    ? 'text-rose-400 font-bold flex items-center gap-1 animate-pulse'
                    : status === 'finished'
                    ? 'text-slate-500 font-normal'
                    : 'text-sky-400'
                }
              >
                {status === 'imminent' && '🔥 '}第{race.raceNumber}レース
                {status === 'imminent' && ' [締切直前]'}
                {status === 'finished' && ' [終了]'}
              </span>
            </div>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-white">
              {race.title}
            </h2>
          </div>

          {/* 発売締切時刻（存在する場合） */}
          {race.closedAt && (
            <div
              className={`flex items-center gap-2 self-start sm:self-center text-xs font-medium rounded-lg px-3 py-2 transition ${
                status === 'imminent'
                  ? 'bg-rose-950/50 border border-rose-600/80 text-rose-300 ring-1 ring-rose-500/40 animate-pulse'
                  : status === 'finished'
                  ? 'bg-slate-800/50 border border-slate-700/60 text-slate-400'
                  : 'bg-slate-800/80 border border-slate-700/80 text-slate-300'
              }`}
            >
              <Clock
                className={`w-4 h-4 shrink-0 ${
                  status === 'imminent'
                    ? 'text-rose-400'
                    : status === 'finished'
                    ? 'text-slate-500'
                    : 'text-amber-400'
                }`}
              />
              <span>{status === 'finished' ? '締切時刻' : '締切予定時刻'}</span>
              <span
                className={`font-bold text-sm tracking-wide ${
                  status === 'imminent'
                    ? 'text-rose-300'
                    : status === 'finished'
                    ? 'text-slate-400'
                    : 'text-amber-300'
                }`}
              >
                {race.closedAt}
              </span>
              {status === 'imminent' && (
                <span className="text-[10px] font-bold text-rose-400 bg-rose-900/80 px-1 py-0.5 rounded">
                  まもなく
                </span>
              )}
              {status === 'finished' && (
                <span className="text-[10px] text-slate-500 bg-slate-800 px-1 py-0.5 rounded">
                  終了
                </span>
              )}
            </div>
          )}
        </div>

        {/* コース進入情報（前付け・枠なりと異なる場合） */}
        {prediction.isFrontEntry && !prediction.isCourseWarning && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-xs font-medium text-amber-400">
            <ArrowRightLeft className="w-4 h-4 text-amber-400 shrink-0" />
            <span>前付けあり（進入が枠なりと異なる）</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="font-bold tracking-wider text-amber-300">
              進入隊形: {prediction.entryFormationText}
            </span>
          </div>
        )}

        {/* 進入コース異常警告 */}
        {prediction.isCourseWarning && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-start gap-2 text-xs font-medium text-rose-400">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>
              進入コースに重複または欠落があります。枠なり（1-2-3-4-5-6）で計算しています。手動修正で各艇のコースを1〜6に指定してください。
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
