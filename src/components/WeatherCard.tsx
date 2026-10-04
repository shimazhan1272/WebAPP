import React from 'react';
import { Wind, Waves, Thermometer, Compass } from 'lucide-react';
import { WeatherData } from '../types/boatrace';

interface WeatherCardProps {
  weather: WeatherData | null;
  appliedWindRules: string[];
}

export const WeatherCard: React.FC<WeatherCardProps> = ({
  weather,
  appliedWindRules,
}) => {
  const windSpeed = weather?.windSpeed ?? 0;
  const windDir = weather?.windDirection ?? '無風';
  const waveHeight = weather?.waveHeight ?? 0;
  const temp = weather?.temperature;
  const waterTemp = weather?.waterTemperature;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Wind className="w-4 h-4 text-sky-400" />
          <span>気象情報 ＆ 水面コンディション</span>
        </h3>
      </div>

      {/* 気象数値グリッド */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 風速 */}
        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center gap-3">
          <Wind className="w-5 h-5 text-sky-400 shrink-0" />
          <div>
            <div className="text-[11px] text-slate-400">風速</div>
            <div className="text-base font-bold font-mono text-white">
              {windSpeed} <span className="text-xs text-slate-400">m/s</span>
            </div>
          </div>
        </div>

        {/* 風向 */}
        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center gap-3">
          <Compass className="w-5 h-5 text-sky-400 shrink-0" />
          <div>
            <div className="text-[11px] text-slate-400">風向</div>
            <div className="text-base font-bold text-white">
              {windDir}
            </div>
          </div>
        </div>

        {/* 波高 */}
        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center gap-3">
          <Waves className="w-5 h-5 text-sky-400 shrink-0" />
          <div>
            <div className="text-[11px] text-slate-400">波高</div>
            <div className="text-base font-bold font-mono text-white">
              {waveHeight} <span className="text-xs text-slate-400">cm</span>
            </div>
          </div>
        </div>

        {/* 気温 / 水温 */}
        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center gap-3">
          <Thermometer className="w-5 h-5 text-sky-400 shrink-0" />
          <div>
            <div className="text-[11px] text-slate-400">気温 / 水温</div>
            <div className="text-xs font-bold font-mono text-white mt-0.5">
              {temp != null ? `${temp}℃` : '—'} / {waterTemp != null ? `${waterTemp}℃` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* 適用された風補正ルール表示 */}
      <div className="pt-3 border-t border-slate-800">
        <div className="text-xs font-semibold text-slate-400 mb-1.5">
          モデル適用風補正
        </div>
        <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs font-mono">
          {appliedWindRules.length > 0 ? (
            <ul className="space-y-1">
              {appliedWindRules.map((rule, idx) => (
                <li
                  key={idx}
                  className={rule.includes('なし') ? 'text-slate-400' : 'text-sky-300 font-semibold'}
                >
                  {rule}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-slate-400">風補正なし</span>
          )}
        </div>
      </div>
    </div>
  );
};
