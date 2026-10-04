/**
 * Boat Race Types & Data Definitions
 */

export interface StadiumInfo {
  code: number;
  name: string;
  romaji: string;
  location: string;
}

export const STADIUMS: StadiumInfo[] = [
  { code: 1, name: '桐生', romaji: 'Kiryu', location: '群馬県' },
  { code: 2, name: '戸田', romaji: 'Toda', location: '埼玉県' },
  { code: 3, name: '江戸川', romaji: 'Edogawa', location: '東京都' },
  { code: 4, name: '平和島', romaji: 'Heiwajima', location: '東京都' },
  { code: 5, name: '多摩川', romaji: 'Tamagawa', location: '東京都' },
  { code: 6, name: '浜名湖', romaji: 'Hamanako', location: '静岡県' },
  { code: 7, name: '蒲郡', romaji: 'Gamagori', location: '愛知県' },
  { code: 8, name: '常滑', romaji: 'Tokoname', location: '愛知県' },
  { code: 9, name: '津', romaji: 'Tsu', location: '三重県' },
  { code: 10, name: '三国', romaji: 'Mikuni', location: '福井県' },
  { code: 11, name: 'びわこ', romaji: 'Biwako', location: '滋賀県' },
  { code: 12, name: '住之江', romaji: 'Suminoe', location: '大阪府' },
  { code: 13, name: '尼崎', romaji: 'Amagasaki', location: '兵庫県' },
  { code: 14, name: '鳴門', romaji: 'Naruto', location: '徳島県' },
  { code: 15, name: '丸亀', romaji: 'Marugame', location: '香川県' },
  { code: 16, name: '児島', romaji: 'Kojima', location: '岡山県' },
  { code: 17, name: '宮島', romaji: 'Miyajima', location: '広島県' },
  { code: 18, name: '徳山', romaji: 'Tokuyama', location: '山口県' },
  { code: 19, name: '下関', romaji: 'Shimonoseki', location: '山口県' },
  { code: 20, name: '若松', romaji: 'Wakamatsu', location: '福岡県' },
  { code: 21, name: '芦屋', romaji: 'Ashiya', location: '福岡県' },
  { code: 22, name: '福岡', romaji: 'Fukuoka', location: '福岡県' },
  { code: 23, name: '唐津', romaji: 'Karatsu', location: '佐賀県' },
  { code: 24, name: '大村', romaji: 'Omura', location: '長崎県' },
];

export const BRANCH_NAMES: Record<number, string> = {
  10: '群馬',
  11: '埼玉',
  13: '東京',
  18: '福井',
  22: '静岡',
  23: '愛知',
  24: '三重',
  25: '滋賀',
  27: '大阪',
  28: '兵庫',
  33: '岡山',
  34: '広島',
  35: '山口',
  36: '徳島',
  37: '香川',
  40: '福岡',
  41: '佐賀',
  42: '長崎',
};

export const BOAT_COLORS = [
  {
    lane: 1,
    name: '1号艇',
    colorName: '白',
    bg: 'bg-white',
    text: 'text-slate-900',
    border: 'border-slate-300',
    hex: '#ffffff',
    textHex: '#0f172a',
    badgeClass: 'bg-white text-slate-900 border border-slate-300 font-bold',
  },
  {
    lane: 2,
    name: '2号艇',
    colorName: '黒',
    bg: 'bg-slate-900',
    text: 'text-white',
    border: 'border-slate-700',
    hex: '#1e293b',
    textHex: '#ffffff',
    badgeClass: 'bg-slate-900 text-white border border-slate-700 font-bold',
  },
  {
    lane: 3,
    name: '3号艇',
    colorName: '赤',
    bg: 'bg-red-600',
    text: 'text-white',
    border: 'border-red-700',
    hex: '#dc2626',
    textHex: '#ffffff',
    badgeClass: 'bg-red-600 text-white font-bold',
  },
  {
    lane: 4,
    name: '4号艇',
    colorName: '青',
    bg: 'bg-blue-600',
    text: 'text-white',
    border: 'border-blue-700',
    hex: '#2563eb',
    textHex: '#ffffff',
    badgeClass: 'bg-blue-600 text-white font-bold',
  },
  {
    lane: 5,
    name: '5号艇',
    colorName: '黄',
    bg: 'bg-amber-400',
    text: 'text-slate-950',
    border: 'border-amber-500',
    hex: '#facc15',
    textHex: '#0f172a',
    badgeClass: 'bg-amber-400 text-slate-950 font-bold',
  },
  {
    lane: 6,
    name: '6号艇',
    colorName: '緑',
    bg: 'bg-emerald-600',
    text: 'text-white',
    border: 'border-emerald-700',
    hex: '#059669',
    textHex: '#ffffff',
    badgeClass: 'bg-emerald-600 text-white font-bold',
  },
];

export type RacerClass = 'A1' | 'A2' | 'B1' | 'B2';

export interface BoatData {
  boatNumber: number; // 1〜6
  name: string;
  racerNumber?: number;
  grade: RacerClass;
  branch: string; // 支部名
  nationalWinRate: number; // 全国勝率
  national2Rate: number; // 全国2連率 (%)
  national3Rate: number; // 全国3連率 (%)
  local2Rate: number; // 当地2連率 (%)
  local3Rate: number; // 当地3連率 (%)
  motor2Rate: number; // モーター2連率 (%)
  motor3Rate: number; // モーター3連率 (%)
  avgST: number; // 平均ST (秒)
  exTime: number | null; // 展示タイム
  startTiming: number | null; // スタート展示ST
  course: number; // 進入コース (1〜6)
}

export type WindDirection = '追い風' | '向かい風' | '横風' | '無風';

export interface WeatherData {
  windSpeed: number; // 風速 (m/s)
  windDirection: WindDirection;
  windDirectionNumber?: number;
  waveHeight: number; // 波高 (cm)
  weatherName?: string;
  temperature?: number;
  waterTemperature?: number;
}

export interface RaceInfo {
  date: string; // YYYY-MM-DD
  stadiumCode: number;
  stadiumName: string;
  raceNumber: number;
  title: string;
  subtitle?: string;
  closedAt: string; // 発売締切時刻 e.g. "15:45"
  boats: BoatData[];
  weather: WeatherData | null;
  hasExhibitionData: boolean;
}

export interface SliderState {
  local2Rate: number; // -3.0 ~ +3.0 (default 0)
  motor2Rate: number; // -3.0 ~ +3.0 (default 0)
  motor3Rate: number; // -3.0 ~ +3.0 (default 0)
  exTime: number; // -3.0 ~ +3.0 (default 0)
}

export interface BetCombination {
  combination: number[]; // e.g. [1, 2, 3]
  label: string; // e.g. "1-2-3" or "1=2=3"
  prob: number; // 0.0 ~ 1.0
}

export interface FormationGroup {
  formation: string; // e.g. "1-2-3456", "12-12-3456"
  points: number;
  totalProb: number;
  items: BetCombination[];
}

export interface PredictionResult {
  p1: number[]; // 1着確率 (1..6) in 0.0 ~ 1.0
  scores: number[]; // Internal score (not shown in table)
  courses: number[]; // Entry courses used
  isCourseWarning: boolean; // True if duplicates/missing
  isFrontEntry: boolean; // True if entry != lane
  entryFormationText: string; // e.g. "4-1-2-3-5-6"
  appliedWindRules: string[]; // List of applied rules
  windAdj: number[]; // 6 elements

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
