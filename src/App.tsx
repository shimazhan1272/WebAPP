/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AlertTriangle, RefreshCw, Anchor } from 'lucide-react';
import {
  RaceInfo,
  SliderState,
  WeatherData,
  BoatData,
} from './types/boatrace';
import { predict } from './utils/predictor';
import { fetchRaceData, getNextRequestId } from './services/boatraceApi';
import { InputArea } from './components/InputArea';
import { ResultHeader } from './components/ResultHeader';
import { RacerTable } from './components/RacerTable';
import { ExhibitionView } from './components/ExhibitionView';
import { WeatherCard } from './components/WeatherCard';
import { BetRecommendations } from './components/BetRecommendations';
import { CoefficientSliders } from './components/CoefficientSliders';
import { ManualAdjustmentCard } from './components/ManualAdjustmentCard';
import { Disclaimer } from './components/Disclaimer';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

const LOCAL_STORAGE_KEYS = {
  DATE: 'boatrace_ai_date',
  STADIUM: 'boatrace_ai_stadium',
  RACE: 'boatrace_ai_race',
  N_TRIFECTA: 'boatrace_ai_n_trifecta',
  N_EXACTA: 'boatrace_ai_n_exacta',
  N_TRIO: 'boatrace_ai_n_trio',
  SLIDERS: 'boatrace_ai_sliders',
};

