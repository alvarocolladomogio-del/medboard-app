import { describe, expect, it } from "vitest";
import { AGENDA, makeBoard, makeCoveredBoard } from "./_fixture";
import { compactDates, generateAdminPdf } from "@/lib/AdminPDFGenerator";
import { workingDays } from "@/lib/calendar";
import { generateRosterPdf } from "@/lib/PDFGenerator";

const pdfText = async (blob: Blob) => Buffer.from(await blob.arrayBuffer()).toString("latin1");

describe("PDF", () => {
  it("agrupa días laborables consecutivos en rangos", () => {
    const w = workingDays(2026, 9);
    expect(compactDates(["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-20"], w)).toBe("05–07/10, 20/10");
    expect(compactDates(["2026-10-09", "2026-10-13"], w)).toBe("09–13/10");
  });
  it("la hoja de Administración incluye DNI y marca los pendientes", async () => {
    const agenda = AGENDA.map((s, i) => (i === 0 ? { ...s, dni: "12345678Z", telefono: "600123456" } : s));
    const raw = await pdfText(await generateAdminPdf(makeCoveredBoard(), agenda, 2026, 9));
    expect(raw.startsWith("%PDF")).toBe(true);
    expect(raw).toContain("12345678Z");
    expect(raw).toContain("PENDIENTE");
    expect(raw).toContain("Firma y sello");
    expect(raw).not.toMatch(/\d+(\.\d+)? \d+(\.\d+)? \d+(\.\d+)? rg/); // sin color: solo grises
  });
  it("genera el cuadrante", async () => {
    const raw = await pdfText(await generateRosterPdf(makeBoard(), AGENDA, 2026, 9));
    expect(raw.startsWith("%PDF")).toBe(true);
    expect(raw).toContain("CUADRANTE OCTUBRE 2026");
  });
});
