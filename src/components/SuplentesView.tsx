"use client";

import { useState } from "react";
import { shortDate } from "@/lib/calendar";
import { dniStatus, maskDni } from "@/lib/dni";
import { especialidades, shiftName } from "@/lib/labels";
import { assignedSubIds, groupBy, type CoverageEntry } from "@/lib/roster";
import { substitutesStore } from "@/lib/substitutesStore";
import { ANY_AREA, type Board, type Especialidad, type SuplenteHabitual } from "@/lib/types";
import { googleCalendarUrl } from "@/lib/calendarExport";
import { assignmentUri, closingUri } from "@/lib/WhatsAppService";
import { Avatar, Button, Confirm, DniBadge, Icon, Stars, WaLink, btnClass } from "./ui";

type TextField = "alias" | "nombreCompleto" | "telefono" | "centroHabitual" | "contrato";

const FIELDS: ReadonlyArray<{ key: TextField; label: string; mode?: "tel" }> = [
  { key: "alias", label: "Nombre corto (sale en el cuadrante)" },
  { key: "nombreCompleto", label: "Nombre y apellidos" },
  { key: "telefono", label: "Teléfono", mode: "tel" },
  { key: "centroHabitual", label: "Centro donde trabaja" },
  { key: "contrato", label: "Tipo de contrato" },
];

