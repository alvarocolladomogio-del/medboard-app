import { describe, expect, it } from "vitest";
import { assignmentUri, closingUri, groupFallbackUri, normalizePhone, offerUri } from "@/lib/WhatsAppService";

const text = (uri: string) => decodeURIComponent(uri.split("?text=")[1]);
const base = { name: "Diana Patricia Díaz", phone: "600 123 456", dates: ["2026-10-29", "2026-10-30"] as const, shift: "M" as const, area: "ADULTOS" as const };

describe("mensajes de WhatsApp", () => {
  it("normaliza teléfonos españoles", () => {
    expect(normalizePhone("600 123 456")).toBe("34600123456");
    expect(normalizePhone("+34 600123456")).toBe("34600123456");
    expect(normalizePhone("12")).toBeNull();
  });
  it("los mensajes son cortos, usan el nombre de pila y llevan fechas", () => {
    for (const uri of [offerUri(base), assignmentUri(base), closingUri(base)]) {
      expect(uri.startsWith("https://wa.me/34600123456?text=")).toBe(true);
      expect(text(uri)).toContain("Diana");
      expect(text(uri)).not.toContain("Patricia");
      expect(text(uri)).toContain("jue 29/10 y vie 30/10");
      expect(text(uri).length).toBeLessThan(320);
    }
    expect(text(assignmentUri(base))).toContain("google.com/maps");
  });
  it("sin nombre no deja huecos raros", () => {
    expect(text(offerUri({ ...base, name: "" }))).toMatch(/^Hola 👋/);
  });
  it("el aviso al grupo va sin destinatario y agrupa por turno", () => {
    const uri = groupFallbackUri({ slots: [{ date: "2026-10-29", shift: "M", area: "ADULTOS" }, { date: "2026-10-30", shift: "T", area: "PEDIATRIA" }] });
    expect(uri.startsWith("https://wa.me/?text=")).toBe(true);
    expect(text(uri)).toContain("mañana · Familiar y Comunitaria: jue 29/10");
    expect(text(uri)).toContain("tarde · Pediatría: vie 30/10");
  });
});
