import { dayInfo } from "./calendar";
import { applyChange, ensureMonth, getCell } from "./roster";
import type { Board, Especialidad, IsoDate, Shift, SuplenteHabitual } from "./types";

/* Traspaso desde El Corcho (App_Corcho, localStorage `elcorcho_<centro>_db` y `_suplentes`).
   Solo añade: nunca pisa un dato que ya exista en MedBoard. */

export interface CorchoSuplente {
  id: string;
  nombre: string;
  nombreCompleto?: string;
  telefono?: string;
  lugarTrabajo?: string;
  tipoContrato?: string;
  especialidad?: string;
  estrellas?: number;
  emoji?: string;
  activo?: boolean;
  dni?: string;
}

interface CorchoEvento {
  profesionalId: string;
  evento?: string;
  turno?: string;
}

interface CorchoSuplencia {
  profesionalId: string;
  suplenteId: string;
  turno?: string;
  fase?: number;
}

export interface CorchoDb {
  profesionales: { id: string; nombre: string }[];
  asignaciones?: Record<string, CorchoEvento[]>;
  suplencias?: Record<string, CorchoSuplencia[]>;
}

export interface ImportSummary {
  newSubs: string[];
  updatedSubs: string[];
  absences: number;
  coverages: number;
  skipped: string[];
}

/** Eventos de El Corcho que dejan el puesto vacío (0 h de cómputo, habilitan suplencia). */
const ABSENCE_EVENTS = new Set(["Vacaciones", "Baja", "Permiso", "Ausencia", "Libre disposición"]);
const ESPECIALIDAD: Record<string, Especialidad> = { Adultos: "ADULTOS", Pediatría: "PEDIATRIA", Ambas: "AMBAS" };
const SHIFT: Record<string, Shift> = { Mañana: "M", Tarde: "T" };

const norm = (s = ""): string =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const firstWord = (s = ""): string => norm(s).split(/[\s.]+/)[0] ?? "";

export function importCorcho(
  board: Board,
  agenda: readonly SuplenteHabitual[],
  db: CorchoDb,
  suplentes: readonly CorchoSuplente[],
  defaults: { center: string; contract: string },
): { board: Board; agenda: SuplenteHabitual[]; summary: ImportSummary } {
  const summary: ImportSummary = { newSubs: [], updatedSubs: [], absences: 0, coverages: 0, skipped: [] };

  // 1 · Agenda: se empareja por nombre de pila; los campos vacíos o por defecto se completan.
  const next = agenda.map((s) => ({ ...s }));
  const subIdMap = new Map<string, string>();
  for (const c of suplentes) {
    const match = next.find((s) => firstWord(s.alias) === firstWord(c.nombre) || norm(s.nombreCompleto) === norm(c.nombreCompleto));
    const extra = {
      especialidad: c.especialidad ? ESPECIALIDAD[c.especialidad] : undefined,
      estrellas: c.estrellas,
      emoji: c.emoji,
    };
    if (match) {
      const before = JSON.stringify(match);
      match.telefono ||= c.telefono ?? "";
      match.dni ||= c.dni ?? "";
      match.nombreCompleto ||= c.nombreCompleto ?? "";
      if (c.lugarTrabajo && (!match.centroHabitual || match.centroHabitual === defaults.center)) match.centroHabitual = c.lugarTrabajo;
      if (c.tipoContrato && (!match.contrato || match.contrato === defaults.contract)) match.contrato = c.tipoContrato;
      match.especialidad ??= extra.especialidad;
      match.estrellas ??= extra.estrellas;
      match.emoji ??= extra.emoji;
      if (JSON.stringify(match) !== before) summary.updatedSubs.push(match.alias);
      subIdMap.set(c.id, match.id);
    } else {
      const id = `S-${firstWord(c.nombre).toUpperCase()}-${c.id.slice(0, 4)}`;
      next.push({
        id,
        alias: c.nombre,
        nombreCompleto: c.nombreCompleto ?? "",
        dni: c.dni ?? "",
        telefono: c.telefono ?? "",
        activo: c.activo ?? true,
        centroHabitual: c.lugarTrabajo ?? "",
        contrato: c.tipoContrato || defaults.contract,
        ...extra,
      });
      summary.newSubs.push(c.nombre);
      subIdMap.set(c.id, id);
    }
  }

  // 2 · Cuadrante: ausencias y suplencias en días laborables, sin pisar lo que ya hay.
  const staffMap = new Map(db.profesionales.flatMap((p) => {
    const s = board.staff.find((x) => norm(x.name) === norm(p.nombre));
    return s ? [[p.id, s] as const] : [];
  }));
  const dates = [...new Set([...Object.keys(db.asignaciones ?? {}), ...Object.keys(db.suplencias ?? {})])].sort() as IsoDate[];
  let out = board;
  for (const date of dates) {
    if (dayInfo(date).locked) continue;
    const [y, m] = date.split("-").map(Number);
    out = ensureMonth(out, y, m - 1);

    for (const ev of db.asignaciones?.[date] ?? []) {
      const staff = staffMap.get(ev.profesionalId);
      if (!staff || !ev.evento || !ABSENCE_EVENTS.has(ev.evento)) continue;
      const cell = getCell(out, staff.id, date);
      if (cell && cell.code !== "AUS" && !cell.subId) {
        out = applyChange(out, { kind: "set", staffId: staff.id, date, code: "AUS" });
        summary.absences++;
      }
    }

    for (const sp of db.suplencias?.[date] ?? []) {
      const staff = staffMap.get(sp.profesionalId);
      const subId = subIdMap.get(sp.suplenteId);
      const shift = SHIFT[sp.turno ?? ""] ?? staff?.baseShift;
      if (!staff || !subId || !shift || (sp.fase ?? 2) < 2) continue;
      const cell = getCell(out, staff.id, date);
      if (cell?.subId === subId) continue;
      const busy = out.staff.find((s) => s.id !== staff.id && getCell(out, s.id, date)?.subId === subId);
      if (cell?.subId || busy) {
        summary.skipped.push(`${date} ${staff.name}`);
        continue;
      }
      out = applyChange(out, { kind: "assign", staffId: staff.id, date, subId, shift });
      summary.coverages++;
    }
  }

  return { board: out, agenda: next, summary };
}
