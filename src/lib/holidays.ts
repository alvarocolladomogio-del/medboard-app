import { addDays, isoOf, toIso } from "./dates";
import type { IsoDate } from "./types";

/**
 * Festivos calculados por año y comunidad autónoma.
 *
 * El calendario laboral se publica cada año por decreto y los traslados de fiestas que caen en
 * domingo cambian de una comunidad a otra. Lo que sale de aquí es una **propuesta**: la app la
 * ofrece y la usuaria la ajusta en Ajustes → Festivos. Nunca se presenta como fuente oficial.
 */

export type HolidayScope = "NACIONAL" | "AUTONOMICO" | "LOCAL";

export interface Holiday {
  date: IsoDate;
  name: string;
  scope: HolidayScope;
}

export const REGIONS = [
  { code: "AN", name: "Andalucía" },
  { code: "AR", name: "Aragón" },
  { code: "AS", name: "Asturias" },
  { code: "CN", name: "Canarias" },
  { code: "CB", name: "Cantabria" },
  { code: "CM", name: "Castilla-La Mancha" },
  { code: "CL", name: "Castilla y León" },
  { code: "CT", name: "Cataluña" },
  { code: "CE", name: "Ceuta" },
  { code: "EX", name: "Extremadura" },
  { code: "GA", name: "Galicia" },
  { code: "IB", name: "Illes Balears" },
  { code: "RI", name: "La Rioja" },
  { code: "MD", name: "Madrid" },
  { code: "ML", name: "Melilla" },
  { code: "MC", name: "Murcia" },
  { code: "NC", name: "Navarra" },
  { code: "PV", name: "País Vasco" },
  { code: "VC", name: "Comunitat Valenciana" },
] as const;

export type RegionCode = (typeof REGIONS)[number]["code"];

export const regionName = (code: RegionCode): string =>
  REGIONS.find((r) => r.code === code)?.name ?? code;

/** Domingo de Pascua (algoritmo gregoriano anónimo). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Fiestas nacionales no sustituibles, art. 37.2 del Estatuto de los Trabajadores. */
function nationalHolidays(year: number): Holiday[] {
  const easter = easterSunday(year);
  return [
    { date: toIso(year, 0, 1), name: "Año Nuevo", scope: "NACIONAL" },
    { date: toIso(year, 0, 6), name: "Epifanía del Señor", scope: "NACIONAL" },
    { date: isoOf(addDays(easter, -2)), name: "Viernes Santo", scope: "NACIONAL" },
    { date: toIso(year, 4, 1), name: "Fiesta del Trabajo", scope: "NACIONAL" },
    { date: toIso(year, 7, 15), name: "Asunción de la Virgen", scope: "NACIONAL" },
    { date: toIso(year, 9, 12), name: "Fiesta Nacional de España", scope: "NACIONAL" },
    { date: toIso(year, 10, 1), name: "Todos los Santos", scope: "NACIONAL" },
    { date: toIso(year, 11, 6), name: "Día de la Constitución", scope: "NACIONAL" },
    { date: toIso(year, 11, 8), name: "Inmaculada Concepción", scope: "NACIONAL" },
    { date: toIso(year, 11, 25), name: "Natividad del Señor", scope: "NACIONAL" },
  ];
}

/** Día propio de cada comunidad, mes 0-11. */
const REGION_DAY: Record<RegionCode, { month: number; day: number; name: string } | null> = {
  AN: { month: 1, day: 28, name: "Día de Andalucía" },
  AR: { month: 3, day: 23, name: "Día de Aragón" },
  AS: { month: 8, day: 8, name: "Día de Asturias" },
  CN: { month: 4, day: 30, name: "Día de Canarias" },
  CB: { month: 6, day: 28, name: "Día de las Instituciones de Cantabria" },
  CM: { month: 4, day: 31, name: "Día de Castilla-La Mancha" },
  CL: { month: 3, day: 23, name: "Día de Castilla y León" },
  CT: { month: 8, day: 11, name: "Diada de Catalunya" },
  CE: { month: 8, day: 2, name: "Día de Ceuta" },
  EX: { month: 8, day: 8, name: "Día de Extremadura" },
  GA: { month: 6, day: 25, name: "Día Nacional de Galicia" },
  IB: { month: 2, day: 1, name: "Día de les Illes Balears" },
  RI: { month: 5, day: 9, name: "Día de La Rioja" },
  MD: { month: 4, day: 2, name: "Fiesta de la Comunidad de Madrid" },
  ML: { month: 8, day: 17, name: "Día de Melilla" },
  MC: { month: 5, day: 9, name: "Día de la Región de Murcia" },
  NC: { month: 11, day: 3, name: "San Francisco Javier" },
  PV: null,
  VC: { month: 9, day: 9, name: "Día de la Comunitat Valenciana" },
};

/** Cataluña y la Comunitat Valenciana celebran Lunes de Pascua en lugar de Jueves Santo. */
const EASTER_MONDAY: readonly RegionCode[] = ["CT", "VC", "IB", "NC", "PV", "RI"];
const NO_MAUNDY_THURSDAY: readonly RegionCode[] = ["CT", "VC"];

function regionalHolidays(year: number, region: RegionCode): Holiday[] {
  const easter = easterSunday(year);
  const list: Holiday[] = [];

  if (!NO_MAUNDY_THURSDAY.includes(region)) {
    list.push({ date: isoOf(addDays(easter, -3)), name: "Jueves Santo", scope: "AUTONOMICO" });
  }
  if (EASTER_MONDAY.includes(region)) {
    list.push({ date: isoOf(addDays(easter, 1)), name: "Lunes de Pascua", scope: "AUTONOMICO" });
  }

  const own = REGION_DAY[region];
  if (own) list.push({ date: toIso(year, own.month, own.day), name: own.name, scope: "AUTONOMICO" });

  if (region === "GA") {
    list.push({ date: toIso(year, 4, 17), name: "Día das Letras Galegas", scope: "AUTONOMICO" });
  }
  if (region === "CT") {
    list.push({ date: toIso(year, 5, 24), name: "Sant Joan", scope: "AUTONOMICO" });
  }
  return list;
}

const byDate = (a: Holiday, b: Holiday): number => a.date.localeCompare(b.date);

/**
 * Propuesta de festivos del año: nacionales + autonómicos + los que añada la usuaria.
 * Los locales ganan sobre los calculados, para que un ajuste manual no se pierda.
 */
export function computeHolidays(
  year: number,
  region: RegionCode,
  custom: readonly Holiday[] = [],
): Holiday[] {
  const computed = [...nationalHolidays(year), ...regionalHolidays(year, region)];
  const merged = new Map<string, Holiday>();
  for (const h of computed) merged.set(h.date, h);
  for (const h of custom) {
    if (h.date.startsWith(String(year))) merged.set(h.date, h);
  }
  return [...merged.values()].sort(byDate);
}

/** Fechas que la usuaria ha marcado como laborables aunque el cálculo las dé por festivas. */
export const applyExceptions = (list: readonly Holiday[], workdays: readonly IsoDate[]): Holiday[] =>
  list.filter((h) => !workdays.includes(h.date));
