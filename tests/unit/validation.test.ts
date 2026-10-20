import { describe, expect, it } from "vitest";
import { applyChange, coverageEntries, ensureMonth, pendingSlots } from "@/lib/roster";
import { DEFAULT_RULES, DEFAULT_SETTINGS } from "@/lib/settings";
import { countFor, evaluateChange, validateDay, validateMonth } from "@/lib/ValidationEngine";
import { AGENDA, makeBoard } from "./_fixture";

const board = makeBoard();
const ruleM = DEFAULT_RULES.find((r) => r.id === "M_ADULTOS")!;

describe("motor de validación", () => {
  it("el cuadrante inicial de octubre cumple los mínimos", () => {
    expect([...validateMonth(board, 2026, 9).values()].every((s) => s.ok)).toBe(true);
  });

  it("bloquea cualquier cambio en fin de semana o festivo", () => {
    expect(evaluateChange(board, { kind: "set", staffId: "T-01", date: "2026-10-12", code: "T" }).allowed).toBe(false);
    expect(evaluateChange(board, { kind: "set", staffId: "T-01", date: "2026-10-10", code: "T" }).allowed).toBe(false);
  });

  it("una ausencia nunca se bloquea, aunque deje el día en crítico", () => {
    let b = board;
    for (const id of ["T-01", "T-02", "T-03", "T-04"]) b = applyChange(b, { kind: "set", staffId: id, date: "2026-10-13", code: "AUS" });
    const v = evaluateChange(b, { kind: "set", staffId: "T-05", date: "2026-10-13", code: "AUS" });
    expect(v.allowed).toBe(true);
    expect(v.warning).toMatch(/crítico/);
  });

  it("rechaza un cambio de turno que empeora el mínimo", () => {
    const b = board;
    expect(countFor(validateDay(b, "2026-10-13").coverage, ruleM)).toBe(ruleM.required);
    // Pasar a Diego de mañana a tarde no toca adultos, pero mover a una de adultos sí.
    expect(evaluateChange(b, { kind: "set", staffId: "T-01", date: "2026-10-13", code: "T" }).allowed).toBe(false);
  });

  it("permuta solo entre turnos distintos y activos", () => {
    expect(evaluateChange(board, { kind: "swap", date: "2026-10-13", a: "T-01", b: "T-02" }).allowed).toBe(false);
    expect(evaluateChange(board, { kind: "swap", date: "2026-10-13", a: "T-01", b: "T-05" }).allowed).toBe(true);
  });

  it("no deja asignar el mismo suplente a dos titulares el mismo día", () => {
    const b = applyChange(applyChange(board, { kind: "set", staffId: "T-01", date: "2026-10-13", code: "AUS" }), {
      kind: "assign", staffId: "T-01", date: "2026-10-13", subId: "S-01", shift: "M",
    });
    const v = evaluateChange(applyChange(b, { kind: "set", staffId: "T-02", date: "2026-10-13", code: "AUS" }), {
      kind: "assign", staffId: "T-02", date: "2026-10-13", subId: "S-01", shift: "M",
    });
    expect(v.allowed).toBe(false);
    expect(v.reason).toMatch(/ya asignado/);
  });

  it("los mínimos salen de los ajustes, no del código", () => {
    const b = applyChange(board, { kind: "set", staffId: "T-01", date: "2026-10-13", code: "AUS" });
    const sinRegla = validateDay(b, "2026-10-13", { ...DEFAULT_SETTINGS, rules: [] });
    expect(sinRegla.ok).toBe(true);
    expect(validateDay(b, "2026-10-13").ok).toBe(false);
  });
});

describe("huecos y coberturas", () => {
  it("lista las jornadas pendientes de cubrir", () => {
    const b = applyChange(board, { kind: "set", staffId: "T-01", date: "2026-10-13", code: "AUS" });
    const pending = pendingSlots(b, 2026, 9);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ date: "2026-10-13", shift: "M", area: "ADULTOS" });
  });

  it("lista las coberturas ya asignadas", () => {
    const b = applyChange(applyChange(board, { kind: "set", staffId: "T-01", date: "2026-10-13", code: "AUS" }), {
      kind: "assign", staffId: "T-01", date: "2026-10-13", subId: "S-01", shift: "M",
    });
    const entries = coverageEntries(b, AGENDA, 2026, 9);
    expect(entries).toHaveLength(1);
    expect(entries[0].sub.alias).toBe("Sofía");
  });

  it("ensureMonth rellena un mes nuevo sin tocar el anterior", () => {
    const next = ensureMonth(board, 2026, 10);
    expect(next).not.toBe(board);
    expect(next.roster["T-01"]?.["2026-11-04"]).toEqual({ code: "M" });
    expect(next.roster["T-01"]?.["2026-10-13"]).toEqual(board.roster["T-01"]?.["2026-10-13"]);
  });
});
