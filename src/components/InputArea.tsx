import React from 'react';
import { Search, Loader2, Calendar, MapPin, Flag } from 'lucide-react';
import { STADIUMS } from '../types/boatrace';
import { RaceScheduleItem } from '../services/boatraceApi';

interface InputAreaProps {
  date: string;
  stadiumCode: number;
  raceNumber: number;
  nTrifecta: number;
  nExacta: number;
  nTrio: number;
  isLoading: boolean;
  activeStadiumCodes?: number[];
  stadiumRaces?: Record<number, RaceScheduleItem[]>;
  raceSchedule?: RaceScheduleItem[];
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
  activeStadiumCodes,
  stadiumRaces,
  raceSchedule,
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

  // 15秒ごとのタイマーで締切状態をリアルタイム判定
  const [now, setNow] = React.useState<number>(() => Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // 開催場のみフィルタ（開催データがある場合は非開催場を非表示）
  const displayStadiums = React.useMemo(() => {
    if (activeStadiumCodes && activeStadiumCodes.length > 0) {
      return STADIUMS.filter((s) => activeStadiumCodes.includes(s.code));
    }
    return STADIUMS;
  }, [activeStadiumCodes]);

  // レース場が終了しているか判定（12Rの締切時刻を過ぎているか）
  const isStadiumFinished = React.useCallback(
    (code: number): boolean => {
      const races = stadiumRaces?.[code];
      if (!races || races.length === 0) return false;
      const lastRace = races[races.length - 1];
      if (lastRace && lastRace.deadlineTimestamp > 0) {
        return now > lastRace.deadlineTimestamp;
      }
      return false;
    },
    [stadiumRaces, now]
  );

  const isCurrentStadiumFinished = isStadiumFinished(stadiumCode);

  // 各レースの状態（finished: 終了 / imminent: 締切10分前 / normal: 通常）
  const getRaceStatus = React.useCallback(
    (r: number): 'finished' | 'imminent' | 'normal' => {
      const sched = raceSchedule?.find((s) => s.raceNumber === r);
      if (!sched || sched.deadlineTimestamp <= 0) return 'normal';
      const diffMs = sched.deadlineTimestamp - now;
      if (diffMs < 0) return 'finished';
      if (diffMs <= 10 * 60 * 1000) return 'imminent';
      return 'normal';
    },
    [raceSchedule, now]
  );

  const currentRaceStatus = getRaceStatus(raceNumber);

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

          {/* レース場（開催場のみ表示、終了した場はグレー文字） */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                <span>レース場</span>
              </label>
              {isCurrentStadiumFinished ? (
                <span className="text-[10px] text-slate-500 font-semibold px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700">
                  全R終了
                </span>
              ) : activeStadiumCodes && activeStadiumCodes.length > 0 ? (
                <span className="text-[10px] text-emerald-400 font-semibold px-1.5 py-0.5 rounded bg-emerald-950/50 border border-emerald-800/50">
                  開催中
                </span>
              ) : null}
            </div>
            <select
              value={stadiumCode}
              onChange={(e) => onStadiumChange(Number(e.target.value))}
              className={`w-full h-11 px-3 rounded-lg bg-slate-800 border text-sm transition focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-transparent ${
                isCurrentStadiumFinished
                  ? 'border-slate-700/80 text-slate-500 font-normal'
                  : 'border-slate-700 text-white font-medium'
              }`}
            >
              {displayStadiums.map((s) => {
                const finished = isStadiumFinished(s.code);
                const codeStr = String(s.code).padStart(2, '0');
                const label = `${codeStr}_${s.name}${finished ? ' [終了]' : ''}`;
                return (
                  <option
                    key={s.code}
                    value={s.code}
                    className={
                      finished
                        ? 'text-slate-500 bg-slate-900 font-normal'
                        : 'text-slate-100 bg-slate-900 font-medium'
                    }
                  >
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* レース番号（1〜12、締切10分前は赤文字、終わったレースはグレー文字） */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Flag
                  className={`w-3.5 h-3.5 ${
                    currentRaceStatus === 'imminent'
                      ? 'text-rose-400 animate-pulse'
                      : currentRaceStatus === 'finished'
                      ? 'text-slate-500'
                      : 'text-sky-400'
                  }`}
                />
                <span>レース番号</span>
              </label>
              {currentRaceStatus === 'imminent' && (
                <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 border border-rose-600/80 px-1.5 py-0.5 rounded animate-pulse">
                  🔥 締切直前（10分前）
                </span>
              )}
              {currentRaceStatus === 'finished' && (
                <span className="text-[10px] text-slate-500 font-normal px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700">
                  終了
                </span>
              )}
            </div>
            <select
              value={raceNumber}
              onChange={(e) => onRaceNumberChange(Number(e.target.value))}
              className={`w-full h-11 px-3 rounded-lg bg-slate-800 border text-sm transition focus:outline-hidden focus:ring-2 ${
                currentRaceStatus === 'imminent'
                  ? 'border-rose-500 text-rose-400 font-bold bg-rose-950/30 focus:ring-rose-500 ring-1 ring-rose-500/40'
                  : currentRaceStatus === 'finished'
                  ? 'border-slate-700/80 text-slate-500 font-normal focus:ring-sky-500'
                  : 'border-slate-700 text-white font-semibold focus:ring-sky-500 focus:border-transparent'
              }`}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((r) => {
                const sched = raceSchedule?.find((s) => s.raceNumber === r);
                const closedAt = sched?.closedAt;
                const status = getRaceStatus(r);

                let label = `${r}R`;
                let optionClass = 'text-slate-100 bg-slate-900';

                if (closedAt) {
                  if (status === 'finished') {
                    label = `${r}R ${closedAt}締切 [終了]`;
                    optionClass = 'text-slate-500 bg-slate-900 font-normal';
                  } else if (status === 'imminent') {
                    label = `🔥 ${r}R ${closedAt}締切 [締切10分前]`;
                    optionClass = 'text-rose-400 bg-slate-900 font-bold';
                  } else {
                    label = `${r}R ${closedAt}締切`;
                    optionClass = 'text-slate-100 bg-slate-900 font-medium';
                  }
                }

                return (
                  <option key={r} value={r} className={optionClass}>
                    {label}
                  </option>
                );
              })}
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
