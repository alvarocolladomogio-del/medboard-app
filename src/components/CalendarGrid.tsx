"use client";

import { memo, useState, type KeyboardEvent } from "react";
import { holidaysOfYear, shortDate, type DayInfo } from "@/lib/calendar";
import { dniStatus, maskDni } from "@/lib/dni";
import { ABSENCE, type Board, type Cell, type Code, type IsoDate, type Staff, type SuplenteHabitual } from "@/lib/types";
import { areaTeam, codeShort } from "@/lib/labels";
import type { Settings } from "@/lib/settings";
import { countFor, type DayStatus } from "@/lib/ValidationEngine";
import { ruleLabel } from "@/lib/settings";
import { useSettings } from "@/lib/settingsStore";

interface Props {
  board: Board;
  agenda: readonly SuplenteHabitual[];
  days: DayInfo[];
  statuses: Map<IsoDate, DayStatus>;
  selected?: { staffId: string; date: IsoDate };
  onOpen: (staffId: string, date: IsoDate) => void;
  onQuick: (staffId: string, date: IsoDate, code: Code) => void;
}

const ABSENCE_STYLE = "bg-salmon-soft text-salmon-ink ring-1 ring-inset ring-salmon/60";

/* Hasta cuatro turnos con color propio; a partir de ahí se repite la paleta. */
const SHIFT_STYLES = [
  "bg-shift-m text-shift-m-ink",
  "bg-shift-t text-shift-t-ink",
  "bg-shift-n text-shift-n-ink",
  "bg-shift-x text-shift-x-ink",
] as const;

const shiftStyle = (settings: Settings, code: Code): string => {
  if (code === ABSENCE) return ABSENCE_STYLE;
  const i = settings.shifts.findIndex((s) => s.id === code);
  return SHIFT_STYLES[(i < 0 ? 0 : i) % SHIFT_STYLES.length];
};

/** Atajos de teclado: la inicial de cada turno, y «a» para ausencia. */
const keyCodes = (settings: Settings): Record<string, Code> => {
  const map: Record<string, Code> = { a: ABSENCE };
  for (const s of settings.shifts) {
    const key = (s.short || s.id).slice(0, 1).toLowerCase();
    if (key && key !== "a" && !(key in map)) map[key] = s.id;
  }
  return map;
};

/** El área que no es la primera lleva distintivo de color en la fila. */
const isSecondaryArea = (settings: Settings, area: string): boolean =>
  settings.areas.length > 1 && area !== settings.areas[0]?.id;

const colWidth = (d: DayInfo) => (d.locked ? "w-3 min-w-3" : "w-10 min-w-10");

const subTitle = (sub: SuplenteHabitual): string => {
  const status = dniStatus(sub.dni);
  if (status === "missing") return `${sub.alias} · sin DNI en la agenda`;
  return `${sub.alias} · DNI ${maskDni(sub.dni)}${status === "verified" ? " ✓ verificado" : " · no válido"}`;
};

