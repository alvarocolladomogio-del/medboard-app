"use client";

import { useState } from "react";
import { newStaff } from "@/data/seed";
import { boardStore } from "@/lib/boardStore";
import { holidaysOfYear, shortDate } from "@/lib/calendar";
import { REGIONS, type RegionCode } from "@/lib/holidays";
import { NIGHT_SHIFT, slugId, type AreaDef, type RuleDef, type ShiftDef } from "@/lib/settings";
import { settingsStore, useSettings } from "@/lib/settingsStore";
import type { Board, IsoDate, Staff } from "@/lib/types";
import { Button, Confirm, Icon } from "./ui";

const INPUT =
  "w-full min-h-11 rounded-xl border border-line bg-surface px-3 text-[15px] focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card-3d rounded-2xl bg-surface p-4">
      <h2 className="text-base font-bold">{title}</h2>
      {hint && <p className="mt-0.5 mb-3 text-sm text-muted">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

export function Ajustes({ board, year, onNotice }: { board: Board; year: number; onNotice: (text: string) => void }) {
  const settings = useSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <Centro settings={settings} onNotice={onNotice} />
      <Turnos settings={settings} onNotice={onNotice} />
      <Equipos settings={settings} onNotice={onNotice} />
      <Minimos settings={settings} onNotice={onNotice} />
      <Plantilla board={board} settings={settings} onNotice={onNotice} />
      <Festivos year={year} onNotice={onNotice} />
      <Ayuda />
      <Legal />
    </div>
  );
}

function Centro({ settings, onNotice }: { settings: ReturnType<typeof useSettings>; onNotice: (t: string) => void }) {
  const [center, setCenter] = useState(settings.center);
  const save = () => {
    settingsStore.update({ center: center.trim() });
    boardStore.setCenter(center.trim());
    onNotice("✓ Centro guardado");
  };
  return (
    <Section title="Centro" hint="Sale en los PDF y en los mensajes a las suplentes.">
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Nombre</span>
          <input className={INPUT} value={center} onChange={(e) => setCenter(e.target.value)} onBlur={save} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Comunidad autónoma</span>
          <select
            className={INPUT}
            value={settings.region}
            onChange={(e) => {
              settingsStore.update({ region: e.target.value as RegionCode });
              onNotice("✓ Festivos recalculados");
            }}
          >
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Section>
  );
}

