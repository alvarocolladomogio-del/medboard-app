"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { MONTHS, formatDates, lockReason, shortDate, type DayInfo } from "@/lib/calendar";
import { areaTeam, shiftName, missingText } from "@/lib/labels";
import { getCell, groupBy, type CoverageEntry, type Slot } from "@/lib/roster";
import { ABSENCE, type Board, type IsoDate, type Shift, type Staff, type SuplenteHabitual } from "@/lib/types";
import { settingsStore } from "@/lib/settingsStore";
import type { DayStatus } from "@/lib/ValidationEngine";
import { groupFallbackUri } from "@/lib/WhatsAppService";
import { Avatar, Button, Icon, WaLink } from "./ui";

export interface CoverDraft {
  staffId?: string;
  dates?: IsoDate[];
  shift?: Shift;
}

interface Props {
  board: Board;
  agenda: readonly SuplenteHabitual[];
  days: DayInfo[];
  statuses: Map<IsoDate, DayStatus>;
  pending: Slot[];
  covered: CoverageEntry[];
  critical: DayStatus[];
  onOpenCell: (staffId: string, date: IsoDate) => void;
  onCover: (draft: CoverDraft) => void;
}

const WEEK = ["L", "M", "X", "J", "V", "S", "D"] as const;
const WEEKDAY_LONG = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;
/* Icono por posición del turno: mañana sol, tarde luna, el resto genérico. */
const SHIFT_ICONS = ["sun", "moon", "calendar", "calendar"] as const;
const shiftIcon = (i: number) => SHIFT_ICONS[i % SHIFT_ICONS.length];

