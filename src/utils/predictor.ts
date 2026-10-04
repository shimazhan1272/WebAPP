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
 * 3連単の買い目をフォーメーション形式に圧縮（カンマなし表記: 1-34-2, 1-2-345, 12-12-34 など）
 */
function compressTrifectaFormations(bets: BetCombination[]): FormationGroup[] {
  if (bets.length === 0) return [];

  const betMap = new Map<string, BetCombination>();
  bets.forEach((b) => {
    betMap.set(`${b.combination[0]}-${b.combination[1]}-${b.combination[2]}`, b);
  });

  const remainingKeys = new Set(betMap.keys());
  const formations: FormationGroup[] = [];
  const boats = [1, 2, 3, 4, 5, 6];

  interface Candidate {
    formStr: string;
    keys: string[];
    typeRank: number;
  }

  while (remainingKeys.size > 0) {
    const candidates: Candidate[] = [];

    // パターン1: 3艇ボックス (6点)
    for (let i = 0; i < boats.length; i++) {
      for (let j = i + 1; j < boats.length; j++) {
        for (let k = j + 1; k < boats.length; k++) {
          const trio = [boats[i], boats[j], boats[k]];
          const perms = [
            [trio[0], trio[1], trio[2]],
            [trio[0], trio[2], trio[1]],
            [trio[1], trio[0], trio[2]],
            [trio[1], trio[2], trio[0]],
            [trio[2], trio[0], trio[1]],
            [trio[2], trio[1], trio[0]],
          ];
          const keys = perms.map((p) => `${p[0]}-${p[1]}-${p[2]}`);
          if (keys.every((k) => remainingKeys.has(k))) {
            candidates.push({
              formStr: `${trio.join('')}BOX`,
              keys,
              typeRank: 6,
            });
          }
        }
      }
    }

    // パターン2: 表裏折り返し 12-12-S3 (例: 12-12-34)
    for (let a = 1; a <= 6; a++) {
      for (let b = a + 1; b <= 6; b++) {
        const thirds: number[] = [];
        for (let c = 1; c <= 6; c++) {
          if (c !== a && c !== b) {
            if (
              remainingKeys.has(`${a}-${b}-${c}`) &&
              remainingKeys.has(`${b}-${a}-${c}`)
            ) {
              thirds.push(c);
            }
          }
        }
        if (thirds.length >= 1) {
          const keys: string[] = [];
          thirds.forEach((c) => {
            keys.push(`${a}-${b}-${c}`);
            keys.push(`${b}-${a}-${c}`);
          });
          const headStr = `${a}${b}`;
          const thirdsStr = thirds.sort((x, y) => x - y).join('');
          candidates.push({
            formStr: `${headStr}-${headStr}-${thirdsStr}`,
            keys,
            typeRank: 5,
          });
        }
      }
    }

    // パターン3: 1着固定 × 2着群 × 3着群 直積 (例: 1-23-45)
    for (let a = 1; a <= 6; a++) {
      const other = boats.filter((x) => x !== a);
      for (let s2Size = 2; s2Size <= 3; s2Size++) {
        for (let s3Size = 2; s3Size <= 3; s3Size++) {
          const getSubsets = (arr: number[], size: number): number[][] => {
            if (size === 0) return [[]];
            if (arr.length < size) return [];
            const [first, ...rest] = arr;
            return [
              ...getSubsets(rest, size - 1).map((s) => [first, ...s]),
              ...getSubsets(rest, size),
            ];
          };

          const s2List = getSubsets(other, s2Size);
          for (const s2 of s2List) {
            const remS3 = other.filter((x) => !s2.includes(x));
            const s3List = getSubsets(remS3, s3Size);
            for (const s3 of s3List) {
              const keys: string[] = [];
              let allMatch = true;
              for (const b of s2) {
                for (const c of s3) {
                  const key = `${a}-${b}-${c}`;
                  if (remainingKeys.has(key)) {
                    keys.push(key);
                  } else {
                    allMatch = false;
                    break;
                  }
                }
                if (!allMatch) break;
              }
              if (allMatch && keys.length >= 4) {
                const s2Str = s2.sort((x, y) => x - y).join('');
                const s3Str = s3.sort((x, y) => x - y).join('');
                candidates.push({
                  formStr: `${a}-${s2Str}-${s3Str}`,
                  keys,
                  typeRank: 4,
                });
              }
            }
          }
        }
      }
    }

    // パターン4: 1着 & 3着固定、2着まとめ (例: 1-34-2, 1-24-3)
    for (let a = 1; a <= 6; a++) {
      for (let c = 1; c <= 6; c++) {
        if (a === c) continue;
        const seconds: number[] = [];
        for (let b = 1; b <= 6; b++) {
          if (b !== a && b !== c && remainingKeys.has(`${a}-${b}-${c}`)) {
            seconds.push(b);
          }
        }
        if (seconds.length >= 2) {
          const keys = seconds.map((b) => `${a}-${b}-${c}`);
          const sStr = seconds.sort((x, y) => x - y).join('');
          candidates.push({
            formStr: `${a}-${sStr}-${c}`,
            keys,
            typeRank: 3,
          });
        }
      }
    }

    // パターン5: 1着 & 2着固定、3着まとめ (例: 1-2-345)
    for (let a = 1; a <= 6; a++) {
      for (let b = 1; b <= 6; b++) {
        if (a === b) continue;
        const thirds: number[] = [];
        for (let c = 1; c <= 6; c++) {
          if (c !== a && c !== b && remainingKeys.has(`${a}-${b}-${c}`)) {
            thirds.push(c);
          }
        }
        if (thirds.length >= 2) {
          const keys = thirds.map((c) => `${a}-${b}-${c}`);
          const tStr = thirds.sort((x, y) => x - y).join('');
          candidates.push({
            formStr: `${a}-${b}-${tStr}`,
            keys,
            typeRank: 3,
          });
        }
      }
    }

    // パターン6: 2着 & 3着固定、1着まとめ (例: 12-3-4)
    for (let b = 1; b <= 6; b++) {
      for (let c = 1; c <= 6; c++) {
        if (b === c) continue;
        const firsts: number[] = [];
        for (let a = 1; a <= 6; a++) {
          if (a !== b && a !== c && remainingKeys.has(`${a}-${b}-${c}`)) {
            firsts.push(a);
          }
        }
        if (firsts.length >= 2) {
          const keys = firsts.map((a) => `${a}-${b}-${c}`);
          const fStr = firsts.sort((x, y) => x - y).join('');
          candidates.push({
            formStr: `${fStr}-${b}-${c}`,
            keys,
            typeRank: 3,
          });
        }
      }
    }

    // 候補の中から最も多くの未処理ベットをカバーし、かつ確率の高いものを選択
    let best: Candidate | null = null;
    let bestCover = 0;
    let bestProb = 0;

    for (const cand of candidates) {
      const cover = cand.keys.length;
      const prob = cand.keys.reduce((s, k) => s + (betMap.get(k)?.prob || 0), 0);
      if (
        cover > bestCover ||
        (cover === bestCover && cand.typeRank > (best?.typeRank || 0)) ||
        (cover === bestCover && cand.typeRank === (best?.typeRank || 0) && prob > bestProb)
      ) {
        best = cand;
        bestCover = cover;
        bestProb = prob;
      }
    }

    if (best && bestCover >= 2) {
      const items = best.keys.map((k) => betMap.get(k)!);
      formations.push({
        formation: best.formStr,
        points: best.keys.length,
        totalProb: items.reduce((s, b) => s + b.prob, 0),
        items,
      });
      best.keys.forEach((k) => remainingKeys.delete(k));
    } else {
      // 1点単独の買い目
      const nextKey = remainingKeys.values().next().value;
      if (!nextKey) break;
      const b = betMap.get(nextKey)!;
      formations.push({
        formation: `${b.combination[0]}-${b.combination[1]}-${b.combination[2]}`,
        points: 1,
        totalProb: b.prob,
        items: [b],
      });
      remainingKeys.delete(nextKey);
    }
  }

  // 確率降順でソート
  formations.sort((a, b) => b.totalProb - a.totalProb);
  return formations;
}

