import { lockReason, workingDays } from "./calendar";
import { applyChange, getCell } from "./roster";
import { ruleLabel, type RuleDef, type Settings } from "./settings";
import { settingsStore } from "./settingsStore";
import { ABSENCE, type AreaId, type Board, type Change, type IsoDate, type ShiftId } from "./types";

/** Cobertura de un día, contada por turno y por turno+área. */
export interface Coverage {
  byShift: Record<ShiftId, number>;
  byShiftArea: Record<string, number>;
  absences: number;
  subs: number;
}

export interface Violation {
  ruleId: string;
  /** "Mañana · Adultos" */
  label: string;
  required: number;
  actual: number;
  message: string;
}

export interface DayStatus {
  date: IsoDate;
  coverage: Coverage;
  violations: Violation[];
  ok: boolean;
}

export interface Verdict {
  allowed: boolean;
  reason?: string;
  warning?: string;
  after?: DayStatus;
}

const slot = (shiftId: ShiftId, areaId: AreaId): string => `${shiftId}|${areaId}`;

export function coverage(board: Board, date: IsoDate): Coverage {
  const c: Coverage = { byShift: {}, byShiftArea: {}, absences: 0, subs: 0 };
  for (const s of board.staff) {
    const cell = getCell(board, s.id, date);
    if (!cell) continue;
    if (cell.subId) c.subs++;
    if (cell.code === ABSENCE) {
      c.absences++;
      continue;
    }
    c.byShift[cell.code] = (c.byShift[cell.code] ?? 0) + 1;
    const key = slot(cell.code, s.area);
    c.byShiftArea[key] = (c.byShiftArea[key] ?? 0) + 1;
  }
  return c;
}

export const countFor = (c: Coverage, rule: RuleDef): number =>
  rule.areaId ? (c.byShiftArea[slot(rule.shiftId, rule.areaId)] ?? 0) : (c.byShift[rule.shiftId] ?? 0);

export function validateDay(board: Board, date: IsoDate, settings: Settings = settingsStore.get()): DayStatus {
  const cov = coverage(board, date);
  const violations = settings.rules.flatMap((rule) => {
    const actual = countFor(cov, rule);
    if (actual >= rule.required) return [];
    const label = ruleLabel(settings, rule);
    return [{ ruleId: rule.id, label, required: rule.required, actual, message: `${label}: ${actual}/${rule.required}` }];
  });
  return { date, coverage: cov, violations, ok: violations.length === 0 };
}

export function validateMonth(board: Board, year: number, month: number): Map<IsoDate, DayStatus> {
  const settings = settingsStore.get();
  return new Map(workingDays(year, month).map((d) => [d, validateDay(board, d, settings)]));
}

const deficit = (s: DayStatus): number => s.violations.reduce((sum, v) => sum + (v.required - v.actual), 0);

const changeDate = (c: Change): IsoDate => c.date;

const isAbsenceEvent = (c: Change): boolean =>
  (c.kind === "set" && c.code === ABSENCE) || c.kind === "unassign";

/**
 * Bloqueo en tiempo real:
 *  - Fines de semana y festivos del centro: inmutables.
 *  - Cambios de turno, permutas y asignaciones: rechazados si empeoran el déficit de ratios.
 *  - Ausencias: hecho no bloqueable; se aceptan y el día pasa a estado crítico + pendiente de cobertura.
 */
export function evaluateChange(board: Board, change: Change): Verdict {
  const date = changeDate(change);
  const locked = lockReason(date);
  if (locked) return { allowed: false, reason: `${locked}. Día bloqueado.` };

  if (change.kind === "swap") {
    const a = getCell(board, change.a, date);
    const b = getCell(board, change.b, date);
    if (!a || !b || a.code === ABSENCE || b.code === ABSENCE) return { allowed: false, reason: "Permuta solo entre turnos activos." };
    if (a.code === b.code) return { allowed: false, reason: "Ambos profesionales tienen el mismo turno." };
  } else if (!getCell(board, change.staffId, date)) {
    return { allowed: false, reason: "Celda fuera del cuadrante." };
  }

  if (change.kind === "assign") {
    const busy = board.staff.find(
      (s) => s.id !== change.staffId && getCell(board, s.id, date)?.subId === change.subId,
    );
    if (busy) return { allowed: false, reason: `Suplente ya asignado ese día (cubre a ${busy.name}).` };
  }

  const before = validateDay(board, date);
  const after = validateDay(applyChange(board, change), date);

  if (isAbsenceEvent(change)) {
    return { allowed: true, after, warning: after.ok ? undefined : `Estado crítico · ${after.violations.map((v) => v.message).join(" · ")}` };
  }
  if (deficit(after) > deficit(before)) {
    return { allowed: false, after, reason: `Ratio incumplido · ${after.violations.map((v) => v.message).join(" · ")}` };
  }
  return { allowed: true, after };
}