export default function App() {
  // 今日の日付 (YYYY-MM-DD)
  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // 入力状態の復元 (localStorage)
  const [date, setDate] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_KEYS.DATE) || getTodayStr();
  });
  const [stadiumCode, setStadiumCode] = useState<number>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.STADIUM);
    return saved ? Number(saved) : 1; // 1: 桐生
  });
  const [raceNumber, setRaceNumber] = useState<number>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.RACE);
    return saved ? Number(saved) : 1;
  });

  // 買い目点数 (0〜30)
  const [nTrifecta, setNTrifecta] = useState<number>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.N_TRIFECTA);
    return saved ? Number(saved) : 5;
  });
  const [nExacta, setNExacta] = useState<number>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.N_EXACTA);
    return saved ? Number(saved) : 3;
  });
  const [nTrio, setNTrio] = useState<number>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.N_TRIO);
    return saved ? Number(saved) : 3;
  });

  // 係数スライダー状態
  const [sliders, setSliders] = useState<SliderState>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.SLIDERS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          local2Rate: parsed.local2Rate ?? 0,
          motor2Rate: parsed.motor2Rate ?? 0,
          motor3Rate: parsed.motor3Rate ?? 0,
          exTime: parsed.exTime ?? 0,
        };
      } catch {
        // fall through
      }
    }
    return {
      local2Rate: 0,
      motor2Rate: 0,
      motor3Rate: 0,
      exTime: 0,
    };
  });

  // レースデータ ＆ UI状態
  const [raceData, setRaceData] = useState<RaceInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 手動編集可能な進入コース・展示タイム・気象状態
  const [manualCourses, setManualCourses] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [manualBoats, setManualBoats] = useState<BoatData[]>([]);
  const [manualWeather, setManualWeather] = useState<WeatherData | null>(null);

  // 取得したオリジナルのスナップショット（リセット用）
  const originalDataRef = useRef<{
    courses: number[];
    boats: BoatData[];
    weather: WeatherData | null;
  } | null>(null);

  // 入力変更の保存
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.DATE, date);
  }, [date]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.STADIUM, String(stadiumCode));
  }, [stadiumCode]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.RACE, String(raceNumber));
  }, [raceNumber]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.N_TRIFECTA, String(nTrifecta));
  }, [nTrifecta]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.N_EXACTA, String(nExacta));
  }, [nExacta]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.N_TRIO, String(nTrio));
  }, [nTrio]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SLIDERS, JSON.stringify(sliders));
  }, [sliders]);

  // レースデータ取得ハンドラー
  const handleFetchRace = async () => {
    // 2-3. 「予想する」押下時のリセット（重要バグ対策）
    // 前回の展示情報（展示タイム、スタート展示、気象・風補正、進入コース、手動修正値）をすべてリセット
    setIsLoading(true);
    setErrorMsg(null);
    setRaceData(null);
    setManualBoats([]);
    setManualCourses([1, 2, 3, 4, 5, 6]);
    setManualWeather(null);
    originalDataRef.current = null;

    const requestId = getNextRequestId();

    try {
      const data = await fetchRaceData(date, stadiumCode, raceNumber, requestId);

      setRaceData(data);
      setManualBoats(data.boats);

      // コース初期値: 各艇の進入コース
      const fetchedCourses = data.boats.map((b) => b.course || b.boatNumber);
      setManualCourses(fetchedCourses);
      setManualWeather(data.weather);

      // スナップショット保存
      originalDataRef.current = {
        courses: [...fetchedCourses],
        boats: JSON.parse(JSON.stringify(data.boats)),
        weather: data.weather ? { ...data.weather } : null,
      };
    } catch (err: any) {
      if (err.message !== 'Canceled request') {
        setErrorMsg(
          err.message ||
            '出走表の取得に失敗しました。日付・レース場・レース番号をご確認ください。'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 手動編集用ハンドラー
  const handleExTimeChange = (boatIdx: number, val: number | null) => {
    setManualBoats((prev) => {
      const updated = [...prev];
      if (updated[boatIdx]) {
        updated[boatIdx] = {
          ...updated[boatIdx],
          exTime: val,
        };
      }
      return updated;
    });
  };

  const handleCourseChange = (boatIdx: number, course: number) => {
    setManualCourses((prev) => {
      const updated = [...prev];
      updated[boatIdx] = course;
      return updated;
    });
  };

  const handleWeatherChange = (newWeather: WeatherData) => {
    setManualWeather(newWeather);
  };

  const handleResetToDefaults = () => {
    if (originalDataRef.current) {
      setManualCourses([...originalDataRef.current.courses]);
      setManualBoats(JSON.parse(JSON.stringify(originalDataRef.current.boats)));
      setManualWeather(
        originalDataRef.current.weather
          ? { ...originalDataRef.current.weather }
          : null
      );
    }
  };

  // 予想計算（純関数 predict: 状態変更に応じて即時再計算）
  const prediction = useMemo(() => {
    if (!raceData || manualBoats.length < 6) return null;

    return predict(
      manualBoats,
      manualCourses,
      manualWeather,
      sliders,
      nTrifecta,
      nExacta,
      nTrio
    );
  }, [
    raceData,
    manualBoats,
    manualCourses,
    manualWeather,
    sliders,
    nTrifecta,
    nExacta,
    nTrio,
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* ナビゲーションバー */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-md">
              <Anchor className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>ボートレースAI予想</span>
              </h1>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                全国24場対応 · Plackett-Luce統計モデル
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PWAInstallButton />
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-5 space-y-6">
        {/* 1. 入力エリア */}
        <section aria-label="レース条件指定">
          <InputArea
            date={date}
            stadiumCode={stadiumCode}
            raceNumber={raceNumber}
            nTrifecta={nTrifecta}
            nExacta={nExacta}
            nTrio={nTrio}
            isLoading={isLoading}
            onDateChange={setDate}
            onStadiumChange={setStadiumCode}
            onRaceNumberChange={setRaceNumber}
            onNTrifectaChange={setNTrifecta}
            onNExactaChange={setNExacta}
            onNTrioChange={setNTrio}
            onSubmit={handleFetchRace}
          />
        </section>

        {/* エラー表示 */}
        {errorMsg && (
          <div className="rounded-xl border border-rose-800/60 bg-rose-950/40 p-4 text-xs sm:text-sm text-rose-300 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-rose-200">取得エラー</div>
              <p>{errorMsg}</p>
              <p className="text-xs text-rose-400 pt-1">
                ※ Boatrace Open API で過去のレースを試す場合は「2024-10-01」など実在する開催日をご指定ください。当日のレースは公式データ公開後に順次取得可能となります。
              </p>
            </div>
          </div>
        )}

        {/* 予想結果表示（上から順に厳密に配置） */}
        {raceData && prediction && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* 2. 結果ヘッダー */}
            <section aria-label="レース基本情報">
              <ResultHeader race={raceData} prediction={prediction} />
            </section>

            {/* 3. 各艇の1着確率＆詳細データ（買い目より先に表示！） */}
            <section aria-label="出走表と1着確率">
              <RacerTable
                boats={manualBoats}
                p1Probabilities={prediction.p1}
              />
            </section>

            {/* 4. 展示情報（SVGスリット隊形） */}
            <section aria-label="展示情報スリット隊形">
              <ExhibitionView
                boats={manualBoats}
                courses={prediction.courses}
              />
            </section>

            {/* 5. 気象情報＆風補正カード */}
            <section aria-label="気象と風補正">
              <WeatherCard
                weather={manualWeather}
                appliedWindRules={prediction.appliedWindRules}
              />
            </section>

            {/* 6. AI推奨買い目（1列表示） */}
            <section aria-label="AI推奨買い目">
              <BetRecommendations
                trifecta={prediction.trifecta}
                exacta={prediction.exacta}
                trio={prediction.trio}
              />
            </section>

            {/* 7. 折りたたみ「予想モデル係数調整」 */}
            <section aria-label="予想モデル係数調整">
              <CoefficientSliders
                sliders={sliders}
                onChange={setSliders}
              />
            </section>

            {/* 8. 折りたたみ「展示タイム・気象データ・進入コースの手動修正」 */}
            <section aria-label="手動修正設定">
              <ManualAdjustmentCard
                boats={manualBoats}
                courses={prediction.courses}
                weather={manualWeather}
                onExTimeChange={handleExTimeChange}
                onCourseChange={handleCourseChange}
                onWeatherChange={handleWeatherChange}
                onResetToDefaults={handleResetToDefaults}
              />
            </section>
          </div>
        )}

        {/* レース未取得時の案内 */}
        {!raceData && !isLoading && !errorMsg && (
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800 text-sky-400 mx-auto flex items-center justify-center">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">
              開催日・レース場・レース番号を指定して「予想する」を押してください
            </h3>
            <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
              全24場の出走表および展示情報を自動取得し、統計モデル（Plackett-Luce）で各艇の1着確率・スリット隊形・推奨買い目（フォーメーション）を計算します。
            </p>
          </div>
        )}

        {/* 9. 注意書き（最下部） */}
        <Disclaimer />
      </main>

      {/* オフライン状態インジケーター */}
      <OfflineIndicator />
    </div>
  );
}
