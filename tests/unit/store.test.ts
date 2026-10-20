import { beforeEach, describe, expect, it } from "vitest";
import { boardStore } from "@/lib/boardStore";
import { makeBoard } from "./_fixture";

describe("deshacer", () => {
  beforeEach(() => {
    boardStore.setBoard(makeBoard());
  });

  it("deshace un cambio y agrupa varios en un solo paso", () => {
    const start = boardStore.getSnapshot();
    boardStore.dispatch({ kind: "set", staffId: "T-01", date: "2026-10-20", code: "AUS" });
    expect(boardStore.getSnapshot().roster["T-01"]?.["2026-10-20"]?.code).toBe("AUS");
    expect(boardStore.undo()).toBe(true);
    expect(boardStore.getSnapshot()).toBe(start);

    boardStore.batch(() => {
      boardStore.dispatch({ kind: "set", staffId: "T-01", date: "2026-10-20", code: "AUS" });
      boardStore.dispatch({ kind: "assign", staffId: "T-01", date: "2026-10-20", subId: "S-01", shift: "M" });
    });
    expect(boardStore.getSnapshot().roster["T-01"]?.["2026-10-20"]).toEqual({ code: "M", subId: "S-01" });
    boardStore.undo();
    expect(boardStore.getSnapshot()).toBe(start);
    expect(boardStore.undo()).toBe(false);
  });

  it("un cambio bloqueado no entra en el historial", () => {
    expect(boardStore.dispatch({ kind: "set", staffId: "T-01", date: "2026-10-12", code: "T" }).allowed).toBe(false);
    expect(boardStore.canUndo()).toBe(false);
  });

  it("alta y baja de plantilla pasan por el historial", () => {
    const before = boardStore.getSnapshot().staff.length;
    boardStore.saveStaff({ id: "T-99", code: "", name: "Nueva", area: "ADULTOS", baseShift: "M" });
    expect(boardStore.getSnapshot().staff).toHaveLength(before + 1);
    boardStore.removeStaff("T-99");
    expect(boardStore.getSnapshot().staff).toHaveLength(before);
    boardStore.undo();
    expect(boardStore.getSnapshot().staff.some((s) => s.id === "T-99")).toBe(true);
  });
});
