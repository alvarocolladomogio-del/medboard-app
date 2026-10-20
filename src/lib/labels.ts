import { areaById, shiftById } from "./settings";
import { settingsStore } from "./settingsStore";
import { ABSENCE, ANY_AREA, type AreaId, type Code, type Especialidad, type ShiftId } from "./types";
import type { Violation } from "./ValidationEngine";

/* Los nombres de turnos y áreas los pone cada centro en Ajustes. Si un identificador
   ya no existe (porque se borró el área), se enseña el propio identificador antes que nada. */

export const ABSENCE_NAME = "Ausencia";

export const shiftName = (id: ShiftId): string => shiftById(settingsStore.get(), id)?.label ?? id;

export const shiftShort = (id: ShiftId): string => shiftById(settingsStore.get(), id)?.short ?? id;

export const codeName = (code: Code): string => (code === ABSENCE ? ABSENCE_NAME : shiftName(code));

export const codeShort = (code: Code): string => (code === ABSENCE ? ABSENCE : shiftShort(code));

/** Nombre largo del área, el que sale en los PDF: "Familiar y Comunitaria". */
export const areaName = (id: AreaId): string => areaById(settingsStore.get(), id)?.label ?? id;

/** Nombre corto del equipo: "Adultos". */
export const areaTeam = (id: AreaId): string => areaById(settingsStore.get(), id)?.team ?? id;

/** Áreas que puede cubrir un suplente, en el orden en que se enseñan. */
export const especialidades = (): { id: Especialidad; label: string }[] => [
  ...settingsStore.get().areas.map((a) => ({ id: a.id as Especialidad, label: a.team })),
  { id: ANY_AREA as Especialidad, label: "Todas" },
];

export const especialidadName = (id: Especialidad): string =>
  id === ANY_AREA ? "Todas las áreas" : areaTeam(id);

/** "Falta 1 · mañana, adultos" */
export const missingText = (v: Violation): string => {
  const n = v.required - v.actual;
  return `Falta${n > 1 ? "n" : ""} ${n} · ${v.label.toLowerCase()}`;
};
