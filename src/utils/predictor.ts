/**
 * Boat Race Statistical Prediction Model (Plackett-Luce)
 */

import {
  BoatData,
  WeatherData,
  SliderState,
  PredictionResult,
  BetCombination,
  FormationGroup,
  WindDirection,
} from '../types/boatrace';
import { CONFIG } from './constants';

/**
 * 実効係数の計算
 * 実効係数 = 基準値 × (1 + スライダー値/3)
 */
export function getEffectiveCoef(base: number, sliderValue: number): number {
  return base * (1 + sliderValue / 3);
}

/**
 * 風補正の計算
 * 「コース」を添字とする6要素の配列（0-indexed: コース1〜6）を返す
 */
export function calcWindAdj(
  windSpeed: number | null | undefined,
  windDir: WindDirection | null | undefined,
  rules = CONFIG.WIND_RULES
): { adj: number[]; descriptions: string[] } {
  const adj = [0, 0, 0, 0, 0, 0];
  const applied: string[] = [];

  if (windSpeed == null || windSpeed <= 0 || !windDir || windDir === '無風') {
    return { adj, descriptions: ['風補正なし'] };
  }

  const { strong, tailwind, mid, excessGain, excessCap } = rules;
  const isTailwind = windDir === '追い風';

  // 1. 強風ルール (>= strong.threshold)
  if (windSpeed >= strong.threshold) {
    const m = Math.min(excessCap, 1 + excessGain * (windSpeed - strong.threshold));
    let val = strong.lane1 * m;
    if (isTailwind) {
      val *= tailwind.lane1Scale;
    }
    adj[0] += val;
  }

  // 2. 追い風ルール (追い風 かつ >= tailwind.threshold)
  if (isTailwind && windSpeed >= tailwind.threshold) {
    const m = Math.min(excessCap, 1 + excessGain * (windSpeed - tailwind.threshold));
    const val = tailwind.lane2 * m;
    adj[1] += val;
  }

  // 3. 中風ルール (>= mid.threshold)
  if (windSpeed >= mid.threshold) {
    const m = Math.min(excessCap, 1 + excessGain * (windSpeed - mid.threshold));
    adj[2] += mid.lane3 * m;
    adj[3] += mid.lane4 * m;
  }

  // ルール適用内容の文字列生成
  const courseParts: string[] = [];
  adj.forEach((val, idx) => {
    if (Math.abs(val) > 0.001) {
      const sign = val > 0 ? '+' : '';
      courseParts.push(`${idx + 1}コース${sign}${val.toFixed(2)}`);
    }
  });

  if (courseParts.length > 0) {
    applied.push(`風速${windSpeed}m/${windDir}: ${courseParts.join('、')}`);
  } else {
    applied.push('風補正なし');
  }

  return { adj, descriptions: applied };
}

/**
 * 3連単の買い目をフォーメーション形式に圧縮（カンマなし表記: 1-2-3456, 12-12-3456 など）
 */
function compressTrifectaFormations(bets: BetCombination[]): FormationGroup[] {
  if (bets.length === 0) return [];

  // 1-2着のペアでグルーピング
  const pairMap = new Map<string, BetCombination[]>();
  bets.forEach((b) => {
    const key = `${b.combination[0]}-${b.combination[1]}`;
    if (!pairMap.has(key)) pairMap.set(key, []);
    pairMap.get(key)!.push(b);
  });

  // 各ペアの3着艇リストを作成
  interface PairInfo {
    first: number;
    second: number;
    thirds: number[];
    bets: BetCombination[];
    used: boolean;
  }

  const pairs: PairInfo[] = [];
  pairMap.forEach((pBets, key) => {
    const [f, s] = key.split('-').map(Number);
    const thirds = pBets.map((b) => b.combination[2]).sort((a, b) => a - b);
    pairs.push({
      first: f,
      second: s,
      thirds,
      bets: pBets,
      used: false,
    });
  });

  const formations: FormationGroup[] = [];

  // パターンA: 2艇の表裏ボックスフォーメーション (例: 1-2-345 と 2-1-345 が同等の3着群を持つ場合 -> 12-12-345)
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i].used) continue;
    const p1 = pairs[i];

    // 表裏となるペアを探す
    const revIndex = pairs.findIndex(
      (p, j) =>
        j > i &&
        !p.used &&
        p.first === p1.second &&
        p.second === p1.first &&
        p.thirds.length === p1.thirds.length &&
        p.thirds.every((t, idx) => t === p1.thirds[idx])
    );

    if (revIndex !== -1) {
      const p2 = pairs[revIndex];
      p1.used = true;
      p2.used = true;
      const combinedBets = [...p1.bets, ...p2.bets];
      const headStr = `${Math.min(p1.first, p2.first)}${Math.max(p1.first, p2.first)}`;
      const thirdsStr = p1.thirds.join('');
      formations.push({
        formation: `${headStr}-${headStr}-${thirdsStr}`,
        points: combinedBets.length,
        totalProb: combinedBets.reduce((sum, b) => sum + b.prob, 0),
        items: combinedBets,
      });
    }
  }

  // パターンB: 通常の流しフォーメーション (1-2-3456)
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i].used) continue;
    const p = pairs[i];
    p.used = true;
    const thirdsStr = p.thirds.join('');
    const formStr = `${p.first}-${p.second}-${thirdsStr}`;
    formations.push({
      formation: formStr,
      points: p.bets.length,
      totalProb: p.bets.reduce((sum, b) => sum + b.prob, 0),
      items: p.bets,
    });
  }

  // 確率降順でソート
  formations.sort((a, b) => b.totalProb - a.totalProb);
  return formations;
}