function Turnos({ settings, onNotice }: { settings: ReturnType<typeof useSettings>; onNotice: (t: string) => void }) {
  const set = (shifts: ShiftDef[]) => settingsStore.update({ shifts });
  const rename = (id: string, label: string) => set(settings.shifts.map((s) => (s.id === id ? { ...s, label } : s)));
  const addNight = () => {
    set([...settings.shifts, NIGHT_SHIFT]);
    onNotice("✓ Turno de noche añadido");
  };
  const remove = (id: string) => {
    set(settings.shifts.filter((s) => s.id !== id));
    settingsStore.update({ rules: settings.rules.filter((r) => r.shiftId !== id) });
    onNotice("Turno quitado. Las celdas que lo usaban siguen en el cuadrante.");
  };
  return (
    <Section title="Turnos" hint="El nombre que ves en la app. La letra de la celda no cambia.">
      <ul className="space-y-2">
        {settings.shifts.map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-canvas font-mono text-sm font-bold">{s.short}</span>
            <input className={INPUT} value={s.label} aria-label={`Nombre del turno ${s.short}`} onChange={(e) => rename(s.id, e.target.value)} />
            {settings.shifts.length > 1 && (
              <button type="button" aria-label={`Quitar turno ${s.label}`} className="grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-canvas" onClick={() => remove(s.id)}>
                <Icon name="close" className="size-5" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {!settings.shifts.some((s) => s.id === NIGHT_SHIFT.id) && (
        <Button tone="neutral" size="sm" className="mt-3" onClick={addNight}>
          <Icon name="plus" className="size-4" /> Añadir turno de noche
        </Button>
      )}
    </Section>
  );
}

function Equipos({ settings, onNotice }: { settings: ReturnType<typeof useSettings>; onNotice: (t: string) => void }) {
  const [name, setName] = useState("");
  const set = (areas: AreaDef[]) => settingsStore.update({ areas });
  const add = () => {
    const clean = name.trim();
    if (!clean) return;
    set([...settings.areas, { id: slugId(clean, settings.areas.map((a) => a.id)), label: clean, team: clean }]);
    setName("");
    onNotice("✓ Equipo añadido");
  };
  return (
    <Section title="Equipos" hint="Cómo se reparte la plantilla: adultos, pediatría, lo que use tu centro.">
      <ul className="space-y-2">
        {settings.areas.map((a) => (
          <li key={a.id} className="flex items-center gap-2">
            <input
              className={INPUT}
              value={a.team}
              aria-label={`Nombre del equipo ${a.team}`}
              onChange={(e) => set(settings.areas.map((x) => (x.id === a.id ? { ...x, team: e.target.value, label: e.target.value } : x)))}
            />
            {settings.areas.length > 1 && (
              <button
                type="button"
                aria-label={`Quitar ${a.team}`}
                className="grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-canvas"
                onClick={() => {
                  set(settings.areas.filter((x) => x.id !== a.id));
                  settingsStore.update({ rules: settings.rules.filter((r) => r.areaId !== a.id) });
                }}
              >
                <Icon name="close" className="size-5" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input className={INPUT} value={name} placeholder="Nuevo equipo" aria-label="Nuevo equipo" onChange={(e) => setName(e.target.value)} />
        <Button tone="neutral" size="md" onClick={add} disabled={!name.trim()}>
          <Icon name="plus" className="size-5" />
        </Button>
      </div>
    </Section>
  );
}

function Minimos({ settings, onNotice }: { settings: ReturnType<typeof useSettings>; onNotice: (t: string) => void }) {
  const set = (rules: RuleDef[]) => settingsStore.update({ rules });
  const add = () => {
    set([...settings.rules, { id: `R-${Date.now().toString(36)}`, shiftId: settings.shifts[0]?.id ?? "M", areaId: null, required: 1 }]);
    onNotice("✓ Mínimo añadido");
  };
  return (
    <Section title="Mínimos de cobertura" hint="MedBoard rechaza los cambios que dejen un día por debajo de estos números.">
      <ul className="space-y-2">
        {settings.rules.map((r) => (
          <li key={r.id} className="flex items-center gap-2 rounded-xl border border-line p-2">
            <select className={INPUT} value={r.shiftId} aria-label="Turno" onChange={(e) => set(settings.rules.map((x) => (x.id === r.id ? { ...x, shiftId: e.target.value } : x)))}>
              {settings.shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <select className={INPUT} value={r.areaId ?? ""} aria-label="Equipo" onChange={(e) => set(settings.rules.map((x) => (x.id === r.id ? { ...x, areaId: e.target.value || null } : x)))}>
              <option value="">Todo el turno</option>
              {settings.areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.team}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              className={`${INPUT} w-20 shrink-0 text-center`}
              value={r.required}
              aria-label="Mínimo"
              onChange={(e) => set(settings.rules.map((x) => (x.id === r.id ? { ...x, required: Math.max(0, Number(e.target.value)) } : x)))}
            />
            <button type="button" aria-label="Quitar mínimo" className="grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-canvas" onClick={() => set(settings.rules.filter((x) => x.id !== r.id))}>
              <Icon name="close" className="size-5" />
            </button>
          </li>
        ))}
      </ul>
      <Button tone="neutral" size="sm" className="mt-3" onClick={add}>
        <Icon name="plus" className="size-4" /> Añadir mínimo
      </Button>
    </Section>
  );
}

function Plantilla({ board, settings, onNotice }: { board: Board; settings: ReturnType<typeof useSettings>; onNotice: (t: string) => void }) {
  const [name, setName] = useState("");
  const [area, setArea] = useState(settings.areas[0]?.id ?? "");
  const [shift, setShift] = useState(settings.shifts[0]?.id ?? "M");
  const [toRemove, setToRemove] = useState<Staff | null>(null);

  const add = () => {
    const clean = name.trim();
    if (!clean) return;
    boardStore.saveStaff(newStaff(clean, area || settings.areas[0]?.id || "", shift));
    setName("");
    onNotice("✓ Añadida a la plantilla");
  };

  return (
    <Section title="Plantilla" hint="Quién trabaja en el centro. Solo el nombre con el que la llamas.">
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <input className={`${INPUT} min-w-32 flex-1`} value={name} placeholder="Nombre" aria-label="Nombre" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} />
        {settings.areas.length > 1 && (
          <select className={`${INPUT} w-auto`} value={area} aria-label="Equipo" onChange={(e) => setArea(e.target.value)}>
            {settings.areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.team}
              </option>
            ))}
          </select>
        )}
        <select className={`${INPUT} w-auto`} value={shift} aria-label="Turno" onChange={(e) => setShift(e.target.value)}>
          {settings.shifts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <Button tone="primary" size="md" onClick={add} disabled={!name.trim()}>
          <Icon name="plus" className="size-5" />
        </Button>
      </div>

      {board.staff.length === 0 ? (
        <p className="rounded-xl bg-canvas p-3 text-sm text-muted">Todavía no hay nadie. Añade a tu equipo para empezar el cuadrante.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {board.staff.map((s) => (
            <li key={s.id} className="flex items-center gap-2 px-3 py-2">
              <input
                className="min-w-0 flex-1 bg-transparent text-[15px] font-bold focus:outline-none"
                value={s.name}
                aria-label={`Nombre de ${s.name}`}
                onChange={(e) => boardStore.saveStaff({ ...s, name: e.target.value })}
              />
              <select className="rounded-lg bg-canvas px-2 py-1 text-sm" value={s.baseShift} aria-label={`Turno de ${s.name}`} onChange={(e) => boardStore.saveStaff({ ...s, baseShift: e.target.value })}>
                {settings.shifts.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label}
                  </option>
                ))}
              </select>
              {settings.areas.length > 1 && (
                <select className="rounded-lg bg-canvas px-2 py-1 text-sm" value={s.area} aria-label={`Equipo de ${s.name}`} onChange={(e) => boardStore.saveStaff({ ...s, area: e.target.value })}>
                  {settings.areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.team}
                    </option>
                  ))}
                </select>
              )}
              <button type="button" aria-label={`Quitar a ${s.name}`} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-canvas" onClick={() => setToRemove(s)}>
                <Icon name="close" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {toRemove && (
        <Confirm
          title={`¿Quitar a ${toRemove.name}?`}
          text="Se borra del cuadrante y todos sus turnos del mes. Se puede deshacer."
          action="Quitar"
          onConfirm={() => {
            boardStore.removeStaff(toRemove.id);
            setToRemove(null);
            onNotice("Quitada de la plantilla");
          }}
          onClose={() => setToRemove(null)}
        />
      )}
    </Section>
  );
}

function Festivos({ year, onNotice }: { year: number; onNotice: (t: string) => void }) {
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const list = holidaysOfYear(year);

  const add = () => {
    if (!date || !name.trim()) return;
    settingsStore.addCustomHoliday({ date: date as IsoDate, name: name.trim(), scope: "LOCAL" });
    setDate("");
    setName("");
    onNotice("✓ Festivo añadido");
  };

  return (
    <Section
      title={`Festivos de ${year}`}
      hint="Propuesta calculada para tu comunidad. El calendario laboral se publica cada año por decreto, así que revísalo y corrige lo que haga falta."
    >
      <ul className="divide-y divide-line rounded-xl border border-line">
        {list.map((h) => (
          <li key={h.date} className="flex items-center gap-2 px-3 py-2">
            <span className="w-20 shrink-0 font-mono text-sm text-muted">{shortDate(h.date)}</span>
            <span className="min-w-0 flex-1 truncate text-[15px]">{h.name}</span>
            {h.scope === "LOCAL" && <span className="rounded bg-cork-soft px-1.5 text-[11px] font-bold text-cork">local</span>}
            <button
              type="button"
              aria-label={`Marcar ${h.name} como laborable`}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-canvas"
              onClick={() => {
                settingsStore.removeHoliday(h.date);
                onNotice("Marcado como laborable");
              }}
            >
              <Icon name="close" className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap gap-2">
        <input type="date" className={`${INPUT} w-auto`} value={date} aria-label="Fecha del festivo" onChange={(e) => setDate(e.target.value)} />
        <input className={`${INPUT} min-w-32 flex-1`} value={name} placeholder="Fiesta local" aria-label="Nombre del festivo" onChange={(e) => setName(e.target.value)} />
        <Button tone="neutral" size="md" onClick={add} disabled={!date || !name.trim()}>
          <Icon name="plus" className="size-5" />
        </Button>
      </div>
    </Section>
  );
}

function Ayuda() {
  return (
    <Section title="Cómo se usa">
      <ol className="list-decimal space-y-2 pl-5 text-[15px]">
        <li>
          <b>Calendario</b>: el día a día. El botón «Apuntar falta» abre el atajo de tres toques: quién falta, qué
          días y quién lo cubre.
        </li>
        <li>
          <b>Cuadrante</b>: la rejilla del mes. Toca una casilla para cambiar turno, permutar o poner suplente.
        </li>
        <li>
          <b>Agenda</b>: las suplentes habituales, con su teléfono y su valoración. Desde aquí les escribes por
          WhatsApp con el mensaje ya redactado.
        </li>
        <li>
          <b>Imprimir</b>: el PDF del cuadrante para el tablón, la hoja para Administración y la copia de seguridad
          cifrada.
        </li>
      </ol>
      <p className="mt-3 rounded-xl bg-brand-soft p-3 text-sm">
        <b>Haz una copia cifrada al mes.</b> Está en Imprimir → Copia de seguridad. Los datos viven solo en este
        dispositivo: si lo pierdes y no tienes copia, no hay forma de recuperarlos.
      </p>
    </Section>
  );
}

function Legal() {
  return (
    <Section title="Privacidad y aviso legal">
      <div className="space-y-3 text-sm">
        <p>
          <b>Dónde están tus datos.</b> En este dispositivo y en ningún sitio más. MedBoard no tiene servidor, no
          envía nada por la red, no lleva analítica ni publicidad y no usa librerías de terceros al ejecutarse. Lo
          único que sale es lo que tú compartes a mano: un PDF, un archivo de calendario o una copia de seguridad.
        </p>
        <p>
          <b>Qué guarda.</b> El cuadrante con los turnos y las ausencias, sin el motivo de la ausencia, y las fichas
          de la agenda de suplentes con nombre, DNI, teléfono y tipo de contrato.
        </p>
        <p>
          <b>Por qué nunca pide el motivo de una falta.</b> Para no tratar datos de salud. La app solo apunta que
          alguien no está. No escribas diagnósticos ni motivos médicos en ningún campo.
        </p>
        <p>
          <b>Si guardas datos de otras personas</b> (las suplentes de la agenda), avísalas de que lo haces y para
          qué, y bórralos cuando te lo pidan. Es el deber de información del artículo 13 del RGPD. Para borrar una
          ficha: Agenda → la ficha → Borrar.
        </p>
        <p>
          <b>Esto no es un producto sanitario.</b> MedBoard es una herramienta de apoyo para organizar turnos. No
          toma decisiones clínicas ni sustituye a la planilla oficial de tu centro, que es la de Supervisión o
          Dirección.
        </p>
        <p>
          <b>Sin garantías.</b> La app se ofrece tal cual, gratis y sin garantía de ningún tipo. Quien la usa es
          responsable de comprobar que su cuadrante es correcto.
        </p>
        <p className="text-muted">
          Los festivos que propone la app son un cálculo orientativo, no una fuente oficial. El calendario laboral
          lo publica cada año tu comunidad autónoma.
        </p>
      </div>
    </Section>
  );
}
