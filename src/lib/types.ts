/** Áreas y turnos los define cada centro en Ajustes: aquí solo son identificadores. */
export type AreaId = string;
export type ShiftId = string;
export type Area = AreaId;
export type Shift = ShiftId;

/**
 * Única marca de ausencia: no existe subtipo (baja, permiso, vacaciones) en el modelo.
 * Es una decisión de minimización del art. 5.1.c del RGPD: sin motivo no hay dato de salud.
 * No añadir subtipos sin releer `docs/SEGURIDAD.md`.
 */
export const ABSENCE = "AUS";
export type Absence = typeof ABSENCE;
export type Code = ShiftId | Absence;

export const isAbsence = (code: Code): boolean => code === ABSENCE;
export type IsoDate = `${number}-${string}-${string}`;

export interface Staff {
  id: string;
  code: string;
  name: string;
  area: Area;
  baseShift: Shift;
  vacancy?: boolean;
}

/** Ficha de la agenda de suplentes habituales · persistida aparte del cuadrante (substitutesStore). */
export interface SuplenteHabitual {
  id: string;
  nombreCompleto: string;
  /** Guardado completo (ej. '12345678Z'); en pantalla solo se muestra enmascarado. */
  dni: string;
  telefono: string;
  activo: boolean;
  /** Nombre corto para la celda del cuadrante. */
  alias: string;
  centroHabitual: string;
  contrato: string;
  /** Equipo que puede cubrir (importado de El Corcho); sin dato = cualquiera. */
  especialidad?: Especialidad;
  /** Valoración 1–5 de la supervisora. */
  estrellas?: number;
  /** Avatar de la agenda. */
  emoji?: string;
}

/** Área que puede cubrir un suplente: una de las del centro, o "AMBAS" (cualquiera). */
export const ANY_AREA = "AMBAS";
export type Especialidad = AreaId | typeof ANY_AREA;

export interface Cell {
  code: Code;
  subId?: string;
}

export type Roster = Record<string, Partial<Record<IsoDate, Cell>>>;

export interface Board {
  version: 1;
  center: string;
  staff: Staff[];
  roster: Roster;
}

export type Change =
  | { kind: "set"; staffId: string; date: IsoDate; code: Code }
  | { kind: "assign"; staffId: string; date: IsoDate; subId: string; shift: Shift }
  | { kind: "unassign"; staffId: string; date: IsoDate }
  | { kind: "swap"; date: IsoDate; a: string; b: string };
