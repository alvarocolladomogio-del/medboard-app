"use client";

import { useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import type { CoverDraft } from "./CalendarHome";
import { boardStore } from "@/lib/boardStore";
import { formatDates, shortDate, type DayInfo } from "@/lib/calendar";
import { areaTeam, codeShort, especialidadName, shiftName } from "@/lib/labels";
import { settingsStore, useSettings } from "@/lib/settingsStore";
import { getCell } from "@/lib/roster";
import type { Area, Board, IsoDate, Shift, Staff, SuplenteHabitual } from "@/lib/types";
import type { Verdict } from "@/lib/ValidationEngine";
import { assignmentUri, groupFallbackUri, offerUri } from "@/lib/WhatsAppService";
import { Avatar, Button, DniBadge, Icon, Sheet, Stars, WaLink, btnClass, haptic } from "./ui";

interface Props {
  board: Board;
  agenda: readonly SuplenteHabitual[];
  days: DayInfo[];
  initial: CoverDraft;
  onClose: () => void;
}

interface Result {
  staff: Staff;
  sub?: SuplenteHabitual;
  shift: Shift;
  ok: IsoDate[];
  failed: { date: IsoDate; reason: string }[];
}

const WEEK = ["L", "M", "X", "J", "V"] as const;
const SHIFT_CHIPS = ["bg-shift-m text-shift-m-ink", "bg-shift-t text-shift-t-ink", "bg-shift-n text-shift-n-ink", "bg-shift-x text-shift-x-ink"] as const;
const shiftChip = (code: Shift): string => {
  const i = settingsStore.get().shifts.findIndex((s) => s.id === code);
  return SHIFT_CHIPS[(i < 0 ? 0 : i) % SHIFT_CHIPS.length];
};

const scrollTo = (ref: RefObject<HTMLElement | null>) => setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);

