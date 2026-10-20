import { buildMonth, DEFAULT_CONTRACT } from "@/data/seed";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import type { Board, IsoDate, Staff, SuplenteHabitual } from "@/lib/types";

/**
 * Centro de prueba para los tests de navegador. Nombres inventados.
 *
 * Se escribe directamente en localStorage antes de cargar la página, así que los tests
 * entran con un cuadrante conocido y sin pasar por el alta. El alta tiene su propio test.
 */

const YEAR = 2026;
const MONTH = 9; // octubre

const staff: Staff[] = [
  { id: "E-01", code: "E-01", name: "Ana", area: "ADULTOS", baseShift: "M" },
  { id: "E-02", code: "E-02", name: "Berta", area: "ADULTOS", baseShift: "M" },
  { id: "E-03", code: "E-03", name: "Clara", area: "ADULTOS", baseShift: "M" },
  { id: "E-04", code: "E-04", name: "Diana", area: "ADULTOS", baseShift: "M" },
  { id: "E-05", code: "E-05", name: "Elia", area: "ADULTOS", baseShift: "M" },
  { id: "E-06", code: "E-06", name: "Fátima", area: "PEDIATRIA", baseShift: "M" },
  { id: "E-07", code: "E-07", name: "Gala", area: "ADULTOS", baseShift: "T" },
  { id: "E-08", code: "E-08", name: "Hugo", area: "ADULTOS", baseShift: "T" },
  { id: "E-09", code: "E-09", name: "Irene", area: "PEDIATRIA", baseShift: "T" },
  { id: "E-10", code: "E-10", name: "Julia", area: "ADULTOS", baseShift: "T" },
];

const sub = (id: string, alias: string, extra: Partial<SuplenteHabitual> = {}): SuplenteHabitual => ({
  id, alias, nombreCompleto: `${alias} Ejemplo Ejemplo`, dni: "", telefono: "600000000",
  activo: true, centroHabitual: "Centro de ejemplo", contrato: DEFAULT_CONTRACT, ...extra,
});

export const agenda: SuplenteHabitual[] = [
  sub("X-01", "Sofía", { especialidad: "AMBAS", estrellas: 5, emoji: "🐬" }),
  sub("X-02", "Tomás", { especialidad: "ADULTOS", estrellas: 4, emoji: "🦉" }),
  sub("X-03", "Nadia", { especialidad: "PEDIATRIA", estrellas: 3, emoji: "🦊" }),
];

const iso = (day: number): IsoDate => `${YEAR}-10-${String(day).padStart(2, "0")}` as IsoDate;

/** Faltas cubiertas: el titular conserva su turno y lleva suplente. */
const COVERED: Array<[staffId: string, day: number, subId: string]> = [
  ["E-01", 13, "X-01"],
  ["E-01", 14, "X-01"],
  ["E-02", 20, "X-02"],
  ["E-03", 6, "X-01"],
  ["E-03", 7, "X-01"],
  ["E-07", 5, "X-02"],
];

/** Faltas sin cubrir. */
const UNCOVERED: Array<[staffId: string, day: number]> = [
  ["E-04", 13],
  ["E-04", 27],
  ["E-04", 28],
  ["E-08", 21],
  ["E-09", 22],
];

export function makeBoard(): Board {
  const roster = buildMonth(YEAR, MONTH, staff);
  for (const [staffId, day, subId] of COVERED) {
    const person = staff.find((s) => s.id === staffId)!;
    roster[staffId] = { ...roster[staffId], [iso(day)]: { code: person.baseShift, subId } };
  }
  for (const [staffId, day] of UNCOVERED) {
    roster[staffId] = { ...roster[staffId], [iso(day)]: { code: "AUS" } };
  }
  return { version: 1, center: "Centro de Salud de prueba", staff, roster };
}

export const CENTER = "Centro de Salud de prueba";
export const SUPLENCIAS = COVERED.length;
export const SIN_CUBRIR = UNCOVERED.length;
export const PCT = Math.round((SUPLENCIAS / (SUPLENCIAS + SIN_CUBRIR)) * 100);

/** Lo que se escribe en localStorage antes de cargar la página. */
export const storage = () => ({
  "medboard:settings:v1": JSON.stringify({ ...DEFAULT_SETTINGS, center: CENTER, onboarded: true }),
  "medboard:v1": JSON.stringify(makeBoard()),
  "medboard:suplentes:v1": JSON.stringify(agenda),
});
