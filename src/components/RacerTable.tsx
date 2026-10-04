import React from 'react';
import { BoatData, BOAT_COLORS } from '../types/boatrace';

interface RacerTableProps {
  boats: BoatData[];
  p1Probabilities: number[]; // 各艇の1着確率 (0.0〜1.0)
}

export const RacerTable: React.FC<RacerTableProps> = ({
  boats,
  p1Probabilities,
}) => {
  // 1着確率の最大値（バーの相対表示用）
  const maxP1 = Math.max(...p1Probabilities, 0.01);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-lg overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-800">
        <h3 className="text-base font-bold text-white flex items-center justify-between">
          <span>出走表 ＆ 各艇1着予想確率</span>
          <span className="text-xs font-normal text-slate-400">
            全6艇（艇番順）
          </span>
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4 w-20 text-center">
                艇番
              </th>
              <th className="py-3.5 px-4 min-w-[140px]">
                選手名
              </th>
              <th className="py-3.5 px-3 min-w-[70px] text-center">支部</th>
              <th className="py-3.5 px-3 min-w-[70px] text-center">級別</th>
              <th className="py-3.5 px-5 min-w-[180px]">1着確率</th>
              <th className="py-3.5 px-4 min-w-[90px] text-right">全国勝率</th>
              <th className="py-3.5 px-4 min-w-[100px] text-right">全国2連率</th>
              <th className="py-3.5 px-4 min-w-[100px] text-right">全国3連率</th>
              <th className="py-3.5 px-4 min-w-[100px] text-right">当地2連率</th>
              <th className="py-3.5 px-4 min-w-[100px] text-right">当地3連率</th>
              <th className="py-3.5 px-4 min-w-[105px] text-right">モーター2連率</th>
              <th className="py-3.5 px-4 min-w-[105px] text-right">モーター3連率</th>
              <th className="py-3.5 px-4 min-w-[90px] text-right">平均ST</th>
              <th className="py-3.5 px-4 min-w-[95px] text-right">展示タイム</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {boats.map((boat, idx) => {
              const colorInfo = BOAT_COLORS[boat.boatNumber - 1] || BOAT_COLORS[0];
              const p1 = p1Probabilities[idx] ?? 0;
              const p1Percent = (p1 * 100).toFixed(1);
              const barWidthPercent = Math.min(100, Math.max(4, (p1 / maxP1) * 100));

              return (
                <tr
                  key={boat.boatNumber}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  {/* 艇番（公式枠色・非固定） */}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-black shadow-xs ${colorInfo.badgeClass}`}
                    >
                      {boat.boatNumber}
                    </span>
                  </td>

                  {/* 選手名（非固定） */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white text-sm">
                      {boat.name}
                    </div>
                    {boat.racerNumber && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        登番 {boat.racerNumber}
                      </div>
                    )}
                  </td>

                  {/* 支部 */}
                  <td className="py-3.5 px-3 text-center text-slate-300 font-medium">
                    {boat.branch}
                  </td>

                  {/* 級別 */}
                  <td className="py-3.5 px-3 text-center">
                    <span
                      className={`font-bold ${
                        boat.grade === 'A1'
                          ? 'text-amber-400'
                          : boat.grade === 'A2'
                          ? 'text-sky-400'
                          : boat.grade === 'B1'
                          ? 'text-slate-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {boat.grade}
                    </span>
                  </td>

                  {/* 1着確率（%バーと数値） */}
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-28 bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-sky-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${barWidthPercent}%` }}
                        />
                      </div>
                      <span className="font-bold font-mono text-sky-400 min-w-[46px] text-right">
                        {p1Percent}%
                      </span>
                    </div>
                  </td>

                  {/* 全国勝率 */}
                  <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-200">
                    {boat.nationalWinRate.toFixed(2)}
                  </td>

                  {/* 全国2連率（小数第2位まで） */}
                  <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                    {boat.national2Rate.toFixed(2)}%
                  </td>

                  {/* 全国3連率（小数第2位まで） */}
                  <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                    {boat.national3Rate.toFixed(2)}%
                  </td>

                  {/* 当地2連率（小数第2位まで） */}
                  <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                    {boat.local2Rate.toFixed(2)}%
                  </td>

                  {/* 当地3連率（小数第2位まで） */}
                  <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                    {boat.local3Rate.toFixed(2)}%
                  </td>

                  {/* モーター2連率（小数第2位まで） */}
                  <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                    {boat.motor2Rate.toFixed(2)}%
                  </td>

                  {/* モーター3連率（小数第2位まで） */}
                  <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                    {boat.motor3Rate.toFixed(2)}%
                  </td>

                  {/* 平均ST */}
                  <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                    {boat.avgST.toFixed(2)}
                  </td>

                  {/* 展示タイム（単位「秒」は表示しない） */}
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-300">
                    {boat.exTime != null && boat.exTime > 0
                      ? boat.exTime.toFixed(2)
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
