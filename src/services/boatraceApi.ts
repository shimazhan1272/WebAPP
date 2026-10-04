/**
 * Boat Race Data Fetching Service
 *
 * 1. Programs: Boatrace Open API (github.io) -> fallback boatrace.jp
 * 2. Previews: Boatrace Open API (github.io) -> fallback boatrace.jp (dev proxy / CORS proxy) -> fallback "直前情報なし"
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
  return 'B1'; // デフォルト
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

  // ボートレースの一般的な16方位風向番号
  // 1: 追い風、2: 左横追い風、11: 右追い風、12: 右横追い風
  if (num === 1 || num === 2 || num === 11 || num === 12 || num === 16) {
    return '追い風';
  }
  // 6, 7, 8: 向かい風系統
  if (num >= 5 && num <= 9) {
    return '向かい風';
  }
  // その他は横風
  return '横風';
}

/**
 * Boatrace Open API から出走表 (programs) を取得
 */
async function fetchProgramFromOpenAPI(
  year: string,
  yyyymmdd: string,
  stadiumCode: number,
  raceNumber: number
): Promise<{
  raceTitle: string;
  closedAt: string;
  boats: BoatData[];
} | null> {
  const url = `https://boatraceopenapi.github.io/programs/v2/${year}/${yyyymmdd}.json?t=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    return null;
  }

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
    // ISO string "2024-10-01T15:45:00" -> "15:45"
    try {
      const d = new Date(closedAt);
      closedAt = d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } catch {
      // keep original
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
      course: boatNum, // 初期値は枠なり
    };
  });

  // 艇番順にソート (1〜6)
  boats.sort((a, b) => a.boatNumber - b.boatNumber);

  return {
    raceTitle,
    closedAt,
    boats,
  };
}

/**
 * Boatrace Open API から展示情報 (previews) を取得
 */
async function fetchPreviewFromOpenAPI(
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
  const url = `https://boatraceopenapi.github.io/previews/v2/${year}/${yyyymmdd}.json?t=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    return null;
  }

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

  if (!prev) {
    return null;
  }

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
}

/**
 * boatrace.jp の HTML 取得（Vite Dev Proxy -> 公開 CORS プロキシ fallback）
 */
async function fetchOfficialHtml(targetUrl: string): Promise<string | null> {
  const isDev = import.meta.env.DEV;

  // 1. Vite Dev Server の proxy を試行
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
      // Dev proxy failed, fall through to CORS proxies
    }
  }

  // 2. 公開 CORS プロキシのフォールバック
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
      // Continue to next proxy
    }
  }

  return null;
}

/**
 * boatrace.jp beforeinfo HTML から直前情報（展示タイム、ST、進入、気象）を抽出
 */
