import { describe, expect, it } from "vitest";
import { DEFAULT_CONTRACT } from "@/data/seed";
import { importCorcho, type CorchoDb, type CorchoSuplente } from "@/lib/corchoImport";
import { applyChange, getCell } from "@/lib/roster";
import type { Board, IsoDate } from "@/lib/types";
import { AGENDA, CENTER, makeBoard } from "./_fixture";

const defaults = { center: CENTER, contract: DEFAULT_CONTRACT };

const SUBS: CorchoSuplente[] = [
  {
    id: "u-sofia", nombre: "Sofía", nombreCompleto: "Sofía Ejemplo Ejemplo", telefono: "600000001",
    lugarTrabajo: "Centro de Salud (externo)", tipoContrato: "Doblaje", especialidad: "Ambas", estrellas: 5, emoji: "🐬",
  },
  {
    id: "u-nueva", nombre: "Nueva", nombreCompleto: "Nueva Prueba", telefono: "600000002",
    especialidad: "Adultos", estrellas: 4, emoji: "🦉",
  },
];

const DB: CorchoDb = {
  profesionales: [
    { id: "ana", nombre: "Ana" },
    { id: "berta", nombre: "Berta" },
    { id: "clara", nombre: "Clara" },
  ],
  asignaciones: {
    "2026-11-04": [{ profesionalId: "berta", evento: "Vacaciones", turno: "Mañana" }],
    "2026-11-05": [{ profesionalId: "berta", evento: "Vacunación gripe", turno: "Mañana" }],
    "2026-10-12": [{ profesionalId: "ana", evento: "Vacaciones", turno: "Mañana" }],
    "2026-10-20": [{ profesionalId: "clara", evento: "Vacaciones", turno: "Mañana" }],
  },
  suplencias: {
    "2026-10-20": [{ profesionalId: "clara", suplenteId: "u-nueva", turno: "Mañana", fase: 2 }],
    "2026-10-14": [{ profesionalId: "ana", suplenteId: "u-sofia", turno: "Mañana", fase: 2 }],
  },
};

/** El 14/10 Ana ya la cubre Tomás en MedBoard: el importador no debe pisarlo. */
const baseBoard = (): Board => {
  const date = "2026-10-14" as IsoDate;
  return applyChange(applyChange(makeBoard(), { kind: "set", staffId: "T-01", date, code: "AUS" }), {
    kind: "assign", staffId: "T-01", date, subId: "S-02", shift: "M",
  });
};

describe("importar El Corcho", () => {
  const run = () => importCorcho(baseBoard(), AGENDA, DB, SUBS, defaults);

  it("completa la ficha existente sin pisar datos y añade las nuevas", () => {
    const { agenda, summary } = run();
    const sofia = agenda.find((s) => s.alias === "Sofía")!;
    expect(sofia).toMatchObject({
      telefono: "600000001",
      contrato: "Doblaje",
      centroHabitual: "Centro de Salud (externo)",
      especialidad: "AMBAS",
      estrellas: 4, // la valoración propia manda: El Corcho no la pisa
      emoji: "🐬",
    });
    expect(sofia.nombreCompleto).toBe("Sofía Ejemplo Ejemplo");
    expect(summary.newSubs).toEqual(["Nueva"]);
    expect(agenda).toHaveLength(AGENDA.length + 1);
  });

  it("apunta ausencias y suplencias en días laborables, y crea los meses que falten", () => {
    const { board, agenda, summary } = run();
    const nueva = agenda.find((s) => s.alias === "Nueva")!;
    expect(getCell(board, "T-02", "2026-11-04")?.code).toBe("AUS");
    expect(getCell(board, "T-02", "2026-11-05")?.code).toBe("M");
    // El 12 de octubre es festivo nacional: no se toca.
    expect(getCell(board, "T-01", "2026-10-12")).toBeUndefined();
    expect(getCell(board, "T-03", "2026-10-20")).toEqual({ code: "M", subId: nueva.id });
    expect(summary).toMatchObject({ absences: 2, coverages: 1 });
  });

  it("no cambia un suplente ya puesto ni duplica a quien ya cubre ese día", () => {
    const { board, summary } = run();
    expect(getCell(board, "T-01", "2026-10-14")?.subId).toBe("S-02");
    expect(summary.skipped).toEqual(["2026-10-14 Ana"]);
  });

  it("es idempotente", () => {
    const first = run();
    const again = importCorcho(first.board, first.agenda, DB, SUBS, defaults);
    expect(again.board).toEqual(first.board);
    expect(again.agenda).toEqual(first.agenda);
    expect(again.summary).toMatchObject({ newSubs: [], updatedSubs: [], absences: 0, coverages: 0 });
  });
});
