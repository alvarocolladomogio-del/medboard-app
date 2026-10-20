import { describe, expect, it } from "vitest";
import { isoOf } from "@/lib/dates";
import { computeHolidays, easterSunday, REGIONS } from "@/lib/holidays";
import { slugId } from "@/lib/settings";
import type { IsoDate } from "@/lib/types";

const dates = (year: number, region: Parameters<typeof computeHolidays>[1]) =>
  computeHolidays(year, region).map((h) => h.date);

describe("festivos", () => {
  it("calcula el domingo de Pascua", () => {
    // isoOf lee la fecha local: toISOString la pasaría a UTC y en España daría el día anterior.
    expect(isoOf(easterSunday(2026))).toBe("2026-04-05");
    expect(isoOf(easterSunday(2027))).toBe("2027-03-28");
    expect(isoOf(easterSunday(2030))).toBe("2030-04-21");
  });

  it("incluye las fiestas nacionales de cualquier año", () => {
    for (const year of [2026, 2027, 2030]) {
      const list = dates(year, "MD");
      expect(list).toContain(`${year}-01-01`);
      expect(list).toContain(`${year}-05-01`);
      expect(list).toContain(`${year}-10-12`);
      expect(list).toContain(`${year}-12-25`);
    }
  });

  it("Jueves Santo y Viernes Santo caen donde deben", () => {
    const md = dates(2026, "MD");
    expect(md).toContain("2026-04-02"); // Jueves Santo
    expect(md).toContain("2026-04-03"); // Viernes Santo
  });

  it("Cataluña cambia Jueves Santo por Lunes de Pascua", () => {
    const ct = dates(2026, "CT");
    expect(ct).not.toContain("2026-04-02");
    expect(ct).toContain("2026-04-03");
    expect(ct).toContain("2026-04-06");
    expect(ct).toContain("2026-09-11");
  });

  it("cada comunidad trae su propio día", () => {
    expect(dates(2026, "MD")).toContain("2026-05-02");
    expect(dates(2026, "AN")).toContain("2026-02-28");
    expect(dates(2026, "GA")).toContain("2026-07-25");
    expect(dates(2026, "VC")).toContain("2026-10-09");
  });

  it("todas las comunidades devuelven una lista razonable", () => {
    for (const r of REGIONS) {
      const list = computeHolidays(2027, r.code);
      expect(list.length).toBeGreaterThanOrEqual(10);
      expect(list.length).toBeLessThanOrEqual(16);
      expect(new Set(list.map((h) => h.date)).size).toBe(list.length);
      expect(list.map((h) => h.date)).toEqual([...list.map((h) => h.date)].sort());
    }
  });

  it("un festivo propio manda sobre el calculado y los de otro año se ignoran", () => {
    const custom = [
      { date: "2026-05-15" as IsoDate, name: "San Isidro", scope: "LOCAL" as const },
      { date: "2026-01-01" as IsoDate, name: "Año Nuevo (así lo llamamos aquí)", scope: "LOCAL" as const },
      { date: "2027-05-15" as IsoDate, name: "De otro año", scope: "LOCAL" as const },
    ];
    const list = computeHolidays(2026, "MD", custom);
    expect(list.map((h) => h.date)).toContain("2026-05-15");
    expect(list.find((h) => h.date === "2026-01-01")?.name).toMatch(/así lo llamamos/);
    expect(list.map((h) => h.date)).not.toContain("2027-05-15");
  });
});

describe("identificadores de ajustes", () => {
  it("convierte un nombre en un id usable", () => {
    expect(slugId("Pediatría")).toBe("PEDIATRIA");
    expect(slugId("Familiar y Comunitaria")).toBe("FAMILIAR_Y_COMUNITARIA");
    expect(slugId("  ")).toBe("ID");
  });
  it("no repite un id ya usado", () => {
    expect(slugId("Adultos", ["ADULTOS"])).toBe("ADULTOS_2");
    expect(slugId("Adultos", ["ADULTOS", "ADULTOS_2"])).toBe("ADULTOS_3");
  });
});
