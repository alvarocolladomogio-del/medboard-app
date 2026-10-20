import type { IsoDate } from "./types";

/** Utilidades de fecha sin dependencias: las comparten calendario y festivos. */

export const toIso = (y: number, m: number, d: number): IsoDate =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` as IsoDate;

export const isoOf = (date: Date): IsoDate => toIso(date.getFullYear(), date.getMonth(), date.getDate());

export const parseIso = (iso: IsoDate): Date => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export const yearOf = (iso: IsoDate): number => Number(iso.slice(0, 4));