/**
 * 2連単の買い目をフォーメーション形式に圧縮（例: 1-234, 12-12）
 */
function compressExactaFormations(bets: BetCombination[]): FormationGroup[] {
  if (bets.length === 0) return [];

  // 1着でグループ化
  const firstMap = new Map<number, BetCombination[]>();
  bets.forEach((b) => {
    const f = b.combination[0];
    if (!firstMap.has(f)) firstMap.set(f, []);
    firstMap.get(f)!.push(b);
  });

  const formations: FormationGroup[] = [];

  // 1-2 と 2-1 があり、他がなければ 12-12 表裏にまとめる
  const betKeys = new Set(bets.map((b) => `${b.combination[0]}-${b.combination[1]}`));
  const handledPairs = new Set<string>();

  firstMap.forEach((fBets, first) => {
    fBets.forEach((b) => {
      const second = b.combination[1];
      const pairKey = [first, second].sort().join('-');
      if (!handledPairs.has(pairKey) && betKeys.has(`${second}-${first}`)) {
        // 2艇の表裏
        const b1 = b;
        const b2 = bets.find(
          (x) => x.combination[0] === second && x.combination[1] === first
        )!;
        const headStr = `${Math.min(first, second)}${Math.max(first, second)}`;
        formations.push({
          formation: `${headStr}-${headStr}`,
          points: 2,
          totalProb: b1.prob + b2.prob,
          items: [b1, b2],
        });
        handledPairs.add(pairKey);
      }
    });
  });

  // 未処理のベットを1着固定フォーメーションにする
  const coveredBets = new Set<string>(
    formations.flatMap((f) => f.items.map((b) => `${b.combination[0]}-${b.combination[1]}`))
  );

  firstMap.forEach((fBets, first) => {
    const remaining = fBets.filter(
      (b) => !coveredBets.has(`${b.combination[0]}-${b.combination[1]}`)
    );
    if (remaining.length > 0) {
      const secondsStr = remaining
        .map((b) => b.combination[1])
        .sort((a, b) => a - b)
        .join('');
      formations.push({
        formation: `${first}-${secondsStr}`,
        points: remaining.length,
        totalProb: remaining.reduce((sum, b) => sum + b.prob, 0),
        items: remaining,
      });
    }
  });

  formations.sort((a, b) => b.totalProb - a.totalProb);
  return formations;
}

/**
 * 3連複のフォーメーション
 */
function compressTrioFormations(bets: BetCombination[]): FormationGroup[] {
  if (bets.length === 0) return [];

  // 2艇固定の軸流しがあればまとめる (例: 1=2=345)
  const pairMap = new Map<string, BetCombination[]>();
  bets.forEach((b) => {
    const sorted = [...b.combination].sort((x, y) => x - y);
    const key = `${sorted[0]}=${sorted[1]}`;
    if (!pairMap.has(key)) pairMap.set(key, []);
    pairMap.get(key)!.push(b);
  });

  const formations: FormationGroup[] = [];
  const handled = new Set<string>();

  pairMap.forEach((pBets, key) => {
    if (pBets.length >= 2) {
      const thirds = pBets
        .map((b) => {
          const sorted = [...b.combination].sort((x, y) => x - y);
          return sorted[2];
        })
        .sort((x, y) => x - y);
      formations.push({
        formation: `${key}=${thirds.join('')}`,
        points: pBets.length,
        totalProb: pBets.reduce((sum, b) => sum + b.prob, 0),
        items: pBets,
      });
      pBets.forEach((b) => handled.add(b.label));
    }
  });

  // 残り
  bets.forEach((b) => {
    if (!handled.has(b.label)) {
      formations.push({
        formation: b.label,
        points: 1,
        totalProb: b.prob,
        items: [b],
      });
    }
  });

  formations.sort((a, b) => b.totalProb - a.totalProb);
  return formations;
}

