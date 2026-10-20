import { describe, expect, it } from "vitest";
import { dniStatus, isValidDni, maskDni, normalizeDni } from "@/lib/dni";

describe("dni", () => {
  it("valida DNI y NIE por letra de control", () => {
    expect(isValidDni("12345678Z")).toBe(true);
    expect(isValidDni("12345678A")).toBe(false);
    expect(isValidDni("X1234567L")).toBe(true);
    expect(isValidDni("1234")).toBe(false);
  });
  it("normaliza espacios, puntos y guiones", () => {
    expect(normalizeDni(" 12.345.678-z ")).toBe("12345678Z");
  });
  it("enmascara sin revelar el número completo", () => {
    expect(maskDni("12345678Z")).toBe("***5678Z");
    expect(maskDni("")).toBe("");
  });
  it("clasifica el estado", () => {
    expect(dniStatus("")).toBe("missing");
    expect(dniStatus("12345678Z")).toBe("verified");
    expect(dniStatus("12345678A")).toBe("invalid");
  });
});
