/**
 * Boat Race Data Fetching Service
 *
 * 1. Boatrace Open API v1 (https://github.com/boatraceopenapi/api)
 *    - Unified API with GitHub Actions ~3-minute live updates for all 24 stadiums
 *    - Today's live data: https://boatraceopenapi.github.io/api/v1/today.json
 *    - Specific dates: https://boatraceopenapi.github.io/api/v1/YYYY/YYYYMMDD.json
 *    - Each race object contains both program (出走表) and preview (直前情報: 展示タイム・ST・進入・気象)
 * 2. Fallbacks: Legacy v2 OpenAPI -> Official boatrace.jp HTML parsing
 */

import {
  BoatData,
  RaceInfo,
  WeatherData,
  WindDirection,
  RacerClass,
  BRANCH_NAMES,
  STADIUMS,
} from '../types/boatrace';

// Request tracking to prevent race conditions
let activeRequestId = 0;

export function getNextRequestId(): number {
  activeRequestId += 1;
  return activeRequestId;
}

export function getCurrentRequestId(): number {
  return activeRequestId;
}

/**
 * 日本標準時（JST = UTC+9）の「今日」の日付文字列（YYYY-MM-DD）を取得
 */
export function getTodayJST(): string {
  try {
    const parts = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    return parts.replace(/\//g, '-');
  } catch {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/**
 * 級別コードを 'A1' | 'A2' | 'B1' | 'B2' に変換
 */
function parseGrade(val: unknown): RacerClass {
  if (typeof val === 'string') {
    const upper = val.toUpperCase().trim();
    if (upper === 'A1' || upper === 'A2' || upper === 'B1' || upper === 'B2') {
      return upper;
    }
  }
  const num = Number(val);
  if (num === 1) return 'A1';
  if (num === 2) return 'A2';
  if (num === 3) return 'B1';
  if (num === 4) return 'B2';
  return 'B1';
}

/**
 * 支部コードまたは名前から支部名を取得
 */
function parseBranch(branchVal: unknown, branchNameVal?: unknown): string {
  if (typeof branchNameVal === 'string' && branchNameVal.trim()) {
    return branchNameVal.trim().replace(/支部$/, '');
  }
  if (typeof branchVal === 'string' && isNaN(Number(branchVal))) {
    return branchVal.trim().replace(/支部$/, '');
  }
  const num = Number(branchVal);
  if (BRANCH_NAMES[num]) {
    return BRANCH_NAMES[num];
  }
  return '—';
}

/**
 * 数値を安全にパース（小数第2位対応、欠損値補完）
 */
function parseNumber(val: unknown, fallback = 0): number {
  if (val == null || val === '') return fallback;
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

/**
 * 風向番号から風向文字列に変換
 */
function parseWindDirection(dirNum: unknown, dirStr?: string): WindDirection {
  if (dirStr) {
    if (dirStr.includes('追')) return '追い風';
    if (dirStr.includes('向')) return '向かい風';
    if (dirStr.includes('横')) return '横風';
    if (dirStr.includes('無')) return '無風';
  }

  const num = Number(dirNum);
  if (isNaN(num) || num === 17 || num === 0) return '無風';

  // 16方位風向番号
  // 1: 追い風、2: 左横追い風、11: 右追い風、12: 右横追い風
  if (num === 1 || num === 2 || num === 11 || num === 12 || num === 16) {
    return '追い風';
  }
  // 5〜9: 向かい風系統
  if (num >= 5 && num <= 9) {
    return '向かい風';
  }
  return '横風';
}

// --------------------------------------------------------------------------
// Boatrace Open API v1 (最新統合API: 出走表 & 直前情報を一度に取得)
// --------------------------------------------------------------------------

export interface RaceScheduleItem {
  raceNumber: number;
  closedAt: string; // e.g. "16:10"
  title?: string;
  deadlineTimestamp: number; // UTC ms
}

export interface DaySchedule {
  activeStadiumCodes: number[];
  stadiumRaces: Record<number, RaceScheduleItem[]>;
}

interface DayDataCache {
  date: string;
  timestamp: number;
  data: any;
}
let cachedDayData: DayDataCache | null = null;

/**
 * 指定日の開催場一覧および各場の全レース締切時刻スケジュールを取得
 */
export async function fetchDaySchedule(dateStr: string): Promise<DaySchedule> {
  const yyyymmdd = dateStr.replace(/-/g, '');
  const year = dateStr.split('-')[0];
  const dayData = await fetchDayDataV1(year, yyyymmdd, dateStr);

  const activeStadiumCodes: number[] = [];
  const stadiumRaces: Record<number, RaceScheduleItem[]> = {};

  if (dayData && dayData.programs?.stadiums) {
    const stadiumsObj = dayData.programs.stadiums;
    for (const sCodeStr of Object.keys(stadiumsObj)) {
      const sCode = Number(sCodeStr);
      if (!isNaN(sCode)) {
        activeStadiumCodes.push(sCode);
        const racesObj = stadiumsObj[sCodeStr]?.races || {};
        const items: RaceScheduleItem[] = [];
        for (let r = 1; r <= 12; r++) {
          const race = racesObj[String(r)];
          let closedAt = '';
          let deadlineTimestamp = 0;

          if (race?.closed_at) {
            const raw = String(race.closed_at).trim();
            if (raw.includes('T')) {
              try {
                const d = new Date(raw);
                deadlineTimestamp = d.getTime();
                closedAt = d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
              } catch {
                closedAt = '';
              }
            } else if (raw.includes(' ')) {
              try {
                const isoStr = raw.replace(' ', 'T') + '+09:00';
                deadlineTimestamp = new Date(isoStr).getTime();
                closedAt = raw.split(' ')[1].slice(0, 5);
              } catch {
                closedAt = raw.slice(0, 5);
              }
            } else {
              closedAt = raw.slice(0, 5);
              try {
                deadlineTimestamp = new Date(`${dateStr}T${closedAt}:00+09:00`).getTime();
              } catch {
                deadlineTimestamp = 0;
              }
            }
          }

          if (isNaN(deadlineTimestamp)) {
            deadlineTimestamp = 0;
          }

          items.push({
            raceNumber: r,
            closedAt,
            title: race?.title || race?.subtitle || '',
            deadlineTimestamp,
          });
        }
        stadiumRaces[sCode] = items;
      }
    }
    activeStadiumCodes.sort((a, b) => a - b);
  }

  return {
    activeStadiumCodes,
    stadiumRaces,
  };
}

/**
 * Boatrace Open API v1 から1日分の全場データを取得（30秒インメモリキャッシュ）
 */
async function fetchDayDataV1(year: string, yyyymmdd: string, dateStr: string): Promise<any | null> {
  const now = Date.now();
  if (cachedDayData && cachedDayData.date === dateStr && now - cachedDayData.timestamp < 30_000) {
    return cachedDayData.data;
  }

  const isToday = dateStr === getTodayJST();

  // 当日の場合は最新リアルタイム更新の today.json を優先
  const candidateUrls: string[] = [];
  if (isToday) {
    candidateUrls.push(`https://boatraceopenapi.github.io/api/v1/today.json?t=${now}`);
  }
  candidateUrls.push(`https://boatraceopenapi.github.io/api/v1/${year}/${yyyymmdd}.json?t=${now}`);

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.programs) {
          cachedDayData = {
            date: dateStr,
            timestamp: now,
            data,
          };
          return data;
        }
      }
    } catch {
      // try next candidate
    }
  }

  return null;
}

