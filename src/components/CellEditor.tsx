"use client";

import { useState } from "react";
import { boardStore } from "@/lib/boardStore";
import { shortDate } from "@/lib/calendar";
import { areaTeam, codeName } from "@/lib/labels";
import { useSettings } from "@/lib/settingsStore";
import { ABSENCE, type Board, type Change, type Code, type IsoDate, type Shift, type SuplenteHabitual } from "@/lib/types";

import type { Verdict } from "@/lib/ValidationEngine";
import { assignmentUri, closingUri, offerUri } from "@/lib/WhatsAppService";
import { SuplenteCombobox } from "./SuplenteCombobox";
import { Button, DniBadge, Icon, Sheet, WaLink } from "./ui";

interface Props {
  board: Board;
  agenda: readonly SuplenteHabitual[];
  staffId: string;
  date: IsoDate;
  onClose: () => void;
  onVerdict: (v: Verdict) => void;
}

export function CellEditor({ board, agenda, staffId, date, onClose, onVerdict }: Props) {
  const settings = useSettings();
  const staff = board.staff.find((s) => s.id === staffId);
  const cell = board.roster[staffId]?.[date];
  const [subShift, setSubShift] = useState<Shift>(staff?.baseShift ?? "M");
  const [pickedId, setPickedId] = useState<string>();
  if (!staff || !cell) return null;

  const run = (change: Change) => {
    const v = boardStore.dispatch(change);
    onVerdict(v);
    if (v.allowed) onClose();
  };
  const assigned = cell.subId ? agenda.find((s) => s.id === cell.subId) : undefined;
  const picked = agenda.find((s) => s.id === pickedId);
  const assignChange: Change | undefined = picked && { kind: "assign", staffId, date, subId: picked.id, shift: subShift };
  const assignVerdict = assignChange && boardStore.preview(assignChange);
  const peers = board.staff.filter((p) => {
    const c = board.roster[p.id]?.[date];
    return p.id !== staffId && c && c.code !== ABSENCE && cell.code !== ABSENCE && c.code !== cell.code;
  });

  return (
    <Sheet title={staff.name} kicker={`${shortDate(date)} · ${areaTeam(staff.area)}`} onClose={onClose}>
      <Section title="Turno">
        <div className="grid grid-cols-3 gap-2">
          {([...settings.shifts.map((sh) => sh.id), ABSENCE] as Code[]).map((code) => {
            const change: Change = { kind: "set", staffId, date, code };
            const v = boardStore.preview(change);
            const active = cell.code === code && !cell.subId;
            return (
              <Button
                key={code}
                tone={active ? "primary" : "neutral"}
                size="md"
                aria-pressed={active}
                disabled={!v.allowed && !active}
                title={v.reason ?? v.warning}
                onClick={() => !active && run(change)}
                className={!v.allowed && !active ? "line-through" : ""}
              >
                {active && <Icon name="check" className="size-5" />}
                {!v.allowed && !active && "🔒"}
                {codeName(code)}
              </Button>
            );
          })}
        </div>
      </Section>

      {peers.length > 0 && (
        <Section title="Cambiar el turno con…">
          <div className="flex flex-wrap gap-2">
            {peers.map((p) => {
              const change: Change = { kind: "swap", date, a: staffId, b: p.id };
              const v = boardStore.preview(change);
              return (
                <Button key={p.id} size="sm" disabled={!v.allowed} title={v.reason} onClick={() => run(change)} className="disabled:line-through">
                  <Icon name="swap" className="size-4" /> {p.name} <span className="font-normal text-muted">({board.roster[p.id]?.[date]?.code})</span>
                </Button>
              );
            })}
          </div>
        </Section>
      )}

      {(cell.code === "AUS" || assigned) && (
        <Section title={assigned ? `Lo cubre ${assigned.alias}` : "¿Quién lo cubre?"}>
          {assigned ? (
            <>
              <SuplenteFicha sub={assigned} />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <WaLink href={assignmentUri({ name: assigned.nombreCompleto, phone: assigned.telefono, dates: [date], shift: cell.code as Shift, area: staff.area })} size="sm">
                  Confirmar
                </WaLink>
                <WaLink href={closingUri({ name: assigned.nombreCompleto, phone: assigned.telefono, dates: [date] })} size="sm">
                  Dar las gracias
                </WaLink>
                <Button tone="danger" size="sm" className="col-span-2" onClick={() => run({ kind: "unassign", staffId, date })}>
                  Quitar suplente
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-3 grid grid-cols-2 gap-2">
                {settings.shifts.map(({ id: s }) => (
                  <Button key={s} size="sm" tone={subShift === s ? "primary" : "neutral"} aria-pressed={subShift === s} onClick={() => setSubShift(s)}>
                    {codeName(s)}
                  </Button>
                ))}
              </div>
              <SuplenteCombobox options={agenda.filter((s) => s.activo)} selected={picked} onSelect={setPickedId} />
              {picked && assignChange && assignVerdict && (
                <div className="rise-in mt-3">
                  <SuplenteFicha sub={picked} />
                  {!assignVerdict.allowed && <p className="mt-2 text-base font-bold text-critical">{assignVerdict.reason}</p>}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <WaLink href={offerUri({ name: picked.nombreCompleto, phone: picked.telefono, dates: [date], shift: subShift, area: staff.area })} size="sm">
                      Preguntar
                    </WaLink>
                    <Button tone="primary" size="sm" disabled={!assignVerdict.allowed} onClick={() => run(assignChange)}>
                      <Icon name="check" className="size-5" /> Poner a {picked.alias}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Section>
      )}
    </Sheet>
  );
}

/** Datos vinculados desde la agenda: el DNI solo se muestra enmascarado. */
function SuplenteFicha({ sub }: { sub: SuplenteHabitual }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-2xl bg-canvas px-3.5 py-2.5 text-sm">
      <dt className="text-muted">Nombre</dt>
      <dd className="font-bold">{sub.nombreCompleto || "—"}</dd>
      <dt className="text-muted">Teléfono</dt>
      <dd className="font-mono">{sub.telefono || "—"}</dd>
      <dt className="text-muted">DNI</dt>
      <dd>
        <DniBadge dni={sub.dni} />
      </dd>
    </dl>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 first-of-type:mt-0">
      <h3 className="mb-2 text-xs font-bold tracking-wide text-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}
