/**
 * Get current timestamp in seconds
 */
export const nowInSeconds = (): number => {
  return Math.floor(Date.now() / 1000);
};

/**
 * Get current timestamp in milliseconds
 */
export const nowInMilliseconds = (): number => {
  return Date.now();
};

/**
 * Add seconds to current time and return timestamp in seconds
 */
export const addSeconds = (seconds: number): number => {
  return nowInSeconds() + seconds;
};

/**
 * Add minutes to current time and return timestamp in seconds
 */
export const addMinutes = (minutes: number): number => {
  return nowInSeconds() + minutes * 60;
};

/**
 * Add hours to current time and return timestamp in seconds
 */
export const addHours = (hours: number): number => {
  return nowInSeconds() + hours * 60 * 60;
};

/**
 * Add days to current time and return timestamp in seconds
 */
export const addDays = (days: number): number => {
  return nowInSeconds() + days * 24 * 60 * 60;
};

/**
 * Check if timestamp is expired
 */
export const isExpired = (timestamp: number): boolean => {
  return timestamp < nowInSeconds();
};

/**
 * Format date to ISO string
 */
export const toISOString = (date?: Date): string => {
  return (date || new Date()).toISOString();
};

/**
 * Format date to Y-m-d H:i:s
 */
export const formatDate = (
  input: Date | string | number | undefined | null,
  formatString: string = "yyyy-MM-dd HH:mm:ss",
): string => {
  if (!input) return "";
  const date = new Date(input);

  if (isNaN(date.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");

  const shortMonths = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const map: Record<string, string> = {
    yyyy: String(date.getFullYear()),
    MMM: shortMonths[date.getMonth()]!,
    MM: pad(date.getMonth() + 1),
    dd: pad(date.getDate()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds()),
  };

  return formatString.replace(/yyyy|MMM|MM|dd|HH|mm|ss/g, (matched) => {
    return map[matched] as string;
  });
};

/**
 * Menghitung selisih hari antara 2 tanggal
 */
export const differenceInDays = (
  laterDate: Date | string | number,
  earlierDate: Date | string | number,
): number => {
  const d1 = new Date(laterDate);
  const d2 = new Date(earlierDate);

  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;

  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;

  return Math.floor((utc1 - utc2) / msPerDay);
};

/**
 * Date object di awal hari (00:00:00.000)
 */
export const startOfDay = (date: Date | string): Date => {
  const result = new Date(date);

  result.setHours(0, 0, 0, 0);

  return result;
};

/**
 * Date object di akhir hari (23:59:59.999)
 */
export const endOfDay = (date: Date | string): Date => {
  const result = new Date(date);

  result.setHours(23, 59, 59, 999);

  return result;
};

/**
 * Get current runtime date equivalent to Laravel date('Y-m-d H:i:s')
 * using Asia/Jakarta (+07:00).
 */
export const nowInJakarta = (): Date => {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);

  now.setMilliseconds(0);

  return now;
};

export function toISO8601String(date: Date = new Date(), offsetHours = 7): string {
  // Hitung waktu berdasarkan timezone target (default WIB +07:00)
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const targetTime = new Date(utc + 3600000 * offsetHours);

  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = targetTime.getFullYear();
  const mm = pad(targetTime.getMonth() + 1);
  const dd = pad(targetTime.getDate());
  const hh = pad(targetTime.getHours());
  const mi = pad(targetTime.getMinutes());
  const ss = pad(targetTime.getSeconds());

  const sign = offsetHours >= 0 ? "+" : "-";
  const tzFormatted = `${sign}${pad(Math.abs(offsetHours))}:00`;

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}${tzFormatted}`;
}

const parseDateTime = (s?: string | null) => {
  if (!s) return new Date();
  // "YYYY-MM-DD HH:mm:ss" => "YYYY-MM-DDTHH:mm:ss"
  const isoLike = s.replace(" ", "T");
  const d = new Date(isoLike);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

export const formatEmailDate = (sqlDate?: string | null) => {
  const d = parseDateTime(sqlDate);
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  // "Mon, 20 Jan 2026 14:05"
  return `${get("weekday")}, ${get("day")} ${get("month")} ${get("year")} ${get("hour")}:${get("minute")}`;
};