/**
 * Boatrace Open API v1 のレースデータをパース
 */
function parseRaceV1(race: any, stadiumCode: number, raceNumber: number) {
  const raceTitle =
    race.title || race.subtitle || race.race_title || `${raceNumber}R`;

  let closedAt = race.closed_at || race.deadline || '';
  if (closedAt && closedAt.includes(' ')) {
    // "2026-10-04 10:47:00" -> "10:47"
    const timePart = closedAt.split(' ')[1];
    if (timePart) {
      closedAt = timePart.slice(0, 5);
    }
  } else if (closedAt && closedAt.includes('T')) {
    try {
      const d = new Date(closedAt);
      closedAt = d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } catch {
      // keep
    }
  }

  // 1. 出走表（選手データ）のパース
  const racersObj = race.racers || {};
  const boats: BoatData[] = [1, 2, 3, 4, 5, 6].map((bNum) => {
    const r = racersObj[String(bNum)] || racersObj[bNum] || {};
    const name = String(r.name || `${bNum}号艇`).trim();
    const grade = parseGrade(r.rank_number_source ?? r.rank_number ?? r.rank);
    const branch = parseBranch(r.branch_number, r.branch_number_source);

    const nationalWinRate = parseNumber(r.national_win_rate, 5.0);
    const national2Rate = parseNumber(r.national_top_2_percent ?? r.national_2_percent, 30.0);
    const national3Rate = parseNumber(r.national_top_3_percent ?? r.national_3_percent, 50.0);
    const local2Rate = parseNumber(r.local_top_2_percent ?? r.local_2_percent, 30.0);
    const local3Rate = parseNumber(r.local_top_3_percent ?? r.local_3_percent, 50.0);
    const motor2Rate = parseNumber(r.motor_top_2_percent ?? r.motor_2_percent, 30.0);
    const motor3Rate = parseNumber(r.motor_top_3_percent ?? r.motor_3_percent, 50.0);
    const avgST = parseNumber(r.average_start_timing, 0.17);

    return {
      boatNumber: bNum,
      name,
      racerNumber: r.number ? Number(r.number) : undefined,
      grade,
      branch,
      nationalWinRate,
      national2Rate,
      national3Rate,
      local2Rate,
      local3Rate,
      motor2Rate,
      motor3Rate,
      avgST,
      exTime: null,
      startTiming: null,
      course: bNum, // 初期値は枠なり
    };
  });

  // 2. 直前情報（展示タイム・スタート展示・気象）のパース
  let weather: WeatherData | null = null;
  let hasExhibition = false;

  if (race.preview) {
    const p = race.preview;
    const windSpeed = parseNumber(p.wind_speed, 0);
    const windDirNum = p.wind_direction_number;
    const windDirection = parseWindDirection(windDirNum, p.wind_direction_number_source);
    const waveHeight = parseNumber(p.wave_height, 0);

    weather = {
      windSpeed,
      windDirection,
      windDirectionNumber: windDirNum ? Number(windDirNum) : undefined,
      waveHeight,
      temperature: p.air_temperature != null ? Number(p.air_temperature) : undefined,
      waterTemperature: p.water_temperature != null ? Number(p.water_temperature) : undefined,
    };

    const pRacers = p.racers || {};
    let exTimesFound = 0;

    boats.forEach((b, idx) => {
      const bNum = b.boatNumber;
      const pr = pRacers[String(bNum)] || pRacers[bNum];
      if (pr) {
        // 展示タイム
        if (pr.exhibition_time != null && Number(pr.exhibition_time) > 0) {
          b.exTime = Number(pr.exhibition_time);
          exTimesFound++;
        }

        // スタートタイミング（Fの場合は負値）
        if (pr.start_timing != null && !isNaN(Number(pr.start_timing))) {
          let st = Number(pr.start_timing);
          if (
            pr.start_timing_source &&
            String(pr.start_timing_source).toUpperCase().startsWith('F')
          ) {
            st = -Math.abs(st);
          }
          b.startTiming = st;
        }

        // 進入コース
        if (pr.course_number != null && Number(pr.course_number) >= 1 && Number(pr.course_number) <= 6) {
          b.course = Number(pr.course_number);
        }
      }
    });

    if (exTimesFound > 0) {
      hasExhibition = true;
    }
  }

  return {
    raceTitle,
    closedAt,
    boats,
    weather,
    hasExhibition,
  };
}