/**
 * 2連単の買い目をフォーメーション形式に圧縮（例: 1-234, 34-2, 12-12）
 */
function compressExactaFormations(bets: BetCombination[]): FormationGroup[] {
  if (bets.length === 0) return [];

  const betMap = new Map<string, BetCombination>();
  bets.forEach((b) => {
    betMap.set(`${b.combination[0]}-${b.combination[1]}`, b);
  });

  const remainingKeys = new Set(betMap.keys());
  const formations: FormationGroup[] = [];

  // 1. 表裏 12-12
  for (let a = 1; a <= 6; a++) {
    for (let b = a + 1; b <= 6; b++) {
      const k1 = `${a}-${b}`;
      const k2 = `${b}-${a}`;
      if (remainingKeys.has(k1) && remainingKeys.has(k2)) {
        const b1 = betMap.get(k1)!;
        const b2 = betMap.get(k2)!;
        formations.push({
          formation: `${a}${b}-${a}${b}`,
          points: 2,
          totalProb: b1.prob + b2.prob,
          items: [b1, b2],
        });
        remainingKeys.delete(k1);
        remainingKeys.delete(k2);
      }
    }
  }

  // 2. 1着固定流し (例: 1-234)
  for (let a = 1; a <= 6; a++) {
    const seconds: number[] = [];
    for (let b = 1; b <= 6; b++) {
      if (a !== b && remainingKeys.has(`${a}-${b}`)) {
        seconds.push(b);
      }
    }
    if (seconds.length >= 2) {
      const keys = seconds.map((b) => `${a}-${b}`);
      const items = keys.map((k) => betMap.get(k)!);
      const sStr = seconds.sort((x, y) => x - y).join('');
      formations.push({
        formation: `${a}-${sStr}`,
        points: seconds.length,
        totalProb: items.reduce((sum, b) => sum + b.prob, 0),
        items,
      });
      keys.forEach((k) => remainingKeys.delete(k));
    }
  }

  // 3. 2着固定流し (例: 34-2)
  for (let b = 1; b <= 6; b++) {
    const firsts: number[] = [];
    for (let a = 1; a <= 6; a++) {
      if (a !== b && remainingKeys.has(`${a}-${b}`)) {
        firsts.push(a);
      }
    }
    if (firsts.length >= 2) {
      const keys = firsts.map((a) => `${a}-${b}`);
      const items = keys.map((k) => betMap.get(k)!);
      const fStr = firsts.sort((x, y) => x - y).join('');
      formations.push({
        formation: `${fStr}-${b}`,
        points: firsts.length,
        totalProb: items.reduce((sum, b) => sum + b.prob, 0),
        items,
      });
      keys.forEach((k) => remainingKeys.delete(k));
    }
  }

  // 4. 残りの単独点
  remainingKeys.forEach((key) => {
    const b = betMap.get(key)!;
    formations.push({
      formation: `${b.combination[0]}-${b.combination[1]}`,
      points: 1,
      totalProb: b.prob,
      items: [b],
    });
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
