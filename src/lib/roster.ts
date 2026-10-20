import { workingDays } from "./calendar";
import type { Area, Board, Cell, Change, IsoDate, Shift, Staff, SuplenteHabitual } from "./types";

export const getCell = (board: Board, staffId: string, date: IsoDate): Cell | undefined =>
  board.roster[staffId]?.[date];

const withCell = (board: Board, staffId: string, date: IsoDate, cell: Cell): Board => ({
  ...board,
  roster: { ...board.roster, [staffId]: { ...board.roster[staffId], [date]: cell } },
});

export function applyChange(board: Board, change: Change): Board {
  switch (change.kind) {
    case "set":
      return withCell(board, change.staffId, change.date, { code: change.code });
    case "assign":
      return withCell(board, change.staffId, change.date, { code: change.shift, subId: change.subId });
    case "unassign":
      return withCell(board, change.staffId, change.date, { code: "AUS" });
    case "swap": {
      const a = getCell(board, change.a, change.date);
      const b = getCell(board, change.b, change.date);
      if (!a || !b) return board;
      return withCell(withCell(board, change.a, change.date, { ...a, code: b.code }), change.b, change.date, {
        ...b,
        code: a.code,
      });
    }
  }
}

export interface Slot {
  staff: Staff;
  date: IsoDate;
  shift: Shift;
  area: Area;
}

export interface CoverageEntry extends Slot {
  sub: SuplenteHabitual;
}

export function pendingSlots(board: Board, year: number, month: number): Slot[] {
  const days = workingDays(year, month);
  return board.staff.flatMap((staff) =>
    days
      .filter((date) => getCell(board, staff.id, date)?.code === "AUS")
      .map((date) => ({ staff, date, shift: staff.baseShift, area: staff.area })),
  );
}

export function coverageEntries(board: Board, agenda: readonly SuplenteHabitual[], year: number, month: number): CoverageEntry[] {
  const days = workingDays(year, month);
  const subs = new Map(agenda.map((s) => [s.id, s]));
  return board.staff.flatMap((staff) =>
    days.flatMap((date) => {
      const cell = getCell(board, staff.id, date);
      const sub = cell?.subId ? subs.get(cell.subId) : undefined;
      return sub && cell && cell.code !== "AUS"
        ? [{ staff, date, shift: cell.code, area: staff.area, sub }]
        : [];
    }),
  );
}

/** Ids de suplente con alguna jornada asignada en el cuadrante (no se pueden borrar de la agenda). */
export const assignedSubIds = (board: Board): Set<string> =>
  new Set(Object.values(board.roster).flatMap((row) => Object.values(row ?? {}).flatMap((c) => (c?.subId ? [c.subId] : []))));

export const groupBy = <T, K extends string>(items: readonly T[], key: (item: T) => K): Record<K, T[]> =>
  items.reduce(
    (acc, item) => {
      (acc[key(item)] ??= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );

/** Quita del cuadrante a un profesional y todas sus celdas. */
export function removeStaff(board: Board, staffId: string): Board {
  const roster = { ...board.roster };
  delete roster[staffId];
  return { ...board, staff: board.staff.filter((s) => s.id !== staffId), roster };
}

export function upsertStaff(board: Board, staff: Staff): Board {
  const exists = board.staff.some((s) => s.id === staff.id);
  return {
    ...board,
    staff: exists ? board.staff.map((s) => (s.id === staff.id ? { ...s, ...staff } : s)) : [...board.staff, staff],
  };
}

export function ensureMonth(board: Board, year: number, month: number): Board {
  const days = workingDays(year, month);
  const missing = board.staff.some((s) => days.some((d) => !board.roster[s.id]?.[d]));
  if (!missing) return board;
  const roster = { ...board.roster };
  for (const s of board.staff) {
    const row = { ...roster[s.id] };
    for (const d of days) row[d] ??= { code: s.baseShift };
    roster[s.id] = row;
  }
  return { ...board, roster };
}
