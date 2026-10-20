import { parseIso, toIso } from "./dates";
import { computeHolidays, type Holiday } from "./holidays";
import { settingsStore } from "./settingsStore";
import type { IsoDate } from "./types";

export type { Holiday } from "./holidays";
export { toIso } from "./dates";

const WEEKDAY_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const;
const WEEKDAY_LETTER = ["D", "L", "M", "X", "J", "V", "S"] as const;
export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const;

/* Los festivos dependen de los ajustes del centro, así que se calculan por año y se cachean
   hasta que alguien cambia de comunidad o toca el calendario. */
const cache = new Map<number, Holiday[]>();
settingsStore.subscribe(() => cache.clear());

/** Festivos que aplican a este centro en un año: calculados, corregidos a mano y sin los que se trabajan. */
export function holidaysOfYear(year: number): Holiday[] {
  const hit = cache.get(year);
  if (hit) return hit;
  const s = settingsStore.get();
  const list = computeHolidays(year, s.region, s.customHolidays).filter(
    (h) => !s.workdayExceptions.includes(h.date),
  );
  cache.set(year, list);
  return list;
}

const holidayOn = (iso: IsoDate): Holiday | undefined =>
  holidaysOfYear(Number(iso.slice(0, 4))).find((h) => h.date === iso);

export interface DayInfo {
  iso: IsoDate;
  day: number;
  letter: (typeof WEEKDAY_LETTER)[number];
  weekend: boolean;
  holiday?: Holiday;
  locked: boolean;
}

export function dayInfo(iso: IsoDate): DayInfo {
  const date = parseIso(iso);
  const dow = date.getDay();
  const weekend = dow === 0 || dow === 6;
  const holiday = holidayOn(iso);
  return { iso, day: date.getDate(), letter: WEEKDAY_LETTER[dow], weekend, holiday, locked: weekend || !!holiday };
}

export function monthDays(year: number, month: number): DayInfo[] {
  const total = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: total }, (_, i) => dayInfo(toIso(year, month, i + 1)));
}

export const workingDays = (year: number, month: number): IsoDate[] =>
  monthDays(year, month).filter((d) => !d.locked).map((d) => d.iso);

export const lockReason = (iso: IsoDate): string | null => {
  const info = dayInfo(iso);
  if (info.holiday) return `Festivo: ${info.holiday.name}`;
  return info.weekend ? "Fin de semana" : null;
};

/** "jue 29/10" */
export const shortDate = (iso: IsoDate): string => {
  const d = parseIso(iso);
  return `${WEEKDAY_SHORT[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const formatDates = (dates: readonly IsoDate[]): string => {
  const list = [...dates].sort().map(shortDate);
  return list.length <= 1 ? (list[0] ?? "") : `${list.slice(0, -1).join(", ")} y ${list.at(-1)}`;
};
