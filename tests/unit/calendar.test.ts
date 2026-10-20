import { describe, expect, it } from "vitest";
import { formatDates, lockReason, monthDays, shortDate, workingDays } from "@/lib/calendar";

describe("calendario 2026", () => {
  it("octubre tiene 31 días y 21 laborables (12-O festivo)", () => {
    expect(monthDays(2026, 9)).toHaveLength(31);
    expect(workingDays(2026, 9)).toHaveLength(21);
    expect(workingDays(2026, 9)).not.toContain("2026-10-12");
  });
  it("bloquea fines de semana y festivos", () => {
    expect(lockReason("2026-10-10")).toBe("Fin de semana");
    expect(lockReason("2026-10-12")).toMatch(/Festivo/);
    expect(lockReason("2026-10-13")).toBeNull();
  });
  it("formatea fechas en castellano", () => {
    expect(shortDate("2026-10-29")).toBe("jue 29/10");
    expect(formatDates(["2026-10-30", "2026-10-29"])).toBe("jue 29/10 y vie 30/10");
  });
});
