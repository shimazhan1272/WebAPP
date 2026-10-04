import React, { useState, useEffect } from 'react';
import { Edit3, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { BoatData, WeatherData, WindDirection, BOAT_COLORS } from '../types/boatrace';

interface ManualAdjustmentCardProps {
  boats: BoatData[];
  courses: number[];
  weather: WeatherData | null;
  onExTimeChange: (boatIdx: number, val: number | null) => void;
  onCourseChange: (boatIdx: number, course: number) => void;
  onWeatherChange: (newWeather: WeatherData) => void;
  onResetToDefaults: () => void;
}

export const ManualAdjustmentCard: React.FC<ManualAdjustmentCardProps> = ({
  boats,
  courses,
  weather,
  onExTimeChange,
  onCourseChange,
  onWeatherChange,
  onResetToDefaults,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // 展示タイム入力文字列のローカル状態（6艇分）
  const [exTimeInputs, setExTimeInputs] = useState<string[]>(() =>
    boats.map((b) => (b.exTime != null ? String(b.exTime) : ''))
  );

  // 気象データ入力文字列のローカル状態（0を消したときに0が残らないよう文字列管理）
  const [windSpeedStr, setWindSpeedStr] = useState<string>(() =>
    weather?.windSpeed != null ? String(weather.windSpeed) : '0'
  );
  const [waveHeightStr, setWaveHeightStr] = useState<string>(() =>
    weather?.waveHeight != null ? String(weather.waveHeight) : '0'
  );

  // 外部からの更新（レース再取得やリセット時）に同期
  useEffect(() => {
    setExTimeInputs(boats.map((b) => (b.exTime != null ? String(b.exTime) : '')));
  }, [boats]);

  useEffect(() => {
    setWindSpeedStr(weather?.windSpeed != null ? String(weather.windSpeed) : '0');
    setWaveHeightStr(weather?.waveHeight != null ? String(weather.waveHeight) : '0');
  }, [weather]);

  const windDir: WindDirection = weather?.windDirection ?? '無風';

  // 展示タイム入力ハンドラー
  // 例:「75」と入力すると即座に「6.75」に変換、「666」と入力すると「6.66」に変換
  const handleExTimeTextChange = (idx: number, rawVal: string) => {
    let val = rawVal.trim();

    // 2桁（例: 75 -> 6.75, 80 -> 6.80, 52 -> 6.52）の自動補完
    // 先頭が4〜9の2桁数字は、ボートレース展示タイム（6.40〜6.99）の小数部分として即時 6.XX に補完
    if (/^[4-9]\d$/.test(val)) {
      const num = parseInt(val, 10);
      val = (6 + num / 100).toFixed(2);
    }
    // 3桁の整数が入力された場合（例: 666 -> 6.66, 675 -> 6.75）
    else if (/^\d{3}$/.test(val)) {
      const num = parseInt(val, 10);
      val = (num / 100).toFixed(2);
    }

    // ローカル入力文字列を更新
    setExTimeInputs((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });

    if (val === '') {
      onExTimeChange(idx, null);
    } else {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed > 0) {
        onExTimeChange(idx, parsed);
      }
    }
  };

  // 展示タイム blur ハンドラー（2桁「68」や3桁が残っていた場合もフォーマット）
  const handleExTimeBlur = (idx: number) => {
    const rawVal = exTimeInputs[idx]?.trim() || '';
    let formatted: string | null = null;

    if (/^\d{2}$/.test(rawVal)) {
      // 2桁の場合（例: 75 -> 6.75, 68 -> 6.68, 05 -> 6.05）
      const num = parseInt(rawVal, 10);
      formatted = (6 + num / 100).toFixed(2);
    } else if (/^\d{3,}$/.test(rawVal)) {
      // 3桁以上の場合（例: 666 -> 6.66）
      const num = parseInt(rawVal, 10);
      formatted = (num / 100).toFixed(2);
    }

    if (formatted) {
      setExTimeInputs((prev) => {
        const next = [...prev];
        next[idx] = formatted!;
        return next;
      });
      onExTimeChange(idx, parseFloat(formatted));
    }
  };

  // 風速入力ハンドラー（0を消せるように処理）
  const handleWindSpeedChange = (raw: string) => {
    setWindSpeedStr(raw);

    const parsed = parseFloat(raw);
    const validSpeed = isNaN(parsed) ? 0 : Math.max(0, parsed);
    onWeatherChange({
      windSpeed: validSpeed,
      windDirection: validSpeed === 0 ? '無風' : windDir,
      waveHeight: parseFloat(waveHeightStr) || 0,
      temperature: weather?.temperature,
      waterTemperature: weather?.waterTemperature,
    });
  };

  // 波高入力ハンドラー（0を消せるように処理）
  const handleWaveHeightChange = (raw: string) => {
    setWaveHeightStr(raw);

    const parsed = parseInt(raw, 10);
    const validHeight = isNaN(parsed) ? 0 : Math.max(0, parsed);
    onWeatherChange({
      windSpeed: parseFloat(windSpeedStr) || 0,
      windDirection: windDir,
      waveHeight: validHeight,
      temperature: weather?.temperature,
      waterTemperature: weather?.waterTemperature,
    });
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <Edit3 className="w-5 h-5 text-sky-400" />
          <div>
            <h3 className="text-base font-bold text-white">
              展示タイム・気象データ・進入コースの手動修正
            </h3>
            <p className="text-xs text-slate-400">
              直前情報が未公開の際や、独自の展示・進入コースを試す場合に手動編集できます（即時再計算）
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-xs font-mono hidden sm:inline">
            {isOpen ? '閉じる' : '手動修正を展開'}
          </span>
          {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              値を変更すると即座にAI予想・買い目が再計算されます。
            </span>
            <button
              type="button"
              onClick={onResetToDefaults}
              className="inline-flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded text-xs transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>取得初期値に戻す</span>
            </button>
          </div>

          {/* 1. 各艇の展示タイム & 進入コース */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                1. 各艇の展示タイム & 進入コース（6艇分）
              </h4>
              <span className="text-[11px] text-amber-400/90 font-mono">
                ※「75」→「6.75」、「666」→「6.66」と自動補完されます
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {boats.map((b, idx) => {
                const color = BOAT_COLORS[b.boatNumber - 1];
                const currentCourse = courses[idx] ?? b.boatNumber;

                return (
                  <div
                    key={b.boatNumber}
                    className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-5 h-5 flex items-center justify-center rounded text-[11px] font-bold ${color.badgeClass}`}
                        >
                          {b.boatNumber}
                        </span>
                        <span className="text-xs font-bold text-white truncate max-w-[90px]">
                          {b.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {b.grade}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* 展示タイム (75 -> 6.75, 666 -> 6.66 自動変換) */}
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">
                          展示タイム
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="例: 75 または 6.75"
                          value={exTimeInputs[idx] ?? ''}
                          onChange={(e) => handleExTimeTextChange(idx, e.target.value)}
                          onBlur={() => handleExTimeBlur(idx)}
                          className="w-full h-9 px-2 text-xs font-mono font-bold text-amber-300 bg-slate-950 border border-slate-700 rounded focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                        />
                      </div>

                      {/* 進入コース */}
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">
                          進入コース
                        </label>
                        <select
                          value={currentCourse}
                          onChange={(e) => onCourseChange(idx, Number(e.target.value))}
                          className="w-full h-9 px-2 text-xs font-mono font-bold text-sky-400 bg-slate-950 border border-slate-700 rounded focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                        >
                          {[1, 2, 3, 4, 5, 6].map((c) => (
                            <option key={c} value={c}>
                              {c} コース
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. 気象データ（風速・風向・波高） */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider">
              2. 気象データの手動修正
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 風速 */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  風速 (m/s)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={windSpeedStr}
                  onChange={(e) => handleWindSpeedChange(e.target.value)}
                  className="w-full h-10 px-3 text-sm font-mono text-white bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              {/* 風向 */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  風向
                </label>
                <select
                  value={windDir}
                  onChange={(e) => {
                    const wd = e.target.value as WindDirection;
                    const ws = parseFloat(windSpeedStr) || 0;
                    onWeatherChange({
                      windSpeed: ws,
                      windDirection: wd,
                      waveHeight: parseFloat(waveHeightStr) || 0,
                      temperature: weather?.temperature,
                      waterTemperature: weather?.waterTemperature,
                    });
                  }}
                  className="w-full h-10 px-3 text-sm font-medium text-white bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                >
                  <option value="追い風">追い風（イン有利〜2コース差し）</option>
                  <option value="向かい風">向かい風（3・4コースまくり有利）</option>
                  <option value="横風">横風</option>
                  <option value="無風">無風</option>
                </select>
              </div>

              {/* 波高 */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  波高 (cm)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={waveHeightStr}
                  onChange={(e) => handleWaveHeightChange(e.target.value)}
                  className="w-full h-10 px-3 text-sm font-mono text-white bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