/**
 * メイン予測関数
 * @param boats 6艇分の出走データ（艇番順）
 * @param courses 各艇の進入コース配列（長さ6）
 * @param weather 気象データ（風速・風向・波高など）
 * @param coefSliders 係数スライダー状態
 * @param nTrifecta 3連単買い目点数（0〜30）
 * @param nExacta 2連単買い目点数（0〜30）
 * @param nTrio 3連複買い目点数（0〜30）
 */
export function predict(
  boats: BoatData[],
  courses: number[],
  weather: WeatherData | null,
  coefSliders: SliderState,
  nTrifecta: number,
  nExacta: number,
  nTrio: number
): PredictionResult {
  // 進入コースの検証
  let effectiveCourses = [...courses];
  let isCourseWarning = false;

  // 1〜6が重複なく揃っているか確認
  const sortedCourses = [...effectiveCourses].sort((a, b) => a - b);
  const isValidCourses =
    effectiveCourses.length === 6 &&
    sortedCourses.every((c, idx) => c === idx + 1);

  if (!isValidCourses) {
    isCourseWarning = true;
    effectiveCourses = [1, 2, 3, 4, 5, 6];
  }

  // 枠なり進入かどうか (1-2-3-4-5-6)
  const isFrontEntry = effectiveCourses.some((c, idx) => c !== idx + 1);

  // コース順に並び替えた隊形テキスト（例: 4-1-2-3-5-6）
  const courseOrder: { boat: number; course: number }[] = [];
  boats.forEach((b, idx) => {
    courseOrder.push({ boat: b.boatNumber, course: effectiveCourses[idx] });
  });
  courseOrder.sort((a, b) => a.course - b.course);
  const entryFormationText = courseOrder.map((item) => item.boat).join('-');

  // 実効係数の計算
  const effectiveL2 = getEffectiveCoef(CONFIG.cL2, coefSliders.local2Rate);
  const effectiveM2 = getEffectiveCoef(CONFIG.cM2, coefSliders.motor2Rate);
  const effectiveM3 = getEffectiveCoef(CONFIG.cM3, coefSliders.motor3Rate);
  const effectiveEx = getEffectiveCoef(CONFIG.cEx, coefSliders.exTime);

  // 全艇の展示タイムが揃っているか確認
  const validExTimes = boats
    .map((b) => b.exTime)
    .filter((t): t is number => typeof t === 'number' && t > 0);
  const hasAllExTimes = validExTimes.length === 6;
  const avgExTime = hasAllExTimes
    ? validExTimes.reduce((acc, v) => acc + v, 0) / 6
    : 0;

  // 風補正の計算
  const windRes = calcWindAdj(
    weather?.windSpeed,
    weather?.windDirection,
    CONFIG.WIND_RULES
  );
  const windAdj = windRes.adj;

  // 各艇のスコア計算
  const scores: number[] = [];
  for (let i = 0; i < boats.length; i++) {
    const boat = boats[i];
    const course = effectiveCourses[i];
    const courseIdx = course - 1; // 0-indexed

    // 1. コース事前確率
    const prior = Math.log(CONFIG.PRIOR_COURSE[courseIdx]);
    const priorTerm = CONFIG.cPrior * prior;

    // 2. 全国勝率・2連率
    const winTerm = CONFIG.cWin * (boat.nationalWinRate - 5.5);
    const n2Term = CONFIG.cN2 * (boat.national2Rate - 35.0);

    // 3. 当地2連率（実効係数）
    const l2Term = effectiveL2 * (boat.local2Rate - 35.0);

    // 4. モーター2連率・3連率（実効係数）
    const m2Term = effectiveM2 * (boat.motor2Rate - 35.0);
    const m3Term = effectiveM3 * (boat.motor3Rate - 50.0);

    // 5. 平均ST補正（コース別倍率）
    const stMult = CONFIG.COURSE_MULT.st[courseIdx] ?? 1.0;
    const stTerm = -CONFIG.cSt * stMult * (boat.avgST - 0.16);

    // 6. 級別補正
    const gradeAdj = CONFIG.GRADE_ADJ[boat.grade] ?? 0;
    const gradeTerm = CONFIG.cGrade * gradeAdj;

    // 7. 展示タイム補正（全艇揃っている場合のみ、コース別倍率）
    let exTerm = 0;
    if (hasAllExTimes && boat.exTime != null) {
      const exMult = CONFIG.COURSE_MULT.ex[courseIdx] ?? 1.0;
      exTerm = -effectiveEx * exMult * (boat.exTime - avgExTime);
    }

    // 8. 風補正（進入コース依存）
    const windTerm = windAdj[courseIdx];

    // 9. 前付けペナルティ（艇番より内側に進入した艇）
    const frontDistance = Math.max(0, boat.boatNumber - course);
    const penaltyTerm = CONFIG.FRONT_ENTRY_PENALTY * frontDistance;

    const totalScore =
      priorTerm +
      winTerm +
      n2Term +
      l2Term +
      m2Term +
      m3Term +
      stTerm +
      gradeTerm +
      exTerm +
      windTerm +
      penaltyTerm;

    scores.push(totalScore);
  }

  // ソフトマックス計算（オーバーフロー対策: score - maxScore）
  const maxScore = Math.max(...scores);
  const strengths = scores.map((s) => Math.exp(s - maxScore));
  const sumStrength = strengths.reduce((a, b) => a + b, 0);
  const p1 = strengths.map((s) => s / sumStrength);

  // Plackett-Luce モデルによる順列確率計算
  // 3連単 (全120通り)
  const trifectaAll: BetCombination[] = [];
  const boatNums = boats.map((b) => b.boatNumber);

  for (let i = 0; i < 6; i++) {
    const a = boatNums[i];
    const pa = p1[i];
    for (let j = 0; j < 6; j++) {
      if (j === i) continue;
      const b = boatNums[j];
      const pb = p1[j];
      const pSecond = pb / (1 - pa);

      for (let k = 0; k < 6; k++) {
        if (k === i || k === j) continue;
        const c = boatNums[k];
        const pc = p1[k];
        const denomThird = Math.max(0.0001, 1 - pa - pb);
        const pThird = pc / denomThird;

        const prob = pa * pSecond * pThird;
        trifectaAll.push({
          combination: [a, b, c],
          label: `${a}-${b}-${c}`,
          prob,
        });
      }
    }
  }

  // 確率降順ソート
  trifectaAll.sort((x, y) => y.prob - x.prob);
  const topTrifecta = trifectaAll.slice(0, Math.max(0, Math.min(30, nTrifecta)));
  const trifectaFormations = compressTrifectaFormations(topTrifecta);

  // 2連単 (全30通り)
  const exactaAll: BetCombination[] = [];
  for (let i = 0; i < 6; i++) {
    const a = boatNums[i];
    const pa = p1[i];
    for (let j = 0; j < 6; j++) {
      if (j === i) continue;
      const b = boatNums[j];
      const pb = p1[j];
      const prob = pa * (pb / (1 - pa));
      exactaAll.push({
        combination: [a, b],
        label: `${a}-${b}`,
        prob,
      });
    }
  }

  exactaAll.sort((x, y) => y.prob - x.prob);
  const topExacta = exactaAll.slice(0, Math.max(0, Math.min(30, nExacta)));
  const exactaFormations = compressExactaFormations(topExacta);

  // 3連複 (全20通り: 6通りの順列確率を合算)
  const trioMap = new Map<string, { comb: number[]; prob: number }>();
  trifectaAll.forEach((item) => {
    const sorted = [...item.combination].sort((x, y) => x - y);
    const key = sorted.join('=');
    if (!trioMap.has(key)) {
      trioMap.set(key, { comb: sorted, prob: 0 });
    }
    trioMap.get(key)!.prob += item.prob;
  });

  const trioAll: BetCombination[] = [];
  trioMap.forEach((val, key) => {
    trioAll.push({
      combination: val.comb,
      label: key,
      prob: val.prob,
    });
  });

  trioAll.sort((x, y) => y.prob - x.prob);
  const topTrio = trioAll.slice(0, Math.max(0, Math.min(30, nTrio)));
  const trioFormations = compressTrioFormations(topTrio);

  return {
    p1,
    scores,
    courses: effectiveCourses,
    isCourseWarning,
    isFrontEntry,
    entryFormationText,
    appliedWindRules: windRes.descriptions,
    windAdj,
    trifecta: {
      totalPoints: topTrifecta.length,
      formations: trifectaFormations,
      allBets: topTrifecta,
    },
    exacta: {
      totalPoints: topExacta.length,
      formations: exactaFormations,
      allBets: topExacta,
    },
    trio: {
      totalPoints: topTrio.length,
      formations: trioFormations,
      allBets: topTrio,
    },
  };
}
