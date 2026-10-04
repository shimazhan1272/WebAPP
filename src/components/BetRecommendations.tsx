import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { FormationGroup, BetCombination, BOAT_COLORS } from '../types/boatrace';

interface BetRecommendationsProps {
  trifecta: {
    totalPoints: number;
    formations: FormationGroup[];
    allBets: BetCombination[];
  };
  exacta: {
    totalPoints: number;
    formations: FormationGroup[];
    allBets: BetCombination[];
  };
  trio: {
    totalPoints: number;
    formations: FormationGroup[];
    allBets: BetCombination[];
  };
}

export const BetRecommendations: React.FC<BetRecommendationsProps> = ({
  trifecta,
  exacta,
  trio,
}) => {
  // 開閉アコーディオン管理（フォーメーションごとの内訳確認用）
  const [expandedFormations, setExpandedFormations] = useState<Record<string, boolean>>({});

  const toggleFormation = (key: string) => {
    setExpandedFormations((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const totalPoints =
    trifecta.totalPoints + exacta.totalPoints + trio.totalPoints;

  // 全券種が0点の場合
  if (totalPoints === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 text-center text-slate-400 text-sm">
        買い目点数がすべて0点に設定されています。上部の点数指定で1点以上を選択してください。
      </div>
    );
  }

  // 買い目ラベル（例: "1-2-3"）をカラー艇番バッジで描画するヘルパー
  const renderBetBadges = (label: string) => {
    const isTrio = label.includes('=');
    const parts = isTrio ? label.split('=') : label.split('-');

    return (
      <div className="inline-flex items-center gap-1">
        {parts.map((part, pIdx) => {
          // part may be single digit "1" or multiple "3456" in formation
          return (
            <React.Fragment key={pIdx}>
              {pIdx > 0 && (
                <span className="text-slate-500 font-bold px-0.5">
                  {isTrio ? '=' : '-'}
                </span>
              )}
              <div className="inline-flex items-center gap-0.5">
                {part.split('').map((char, cIdx) => {
                  const bNum = Number(char);
                  const color = !isNaN(bNum) && bNum >= 1 && bNum <= 6
                    ? BOAT_COLORS[bNum - 1]
                    : null;

                  if (color) {
                    return (
                      <span
                        key={cIdx}
                        className={`inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-black ${color.badgeClass}`}
                      >
                        {char}
                      </span>
                    );
                  }
                  return (
                    <span key={cIdx} className="font-mono font-bold text-white">
                      {char}
                    </span>
                  );
                })}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 shadow-lg space-y-5">
      {/* セクションヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">AI推奨買い目</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            フォーメーション形式（カンマなし表記）で集約して1列表示しています
          </p>
        </div>

        {/* 合計点数表示 */}
        <div className="text-xs font-semibold text-sky-400 bg-sky-950/80 border border-sky-800/80 rounded-lg px-3 py-1.5 self-start sm:self-center">
          合計点数: <span className="font-mono text-sm font-bold text-sky-300">{totalPoints}点</span>
        </div>
      </div>

      {/* 確率定義の説明文 */}
      <div className="rounded-lg bg-slate-950/80 border border-slate-800/80 p-3 text-xs text-slate-300 leading-relaxed">
        <span className="font-bold text-sky-400">確率(%)について：</span>{' '}
        各買い目がその着順で入る確率（モデル推定値）。フォーメーション行は含まれる買い目の確率の合計です。
      </div>

      {/* 1列表示 (Single Column Display) */}
      <div className="space-y-6">
        {/* 3連単 */}
        {trifecta.totalPoints > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <span>3連単</span>
                <span className="text-xs font-mono text-slate-400">
                  （{trifecta.totalPoints}点）
                </span>
              </h4>
            </div>

            <div className="space-y-2">
              {trifecta.formations.map((f, idx) => {
                const key = `trifecta-${idx}-${f.formation}`;
                const isExpanded = !!expandedFormations[key];
                const probPercent = (f.totalProb * 100).toFixed(1);

                return (
                  <div
                    key={key}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden transition-colors hover:border-slate-700"
                  >
                    <div className="p-3 flex items-center justify-between gap-3">
                      {/* フォーメーション表記 */}
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-white text-base tracking-wider">
                          {renderBetBadges(f.formation)}
                        </span>
                        <span className="text-xs font-mono text-slate-400 bg-slate-800/80 rounded px-2 py-0.5">
                          {f.points}点
                        </span>
                      </div>

                      {/* 確率 ＆ 個別確認トグル */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">合算確率</span>
                          <span className="font-mono font-bold text-sky-400 text-sm">
                            {probPercent}%
                          </span>
                        </div>

                        {f.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => toggleFormation(key)}
                            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                            title="個別の買い目を表示"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 個別の買い目一覧（開いている場合） */}
                    {isExpanded && f.items.length > 1 && (
                      <div className="px-3 pb-3 pt-1 border-t border-slate-800/70 bg-slate-950/90">
                        <div className="text-[11px] text-slate-400 mb-1.5 font-medium">
                          内訳（{f.items.length}点）：
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {f.items.map((subItem) => (
                            <div
                              key={subItem.label}
                              className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800 text-xs"
                            >
                              <span className="font-mono font-bold text-slate-200">
                                {subItem.label}
                              </span>
                              <span className="font-mono text-sky-400 text-[11px]">
                                {(subItem.prob * 100).toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2連単 */}
        {exacta.totalPoints > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <h4 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                <span>2連単</span>
                <span className="text-xs font-mono text-slate-400">
                  （{exacta.totalPoints}点）
                </span>
              </h4>
            </div>

            <div className="space-y-2">
              {exacta.formations.map((f, idx) => {
                const key = `exacta-${idx}-${f.formation}`;
                const isExpanded = !!expandedFormations[key];
                const probPercent = (f.totalProb * 100).toFixed(1);

                return (
                  <div
                    key={key}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden transition-colors hover:border-slate-700"
                  >
                    <div className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-white text-base tracking-wider">
                          {renderBetBadges(f.formation)}
                        </span>
                        <span className="text-xs font-mono text-slate-400 bg-slate-800/80 rounded px-2 py-0.5">
                          {f.points}点
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">合算確率</span>
                          <span className="font-mono font-bold text-sky-400 text-sm">
                            {probPercent}%
                          </span>
                        </div>

                        {f.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => toggleFormation(key)}
                            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                            title="個別の買い目を表示"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && f.items.length > 1 && (
                      <div className="px-3 pb-3 pt-1 border-t border-slate-800/70 bg-slate-950/90">
                        <div className="text-[11px] text-slate-400 mb-1.5 font-medium">
                          内訳（{f.items.length}点）：
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {f.items.map((subItem) => (
                            <div
                              key={subItem.label}
                              className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800 text-xs"
                            >
                              <span className="font-mono font-bold text-slate-200">
                                {subItem.label}
                              </span>
                              <span className="font-mono text-sky-400 text-[11px]">
                                {(subItem.prob * 100).toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3連複 */}
        {trio.totalPoints > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <span>3連複</span>
                <span className="text-xs font-mono text-slate-400">
                  （{trio.totalPoints}点）
                </span>
              </h4>
            </div>

            <div className="space-y-2">
              {trio.formations.map((f, idx) => {
                const key = `trio-${idx}-${f.formation}`;
                const isExpanded = !!expandedFormations[key];
                const probPercent = (f.totalProb * 100).toFixed(1);

                return (
                  <div
                    key={key}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden transition-colors hover:border-slate-700"
                  >
                    <div className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-white text-base tracking-wider">
                          {renderBetBadges(f.formation)}
                        </span>
                        <span className="text-xs font-mono text-slate-400 bg-slate-800/80 rounded px-2 py-0.5">
                          {f.points}点
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">合算確率</span>
                          <span className="font-mono font-bold text-sky-400 text-sm">
                            {probPercent}%
                          </span>
                        </div>

                        {f.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => toggleFormation(key)}
                            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                            title="個別の買い目を表示"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && f.items.length > 1 && (
                      <div className="px-3 pb-3 pt-1 border-t border-slate-800/70 bg-slate-950/90">
                        <div className="text-[11px] text-slate-400 mb-1.5 font-medium">
                          内訳（{f.items.length}点）：
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {f.items.map((subItem) => (
                            <div
                              key={subItem.label}
                              className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800 text-xs"
                            >
                              <span className="font-mono font-bold text-slate-200">
                                {subItem.label}
                              </span>
                              <span className="font-mono text-sky-400 text-[11px]">
                                {(subItem.prob * 100).toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
