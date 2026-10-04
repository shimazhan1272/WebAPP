import React, { useState } from 'react';
import { Sliders, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { SliderState } from '../types/boatrace';
import { CONFIG } from '../utils/constants';
import { getEffectiveCoef } from '../utils/predictor';

interface CoefficientSlidersProps {
  sliders: SliderState;
  onChange: (newSliders: SliderState) => void;
}

export const CoefficientSliders: React.FC<CoefficientSlidersProps> = ({
  sliders,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSliderChange = (key: keyof SliderState, val: number) => {
    onChange({
      ...sliders,
      [key]: Math.round(val * 10) / 10,
    });
  };

  const handleReset = (key: keyof SliderState) => {
    handleSliderChange(key, 0);
  };

  const handleResetAll = () => {
    onChange({
      local2Rate: 0,
      motor2Rate: 0,
      motor3Rate: 0,
      exTime: 0,
    });
  };

  // 各項目の定義
  const items: {
    key: keyof SliderState;
    label: string;
    description: string;
    base: number;
    digits: number;
  }[] = [
    {
      key: 'local2Rate',
      label: '当地2連率 係数 (cL2)',
      description: '選手の当該水面（場）での過去2連率の重視度',
      base: CONFIG.cL2,
      digits: 4,
    },
    {
      key: 'motor2Rate',
      label: 'モーター2連率 係数 (cM2)',
      description: '割り当てられた抽選モーターの2連対率重視度',
      base: CONFIG.cM2,
      digits: 4,
    },
    {
      key: 'motor3Rate',
      label: 'モーター3連対率 係数 (cM3)',
      description: '割り当てられた抽選モーターの3連対率重視度',
      base: CONFIG.cM3,
      digits: 4,
    },
    {
      key: 'exTime',
      label: '展示タイム補正 係数 (cEx)',
      description: '直前展示航走タイムの良し悪しの重視度',
      base: CONFIG.cEx,
      digits: 2,
    },
  ];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-sky-400" />
          <div>
            <h3 className="text-base font-bold text-white">予想モデル係数調整</h3>
            <p className="text-xs text-slate-400">
              当地2連率・モーター2連率・モーター3連対率・展示タイムの影響度をカスタマイズ（即時再計算）
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-xs font-mono hidden sm:inline">
            {isOpen ? '閉じる' : '設定を展開'}
          </span>
          {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 bg-slate-900/90 p-3 rounded-lg border border-slate-800">
            <div>
              <span className="font-semibold text-sky-400">実効係数計算式:</span>{' '}
              <code className="font-mono text-slate-200">基準値 × (1 + スライダー値 / 3)</code>
              <span className="ml-2 text-slate-400">（-3.0で無効化、0.0で基準、+3.0で2倍）</span>
            </div>
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded text-xs transition cursor-pointer self-start sm:self-center"
            >
              <RotateCcw className="w-3 h-3" />
              <span>すべて0に戻す</span>
            </button>
          </div>

          <div className="space-y-5">
            {items.map((item) => {
              const sliderVal = sliders[item.key];
              const effectiveVal = getEffectiveCoef(item.base, sliderVal);
              const sign = sliderVal > 0 ? '+' : '';

              return (
                <div
                  key={item.key}
                  className="rounded-lg bg-slate-900/80 border border-slate-800/90 p-3.5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <span className="text-sm font-bold text-white">
                        {item.label}
                      </span>
                      <span className="block text-xs text-slate-400 mt-0.5">
                        {item.description}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center mt-1 sm:mt-0">
                      <div className="font-mono text-xs bg-slate-950 border border-slate-800 rounded px-2.5 py-1">
                        <span className="text-slate-400">スライダー: </span>
                        <span className={`font-bold ${sliderVal !== 0 ? 'text-sky-400' : 'text-slate-300'}`}>
                          {sign}{sliderVal.toFixed(1)}
                        </span>
                        <span className="text-slate-500 mx-1.5">→</span>
                        <span className="text-slate-400">実効: </span>
                        <span className="font-bold text-emerald-400">
                          {effectiveVal.toFixed(item.digits)}
                        </span>
                      </div>

                      {sliderVal !== 0 && (
                        <button
                          type="button"
                          onClick={() => handleReset(item.key)}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>0に戻す</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500">-3.0</span>
                    <input
                      type="range"
                      min="-3.0"
                      max="3.0"
                      step="0.1"
                      value={sliderVal}
                      onChange={(e) =>
                        handleSliderChange(item.key, parseFloat(e.target.value))
                      }
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                    <span className="text-xs font-mono text-slate-500">+3.0</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