// --------------------------------------------------------------------------
// レガシー v2 API（過去アーカイブ用フォールバック）
// --------------------------------------------------------------------------

async function fetchProgramFromOpenAPIV2(
  year: string,
  yyyymmdd: string,
  stadiumCode: number,
  raceNumber: number
): Promise<{
  raceTitle: string;
  closedAt: string;
  boats: BoatData[];
} | null> {
  try {
    const url = `https://boatraceopenapi.github.io/programs/v2/${year}/${yyyymmdd}.json?t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;

    const data = await res.json();
    const programs = Array.isArray(data)
      ? data
      : Array.isArray(data?.programs)
      ? data.programs
      : [];

    const race = programs.find((p: any) => {
      const sCode = Number(p.race_stadium_number ?? p.stadium_number ?? p.stadium_code ?? p.jcd);
      const rNum = Number(p.race_number ?? p.race_no ?? p.rno);
      return sCode === stadiumCode && rNum === raceNumber;
    });

    if (!race || !Array.isArray(race.boats) || race.boats.length === 0) {
      return null;
    }

    const raceTitle =
      race.race_title || race.title || race.race_name || `${raceNumber}R`;
    let closedAt =
      race.race_closed_at || race.closed_at || race.deadline || '';
    if (closedAt && closedAt.includes('T')) {
      try {
        const d = new Date(closedAt);
        closedAt = d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      } catch {
        // keep
      }
    }

    const boats: BoatData[] = race.boats.map((b: any, idx: number) => {
      const boatNum = Number(b.racer_boat_number ?? b.boat_number ?? b.lane ?? idx + 1);
      const name = String(b.racer_name ?? b.name ?? `${boatNum}号艇`).trim();
      const grade = parseGrade(b.racer_class_number ?? b.class_number ?? b.class);
      const branch = parseBranch(
        b.racer_branch_number ?? b.branch_number,
        b.racer_branch_name ?? b.branch_name
      );

      const nationalWinRate = parseNumber(
        b.racer_national_top_1_percent ?? b.national_win_rate ?? b.national_top_1,
        0
      );
      const national2Rate = parseNumber(
        b.racer_national_top_2_percent ?? b.national_2_percent ?? b.national_top_2,
        0
      );
      const national3Rate = parseNumber(
        b.racer_national_top_3_percent ?? b.national_3_percent ?? b.national_top_3,
        0
      );

      const local2Rate = parseNumber(
        b.racer_local_top_2_percent ?? b.local_2_percent ?? b.local_top_2,
        0
      );
      const local3Rate = parseNumber(
        b.racer_local_top_3_percent ?? b.local_3_percent ?? b.local_top_3,
        0
      );

      const motor2Rate = parseNumber(
        b.racer_assigned_motor_top_2_percent ?? b.motor_top_2_percent ?? b.motor_2_percent,
        0
      );
      const motor3Rate = parseNumber(
        b.racer_assigned_motor_top_3_percent ?? b.motor_top_3_percent ?? b.motor_3_percent,
        0
      );

      const avgST = parseNumber(
        b.racer_average_start_timing ?? b.average_start_timing ?? b.avg_st,
        0.17
      );

      return {
        boatNumber: boatNum,
        name,
        racerNumber: b.racer_number ? Number(b.racer_number) : undefined,
        grade,
        branch,
        nationalWinRate,
        national2Rate,
        national3Rate,
        local2Rate,
        local3Rate,
        motor2Rate,
        motor3Rate,
        avgST,
        exTime: null,
        startTiming: null,
        course: boatNum,
      };
    });

    boats.sort((a, b) => a.boatNumber - b.boatNumber);

    return {
      raceTitle,
      closedAt,
      boats,
    };
  } catch {
    return null;
  }
}

async function fetchPreviewFromOpenAPIV2(
  year: string,
  yyyymmdd: string,
  stadiumCode: number,
  raceNumber: number
): Promise<{
  weather: WeatherData;
  exTimes: (number | null)[];
  startTimings: (number | null)[];
  courses: number[];
} | null> {
  try {
    const url = `https://boatraceopenapi.github.io/previews/v2/${year}/${yyyymmdd}.json?t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;

    const data = await res.json();
    const previews = Array.isArray(data)
      ? data
      : Array.isArray(data?.previews)
      ? data.previews
      : [];

    const prev = previews.find((p: any) => {
      const sCode = Number(p.race_stadium_number ?? p.stadium_number ?? p.stadium_code ?? p.jcd);
      const rNum = Number(p.race_number ?? p.race_no ?? p.rno);
      return sCode === stadiumCode && rNum === raceNumber;
    });

    if (!prev) return null;

    const windSpeed = parseNumber(prev.race_wind ?? prev.wind, 0);
    const windDirNum = prev.race_wind_direction_number ?? prev.wind_direction_number;
    const windDirection = parseWindDirection(windDirNum);
    const waveHeight = parseNumber(prev.race_wave ?? prev.wave, 0);

    const weather: WeatherData = {
      windSpeed,
      windDirection,
      windDirectionNumber: windDirNum ? Number(windDirNum) : undefined,
      waveHeight,
      temperature: prev.race_temperature ? Number(prev.race_temperature) : undefined,
      waterTemperature: prev.race_water_temperature ? Number(prev.race_water_temperature) : undefined,
    };

    const exTimes: (number | null)[] = [null, null, null, null, null, null];
    const startTimings: (number | null)[] = [null, null, null, null, null, null];
    const courses: number[] = [1, 2, 3, 4, 5, 6];

    if (Array.isArray(prev.boats)) {
      prev.boats.forEach((b: any) => {
        const bNum = Number(b.racer_boat_number ?? b.boat_number ?? b.lane);
        if (bNum >= 1 && bNum <= 6) {
          const idx = bNum - 1;
          const exT = b.racer_exhibition_time ?? b.exhibition_time ?? b.ex_time;
          if (exT != null && !isNaN(Number(exT)) && Number(exT) > 0) {
            exTimes[idx] = Number(exT);
          }

          const st = b.racer_start_timing ?? b.start_timing ?? b.st;
          if (st != null && !isNaN(Number(st))) {
            startTimings[idx] = Number(st);
          }

          const cNum = b.racer_course_number ?? b.course_number ?? b.course;
          if (cNum != null && !isNaN(Number(cNum)) && Number(cNum) >= 1 && Number(cNum) <= 6) {
            courses[idx] = Number(cNum);
          }
        }
      });
    }

    return {
      weather,
      exTimes,
      startTimings,
      courses,
    };
  } catch {
    return null;
  }
}

