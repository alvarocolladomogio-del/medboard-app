import type { Holiday, RegionCode } from "./holidays";
import type { AreaId, IsoDate, ShiftId } from "./types";

/** Lo que antes estaba escrito en el código y ahora configura cada centro. */

export interface ShiftDef {
  id: ShiftId;
  /** "Mañana" */
  label: string;
  /** Letra de la celda del cuadrante: "M" */
  short: string;
}

export interface AreaDef {
  id: AreaId;
  /** Nombre largo, el que sale en los PDF: "Familiar y Comunitaria" */
  label: string;
  /** Nombre corto para hablar del equipo: "Adultos" */
  team: string;
}

/** "Por la mañana tiene que haber 3 de adultos". `areaId` nulo = cuenta todo el turno. */
export interface RuleDef {
  id: string;
  shiftId: ShiftId;
  areaId: AreaId | null;
  required: number;
}

export interface Settings {
  version: 1;
  center: string;
  region: RegionCode;
  shifts: ShiftDef[];
  areas: AreaDef[];
  rules: RuleDef[];
  /** Festivos añadidos o corregidos a mano; mandan sobre los calculados. */
  customHolidays: Holiday[];
  /** Días que el cálculo da por festivos y en este centro se trabajan. */
  workdayExceptions: IsoDate[];
  /** Falso hasta que se completa el alta del centro. */
  onboarded: boolean;
}

export const DEFAULT_SHIFTS: ShiftDef[] = [
  { id: "M", label: "Mañana", short: "M" },
  { id: "T", label: "Tarde", short: "T" },
];

export const NIGHT_SHIFT: ShiftDef = { id: "N", label: "Noche", short: "N" };

export const DEFAULT_AREAS: AreaDef[] = [
  { id: "ADULTOS", label: "Familiar y Comunitaria", team: "Adultos" },
  { id: "PEDIATRIA", label: "Pediatría", team: "Pediatría" },
];

export const DEFAULT_RULES: RuleDef[] = [
  { id: "M_ADULTOS", shiftId: "M", areaId: "ADULTOS", required: 3 },
  { id: "M_PEDIATRIA", shiftId: "M", areaId: "PEDIATRIA", required: 1 },
  { id: "T_TOTAL", shiftId: "T", areaId: null, required: 2 },
];

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  center: "",
  region: "MD",
  shifts: DEFAULT_SHIFTS,
  areas: DEFAULT_AREAS,
  rules: DEFAULT_RULES,
  customHolidays: [],
  workdayExceptions: [],
  onboarded: false,
};

export const newRuleId = (): string => `R-${Date.now().toString(36)}`;

export const shiftById = (s: Settings, id: ShiftId): ShiftDef | undefined =>
  s.shifts.find((x) => x.id === id);

export const areaById = (s: Settings, id: AreaId): AreaDef | undefined =>
  s.areas.find((x) => x.id === id);

/** Turno por defecto de una ficha nueva: el primero configurado. */
export const firstShift = (s: Settings): ShiftId => s.shifts[0]?.id ?? "M";
export const firstArea = (s: Settings): AreaId => s.areas[0]?.id ?? "ADULTOS";

/** "Mañana · Adultos" o "Tarde" si la regla no mira el área. */
export function ruleLabel(s: Settings, rule: RuleDef): string {
  const shift = shiftById(s, rule.shiftId)?.label ?? rule.shiftId;
  const area = rule.areaId ? areaById(s, rule.areaId)?.team : null;
  return area ? `${shift} · ${area}` : shift;
}

/** Un id legible y estable a partir de un nombre escrito por la usuaria. */
export function slugId(name: string, taken: readonly string[] = []): string {
  const base =
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 24) || "ID";
  if (!taken.includes(base)) return base;
  for (let i = 2; ; i++) {
    const next = `${base}_${i}`;
    if (!taken.includes(next)) return next;
  }
}
