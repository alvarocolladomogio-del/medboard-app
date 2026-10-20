import { buildMonth, DEFAULT_CONTRACT } from "@/data/seed";
import { applyChange } from "@/lib/roster";
import type { Board, IsoDate, Staff, SuplenteHabitual } from "@/lib/types";

/**
 * Datos de prueba inventados.
 *
 * Aquí nunca puede haber nombres, DNI ni teléfonos de personas reales: este repositorio
 * se publica. Si hace falta reproducir un caso real, se anonimiza antes de escribirlo.
 */

export const STAFF: Staff[] = [
  { id: "T-01", code: "T-01", name: "Ana", area: "ADULTOS", baseShift: "M" },
  { id: "T-02", code: "T-02", name: "Berta", area: "ADULTOS", baseShift: "M" },
  { id: "T-03", code: "T-03", name: "Clara", area: "ADULTOS", baseShift: "M" },
  { id: "T-04", code: "T-04", name: "Diego", area: "PEDIATRIA", baseShift: "M" },
  { id: "T-05", code: "T-05", name: "Eva", area: "ADULTOS", baseShift: "T" },
  { id: "T-06", code: "T-06", name: "Félix", area: "ADULTOS", baseShift: "T" },
  { id: "T-07", code: "T-07", name: "Gema", area: "PEDIATRIA", baseShift: "T" },
];

const sub = (id: string, alias: string, extra: Partial<SuplenteHabitual> = {}): SuplenteHabitual => ({
  id,
  alias,
  nombreCompleto: "",
  dni: "",
  telefono: "",
  activo: true,
  centroHabitual: "",
  contrato: DEFAULT_CONTRACT,
  ...extra,
});

export const AGENDA: SuplenteHabitual[] = [
  sub("S-01", "Sofía", { especialidad: "AMBAS", estrellas: 4 }),
  sub("S-02", "Tomás", { especialidad: "ADULTOS", estrellas: 3 }),
];

export const CENTER = "Centro de Salud de prueba";

/**
 * Cuadrante con dos faltas cubiertas, para los informes que listan suplencias:
 * una suplente con DNI y otra sin él, que es lo que la hoja de Administración marca como pendiente.
 */
export const makeCoveredBoard = (): Board => {
  const cover = (b: Board, staffId: string, date: IsoDate, subId: string): Board =>
    applyChange(applyChange(b, { kind: "set", staffId, date, code: "AUS" }), {
      kind: "assign", staffId, date, subId, shift: "M",
    });
  const uno = cover(makeBoard(), "T-01", "2026-10-13" as IsoDate, "S-01");
  return cover(uno, "T-02", "2026-10-14" as IsoDate, "S-02");
};

/** Cuadrante completo de un mes: cumple los mínimos por defecto en todos los días. */
export const makeBoard = (year = 2026, month = 9): Board => ({
  version: 1,
  center: CENTER,
  staff: STAFF,
  roster: buildMonth(year, month, STAFF),
});