// --------------------------------------------------------------------------
// boatrace.jp 公式サイト HTML フォールバック（CORS/Dev Proxy 経由）
// --------------------------------------------------------------------------

async function fetchOfficialHtml(targetUrl: string): Promise<string | null> {
  const isDev = import.meta.env.DEV;

  if (isDev && targetUrl.startsWith('https://boatrace.jp')) {
    try {
      const proxyUrl = targetUrl.replace('https://boatrace.jp', '/api/boatrace-jp');
      const res = await fetch(proxyUrl, {
        headers: { Accept: 'text/html' },
        cache: 'no-store',
      });
      if (res.ok) {
        const text = await res.text();
        if (text && text.includes('boatrace')) {
          return text;
        }
      }
    } catch {
      // fallback
    }
  }

  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`,
  ];

  for (const proxy of proxies) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(proxy, {
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const text = await res.text();
        if (text && (text.includes('weather') || text.includes('racer') || text.includes('boatrace'))) {
          return text;
        }
      }
    } catch {
      // try next
    }
  }

  return null;
}

function parseBeforeInfoHtml(html: string): {
  weather: WeatherData;
  exTimes: (number | null)[];
  startTimings: (number | null)[];
  courses: number[];
} | null {
  try {
    const windMatch = html.match(/class="weather1_bodyUnitLabelData">([\d.]+)m/);
    const windSpeed = windMatch ? parseFloat(windMatch[1]) : 0;

    let windDirection: WindDirection = '無風';
    if (html.includes('is-wind1') || html.includes('is-wind2') || html.includes('is-wind16')) {
      windDirection = '追い風';
    } else if (html.includes('is-wind6') || html.includes('is-wind7') || html.includes('is-wind8')) {
      windDirection = '向かい風';
    } else if (windSpeed > 0) {
      windDirection = '横風';
    }

    const waveMatch = html.match(/class="weather1_bodyUnitLabelData">(\d+)cm/);
    const waveHeight = waveMatch ? parseInt(waveMatch[1], 10) : 0;

    const weather: WeatherData = {
      windSpeed,
      windDirection,
      waveHeight,
    };

    const exTimes: (number | null)[] = [null, null, null, null, null, null];
    const exMatches = html.match(/(\d\.\d{2})\s*<\/td>/g);
    if (exMatches && exMatches.length >= 6) {
      exMatches.slice(0, 6).forEach((m, idx) => {
        const num = parseFloat(m.replace(/<\/?[^>]+(>|$)/g, '').trim());
        if (!isNaN(num) && num > 0) {
          exTimes[idx] = num;
        }
      });
    }

    const courses = [1, 2, 3, 4, 5, 6];
    const startTimings: (number | null)[] = [null, null, null, null, null, null];

    const slitMatches = html.match(/class="table1_slit[^"]*">([\s\S]*?)<\/table>/i);
    if (slitMatches) {
      const slitContent = slitMatches[1];
      const stMatches = slitContent.match(/(F?\.\d{2})/g);
      if (stMatches) {
        stMatches.slice(0, 6).forEach((stStr, idx) => {
          let val = 0.17;
          if (stStr.startsWith('F')) {
            val = -Number(stStr.replace('F.', '0.'));
          } else {
            val = Number(stStr.replace('.', '0.'));
          }
          startTimings[idx] = val;
        });
      }
    }

    return {
      weather,
      exTimes,
      startTimings,
      courses,
    };
  } catch {
    return null;
  }
}

// --------------------------------------------------------------------------
// メインのレース情報取得関数
// --------------------------------------------------------------------------

export async function fetchRaceData(
  dateStr: string, // YYYY-MM-DD
  stadiumCode: number,
  raceNumber: number,
  reqId?: number
): Promise<RaceInfo> {
  const requestId = reqId ?? getNextRequestId();
  const yyyymmdd = dateStr.replace(/-/g, '');
  const year = dateStr.split('-')[0];
  const jcd2 = String(stadiumCode).padStart(2, '0');
  const stadium = STADIUMS.find((s) => s.code === stadiumCode);
  const stadiumName = stadium?.name ?? `${stadiumCode}場`;

  // =========================================================================
  // 1. 最新の Boatrace Open API v1（リアルタイム3分間隔更新）を試行
  // =========================================================================
  const dayData = await fetchDayDataV1(year, yyyymmdd, dateStr);

  if (dayData && dayData.programs?.stadiums) {
    const stadiumObj = dayData.programs.stadiums[String(stadiumCode)];
    const raceObj = stadiumObj?.races?.[String(raceNumber)];

    if (raceObj) {
      if (requestId !== activeRequestId) {
        throw new Error('Canceled request');
      }

      const parsed = parseRaceV1(raceObj, stadiumCode, raceNumber);

      return {
        date: dateStr,
        stadiumCode,
        stadiumName,
        raceNumber,
        title: parsed.raceTitle,
        closedAt: parsed.closedAt,
        boats: parsed.boats,
        weather: parsed.weather,
        hasExhibitionData: parsed.hasExhibition,
      };
    }
  }

  // =========================================================================
  // 2. レガシー v2 API（過去日付やバックアップ用）
  // =========================================================================
  let programData = await fetchProgramFromOpenAPIV2(year, yyyymmdd, stadiumCode, raceNumber);

  // 公式サイトHTMLフォールバック（出走表）
  if (!programData) {
    const racelistUrl = `https://boatrace.jp/owpc/pc/race/racelist?rno=${raceNumber}&jcd=${jcd2}&hd=${yyyymmdd}`;
    const racelistHtml = await fetchOfficialHtml(racelistUrl);
    if (racelistHtml) {
      const titleMatch = racelistHtml.match(/<h2[^>]*class="heading2_title"[^>]*>([\s\S]*?)<\/h2>/i);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : `${raceNumber}R`;
      const deadlineMatch = racelistHtml.match(/締切予定\s*<\/span>\s*<span[^>]*>(\d{2}:\d{2})<\/span>/i);
      const closedAt = deadlineMatch ? deadlineMatch[1] : '';

      const boats: BoatData[] = [1, 2, 3, 4, 5, 6].map((bNum) => ({
        boatNumber: bNum,
        name: `${bNum}号艇`,
        grade: 'A1' as RacerClass,
        branch: '—',
        nationalWinRate: 5.5,
        national2Rate: 35.0,
        national3Rate: 50.0,
        local2Rate: 35.0,
        local3Rate: 50.0,
        motor2Rate: 35.0,
        motor3Rate: 50.0,
        avgST: 0.16,
        exTime: null,
        startTiming: null,
        course: bNum,
      }));

      programData = {
        raceTitle: title,
        closedAt,
        boats,
      };
    }
  }

  if (!programData) {
    throw new Error(
      `出走表が見つかりません。日付（${dateStr}）や開催場（${stadiumName}）の開催スケジュールをご確認ください。当日・直近の開催日のみ提供されている場合があります。`
    );
  }

  if (requestId !== activeRequestId) {
    throw new Error('Canceled request');
  }

  // 展示情報取得（レガシー Open API v2 または 公式サイト解析）
  let previewData = await fetchPreviewFromOpenAPIV2(year, yyyymmdd, stadiumCode, raceNumber);

  if (!previewData) {
    const beforeinfoUrl = `https://boatrace.jp/owpc/pc/race/beforeinfo?rno=${raceNumber}&jcd=${jcd2}&hd=${yyyymmdd}`;
    const beforeHtml = await fetchOfficialHtml(beforeinfoUrl);
    if (beforeHtml) {
      previewData = parseBeforeInfoHtml(beforeHtml);
    }
  }

  if (requestId !== activeRequestId) {
    throw new Error('Canceled request');
  }

  const hasExhibitionData = previewData != null;
  const weather = previewData?.weather ?? null;

  const boats = programData.boats.map((b, idx) => {
    const exTime = previewData?.exTimes?.[idx] ?? null;
    const startTiming = previewData?.startTimings?.[idx] ?? null;
    const course = previewData?.courses?.[idx] ?? b.boatNumber;

    return {
      ...b,
      exTime,
      startTiming,
      course,
    };
  });

  return {
    date: dateStr,
    stadiumCode,
    stadiumName,
    raceNumber,
    title: programData.raceTitle,
    closedAt: programData.closedAt,
    boats,
    weather,
    hasExhibitionData,
  };
}
