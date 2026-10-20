import { workingDays } from "@/lib/calendar";
import { ABSENCE, type Board, type Cell, type Roster, type Shift, type Staff, type SuplenteHabitual } from "@/lib/types";

/**
 * MedBoard arranca vacío: el centro y la plantilla se dan de alta desde la app.
 *
 * Aquí no puede haber datos de personas reales. Lo único con nombres es la demo de abajo,
 * que es inventada y sirve para probar la app sin escribir nada propio.
 */

export const DEFAULT_CONTRACT = "Eventual por sustitución";

/** Agenda de suplentes vacía. */
export const EMPTY_SUPLENTES: SuplenteHabitual[] = [];

export const createEmptyBoard = (): Board => ({
  version: 1,
  center: "",
  staff: [],
  roster: {},
});

export const newStaff = (name: string, area: string, baseShift: Shift): Staff => ({
  id: `P-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
  code: "",
  name: name.trim(),
  area,
  baseShift,
});

/** Rellena un mes con el turno base de cada profesional. */
export function buildMonth(year: number, month: number, staff: Staff[], pattern?: Record<string, string>): Roster {
  const days = workingDays(year, month);
  return Object.fromEntries(
    staff.map((s) => [
      s.id,
      Object.fromEntries(days.map((iso, i) => [iso, decode(pattern?.[s.id]?.[i] ?? s.baseShift, s.baseShift)])),
    ]),
  );
}

const decode = (ch: string, base: Shift): Cell => {
  if (ch === "-" || ch === ABSENCE) return { code: ABSENCE };
  return { code: ch || base };
};

/* ------------------------------------------------------------------ */
/* Demo: nombres inventados, para probar la app sin datos propios.      */
/* ------------------------------------------------------------------ */

const DEMO_STAFF: Staff[] = [
  { id: "D-01", code: "D-01", name: "Ana", area: "ADULTOS", baseShift: "M" },
  { id: "D-02", code: "D-02", name: "Beatriz", area: "ADULTOS", baseShift: "M" },
  { id: "D-03", code: "D-03", name: "Carmen", area: "ADULTOS", baseShift: "M" },
  { id: "D-04", code: "D-04", name: "Daniel", area: "PEDIATRIA", baseShift: "M" },
  { id: "D-05", code: "D-05", name: "Elena", area: "ADULTOS", baseShift: "T" },
  { id: "D-06", code: "D-06", name: "Fernando", area: "ADULTOS", baseShift: "T" },
  { id: "D-07", code: "D-07", name: "Gloria", area: "PEDIATRIA", baseShift: "T" },
];

export const DEMO_SUPLENTES: SuplenteHabitual[] = [
  {
    id: "D-S1", alias: "Marta", nombreCompleto: "Marta Ejemplo Ejemplo", dni: "", telefono: "",
    activo: true, centroHabitual: "Centro de ejemplo", contrato: DEFAULT_CONTRACT,
    especialidad: "AMBAS", estrellas: 4, emoji: "🙂",
  },
  {
    id: "D-S2", alias: "Nuria", nombreCompleto: "Nuria Ejemplo Ejemplo", dni: "", telefono: "",
    activo: true, centroHabitual: "Centro de ejemplo", contrato: DEFAULT_CONTRACT,
    especialidad: "PEDIATRIA", estrellas: 5, emoji: "😊",
  },
];

/** Cuadrante de ejemplo del mes que se le pase, con una ausencia para ver la cobertura. */
export function createDemoBoard(year: number, month: number): Board {
  const roster = buildMonth(year, month, DEMO_STAFF);
  const days = workingDays(year, month);
  const target = days[2] ?? days[0];
  if (target) roster["D-02"] = { ...roster["D-02"], [target]: { code: ABSENCE } };
  return { version: 1, center: "Centro de Salud de ejemplo", staff: DEMO_STAFF, roster };
}

/** Arranque de la app: hasta que se completa el alta, el cuadrante está vacío. */
export const createSeedBoard = createEmptyBoard;
