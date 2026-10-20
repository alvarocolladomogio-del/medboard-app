import { useSyncExternalStore } from "react";
import type { Holiday } from "./holidays";
import { DEFAULT_SETTINGS, type Settings } from "./settings";
import type { IsoDate } from "./types";

const KEY = "medboard:settings:v1";
/** El cuadrante guardaba el nombre del centro antes de que existieran los ajustes. */
const LEGACY_BOARD_KEY = "medboard:v1";

/**
 * Festivos de Madrid capital de 2026 que la app traía escritos a mano.
 * Se conservan al migrar para que un cuadrante ya montado no cambie de días bloqueados.
 */
const LEGACY_HOLIDAYS_2026: Holiday[] = [
  { date: "2026-01-01" as IsoDate, name: "Año Nuevo", scope: "NACIONAL" },
  { date: "2026-01-06" as IsoDate, name: "Epifanía del Señor", scope: "NACIONAL" },
  { date: "2026-04-02" as IsoDate, name: "Jueves Santo", scope: "AUTONOMICO" },
  { date: "2026-04-03" as IsoDate, name: "Viernes Santo", scope: "NACIONAL" },
  { date: "2026-05-01" as IsoDate, name: "Fiesta del Trabajo", scope: "NACIONAL" },
  { date: "2026-05-02" as IsoDate, name: "Fiesta de la Comunidad de Madrid", scope: "AUTONOMICO" },
  { date: "2026-05-15" as IsoDate, name: "San Isidro", scope: "LOCAL" },
  { date: "2026-08-15" as IsoDate, name: "Asunción de la Virgen", scope: "NACIONAL" },
  { date: "2026-10-12" as IsoDate, name: "Fiesta Nacional de España", scope: "NACIONAL" },
  { date: "2026-11-02" as IsoDate, name: "Traslado de Todos los Santos", scope: "AUTONOMICO" },
  { date: "2026-11-09" as IsoDate, name: "Nuestra Señora de la Almudena", scope: "LOCAL" },
  { date: "2026-12-07" as IsoDate, name: "Traslado del Día de la Constitución", scope: "AUTONOMICO" },
  { date: "2026-12-08" as IsoDate, name: "Inmaculada Concepción", scope: "NACIONAL" },
  { date: "2026-12-25" as IsoDate, name: "Natividad del Señor", scope: "NACIONAL" },
];

const listeners = new Set<() => void>();
let state: Settings | null = null;

/** Quien ya usaba MedBoard conserva su centro, sus festivos y no ve el alta. */
function migrateLegacy(): Settings | null {
  try {
    const raw = localStorage.getItem(LEGACY_BOARD_KEY);
    if (!raw) return null;
    const board = JSON.parse(raw) as { center?: string; staff?: unknown[] };
    if (!board.staff?.length) return null;
    return {
      ...DEFAULT_SETTINGS,
      center: board.center ?? "",
      customHolidays: LEGACY_HOLIDAYS_2026,
      onboarded: true,
    };
  } catch {
    return null;
  }
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Settings;
      if (parsed?.version === 1) return { ...DEFAULT_SETTINGS, ...parsed };
    }
    const migrated = migrateLegacy();
    if (migrated) {
      persist(migrated);
      return migrated;
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

function persist(next: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

function commit(next: Settings): void {
  state = next;
  persist(next);
  listeners.forEach((l) => l());
}

const getSnapshot = (): Settings => (state ??= load());

export const settingsStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot,
  getServerSnapshot: () => DEFAULT_SETTINGS,

  get: getSnapshot,
  update: (patch: Partial<Settings>) => commit({ ...getSnapshot(), ...patch }),
  replace: (next: Settings) => commit({ ...DEFAULT_SETTINGS, ...next }),

  addCustomHoliday(holiday: Holiday) {
    const rest = getSnapshot().customHolidays.filter((h) => h.date !== holiday.date);
    commit({
      ...getSnapshot(),
      customHolidays: [...rest, holiday].sort((a, b) => a.date.localeCompare(b.date)),
      workdayExceptions: getSnapshot().workdayExceptions.filter((d) => d !== holiday.date),
    });
  },
  /** Marca un día festivo como laborable en este centro. */
  removeHoliday(date: IsoDate) {
    const s = getSnapshot();
    commit({
      ...s,
      customHolidays: s.customHolidays.filter((h) => h.date !== date),
      workdayExceptions: s.workdayExceptions.includes(date)
        ? s.workdayExceptions
        : [...s.workdayExceptions, date],
    });
  },
  reset: () => commit(DEFAULT_SETTINGS),
};

export const useSettings = (): Settings =>
  useSyncExternalStore(settingsStore.subscribe, settingsStore.getSnapshot, settingsStore.getServerSnapshot);
