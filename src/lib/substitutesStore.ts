import { useSyncExternalStore } from "react";
import { DEFAULT_CONTRACT, EMPTY_SUPLENTES } from "@/data/seed";
import { normalizeDni } from "./dni";
import type { SuplenteHabitual } from "./types";

const KEY = "medboard:suplentes:v1";
/** Cuadrante anterior a la agenda propia: las fichas vivían en `board.substitutes`. */
const LEGACY_BOARD_KEY = "medboard:v1";
const listeners = new Set<() => void>();
let state: SuplenteHabitual[] | null = null;

interface LegacySubstitute {
  id: string;
  displayName: string;
  fullName: string;
  phone: string;
  dni: string;
  homeCenter: string;
  contract: string;
}

function migrateLegacy(): SuplenteHabitual[] | null {
  const raw = localStorage.getItem(LEGACY_BOARD_KEY);
  const subs = raw ? (JSON.parse(raw) as { substitutes?: LegacySubstitute[] }).substitutes : undefined;
  if (!subs?.length) return null;
  return subs.map((s) => ({
    id: s.id,
    alias: s.displayName,
    nombreCompleto: s.fullName,
    dni: normalizeDni(s.dni ?? ""),
    telefono: s.phone ?? "",
    activo: true,
    centroHabitual: s.homeCenter ?? "",
    contrato: s.contract || DEFAULT_CONTRACT,
  }));
}

function load(): SuplenteHabitual[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as SuplenteHabitual[];
    const migrated = migrateLegacy();
    if (migrated) {
      persist(migrated);
      return migrated;
    }
  } catch {}
  return EMPTY_SUPLENTES;
}

function persist(next: SuplenteHabitual[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

function commit(next: SuplenteHabitual[]): void {
  state = next;
  persist(next);
  listeners.forEach((l) => l());
}

const getSnapshot = (): SuplenteHabitual[] => (state ??= load());

export const newSuplente = (): SuplenteHabitual => ({
  id: `S-${Date.now().toString(36)}`,
  alias: "Nuevo",
  nombreCompleto: "",
  dni: "",
  telefono: "",
  activo: true,
  centroHabitual: "",
  contrato: DEFAULT_CONTRACT,
});

/** CRUD local de la Agenda de Suplentes Habituales. */
export const substitutesStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot,
  getServerSnapshot: () => EMPTY_SUPLENTES,

  list: getSnapshot,
  get: (id: string): SuplenteHabitual | undefined => getSnapshot().find((s) => s.id === id),
  create(sub: SuplenteHabitual = newSuplente()): SuplenteHabitual {
    commit([...getSnapshot(), sub]);
    return sub;
  },
  update(id: string, patch: Partial<Omit<SuplenteHabitual, "id">>) {
    const next = { ...patch, ...(patch.dni !== undefined && { dni: normalizeDni(patch.dni) }) };
    commit(getSnapshot().map((s) => (s.id === id ? { ...s, ...next } : s)));
  },
  remove: (id: string) => commit(getSnapshot().filter((s) => s.id !== id)),
  replaceAll: (list: SuplenteHabitual[]) => commit(list),
};

export const useSuplentes = (): SuplenteHabitual[] =>
  useSyncExternalStore(substitutesStore.subscribe, substitutesStore.getSnapshot, substitutesStore.getServerSnapshot);
