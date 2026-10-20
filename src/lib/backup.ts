import type { Board, SuplenteHabitual } from "./types";

/* Copia de seguridad cifrada (AES-GCM 256, clave derivada con PBKDF2-SHA256).
   Sustituye a la copia en la nube de Android, que está desactivada: el archivo
   puede viajar por correo o Drive sin exponer DNI ni teléfonos. */

const ITERATIONS = 310_000;
export const MIN_PASSWORD = 8;

export interface BackupData {
  board: Board;
  agenda: SuplenteHabitual[];
}

interface Envelope {
  app: "medboard";
  v: 1;
  iter: number;
  salt: string;
  iv: string;
  data: string;
}

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function key(password: string, salt: Uint8Array, iter: number, usage: KeyUsage): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: iter }, base, { name: "AES-GCM", length: 256 }, false, [usage]);
}

export async function encryptBackup(data: BackupData, password: string): Promise<string> {
  if (password.length < MIN_PASSWORD) throw new Error("short");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(data));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(password, salt, ITERATIONS, "encrypt"), plain));
  // Trozos para no desbordar la pila con String.fromCharCode en copias grandes.
  let data64 = "";
  for (let i = 0; i < cipher.length; i += 0x8000) data64 += String.fromCharCode(...cipher.subarray(i, i + 0x8000));
  const env: Envelope = { app: "medboard", v: 1, iter: ITERATIONS, salt: b64(salt), iv: b64(iv), data: btoa(data64) };
  return JSON.stringify(env);
}

/** Lanza "format" si el archivo no es una copia de MedBoard y "password" si la contraseña no es la correcta. */
export async function decryptBackup(text: string, password: string): Promise<BackupData> {
  let env: Envelope;
  try {
    env = JSON.parse(text);
  } catch {
    throw new Error("format");
  }
  if (env?.app !== "medboard" || env.v !== 1) throw new Error("format");
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(env.iv) }, await key(password, unb64(env.salt), env.iter, "decrypt"), unb64(env.data));
  } catch {
    throw new Error("password");
  }
  const data = JSON.parse(new TextDecoder().decode(plain)) as BackupData;
  if (data?.board?.version !== 1 || !Array.isArray(data.agenda)) throw new Error("format");
  return data;
}

/** Al restaurar no se borra ninguna ficha: las de la copia sustituyen a las del mismo id y el resto se conserva. */
export const mergeAgenda = (current: readonly SuplenteHabitual[], restored: readonly SuplenteHabitual[]): SuplenteHabitual[] => {
  const ids = new Set(restored.map((s) => s.id));
  return [...restored, ...current.filter((s) => !ids.has(s.id))];
};
