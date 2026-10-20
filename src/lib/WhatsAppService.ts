import { formatDates } from "./calendar";
import { areaName, shiftName } from "./labels";
import { settingsStore } from "./settingsStore";
import type { Area, IsoDate, Shift } from "./types";

/* El centro y los nombres de turno salen de los ajustes, así que se leen al construir
   cada mensaje y no al cargar el módulo. */
const shiftWord = (shift: Shift): string => shiftName(shift).toLowerCase();
const center = (): string => settingsStore.get().center.trim();
const place = (): string => center().replace(/^Centro de Salud\s+/i, "") || "el centro";

export const mapsUrl = (): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(center() || "centro de salud")}`;

/** 9 dígitos → prefijo España (34). Devuelve null si no es utilizable por wa.me. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "").replace(/^00/, "");
  if (/^[6789]\d{8}$/.test(digits)) return `34${digits}`;
  return /^\d{10,15}$/.test(digits) ? digits : null;
}

const waUri = (text: string, phone?: string): string => {
  const target = phone ? normalizePhone(phone) : null;
  return `https://wa.me/${target ?? ""}?text=${encodeURIComponent(text)}`;
};

const firstName = (name: string): string => name.trim().split(/\s+/)[0] || "";
const hello = (name: string): string => (firstName(name) ? `Hola, ${firstName(name)}` : "Hola");
const when = (dates: readonly IsoDate[]): string => `${dates.length > 1 ? "" : "el "}${formatDates(dates)}`;

export interface OfferInput {
  name: string;
  phone: string;
  dates: readonly IsoDate[];
  shift: Shift;
  area: Area;
}

/** F1 · Pregunta */
export function offerUri({ name, phone, dates, shift, area }: OfferInput): string {
  const text = `${hello(name)} 👋 ¿Podrías cubrirnos ${when(dates)} de ${shiftWord(shift)} en ${place()} (${areaName(area)})? Sin compromiso, dime lo que te venga bien. ¡Gracias!`;
  return waUri(text, phone);
}

/** F2 · Confirmación (turno / área / Maps) */
export function assignmentUri({ name, phone, dates, shift, area }: OfferInput): string {
  const text = [
    `¡Mil gracias${firstName(name) ? `, ${firstName(name)}` : ""}! 🙌 Te esperamos:`,
    `📅 ${formatDates(dates)} · ${shiftWord(shift)}`,
    `🩺 ${areaName(area)}`,
    `📍 ${mapsUrl()}`,
    "Cualquier cosa, aquí estoy.",
  ].join("\n");
  return waUri(text, phone);
}

/** F3 · Agradecimiento */
export function closingUri({ name, phone, dates }: Pick<OfferInput, "name" | "phone" | "dates">): string {
  const text = `Todo listo para ${when(dates)}${firstName(name) ? `, ${firstName(name)}` : ""}. Gracias de corazón por echarnos una mano 💙`;
  return waUri(text, phone);
}

export interface GroupOfferInput {
  slots: ReadonlyArray<{ date: IsoDate; shift: Shift; area: Area }>;
}

/** F4 · Aviso al grupo (sin destinatario: se elige el grupo en WhatsApp) */
export function groupFallbackUri({ slots }: GroupOfferInput): string {
  const { shifts, areas } = settingsStore.get();
  const lines = shifts.flatMap(({ id: shift }) =>
    areas.flatMap(({ id: area }) => {
      const dates = [...new Set(slots.filter((s) => s.shift === shift && s.area === area).map((s) => s.date))];
      return dates.length ? [`• ${shiftWord(shift)} · ${areaName(area)}: ${formatDates(dates)}`] : [];
    }),
  );
  const text = [`Hola 👋 Buscamos quien nos cubra en ${place()}:`, lines.join("\n"), "¿Te viene bien algún día? Escríbeme por privado. ¡Gracias!"].join("\n\n");
  return waUri(text);
}