const INPUT = "w-full min-h-11 rounded-xl border border-line bg-surface px-3 text-[15px] focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none";
/* El color depende de la posición del área en los ajustes; "Todas" siempre en color de marca. */
const AREA_CHIPS = ["bg-shift-m text-shift-m-ink", "bg-ped-soft text-ped", "bg-shift-t text-shift-t-ink", "bg-shift-x text-shift-x-ink"] as const;
const especialidadChip = (id: Especialidad, index: number): string =>
  id === ANY_AREA ? "bg-brand-soft text-brand-deep" : AREA_CHIPS[index % AREA_CHIPS.length];
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
const waHref = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.length === 9 ? `34${digits}` : digits}`;
};

type View = "agenda" | "mes";

export function SuplentesView({ board, agenda, covered }: { board: Board; agenda: readonly SuplenteHabitual[]; covered: CoverageEntry[] }) {
  const [view, setView] = useState<View>("agenda");
  const [query, setQuery] = useState("");
  const groups = Object.values(groupBy(covered, (e) => `${e.sub.id}|${e.shift}|${e.area}`));
  const inUse = assignedSubIds(board);
  const monthCount = new Map<string, number>();
  for (const e of covered) monthCount.set(e.sub.id, (monthCount.get(e.sub.id) ?? 0) + 1);
  const q = query.trim().toLowerCase();
  const list = [...agenda]
    .filter((s) => !q || `${s.alias} ${s.nombreCompleto} ${s.centroHabitual}`.toLowerCase().includes(q))
    .sort((a, b) => Number(b.activo) - Number(a.activo) || a.alias.localeCompare(b.alias, "es"));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-line/60 p-1" role="tablist" aria-label="Agenda">
        {([["agenda", `Suplentes · ${agenda.filter((s) => s.activo).length}`], ["mes", `Suplencias del mes · ${covered.length}`]] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`min-h-10 rounded-xl text-sm font-bold transition ${view === id ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "mes" ? (
        <section className="space-y-2" aria-label="Suplencias de este mes">
          {groups.length ? (
            <ul className="space-y-2">
              {groups.map((g) => {
                const { sub, shift, area } = g[0];
                const dates = g.map((e) => e.date);
                return (
                  <li key={`${sub.id}${shift}${area}`} className="card-3d rise-in rounded-2xl bg-surface p-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={sub.alias} emoji={sub.emoji} className="size-10 text-base" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-bold">
                          {sub.alias} <span className="font-normal text-muted">cubre a {[...new Set(g.map((e) => e.staff.name))].join(", ")}</span>
                        </p>
                        <p className="text-xs font-bold text-muted">
                          {shiftName(shift)} · {dates.length} día{dates.length > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <ul className="mt-2 flex flex-wrap gap-1">
                      {[...dates].sort().map((d) => (
                        <li key={d} className="rounded-md bg-sub px-1.5 py-0.5 text-xs font-bold text-sub-ink">
                          {shortDate(d)}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <WaLink href={assignmentUri({ name: sub.nombreCompleto, phone: sub.telefono, dates, shift, area })} size="sm">
                        Confirmar
                      </WaLink>
                      <WaLink href={closingUri({ name: sub.nombreCompleto, phone: sub.telefono, dates })} size="sm">
                        Dar las gracias
                      </WaLink>
                    </div>
                    <a
                      href={googleCalendarUrl({ subName: sub.alias, staffName: [...new Set(g.map((e) => e.staff.name))].join(", "), shift, dates, center: board.center })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={btnClass("quiet", "sm", "mt-2 w-full")}
                    >
                      <Icon name="calendar" className="size-4" /> Añadir a Google Calendar
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-2xl bg-surface p-4 text-muted">Aún no hay suplencias este mes.</p>
          )}
        </section>
      ) : (
        <section className="space-y-3" aria-label="Agenda de suplentes">
          <label className="relative block">
            <span className="sr-only">Buscar suplente</span>
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o centro" className={`${INPUT} pl-10`} />
          </label>
          <ul className="card-3d divide-y divide-line overflow-hidden rounded-3xl bg-surface">
            {list.map((s) => (
              <SuplenteCard key={s.id} sub={s} inUse={inUse.has(s.id)} monthDays={monthCount.get(s.id) ?? 0} />
            ))}
            {!list.length && <li className="p-4 text-muted">Nadie coincide con «{query}».</li>}
          </ul>
          <Button tone="primary" className="w-full" onClick={() => substitutesStore.create()}>
            <Icon name="plus" className="size-5" /> Añadir suplente
          </Button>
        </section>
      )}
    </div>
  );
}

function SuplenteCard({ sub, inUse, monthDays }: { sub: SuplenteHabitual; inUse: boolean; monthDays: number }) {
  const opciones = especialidades();
  const [open, setOpen] = useState(!sub.nombreCompleto);
  const [asking, setAsking] = useState(false);
  return (
    <li className={sub.activo ? "" : "bg-canvas/50"}>
      <div className="flex items-center gap-3 px-3.5 py-3">
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} aria-label={`${open ? "Cerrar" : "Ver"} ficha de ${sub.alias}`} className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none focus-visible:ring-4 focus-visible:ring-brand/30 rounded-xl">
          <Avatar name={sub.alias} emoji={sub.emoji} className={`size-11 text-lg ${sub.activo ? "" : "grayscale"}`} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[15px] font-bold">{sub.alias}</span>
              <Stars value={sub.estrellas} />
            </span>
            <span className="block truncate text-sm text-muted">{sub.nombreCompleto || "Sin nombre completo"}</span>
            <span className="mt-1 flex flex-wrap items-center gap-1">
              {sub.especialidad && (
                <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${especialidadChip(sub.especialidad, opciones.findIndex((e) => e.id === sub.especialidad))}`}>
                  {opciones.find((e) => e.id === sub.especialidad)?.label}
                </span>
              )}
              {monthDays > 0 && <span className="rounded-md bg-sub px-1.5 py-0.5 text-[11px] font-bold text-sub-ink">{monthDays} este mes</span>}
              {!sub.activo && <span className="rounded-md bg-line px-1.5 py-0.5 text-[11px] font-bold text-muted">No disponible</span>}
              <DniBadge dni={sub.dni} />
            </span>
          </span>
        </button>
        {sub.telefono && (
          <span className="flex shrink-0 gap-1.5">
            <a href={telHref(sub.telefono)} aria-label={`Llamar a ${sub.alias}`} className="grid size-10 place-items-center rounded-full bg-brand-soft text-brand-deep active:scale-90">
              <Icon name="phone" className="size-5" />
            </a>
            <a href={waHref(sub.telefono)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp a ${sub.alias}`} className="grid size-10 place-items-center rounded-full bg-wa text-white active:scale-90">
              <Icon name="wa" className="size-5" />
            </a>
          </span>
        )}
      </div>
      {open && (
        <div className="rise-in grid gap-3 border-t border-line bg-canvas/40 p-3.5 sm:grid-cols-2">
          <label className="flex min-h-11 items-center gap-3 text-[15px] font-bold sm:col-span-2">
            <input
              type="checkbox"
              checked={sub.activo}
              onChange={(e) => substitutesStore.update(sub.id, { activo: e.target.checked })}
              className="size-5 accent-brand"
            />
            Disponible para suplencias
          </label>
          {FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1 block text-xs font-bold text-muted">{f.label}</span>
              <input
                key={sub[f.key]}
                defaultValue={sub[f.key]}
                onBlur={(e) => e.target.value.trim() !== sub[f.key] && substitutesStore.update(sub.id, { [f.key]: e.target.value.trim() })}
                inputMode={f.mode}
                className={INPUT}
              />
            </label>
          ))}
          <DniField sub={sub} />
          <fieldset>
            <legend className="mb-1 text-xs font-bold text-muted">Puede cubrir</legend>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-line/60 p-1">
              {opciones.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  aria-pressed={sub.especialidad === e.id}
                  onClick={() => substitutesStore.update(sub.id, { especialidad: e.id })}
                  className={`min-h-9 rounded-lg text-sm font-bold ${sub.especialidad === e.id ? "bg-surface shadow-sm" : "text-muted"}`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-1 text-xs font-bold text-muted">Valoración</legend>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
                  aria-pressed={(sub.estrellas ?? 0) >= n}
                  onClick={() => substitutesStore.update(sub.id, { estrellas: n })}
                  className={`grid size-10 place-items-center rounded-lg text-xl active:scale-90 ${(sub.estrellas ?? 0) >= n ? "text-cork" : "text-line"}`}
                >
                  ★
                </button>
              ))}
            </div>
          </fieldset>
          <Button tone="danger" size="sm" className="sm:col-span-2" disabled={inUse} onClick={() => setAsking(true)}>
            {inUse ? "Tiene turnos en el cuadrante: márcala como no disponible" : "Borrar ficha"}
          </Button>
          {asking && (
            <Confirm
              title={`¿Borrar a ${sub.alias}?`}
              text="Se borra su ficha de la agenda (nombre, teléfono y DNI). Esto no se puede deshacer."
              action="Sí, borrar ficha"
              onConfirm={() => substitutesStore.remove(sub.id)}
              onClose={() => setAsking(false)}
            />
          )}
        </div>
      )}
    </li>
  );
}

/** DNI oculto por defecto ('***' + últimos 4 dígitos y letra); el ojo lo revela y lo hace editable. */
function DniField({ sub }: { sub: SuplenteHabitual }) {
  const [visible, setVisible] = useState(false);
  const status = dniStatus(sub.dni);
  const tone = status === "verified" ? "text-sub-ink" : status === "invalid" ? "text-critical" : "text-muted";

  return (
    <div>
      <span className="mb-1 block text-xs font-bold text-muted">DNI / NIE</span>
      <div className="flex gap-2">
        {visible ? (
          <input
            key={sub.dni}
            defaultValue={sub.dni}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            onBlur={(e) => e.target.value.trim() !== sub.dni && substitutesStore.update(sub.id, { dni: e.target.value })}
            aria-label={`DNI de ${sub.alias}`}
            className={`${INPUT} font-mono uppercase`}
          />
        ) : (
          <span className={`flex min-h-11 flex-1 items-center rounded-xl border border-dashed border-line px-3 font-mono text-[15px] ${tone}`}>
            {maskDni(sub.dni) || "—"} {status === "verified" ? "✓" : status === "invalid" ? "· erróneo" : ""}
          </span>
        )}
        <Button tone="neutral" onClick={() => setVisible((v) => !v)} aria-pressed={visible} aria-label={visible ? "Ocultar DNI" : "Ver y cambiar DNI"}>
          <Icon name={visible ? "eyeOff" : "eye"} className="size-5" /> {visible ? "Ocultar" : "Ver"}
        </Button>
      </div>
    </div>
  );
}
