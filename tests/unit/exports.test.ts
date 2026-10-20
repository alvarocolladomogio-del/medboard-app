import { describe, expect, it } from "vitest";
import { AGENDA, CENTER, makeBoard } from "./_fixture";
import { phoneText } from "@/lib/AdminPDFGenerator";
import { googleCalendarUrl, monthIcs } from "@/lib/calendarExport";
import { applyChange } from "@/lib/roster";

describe("Google Calendar", () => {
  it("el enlace abre un evento de día completo que acaba el día siguiente al último", () => {
    const url = new URL(googleCalendarUrl({ subName: "Diana", staffName: "Ana", shift: "M", dates: ["2026-10-13", "2026-10-09"], center: CENTER }));
    expect(url.host).toBe("calendar.google.com");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("dates")).toBe("20261009/20261014");
    expect(url.searchParams.get("text")).toBe("Suplencia mañana: Diana cubre a Ana");
  });
  it("el .ics trae una jornada por evento y nunca el DNI", () => {
    const sub = { ...AGENDA[0], dni: "12345678Z" };
    const board = applyChange(makeBoard(), { kind: "assign", staffId: "T-01", date: "2026-10-30", subId: sub.id, shift: "M" });
    const ics = monthIcs(board, [sub, ...AGENDA.slice(1)], 2026, 9, new Date("2026-10-18T10:00:00Z"));
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261030\r\nDTEND;VALUE=DATE:20261031");
    expect(ics).toContain("DTSTAMP:20261018T100000Z");
    expect(ics).not.toContain("12345678Z");
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBeGreaterThan(0);
  });
  it("teléfono legible en la hoja impresa", () => {
    expect(phoneText("34615602204")).toBe("615 602 204");
    expect(phoneText("+34 659-576-319")).toBe("659 576 319");
    expect(phoneText("")).toBe("—");
  });
});

describe("copia de seguridad cifrada", async () => {
  const { decryptBackup, encryptBackup, mergeAgenda } = await import("@/lib/backup");
  const data = { board: makeBoard(), agenda: [{ ...AGENDA[0], dni: "12345678Z" }] };
  it("cifra (sin DNI legible) y recupera con la contraseña", async () => {
    const file = await encryptBackup(data, "contraseña-larga");
    expect(file).not.toContain("12345678Z");
    expect(await decryptBackup(file, "contraseña-larga")).toEqual(data);
    await expect(decryptBackup(file, "otra-contraseña")).rejects.toThrow("password");
    await expect(decryptBackup("{}", "x")).rejects.toThrow("format");
    await expect(encryptBackup(data, "corta")).rejects.toThrow("short");
  });
  it("restaurar no borra fichas que no estén en la copia", () => {
    const merged = mergeAgenda(AGENDA, [{ ...AGENDA[0], alias: "Cambiada" }]);
    expect(merged).toHaveLength(AGENDA.length);
    expect(merged[0].alias).toBe("Cambiada");
  });
});
