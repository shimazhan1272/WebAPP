/**
 * Boat Race AI Prediction Model Constants & Configurations
 */

export const CONFIG = {
  // 基準係数
  cPrior: 1.0,
  cWin: 0.35,
  cN2: 0.015,
  cL2: 0.010,
  cM2: 0.012,
  cM3: 0.008,
  cSt: 4.0,
  cGrade: 1.0,
  cEx: 6.0,

  // 級別補正
  GRADE_ADJ: {
    A1: 0.3,
    A2: 0.1,
    B1: 0.0,
    B2: -0.2,
  } as Record<string, number>,

  // コース別事前確率（1〜6コース）
  PRIOR_COURSE: [0.55, 0.15, 0.12, 0.10, 0.06, 0.02],

  // コース別倍率
  COURSE_MULT: {
    st: [0.8, 0.9, 1.2, 1.3, 1.1, 0.9],
    ex: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
  },

  // 前付けペナルティ（枠番より内側に動いた艇に、動いたコース数×この値を加算）
  FRONT_ENTRY_PENALTY: -0.10,

  // 風補正ルール
  WIND_RULES: {
    strong: {
      threshold: 5,
      lane1: -0.30,
    },
    tailwind: {
      threshold: 5,
      lane2: -0.20,
      lane1Scale: 0.5,
    },
    mid: {
      threshold: 4,
      lane3: 0.15,
      lane4: 0.20,
    },
    excessGain: 0.15, // 閾値超過1m/sごとに補正量を15%強める
    excessCap: 1.5, // 倍率の上限
  },
};

/**
 * 統計モデルの説明・注意書き定数
 */
export const DISCLAIMER_TEXT =
  '統計モデルによる参考値です。係数は仮の値で統計的に検証されていません。的中を保証するものではありません。買い目点数は各券種0〜30点まで指定できます。馬券・舟券の購入は自己責任で';