const todayIso = (): IsoDate => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` as IsoDate;
};

const noop = () => () => {};

/** Hoy si cae en el mes; si es fin de semana o festivo, el siguiente día laborable. */
const initialDay = (days: DayInfo[], today: IsoDate | null): IsoDate => {
  const from = today ? days.findIndex((d) => d.iso >= today) : -1;
  const pool = from >= 0 ? days.slice(from) : days;
  return (pool.find((d) => !d.locked) ?? days.find((d) => !d.locked) ?? days[0]).iso;
};

const longDate = (d: DayInfo): string => {
  const [y, m] = d.iso.split("-").map(Number);
  return `${WEEKDAY_LONG[new Date(y, m - 1, d.day).getDay()]}, ${d.day} de ${MONTHS[m - 1].toLowerCase()}`;
};

/** Pantalla principal: calendario del mes y, debajo, la agenda del día elegido. */
export function CalendarHome({ board, agenda, days, statuses, pending, covered, critical, onOpenCell, onCover }: Props) {
  const monthKey = days[0]?.iso.slice(0, 7);
  const [picked, setPicked] = useState<{ month?: string; day?: IsoDate }>({});
  // La fecha de hoy solo existe en el dispositivo: el HTML estático se genera sin ella.
  const today = useSyncExternalStore(noop, todayIso, () => null);
  const selected = picked.month === monthKey && picked.day ? picked.day : initialDay(days, today);
  const select = (day: IsoDate) => setPicked({ month: monthKey, day });

  const marks = useMemo(() => {
    const out = new Map<IsoDate, { pending: number; subs: number }>();
    for (const s of pending) out.set(s.date, { pending: (out.get(s.date)?.pending ?? 0) + 1, subs: out.get(s.date)?.subs ?? 0 });
    for (const c of covered) out.set(c.date, { pending: out.get(c.date)?.pending ?? 0, subs: (out.get(c.date)?.subs ?? 0) + 1 });
    return out;
  }, [pending, covered]);

  const total = pending.length + covered.length;
  const pct = total ? Math.round((covered.length / total) * 100) : 100;
  const lead = days.length ? (["L", "M", "X", "J", "V", "S", "D"] as const).indexOf(days[0].letter as (typeof WEEK)[number]) : 0;
  const monthName = monthKey ? MONTHS[Number(monthKey.slice(5)) - 1] : "";
  const pendingGroups = Object.values(groupBy(pending, (s) => `${s.staff.id}|${s.shift}`));

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <div className="space-y-4">
        <section className="card-3d rise-in flex items-center gap-4 rounded-3xl bg-surface p-4" aria-label="Resumen del mes">
          <Ring pct={pct} />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold">Cobertura de {monthName.toLowerCase()}</h2>
            <dl className="mt-1.5 flex flex-wrap gap-1.5 text-xs font-bold">
              <Chip tone="sub" label="suplencias" value={covered.length} />
              <Chip tone={pending.length ? "salmon" : "muted"} label="sin cubrir" value={pending.length} />
              <Chip tone={critical.length ? "critical" : "muted"} label="días sin personal" value={critical.length} />
            </dl>
          </div>
        </section>

        <section className="card-3d rise-in rounded-3xl bg-surface p-3 sm:p-4" aria-label={`Calendario de ${monthName}`}>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEK.map((l, i) => (
              <span key={l + i} aria-hidden className="pb-1 text-[11px] font-bold text-muted">
                {l}
              </span>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <span key={`lead${i}`} />
            ))}
            {days.map((d) => (
              <DayCell key={d.iso} day={d} mark={marks.get(d.iso)} critical={statuses.get(d.iso)?.ok === false} selected={d.iso === selected} today={d.iso === today} onSelect={select} />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-line pt-2.5 text-[11px] font-bold text-muted">
            <li className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-sub-ink" />Suplencia</li>
            <li className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-salmon" />Sin cubrir</li>
            <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-[4px] ring-2 ring-critical" />Falta personal</li>
            <li className="flex items-center gap-1.5"><span className="locked-stripes size-2.5 rounded-[4px]" />Festivo</li>
          </ul>
        </section>
      </div>

      <div className="space-y-4">
        <DayAgenda board={board} agenda={agenda} day={days.find((d) => d.iso === selected)} status={statuses.get(selected)} onOpenCell={onOpenCell} onCover={onCover} />

        {pendingGroups.length > 0 && (
          <section className="rise-in space-y-2" aria-labelledby="pendientes">
            <div className="flex items-center justify-between gap-2 px-1">
              <h2 id="pendientes" className="text-base font-bold">
                Faltas sin cubrir <span className="text-muted">· {pending.length}</span>
              </h2>
              <WaLink href={groupFallbackUri({ slots: pending })} size="sm">
                Avisar al grupo
              </WaLink>
            </div>
            <ul className="card-3d divide-y divide-line overflow-hidden rounded-3xl bg-surface">
              {pendingGroups.map((slots) => (
                <li key={`${slots[0].staff.id}${slots[0].shift}`} className="flex items-center gap-3 px-4 py-3">
                  <span className="h-9 w-1 shrink-0 rounded-full bg-salmon" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold">
                      {slots[0].staff.name} <span className="font-normal text-muted">· {shiftName(slots[0].shift)}</span>
                    </p>
                    <p className="truncate text-sm text-muted">{formatDates(slots.map((s) => s.date))}</p>
                  </div>
                  <Button size="sm" tone="primary" onClick={() => onCover({ staffId: slots[0].staff.id, dates: slots.map((s) => s.date), shift: slots[0].shift })}>
                    Buscar suplente
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {critical.length > 0 && (
          <section className="rise-in rounded-3xl border border-critical/30 bg-critical-soft p-4 text-critical">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Icon name="alert" className="size-5" /> Falta personal {critical.length} día{critical.length > 1 ? "s" : ""}
            </h2>
            <ul className="mt-1.5 space-y-0.5 text-sm">
              {critical.map((s) => (
                <li key={s.date}>
                  <button type="button" className="text-left underline-offset-2 hover:underline" onClick={() => select(s.date)}>
                    <b>{shortDate(s.date)}</b> · {s.violations.map(missingText).join(" · ")}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const tone = pct === 100 ? "var(--color-sub-ink)" : pct >= 75 ? "var(--color-brand)" : "var(--color-salmon)";
  return (
    <div className="relative grid size-16 shrink-0 place-items-center" role="img" aria-label={`${pct}% de las faltas cubiertas`}>
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-canvas)" strokeWidth="7" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={tone} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <span className="text-base font-bold tabular-nums">{pct}%</span>
    </div>
  );
}

function Chip({ tone, label, value }: { tone: "sub" | "salmon" | "critical" | "muted"; label: string; value: number }) {
  const cls = { sub: "bg-sub text-sub-ink", salmon: "bg-salmon-soft text-salmon-ink", critical: "bg-critical text-white", muted: "bg-canvas text-muted" }[tone];
  return (
    <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${cls}`}>
      <dd className="tabular-nums">{value}</dd>
      <dt>{label}</dt>
    </div>
  );
}

function DayCell({ day, mark, critical, selected, today, onSelect }: { day: DayInfo; mark?: { pending: number; subs: number }; critical: boolean; selected: boolean; today: boolean; onSelect: (iso: IsoDate) => void }) {
  const dots = [...Array(Math.min(mark?.subs ?? 0, 3)).fill("bg-sub-ink"), ...Array(Math.min(mark?.pending ?? 0, 3)).fill("bg-salmon")].slice(0, 4);
  const label = [
    `${day.day}`,
    day.holiday ? `festivo, ${day.holiday.name}` : day.weekend ? "fin de semana" : null,
    mark?.subs ? `${mark.subs} suplencia${mark.subs > 1 ? "s" : ""}` : null,
    mark?.pending ? `${mark.pending} sin cubrir` : null,
    critical ? "falta personal" : null,
  ].filter(Boolean).join(", ");
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      title={day.holiday?.name}
      onClick={() => onSelect(day.iso)}
      className={`tilt relative flex aspect-square max-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl text-[15px] font-bold outline-none focus-visible:ring-4 focus-visible:ring-brand/40 ${
        selected
          ? "bg-brand text-white shadow-[0_3px_0_var(--color-brand-deep)]"
          : day.locked
            ? `${day.holiday ? "locked-stripes" : ""} font-normal text-muted`
            : critical
              ? "bg-critical-soft text-critical ring-2 ring-critical ring-inset"
              : "hover:bg-canvas"
      } ${today && !selected ? "ring-2 ring-brand ring-inset" : ""}`}
    >
      <span className="leading-none">{day.day}</span>
      <span className="flex h-1.5 gap-0.5" aria-hidden>
        {dots.map((cls, i) => (
          <span key={i} className={`size-1.5 rounded-full ${selected ? "bg-white" : cls}`} />
        ))}
      </span>
    </button>
  );
}

