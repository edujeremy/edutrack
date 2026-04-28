// EduTrack 시간대 변환 유틸
// 정책:
//   - DB에는 lesson_date(date) + start_time(time) + end_time(time)을 모두 PST 기준으로 저장
//   - admin은 항상 PST 기준 입력·표시
//   - 학부모/강사는 profile.timezone 값으로 변환해서 표시

export const ADMIN_TIMEZONE = 'America/Los_Angeles';

export const SUPPORTED_TIMEZONES = [
  { value: 'America/Los_Angeles', label: '서부 (Pacific) — LA, San Francisco' },
  { value: 'America/Denver', label: '마운틴 (Mountain) — Denver, Phoenix' },
  { value: 'America/Chicago', label: '중부 (Central) — Chicago, Houston' },
  { value: 'America/New_York', label: '동부 (Eastern) — NYC, Boston' },
] as const;

export type SupportedTimezone = typeof SUPPORTED_TIMEZONES[number]['value'];

const TZ_SHORT: Record<SupportedTimezone, string> = {
  'America/Los_Angeles': 'PT',
  'America/Denver': 'MT',
  'America/Chicago': 'CT',
  'America/New_York': 'ET',
};

/**
 * PST(YYYY-MM-DD + HH:MM:SS) → 사용자 timezone의 표시 문자열
 * @param dateStr  e.g. '2026-04-28'
 * @param timeStr  e.g. '16:00:00'
 * @param userTz   e.g. 'America/New_York'
 * @returns { date: '2026-04-28', time: '19:00', label: 'ET', diffMinutes: 180 }
 */
export function convertFromPST(
  dateStr: string,
  timeStr: string,
  userTz: SupportedTimezone,
): { date: string; time: string; label: string; isoString: string } {
  // 입력 시간을 PST로 해석
  // "2026-04-28T16:00:00" + LA timezone offset
  const [hh, mm, ss = '00'] = timeStr.split(':');
  // PST 시각의 진짜 instant를 구하려면 toLocaleString trick 사용
  const isoLocal = `${dateStr}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`;

  // Date에 PST 텍스트로 만든 다음, 진짜 PST 시각으로 보정
  // 안전한 방법: Date를 UTC로 만들고 PST → UTC 변환을 timezone offset으로 처리
  const pstDate = new Date(isoLocal);
  // 위 Date는 사용자 브라우저 로컬 timezone 기준. PST instant로 바꾸려면 보정 필요.
  // 가장 안전한 방법: Intl.DateTimeFormat을 써서 PST의 같은 시각의 UTC offset을 얻고, 보정
  const pstOffsetMin = getTimezoneOffsetMinutes(isoLocal, ADMIN_TIMEZONE);
  // pstDate는 브라우저 로컬 시각으로 해석된 상태. 진짜 UTC instant = pstDate - browserLocal_offset
  // 그러나 Date(isoLocal)은 브라우저 로컬 timezone으로 해석되므로 결과는
  // 브라우저로컬instant. 이를 PST instant로 다시 만들려면:
  const browserOffset = pstDate.getTimezoneOffset(); // minutes (e.g. 420 for PST in browser of PST)
  // 우리가 원하는 건 isoLocal을 PST로 해석한 진짜 UTC instant
  // utcInstant = isoLocal as PST = isoLocal - pstOffset
  // pstOffset(positive when behind UTC) = -getTimezoneOffsetMinutes
  const utcMs = pstDate.getTime() - (browserOffset - pstOffsetMin) * 60_000;
  const utcDate = new Date(utcMs);

  // 이제 utcDate를 userTz로 표시
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: userTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(utcDate);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  let hour = get('hour');
  if (hour === '24') hour = '00';
  const time = `${hour}:${get('minute')}`;

  return {
    date,
    time,
    label: TZ_SHORT[userTz],
    isoString: utcDate.toISOString(),
  };
}

/**
 * 특정 timezone에서 isoLocal의 UTC offset (minutes, positive=behind UTC)
 * 예: PST=480, EST=300, PDT=420
 */
function getTimezoneOffsetMinutes(isoLocal: string, timeZone: string): number {
  const dt = new Date(isoLocal + 'Z'); // 일단 UTC로 해석
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
  });
  const parts = fmt.formatToParts(dt);
  const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT';
  // "GMT-7", "GMT-08:00", "GMT+5:30"
  const m = offsetPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 0;
  const sign = m[1] === '+' ? 1 : -1;
  const hours = parseInt(m[2], 10);
  const minutes = m[3] ? parseInt(m[3], 10) : 0;
  return -sign * (hours * 60 + minutes); // postive = behind UTC
}

/**
 * 사용자 timezone 표시용 짧은 라벨 (PT/MT/CT/ET)
 */
export function tzShortLabel(tz: SupportedTimezone): string {
  return TZ_SHORT[tz];
}

/**
 * "16:00:00" → "16:00" (admin 화면용 PST raw)
 */
export function trimTime(t: string | null | undefined): string {
  if (!t) return '';
  return t.slice(0, 5);
}