function ShiftCell({ cell, sub, settings }: { cell?: Cell; sub?: SuplenteHabitual; settings: Settings }) {
  if (!cell) return null;
  if (cell.subId) {
    const verified = sub && dniStatus(sub.dni) === "verified";
    return (
      <span
        title={sub && subTitle(sub)}
        className="relative flex h-full w-full flex-col items-center justify-center rounded-lg bg-sub text-sub-ink leading-none"
      >
        <span className="text-sm font-bold">{codeShort(cell.code)}</span>
        <span className="max-w-full truncate px-0.5 text-[10px] font-bold">{sub?.alias}</span>
        {!verified && <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-critical" aria-hidden />}
      </span>
    );
  }
  return (
    <span className={`flex h-full w-full items-center justify-center rounded-lg text-sm font-bold ${shiftStyle(settings, cell.code)}`}>
      {cell.code === ABSENCE ? <span className="text-[11px]">Falta</span> : codeShort(cell.code)}
    </span>
  );
}

function NameCell({ staff, settings }: { staff: Staff; settings: Settings }) {
  const ped = isSecondaryArea(settings, staff.area);
  return (
    <th
      scope="row"
      className={`sticky left-0 z-10 border-b border-line px-2 text-left font-semibold whitespace-nowrap ${
        ped ? "bg-ped-soft shadow-[inset_3px_0_0_var(--color-ped)]" : "bg-surface"
      }`}
    >
      <span className="flex items-center gap-1.5">
        <span className={`text-sm ${staff.vacancy ? "text-muted italic" : ""}`}>{staff.name}</span>
        {ped && <span className="rounded bg-ped px-1 text-[10px] font-bold text-white">{areaTeam(staff.area).slice(0, 3).toUpperCase()}</span>}
      </span>
    </th>
  );
}

function CalendarGridImpl({ board, agenda, days, statuses, selected, onOpen, onQuick }: Props) {
  const settings = useSettings();
  const subs = new Map(agenda.map((s) => [s.id, s]));
  const [counts, setCounts] = useState(false);
  const year = Number(days[0]?.iso.slice(0, 4) ?? new Date().getFullYear());
  const keys = keyCodes(settings);

  const handleKey = (e: KeyboardEvent<HTMLButtonElement>, staffId: string, date: IsoDate) => {
    const code = keys[e.key.toLowerCase()];
    if (code) {
      e.preventDefault();
      onQuick(staffId, date, code);
    }
  };

  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-bold text-muted">
        {chips(settings).map((c) => (
          <li key={c.text} className="flex items-center gap-1.5">
            <span className={`flex h-6 min-w-8 items-center justify-center rounded-lg px-1 text-xs font-bold ${c.cls}`}>{c.label}</span>
            {c.text}
          </li>
        ))}
        <li className="ml-auto">
          <button
            type="button"
            onClick={() => setCounts((v) => !v)}
            aria-pressed={counts}
            className="min-h-9 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-ink hover:border-brand"
          >
            {counts ? "Ocultar recuentos" : "Ver recuentos"}
          </button>
        </li>
      </ul>
      <div className="card-3d max-h-[calc(100dvh-14rem)] overflow-auto rounded-2xl bg-surface">
        <table className="border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20 bg-surface">
            <tr>
              <th className="sticky left-0 z-30 min-w-28 border-b border-line bg-surface px-3 py-2 text-left text-sm font-bold text-muted">Titular</th>
              {days.map((d) => {
                const critical = statuses.get(d.iso)?.ok === false;
                return (
                  <th
                    key={d.iso}
                    title={d.holiday?.name ?? (d.weekend ? "Fin de semana" : undefined)}
                    className={`${colWidth(d)} border-b border-line py-1 text-center ${
                      d.locked ? "locked-stripes text-muted/60" : critical ? "bg-critical-soft text-critical" : "text-ink"
                    }`}
                  >
                    {!d.locked && (
                      <span className="flex flex-col leading-tight">
                        <span className="text-[11px] font-bold text-muted">{d.letter}</span>
                        <span className="text-sm font-bold">{d.day}</span>
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          {settings.shifts.map(({ id: shift, label }) => (
            <tbody key={shift}>
              <tr>
                <td colSpan={days.length + 1} className="sticky left-0 bg-canvas px-3 py-1 text-sm font-bold text-muted">
                  Turno de {label.toLowerCase()}
                </td>
              </tr>
              {board.staff
                .filter((s) => s.baseShift === shift)
                .map((s) => (
                  <tr key={s.id} className="group">
                    <NameCell staff={s} settings={settings} />
                    {days.map((d) => {
                      if (d.locked) return <td key={d.iso} className={`${colWidth(d)} locked-stripes border-b border-line`} />;
                      const cell = board.roster[s.id]?.[d.iso];
                      const sub = cell?.subId ? subs.get(cell.subId) : undefined;
                      const isSel = selected?.staffId === s.id && selected.date === d.iso;
                      return (
                        <td key={d.iso} className={`${colWidth(d)} h-11 border-b border-line p-[3px] group-hover:bg-canvas`}>
                          <button
                            type="button"
                            onClick={() => onOpen(s.id, d.iso)}
                            onKeyDown={(e) => handleKey(e, s.id, d.iso)}
                            aria-label={`${s.name} ${d.day}: ${cell?.code ?? "sin turno"}${sub ? ` · ${subTitle(sub)}` : ""}`}
                            className={`h-full w-full rounded-lg outline-none transition active:scale-90 focus-visible:ring-4 focus-visible:ring-brand/50 ${
                              isSel ? "ring-[3px] ring-brand" : ""
                            }`}
                          >
                            <ShiftCell cell={cell} sub={sub} settings={settings} />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          ))}
          <tfoot className="sticky bottom-0 z-20 bg-surface">
            <tr>
              <th className="sticky left-0 z-10 border-t-2 border-line bg-surface px-3 py-1.5 text-left text-sm font-bold whitespace-nowrap text-muted">Personal</th>
              {days.map((d) => {
                const st = statuses.get(d.iso);
                if (d.locked || !st) return <td key={d.iso} className={`${colWidth(d)} locked-stripes border-t-2 border-line`} />;
                return (
                  <td
                    key={d.iso}
                    title={st.violations.map((v) => v.message).join(" · ") || "Ratios correctos"}
                    className={`${colWidth(d)} border-t-2 border-line text-center text-base font-bold ${st.ok ? "text-sub-ink" : "bg-critical text-white"}`}
                  >
                    {st.ok ? "✓" : "!"}
                  </td>
                );
              })}
            </tr>
            {counts &&
              settings.rules.map((rule) => (
                <tr key={rule.id}>
                  <th className="sticky left-0 z-10 border-t border-line bg-surface px-3 py-1 text-left text-xs font-bold whitespace-nowrap text-muted">
                    {ruleLabel(settings, rule)} <span className="font-mono">≥{rule.required}</span>
                  </th>
                  {days.map((d) => {
                    const st = statuses.get(d.iso);
                    if (d.locked || !st) return <td key={d.iso} className={`${colWidth(d)} locked-stripes border-t border-line`} />;
                    const bad = st.violations.some((v) => v.ruleId === rule.id);
                    return (
                      <td key={d.iso} className={`${colWidth(d)} border-t border-line text-center font-mono text-sm font-bold ${bad ? "bg-critical text-white" : "text-muted"}`}>
                        {countFor(st.coverage, rule)}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tfoot>
        </table>
      </div>
      <details className="rounded-2xl bg-surface p-4 text-sm">
        <summary className="min-h-10 cursor-pointer font-bold">¿Qué significa cada cosa?</summary>
        <ul className="mt-3 space-y-1.5">
          <li>Toca una casilla para cambiar el turno, hacer una permuta o poner suplente.</li>
          <li>
            Mínimos de este centro:{" "}
            {settings.rules.map((r, i) => (
              <span key={r.id}>
                {i > 0 && " · "}
                {ruleLabel(settings, r).toLowerCase()} {r.required}
              </span>
            ))}
            . Si no se cumplen, la fila «Personal» marca <b className="rounded bg-critical px-1 text-white">!</b>
          </li>
          <li>Toda ausencia aparece como «Falta», sin decir el motivo.</li>
          <li>Punto rojo en un suplente: le falta el DNI correcto en la agenda.</li>
          <li>Rayas: fin de semana o festivo (no se puede cambiar).</li>
        </ul>
        <p className="mt-3 font-bold">Festivos de {year}</p>
        <ul className="mt-1 columns-1 gap-4 text-sm sm:columns-2">
          {holidaysOfYear(year).map((h) => (
            <li key={h.date}>
              <b className="font-mono">{shortDate(h.date)}</b> {h.name}
              {h.scope === "LOCAL" && " (local)"}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

const chips = (settings: Settings): { cls: string; label: string; text: string }[] => [
  ...settings.shifts.map((s, i) => ({
    cls: SHIFT_STYLES[i % SHIFT_STYLES.length],
    label: s.short || s.id,
    text: s.label,
  })),
  { cls: ABSENCE_STYLE, label: "Falta", text: "Ausencia" },
  { cls: "bg-sub text-sub-ink", label: settings.shifts[0]?.short ?? "M", text: "Suplente" },
  ...settings.areas.slice(1).map((a) => ({
    cls: "bg-ped text-white",
    label: a.team.slice(0, 3).toUpperCase(),
    text: a.team,
  })),
];

export const CalendarGrid = memo(CalendarGridImpl);