function DayAgenda({ board, agenda, day, status, onOpenCell, onCover }: { board: Board; agenda: readonly SuplenteHabitual[]; day?: DayInfo; status?: DayStatus; onOpenCell: (staffId: string, date: IsoDate) => void; onCover: (draft: CoverDraft) => void }) {
  if (!day) return null;
  const locked = lockReason(day.iso);
  const subs = new Map(agenda.map((s) => [s.id, s]));
  const settings = settingsStore.get();
  const groups: Record<Shift, Staff[]> = Object.fromEntries(settings.shifts.map((sh) => [sh.id, [] as Staff[]]));
  if (!locked)
    for (const s of board.staff) {
      const cell = getCell(board, s.id, day.iso);
      if (!cell) continue;
      const key = cell.code === ABSENCE ? s.baseShift : cell.code;
      (groups[key] ??= []).push(s);
    }

  return (
    <section key={day.iso} className="card-3d rise-in overflow-hidden rounded-3xl bg-surface" aria-labelledby="agenda-dia">
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-wide text-muted uppercase">Agenda del día</p>
          <h2 id="agenda-dia" className="text-lg leading-tight font-bold">
            {longDate(day)}
          </h2>
        </div>
        {status && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status.ok ? "bg-sub text-sub-ink" : "bg-critical text-white"}`}>
            {status.ok ? "✓ Personal completo" : status.violations.map(missingText).join(" · ")}
          </span>
        )}
      </header>

      {locked ? (
        <p className="flex items-center gap-3 px-4 py-6 text-[15px] text-muted">
          <span className="locked-stripes size-8 shrink-0 rounded-lg" aria-hidden />
          {locked}. No hay turnos.
        </p>
      ) : (
        <>
          {settings.shifts.map(({ id: shift }, i) => (
            <div key={shift}>
              <h3 className="flex items-center gap-1.5 bg-canvas/60 px-4 py-1.5 text-xs font-bold tracking-wide text-muted uppercase">
                <Icon name={shiftIcon(i)} className="size-4" /> {shiftName(shift)} · {(groups[shift] ?? []).length}
              </h3>
              <ul className="divide-y divide-line">
                {(groups[shift] ?? []).map((s) => {
                  const cell = getCell(board, s.id, day.iso)!;
                  const sub = cell.subId ? subs.get(cell.subId) : undefined;
                  const absent = cell.code === ABSENCE;
                  const ped = settings.areas.length > 1 && s.area !== settings.areas[0]?.id;
                  return (
                    <li key={s.id} className="flex items-center gap-2 pr-3">
                      <button
                        type="button"
                        onClick={() => onOpenCell(s.id, day.iso)}
                        aria-label={`${s.name}: ${absent ? "falta sin cubrir" : sub ? `cubre ${sub.alias}` : shiftName(cell.code as Shift)}`}
                        className="flex min-h-13 min-w-0 flex-1 items-center gap-3 py-2 pl-4 text-left outline-none hover:bg-canvas/50 focus-visible:bg-brand-soft"
                      >
                        <Avatar name={s.name} tone={ped ? "bg-ped-soft text-ped" : undefined} />
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-[15px] font-bold ${absent || sub ? "text-muted line-through decoration-2" : ""} ${s.vacancy ? "italic" : ""}`}>{s.name}</span>
                          {ped && <span className="block text-xs font-bold text-ped">{areaTeam(s.area)}</span>}
                        </span>
                        {sub && (
                          <span className="flex items-center gap-1.5 rounded-full bg-sub py-0.5 pr-2.5 pl-0.5 text-sm font-bold text-sub-ink">
                            <Avatar name={sub.alias} emoji={sub.emoji} tone="bg-surface" className="size-6 text-xs" />
                            {sub.alias}
                          </span>
                        )}
                        {absent && <span className="rounded-full bg-salmon-soft px-2.5 py-0.5 text-sm font-bold text-salmon-ink">Falta</span>}
                      </button>
                      {absent && (
                        <Button size="sm" tone="primary" onClick={() => onCover({ staffId: s.id, dates: [day.iso], shift: s.baseShift })} aria-label={`Buscar suplente para ${s.name}`}>
                          Buscar
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <div className="border-t border-line p-3">
            <Button tone="neutral" className="w-full" onClick={() => onCover({ dates: [day.iso] })}>
              <Icon name="plus" className="size-5" /> Apuntar una falta este día
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
