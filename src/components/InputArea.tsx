import React from 'react';
import { Search, Loader2, Calendar, MapPin, Flag } from 'lucide-react';
import { STADIUMS } from '../types/boatrace';

interface InputAreaProps {
  date: string;
  stadiumCode: number;
  raceNumber: number;
  nTrifecta: number;
  nExacta: number;
  nTrio: number;
  isLoading: boolean;
  onDateChange: (date: string) => void;
  onStadiumChange: (code: number) => void;
  onRaceNumberChange: (num: number) => void;
  onNTrifectaChange: (count: number) => void;
  onNExactaChange: (count: number) => void;
  onNTrioChange: (count: number) => void;
  onSubmit: () => void;
}

export const InputArea: React.FC<InputAreaProps> = ({
  date,
  stadiumCode,
  raceNumber,
  nTrifecta,
  nExacta,
  nTrio,
  isLoading,
  onDateChange,
  onStadiumChange,
  onRaceNumberChange,
  onNTrifectaChange,
  onNExactaChange,
  onNTrioChange,
  onSubmit,
}) => {
  // 0〜30 の選択肢リスト
  const betCountOptions = Array.from({ length: 31 }, (_, i) => i);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 shadow-lg">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-4"
      >
        {/* レース指定（年月日・レース場・レース番号） */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 年月日 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>開催日（年月日）</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  try {
                    const parts = new Intl.DateTimeFormat('ja-JP', {
                      timeZone: 'Asia/Tokyo',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    }).format(new Date());
                    onDateChange(parts.replace(/\//g, '-'));
                  } catch {
                    // fallback
                  }
                }}
                className="text-[11px] font-bold text-sky-400 hover:text-sky-300 transition cursor-pointer px-1.5 py-0.5 rounded bg-sky-950/60 border border-sky-800/60"
              >
                今日
              </button>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
              required
            />
          </div>

          {/* レース場（全24場） */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>レース場（全24場）</span>
            </label>
            <select
              value={stadiumCode}
              onChange={(e) => onStadiumChange(Number(e.target.value))}
              className="w-full h-11 px-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
            >
              {STADIUMS.map((s) => (
                <option key={s.code} value={s.code}>
                  {String(s.code).padStart(2, '0')} {s.name} ({s.location})
                </option>
              ))}
            </select>
          </div>

          {/* レース番号（1〜12） */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-1.5">
              <Flag className="w-3.5 h-3.5 text-sky-400" />
              <span>レース番号</span>
            </label>
            <select
              value={raceNumber}
              onChange={(e) => onRaceNumberChange(Number(e.target.value))}
              className="w-full h-11 px-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((r) => (
                <option key={r} value={r}>
                  第{r}レース ({r}R)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 買い目点数（3連単・2連単・3連複: 0〜30） */}
        <div className="pt-2 border-t border-slate-800">
          <div className="text-xs font-semibold text-slate-400 mb-2">
            買い目点数の指定（0〜30点・変更時は即時再計算）
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            {/* 3連単 */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                3連単点数
              </label>
              <select
                value={nTrifecta}
                onChange={(e) => onNTrifectaChange(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-lg bg-slate-800 border border-slate-700 text-sky-400 font-bold text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 transition"
              >
                {betCountOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}点
                  </option>
                ))}
              </select>
            </div>

            {/* 2連単 */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                2連単点数
              </label>
              <select
                value={nExacta}
                onChange={(e) => onNExactaChange(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-lg bg-slate-800 border border-slate-700 text-sky-400 font-bold text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 transition"
              >
                {betCountOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}点
                  </option>
                ))}
              </select>
            </div>

            {/* 3連複 */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                3連複点数
              </label>
              <select
                value={nTrio}
                onChange={(e) => onNTrioChange(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-lg bg-slate-800 border border-slate-700 text-sky-400 font-bold text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 transition"
              >
                {betCountOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}点
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 予想する ボタン */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-sky-500 to-blue-600 px-6 text-base font-bold text-white shadow-md hover:from-sky-500 hover:to-blue-500 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>データ取得・解析中...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>予想する</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
