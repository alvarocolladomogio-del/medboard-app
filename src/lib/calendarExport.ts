import { formatDates, MONTHS } from "./calendar";
import { shiftName } from "./labels";
import { coverageEntries } from "./roster";
import type { Board, IsoDate, Shift, SuplenteHabitual } from "./types";

/* Exportar suplencias a Google Calendar: enlace con el evento ya relleno (sin cuentas ni permisos)
   y fichero .ics del mes para importarlo de una vez (calendar.google.com → Configuración → Importar). */

const compact = (iso: IsoDate) => iso.replaceAll("-", "");
const nextDay = (iso: IsoDate): string => {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + 1));
  return t.toISOString().slice(0, 10).replaceAll("-", "");
};

export interface CoverageEvent {
  subName: string;
  staffName: string;
  shift: Shift;
  dates: readonly IsoDate[];
  center: string;
}

const title = ({ subName, staffName, shift }: CoverageEvent) => `Suplencia ${shiftName(shift).toLowerCase()}: ${subName} cubre a ${staffName}`;

/** Evento de día completo del primer al último día; las fechas exactas van en la descripción. */
export function googleCalendarUrl(ev: CoverageEvent): string {
  const sorted = [...ev.dates].sort();
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title(ev),
    dates: `${compact(sorted[0])}/${nextDay(sorted[sorted.length - 1])}`,
    details: `Días: ${formatDates(sorted)}\nTurno de ${shiftName(ev.shift).toLowerCase()} · ${ev.center}`,
    location: ev.center,
    ctz: "Europe/Madrid",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

/** Un evento por jornada cubierta (RFC 5545, días completos). Sin DNI ni teléfonos: solo alias. */
export function monthIcs(board: Board, agenda: readonly SuplenteHabitual[], year: number, month: number, now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const events = coverageEntries(board, agenda, year, month).flatMap((e) => [
    "BEGIN:VEVENT",
    `UID:${e.date}-${e.staff.id}@medboard`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compact(e.date)}`,
    `DTEND;VALUE=DATE:${nextDay(e.date)}`,
    `SUMMARY:${esc(title({ subName: e.sub.alias, staffName: e.staff.name, shift: e.shift, dates: [e.date], center: board.center }))}`,
    `LOCATION:${esc(board.center)}`,
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
  ]);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MedBoard//Suplencias//ES",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${esc(`Suplencias ${MONTHS[month]} ${year}`)}`,
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
