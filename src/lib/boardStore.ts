import { useSyncExternalStore } from "react";
import { createSeedBoard } from "@/data/seed";
import { applyChange, ensureMonth, removeStaff, upsertStaff } from "./roster";
import type { Board, Change, Staff } from "./types";
import { evaluateChange, type Verdict } from "./ValidationEngine";

const KEY = "medboard:v1";
const SERVER_SNAPSHOT = createSeedBoard();
const listeners = new Set<() => void>();
let state: Board | null = null;
/** Estados anteriores a cada cambio del usuario (deshacer). */
const history: Board[] = [];
const HISTORY_MAX = 30;
let batching = false;

const remember = (board: Board): void => {
  if (batching) return;
  history.push(board);
  if (history.length > HISTORY_MAX) history.shift();
};

function load(): Board {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Board) : null;
    if (parsed?.version === 1) return parsed;
  } catch {}
  return createSeedBoard();
}

function commit(next: Board): void {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

const getSnapshot = (): Board => (state ??= load());

export const boardStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot,
  getServerSnapshot: () => SERVER_SNAPSHOT,

  dispatch(change: Change): Verdict {
    const board = getSnapshot();
    const verdict = evaluateChange(board, change);
    if (verdict.allowed) {
      remember(board);
      commit(applyChange(board, change));
    }
    return verdict;
  },
  preview: (change: Change): Verdict => evaluateChange(getSnapshot(), change),
  ensureMonth(year: number, month: number) {
    const board = getSnapshot();
    const next = ensureMonth(board, year, month);
    if (next !== board) commit(next);
  },
  /** Agrupa varios cambios en un solo paso de deshacer. */
  batch<T>(fn: () => T): T {
    const before = getSnapshot();
    batching = true;
    try {
      return fn();
    } finally {
      batching = false;
      if (getSnapshot() !== before) remember(before);
    }
  },
  undo(): boolean {
    const prev = history.pop();
    if (prev) commit(prev);
    return !!prev;
  },
  canUndo: (): boolean => history.length > 0,
  reset() {
    remember(getSnapshot());
    commit(createSeedBoard());
  },
  setCenter(center: string) {
    remember(getSnapshot());
    commit({ ...getSnapshot(), center });
  },
  /** Alta o edición de un profesional de la plantilla. */
  saveStaff(staff: Staff) {
    remember(getSnapshot());
    commit(upsertStaff(getSnapshot(), staff));
  },
  removeStaff(staffId: string) {
    remember(getSnapshot());
    commit(removeStaff(getSnapshot(), staffId));
  },
  /**
   * Sustituye el cuadrante y vacía el historial.
   * Se usa al terminar el alta: deshacer no puede llevarte a antes de existir el centro.
   */
  setBoard(board: Board) {
    history.length = 0;
    commit(board);
  },
  /** Restaurar una copia de seguridad (se puede deshacer). */
  restore(board: Board) {
    remember(getSnapshot());
    commit(board);
  },
};

export const useBoard = (): Board =>
  useSyncExternalStore(boardStore.subscribe, boardStore.getSnapshot, boardStore.getServerSnapshot);
