import React from 'react';
import { BoatData, BOAT_COLORS } from '../types/boatrace';

interface ExhibitionViewProps {
  boats: BoatData[];
  courses: number[];
}

export const ExhibitionView: React.FC<ExhibitionViewProps> = ({ boats, courses }) => {
  // 各コースに入った艇の情報を整理（コース 1〜6）
  const courseItems = [1, 2, 3, 4, 5, 6].map((courseNum) => {
    const boatIdx = courses.findIndex((c) => c === courseNum);
    const boat = boatIdx !== -1 ? boats[boatIdx] : boats[courseNum - 1];
    return {
      course: courseNum,
      boat,
      color: BOAT_COLORS[(boat?.boatNumber ?? courseNum) - 1],
      st: boat?.startTiming ?? null,
      exTime: boat?.exTime ?? null,
    };
  });

  // SVGの横幅・スリット基準位置
  const svgWidth = 540;
  const svgHeight = 240;
  const slitX = 440; // スリットラインのX座標

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-bold text-white">
            展示情報 ＆ スタート展示スリット隊形
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            スタート展示の進入コース・展示タイム・隊形・STの全体図
          </p>
        </div>
      </div>

      {/* スリット隊形 SVG（横スクロールなし・全画面レスポンシブ） */}
      <div className="w-full bg-slate-950 rounded-xl p-2 sm:p-3 border border-slate-800">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none block"
          style={{ maxHeight: '320px' }}
        >
          {/* 水面背景グラデーション */}
          <defs>
            <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#082f49" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#0369a1" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          {/* 水面領域（コース・展示タイム列を除く右側水面） */}
          <rect
            x="80"
            y="22"
            width={svgWidth - 90}
            height={svgHeight - 28}
            fill="url(#waterGrad)"
            rx="6"
          />

          {/* ヘッダーラベル: 進入コース・展示タイム */}
          <text
            x="20"
            y="14"
            fill="#94a3b8"
            fontSize="9"
            fontWeight="bold"
            textAnchor="middle"
          >
            コース
          </text>
          <text
            x="54"
            y="14"
            fill="#fde047"
            fontSize="9"
            fontWeight="bold"
            textAnchor="middle"
          >
            展示T
          </text>

          {/* ヘッダー区切り線 */}
          <line
            x1="76"
            y1="6"
            x2="76"
            y2={svgHeight - 8}
            stroke="#1e293b"
            strokeWidth="1"
          />

          {/* コースレーン破線 */}
          {[1, 2, 3, 4, 5].map((lane) => (
            <line
              key={lane}
              x1="80"
              y1={lane * 35 + 24}
              x2={svgWidth - 12}
              y2={lane * 35 + 24}
              stroke="#1e293b"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}

          {/* スリットライン（スタートライン） */}
          <line
            x1={slitX}
            y1="22"
            x2={slitX}
            y2={svgHeight - 8}
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="5 3"
          />

          {/* スリットライン ラベル */}
          <text
            x={slitX}
            y="14"
            fill="#ef4444"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
            className="font-mono tracking-wider"
          >
            SLIT
          </text>

          {/* 進行方向インジケーター矢印 */}
          <path
            d={`M ${slitX - 55} 12 L ${slitX - 18} 12 L ${slitX - 23} 9 M ${slitX - 18} 12 L ${slitX - 23} 15`}
            stroke="#38bdf8"
            strokeWidth="1.2"
            fill="none"
            opacity="0.85"
          />
          <text
            x={slitX - 60}
            y="14"
            fill="#38bdf8"
            fontSize="8"
            textAnchor="end"
            opacity="0.85"
          >
            進行方向
          </text>

          {/* 6コース分のボート・進入コース・展示タイム・STプロット */}
          {courseItems.map((item, idx) => {
            const rowY = 42 + idx * 35;
            const boatNum = item.boat?.boatNumber ?? item.course;
            const color = item.color;
            const st = item.st;

            // ST に応じた X 座標計算
            // 基準: st === 0.00 -> slitX
            // st > 0 (通常) -> slitX より手前（左）。
            // st < 0 (フライング F) -> slitX より先（右）。
            let boatX = slitX - 110;
            let isFlying = false;
            let stLabel = '—';

            if (st != null) {
              if (st < 0) {
                isFlying = true;
                stLabel = `F.${Math.abs(st * 100).toFixed(0).padStart(2, '0')}`;
                boatX = slitX + Math.min(45, Math.abs(st) * 350);
              } else {
                stLabel = `.${(st * 100).toFixed(0).padStart(2, '0')}`;
                boatX = slitX - Math.min(230, Math.max(25, st * 550));
              }
            } else {
              boatX = slitX - (100 + idx * 8);
            }

            return (
              <g key={item.course}>
                {/* 1. 進入コース番号 (左端) */}
                <text
                  x="20"
                  y={rowY + 4}
                  fill="#94a3b8"
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {item.course}C
                </text>

                {/* 2. 展示タイム（進入コースの右隣に表示！） */}
                <text
                  x="54"
                  y={rowY + 4}
                  fill="#fde047"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {item.exTime != null ? item.exTime.toFixed(2) : '—'}
                </text>

                {/* 航跡波（スタート手前） */}
                <line
                  x1="86"
                  y1={rowY}
                  x2={boatX - 18}
                  y2={rowY}
                  stroke="#0284c7"
                  strokeWidth="1.2"
                  strokeDasharray="2 4"
                  opacity="0.4"
                />

                {/* ボート船体シルエット */}
                <path
                  d={`M ${boatX + 14} ${rowY} L ${boatX - 14} ${rowY - 7} L ${boatX - 18} ${rowY + 7} Z`}
                  fill={color.hex}
                  stroke={color.textHex === '#0f172a' ? '#475569' : '#000000'}
                  strokeWidth="0.8"
                  filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.5))"
                />

                {/* 艇番サークル */}
                <circle
                  cx={boatX - 2}
                  cy={rowY}
                  r="9.5"
                  fill={color.hex}
                  stroke={color.textHex === '#0f172a' ? '#64748b' : '#334155'}
                  strokeWidth="1.2"
                />
                <text
                  x={boatX - 2}
                  y={rowY + 3.5}
                  fill={color.textHex}
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {boatNum}
                </text>

                {/* ST ラベル */}
                <rect
                  x={boatX + 18}
                  y={rowY - 8}
                  width="38"
                  height="16"
                  rx="3.5"
                  fill={isFlying ? '#991b1b' : '#1e293b'}
                  stroke={isFlying ? '#ef4444' : '#334155'}
                  strokeWidth="0.8"
                />
                <text
                  x={boatX + 37}
                  y={rowY + 3.5}
                  fill={isFlying ? '#fecaca' : '#38bdf8'}
                  fontSize="9.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {stLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 各艇の展示タイム サマリー行（艇番順） */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-6 gap-2">
        {boats.map((b) => {
          const color = BOAT_COLORS[b.boatNumber - 1];
          return (
            <div
              key={b.boatNumber}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-5 h-5 flex items-center justify-center rounded text-[11px] font-bold ${color.badgeClass}`}
                >
                  {b.boatNumber}
                </span>
                <span className="text-xs text-slate-300 truncate max-w-[60px]">
                  {b.name.split(' ')[0]}
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-amber-300">
                {b.exTime != null ? b.exTime.toFixed(2) : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