function parseBeforeInfoHtml(html: string): {
  weather: WeatherData;
  exTimes: (number | null)[];
  startTimings: (number | null)[];
  courses: number[];
} | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 気象情報の抽出
    let windSpeed = 0;
    let windDir: WindDirection = '無風';
    let waveHeight = 0;
    let temp: number | undefined;
    let waterTemp: number | undefined;

    // 風速
    const windSpeedEl = doc.querySelector('.weather1_body_unitLabel:contains("風速"), .is-wind');
    const windMatch = html.match(/風速\s*<\/span>\s*<span[^>]*>(\d+)m?/i) || html.match(/class="weather1_body_number">(\d+)m?<\/span>/i);
    if (windMatch) {
      windSpeed = Number(windMatch[1]);
    }

    // 風向
    if (html.includes('追い風') || html.includes('is-windDirection1')) {
      windDir = '追い風';
    } else if (html.includes('向かい風') || html.includes('is-windDirection7')) {
      windDir = '向かい風';
    } else if (html.includes('横風')) {
      windDir = '横風';
    } else if (windSpeed === 0) {
      windDir = '無風';
    }

    // 波高
    const waveMatch = html.match(/波高\s*<\/span>\s*<span[^>]*>(\d+)cm?/i) || html.match(/(\d+)cm<\/span>/i);
    if (waveMatch) {
      waveHeight = Number(waveMatch[1]);
    }

    // 気温
    const tempMatch = html.match(/気温\s*<\/span>\s*<span[^>]*>(\d+\.?\d*)℃?/i);
    if (tempMatch) temp = Number(tempMatch[1]);

    // 水温
    const waterTempMatch = html.match(/水温\s*<\/span>\s*<span[^>]*>(\d+\.?\d*)℃?/i);
    if (waterTempMatch) waterTemp = Number(waterTempMatch[1]);

    const weather: WeatherData = {
      windSpeed,
      windDirection: windDir,
      waveHeight,
      temperature: temp,
      waterTemperature: waterTemp,
    };

    // 展示タイムの抽出 (各艇 td またはテキスト)
    const exTimes: (number | null)[] = [null, null, null, null, null, null];
    const exTimeMatches = Array.from(html.matchAll(/(\d\.\d{2})<\/td>/g)).map((m) => Number(m[1]));
    if (exTimeMatches.length >= 6) {
      for (let i = 0; i < 6; i++) {
        exTimes[i] = exTimeMatches[i];
      }
    }

    // スタート展示（進入・ST）の抽出
    const courses: number[] = [1, 2, 3, 4, 5, 6];
    const startTimings: (number | null)[] = [null, null, null, null, null, null];

    // スリット行を探す
    // 例: class="table1_boatImage1" またはテーブル
    const slitMatches = Array.from(html.matchAll(/([FL]?\.?\d{2})\s*<\/span>/g)).map(
      (m) => m[1]
    );
    if (slitMatches.length >= 6) {
      slitMatches.slice(0, 6).forEach((stStr, idx) => {
        let val = 0.15;
        if (stStr.startsWith('F')) {
          val = -Number(stStr.replace('F', '').replace('.', '0.'));
        } else if (stStr.startsWith('L')) {
          val = 0.5;
        } else {
          val = Number(stStr.replace('.', '0.'));
        }
        startTimings[idx] = val;
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

/**
 * メインのレース情報取得関数
 * 出走表と展示情報を取得し、統合された RaceInfo を返す
 */
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

  // 1. 出走表の取得 (Boatrace Open API)
  let programData = await fetchProgramFromOpenAPI(year, yyyymmdd, stadiumCode, raceNumber);

  // もし Open API が 404 の場合、boatrace.jp racelist からのフォールバックを試行
  if (!programData) {
    const racelistUrl = `https://boatrace.jp/owpc/pc/race/racelist?rno=${raceNumber}&jcd=${jcd2}&hd=${yyyymmdd}`;
    const racelistHtml = await fetchOfficialHtml(racelistUrl);
    if (racelistHtml) {
      // 簡易パース
      // タイトル抽出
      const titleMatch = racelistHtml.match(/<h2[^>]*class="heading2_title"[^>]*>([\s\S]*?)<\/h2>/i);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : `${raceNumber}R`;
      const deadlineMatch = racelistHtml.match(/締切予定\s*<\/span>\s*<span[^>]*>(\d{2}:\d{2})<\/span>/i);
      const closedAt = deadlineMatch ? deadlineMatch[1] : '';

      // 6艇分のプレースホルダー（選手名など）
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

  // もし出走表がどこからも取れない場合
  if (!programData) {
    throw new Error(
      `出走表が見つかりません。日付（${dateStr}）や開催場（${stadiumName}）の開催スケジュールをご確認ください。当日・直近の開催日のみ提供されている場合があります。`
    );
  }

  // 最新のリクエストか確認
  if (requestId !== activeRequestId) {
    throw new Error('Canceled request');
  }

  // 2. 展示情報の取得（直前情報）
  // 優先順位 1: Boatrace Open API
  let previewData = await fetchPreviewFromOpenAPI(year, yyyymmdd, stadiumCode, raceNumber);

  // 優先順位 2: 公式サイト boatrace.jp の HTML 解析
  if (!previewData) {
    const beforeinfoUrl = `https://boatrace.jp/owpc/pc/race/beforeinfo?rno=${raceNumber}&jcd=${jcd2}&hd=${yyyymmdd}`;
    const beforeHtml = await fetchOfficialHtml(beforeinfoUrl);
    if (beforeHtml) {
      previewData = parseBeforeInfoHtml(beforeHtml);
    }
  }

  // 最新のリクエストか確認
  if (requestId !== activeRequestId) {
    throw new Error('Canceled request');
  }

  // 統合
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