/** Apuntar una falta y su suplente en 3 toques (ventana emergente desde el calendario). */
export function QuickCover({ board, agenda, days, initial, onClose }: Props) {
  const settings = useSettings();
  const first = board.staff.find((s) => s.id === initial.staffId);
  const [staffId, setStaffId] = useState<string | undefined>(first?.id);
  const [dates, setDates] = useState<IsoDate[]>(initial.dates ?? []);
  const [subId, setSubId] = useState<string | null>(null);
  const [shift, setShift] = useState<Shift>(initial.shift ?? first?.baseShift ?? "M");
  const [result, setResult] = useState<Result | null>(null);
  const step2 = useRef<HTMLElement>(null);
  const step3 = useRef<HTMLElement>(null);

  const staff = board.staff.find((s) => s.id === staffId);
  const sorted = [...dates].sort();
  // Primero quien puede cubrir ese equipo; dentro, las mejor valoradas.
  const active = agenda
    .filter((s) => s.activo)
    .map((s) => ({ s, fits: !staff || !s.especialidad || s.especialidad === "AMBAS" || s.especialidad === staff.area }))
    .sort((a, b) => Number(b.fits) - Number(a.fits) || (b.s.estrellas ?? 0) - (a.s.estrellas ?? 0));

  const weeks = useMemo(() => {
    const out: (DayInfo | null)[][] = [];
    let row: (DayInfo | null)[] | null = null;
    for (const d of days) {
      if (d.weekend) continue;
      const col = WEEK.indexOf(d.letter as (typeof WEEK)[number]);
      if (!row || col === 0) out.push((row = Array(5).fill(null)));
      row[col] = d;
    }
    return out;
  }, [days]);

  const chooseStaff = (s: Staff) => {
    setStaffId(s.id);
    setSubId(null);
    setShift(s.baseShift);
    scrollTo(dates.length ? step3 : step2);
  };

  const toggleDate = (iso: IsoDate) => setDates((d) => (d.includes(iso) ? d.filter((x) => x !== iso) : [...d, iso]));

  const busyDays = (sub: SuplenteHabitual) =>
    sorted.flatMap((date) => {
      const other = board.staff.find((p) => p.id !== staffId && getCell(board, p.id, date)?.subId === sub.id);
      return other ? [`${shortDate(date)} (cubre a ${other.name})`] : [];
    });

  const save = () => {
    if (!staff || !sorted.length) return;
    const sub = agenda.find((s) => s.activo && s.id === subId);
    const res: Result = { staff, sub, shift, ok: [], failed: [] };
    boardStore.batch(() => {
      for (const date of sorted) {
        const cell = getCell(boardStore.getSnapshot(), staff.id, date);
        let v: Verdict = cell?.code === "AUS" && !cell.subId ? { allowed: true } : boardStore.dispatch({ kind: "set", staffId: staff.id, date, code: "AUS" });
        if (v.allowed && sub) v = boardStore.dispatch({ kind: "assign", staffId: staff.id, date, subId: sub.id, shift });
        if (v.allowed) res.ok.push(date);
        else res.failed.push({ date, reason: v.reason ?? "No permitido" });
      }
    });
    if (res.ok.length) haptic();
    setResult(res);
  };

  if (result) return <ResultSheet result={result} onClose={onClose} />;

  return (
    <Sheet title="Apuntar una falta" onClose={onClose}>
      <Step n={1} title="¿Quién falta?" done={!!staff}>
        <div className="grid grid-cols-3 gap-2">
          {board.staff.map((s) => {
            const on = s.id === staffId;
            const ped = settings.areas.length > 1 && s.area !== settings.areas[0]?.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                onClick={() => chooseStaff(s)}
                className={btnClass(on ? "primary" : "neutral", "md", `flex-col !gap-0 px-1.5 py-1.5 leading-tight ${ped && !on ? "!bg-ped-soft" : ""}`)}
              >
                <span className={`max-w-full truncate text-sm ${s.vacancy ? "italic" : ""}`}>{s.name}</span>
                <span className={`text-[11px] font-bold ${on ? "text-white/85" : ped ? "text-ped" : "text-muted"}`}>
                  {ped ? `${areaTeam(s.area)} · ` : ""}
                  {shiftName(s.baseShift)}
                </span>
              </button>
            );
          })}
        </div>
      </Step>

      {staff && (
        <Step n={2} title={`¿Qué días falta ${staff.name}?`} done={dates.length > 0} innerRef={step2}>
          <div className="grid grid-cols-5 gap-1.5 text-center">
            {WEEK.map((l) => (
              <span key={l} className="text-[11px] font-bold text-muted">
                {l}
              </span>
            ))}
            {weeks.flat().map((d, i) =>
              d ? (
                <DayButton key={d.iso} day={d} staff={staff} board={board} agenda={agenda} selected={dates.includes(d.iso)} onToggle={toggleDate} />
              ) : (
                <span key={`x${i}`} />
              ),
            )}
          </div>
        </Step>
      )}

      {staff && dates.length > 0 && (
        <Step n={3} title="¿Quién la cubre?" innerRef={step3}>
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-canvas p-1" role="group" aria-label="Turno a cubrir">
            {settings.shifts.map(({ id: s }) => (
              <button
                key={s}
                type="button"
                aria-pressed={shift === s}
                onClick={() => setShift(s)}
                className={`min-h-9 rounded-lg text-sm font-bold transition ${shift === s ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
              >
                {shiftName(s)}
              </button>
            ))}
          </div>
          <ul className="space-y-2">
            <li className="flex">
              <Choice selected={subId === null} onSelect={() => setSubId(null)}>
                <span className="text-[15px] font-bold">Todavía nadie</span>
                <span className="block text-sm text-muted">Solo apuntar la falta</span>
              </Choice>
            </li>
            {active.map(({ s, fits }) => {
              const busy = busyDays(s);
              return (
                <li key={s.id} className={`flex items-center gap-2 ${fits ? "" : "opacity-60"}`}>
                  <Choice selected={subId === s.id} onSelect={() => setSubId(s.id)}>
                    <span className="flex items-center gap-2.5">
                      <Avatar name={s.alias} emoji={s.emoji} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-[15px] font-bold">
                          {s.alias} <Stars value={s.estrellas} />
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {s.especialidad ? especialidadName(s.especialidad) : s.nombreCompleto || "Sin nombre completo"}
                          {s.contrato ? ` · ${s.contrato}` : ""}
                        </span>
                        <span className="mt-0.5 block">
                          <DniBadge dni={s.dni} />
                        </span>
                        {busy.length > 0 && <span className="mt-0.5 block text-xs font-bold text-critical">No disponible: {busy.join(", ")}</span>}
                      </span>
                    </span>
                  </Choice>
                  <WaLink href={offerUri({ name: s.nombreCompleto, phone: s.telefono, dates: sorted, shift, area: staff.area })} size="sm" className="shrink-0">
                    Preguntar
                  </WaLink>
                </li>
              );
            })}
          </ul>
        </Step>
      )}

      <div className="sticky -bottom-4 -mx-4 mt-4 border-t border-line bg-surface/95 px-4 pt-3 pb-1 backdrop-blur sm:-mx-5 sm:px-5">
        <Button tone="primary" size="lg" className="w-full" disabled={!staff || !dates.length} onClick={save}>
          <Icon name="check" className="size-5" /> {staff && dates.length ? `Guardar · ${dates.length} día${dates.length > 1 ? "s" : ""}` : "Guardar"}
        </Button>
      </div>
    </Sheet>
  );
}

function Step({ n, title, done, innerRef, children }: { n: number; title: string; done?: boolean; innerRef?: RefObject<HTMLElement | null>; children: ReactNode }) {
  return (
    <section ref={innerRef} className="rise-in scroll-mt-4 border-line not-first:mt-4 not-first:border-t not-first:pt-4">
      <h3 className="mb-2.5 flex items-center gap-2.5 text-base font-bold">
        <span className={`pop-in grid size-7 shrink-0 place-items-center rounded-full text-sm ${done ? "bg-sub text-sub-ink" : "bg-brand text-white"}`}>
          {done ? <Icon name="check" className="size-4" /> : n}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Choice({ selected, onSelect, children }: { selected: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex min-h-13 min-w-0 flex-1 items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-left outline-none transition active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-brand/40 ${
        selected ? "border-brand bg-brand-soft" : "border-line bg-surface"
      }`}
    >
      <span className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${selected ? "border-brand bg-brand text-white" : "border-line"}`}>
        {selected && <Icon name="check" className="pop-in size-4" />}
      </span>
      <span className="min-w-0">{children}</span>
    </button>
  );
}

function DayButton({ day, staff, board, agenda, selected, onToggle }: { day: DayInfo; staff: Staff; board: Board; agenda: readonly SuplenteHabitual[]; selected: boolean; onToggle: (iso: IsoDate) => void }) {
  if (day.locked)
    return (
      <span className="locked-stripes flex min-h-12 flex-col items-center justify-center rounded-xl text-muted" title={day.holiday?.name}>
        <span className="text-[15px] font-bold">{day.day}</span>
        <span className="text-[10px] font-bold">Fiesta</span>
      </span>
    );
  const cell = getCell(board, staff.id, day.iso);
  const sub = cell?.subId ? agenda.find((s) => s.id === cell.subId) : undefined;
  const chip = !cell ? null : sub ? { cls: "bg-sub text-sub-ink", text: sub.alias } : cell.code === "AUS" ? { cls: "bg-salmon-soft text-salmon-ink", text: "Falta" } : { cls: shiftChip(cell.code), text: codeShort(cell.code) };
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${day.day}${chip ? `, ahora ${chip.text}` : ""}`}
      onClick={() => onToggle(day.iso)}
      className={`tilt flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl border-2 outline-none focus-visible:ring-4 focus-visible:ring-brand/40 ${
        selected ? "border-brand bg-brand text-white" : "border-line bg-surface"
      }`}
    >
      <span className="text-[15px] leading-none font-bold">{day.day}</span>
      {selected ? (
        <Icon name="check" className="pop-in size-4" />
      ) : (
        chip && <span className={`max-w-full truncate rounded px-1 text-[10px] font-bold ${chip.cls}`}>{chip.text}</span>
      )}
    </button>
  );
}

function ResultSheet({ result, onClose }: { result: Result; onClose: () => void }) {
  const { staff, sub, shift, ok, failed } = result;
  const area: Area = staff.area;
  return (
    <Sheet title={ok.length ? "Guardado" : "No se pudo guardar"} kicker={staff.name} onClose={onClose}>
      {ok.length > 0 && (
        <div className="pop-in mb-3 flex items-start gap-3 rounded-2xl bg-sub p-3.5 text-sub-ink">
          <Icon name="check" className="size-6 shrink-0" />
          <p className="text-[15px]">
            {staff.name} falta <b>{formatDates(ok)}</b>.<br />
            {sub ? (
              <>
                Lo cubre <b>{sub.alias}</b> ({shiftName(shift).toLowerCase()}).
              </>
            ) : (
              "Aún sin suplente."
            )}
          </p>
        </div>
      )}
      {failed.length > 0 && (
        <ul className="mb-3 space-y-1 rounded-2xl bg-critical-soft p-3.5 text-sm text-critical">
          {failed.map((f) => (
            <li key={f.date}>
              <b>{shortDate(f.date)}</b>: {f.reason}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2">
        {ok.length > 0 &&
          (sub ? (
            <WaLink href={assignmentUri({ name: sub.nombreCompleto, phone: sub.telefono, dates: ok, shift, area })} size="lg">
              Confirmar a {sub.alias}
            </WaLink>
          ) : (
            <WaLink href={groupFallbackUri({ slots: ok.map((date) => ({ date, shift, area })) })} size="lg">
              Avisar al grupo
            </WaLink>
          ))}
        <div className="grid grid-cols-2 gap-2">
          {ok.length > 0 && (
            <Button
              tone="neutral"
              size="lg"
              onClick={() => {
                boardStore.undo();
                onClose();
              }}
            >
              <Icon name="undo" className="size-5" /> Deshacer
            </Button>
          )}
          <Button tone="primary" size="lg" className={ok.length ? "" : "col-span-2"} onClick={onClose}>
            Hecho
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
