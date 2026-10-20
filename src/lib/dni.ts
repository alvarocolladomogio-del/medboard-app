const LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";
const NIE_PREFIX: Record<string, string> = { X: "0", Y: "1", Z: "2" };

export const normalizeDni = (raw: string): string => raw.replace(/[\s.-]/g, "").toUpperCase();

/** DNI (8 dígitos + letra) o NIE (X/Y/Z + 7 dígitos + letra) con letra de control correcta. */
export function isValidDni(raw: string): boolean {
  const dni = normalizeDni(raw);
  const m = /^([XYZ]|\d)(\d{7})([A-Z])$/.exec(dni);
  if (!m) return false;
  const num = Number((NIE_PREFIX[m[1]] ?? m[1]) + m[2]);
  return LETTERS[num % 23] === m[3];
}

/** Máscara de pantalla: '***' + últimos 4 dígitos y letra ('12345678Z' → '***5678Z'). */
export const maskDni = (raw: string): string => {
  const dni = normalizeDni(raw);
  return dni ? `***${dni.slice(-5)}` : "";
};

export type DniStatus = "verified" | "invalid" | "missing";

export const dniStatus = (raw: string): DniStatus => (!normalizeDni(raw) ? "missing" : isValidDni(raw) ? "verified" : "invalid");
