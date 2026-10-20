"use client";

import { useState } from "react";
import { createDemoBoard, DEMO_SUPLENTES, newStaff } from "@/data/seed";
import { boardStore } from "@/lib/boardStore";
import { REGIONS, type RegionCode } from "@/lib/holidays";
import {
  DEFAULT_AREAS,
  DEFAULT_RULES,
  DEFAULT_SHIFTS,
  NIGHT_SHIFT,
  type AreaDef,
  type RuleDef,
  type ShiftDef,
} from "@/lib/settings";
import { settingsStore } from "@/lib/settingsStore";
import { substitutesStore } from "@/lib/substitutesStore";
import type { Staff } from "@/lib/types";
import { Button, Icon } from "./ui";
import { Logo as Mark } from "./Intro";

const INPUT =
  "w-full min-h-11 rounded-xl border border-line bg-surface px-3 text-[15px] focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none";

type Step = 0 | 1 | 2 | 3;

interface Draft {
  center: string;
  region: RegionCode;
  nights: boolean;
  areas: AreaDef[];
  rules: RuleDef[];
  staff: Staff[];
}

const initialDraft = (): Draft => ({
  center: "",
  region: "MD",
  nights: false,
  areas: DEFAULT_AREAS.map((a) => ({ ...a })),
  rules: DEFAULT_RULES.map((r) => ({ ...r })),
  staff: [],
});

/**
 * Alta del centro la primera vez que se abre la app.
 *
 * Son cuatro pasos y todos se pueden cambiar luego en Ajustes: lo que importa aquí es que
 * nadie se quede mirando un cuadrante vacío sin saber por dónde empezar.
 */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>(0);
  const [d, setDraft] = useState<Draft>(initialDraft);
  const patch = (p: Partial<Draft>) => setDraft((prev) => ({ ...prev, ...p }));

  const shifts: ShiftDef[] = d.nights ? [...DEFAULT_SHIFTS, NIGHT_SHIFT] : DEFAULT_SHIFTS;

  const finish = (): void => {
    settingsStore.replace({
      version: 1,
      center: d.center.trim(),
      region: d.region,
      shifts,
      areas: d.areas,
      rules: d.rules.filter((r) => shifts.some((s) => s.id === r.shiftId)),
      customHolidays: [],
      workdayExceptions: [],
      onboarded: true,
    });
    boardStore.setBoard({ version: 1, center: d.center.trim(), staff: d.staff, roster: {} });
    onDone();
  };

  const useDemo = (): void => {
    const now = new Date();
    settingsStore.replace({
      version: 1,
      center: "Centro de Salud de ejemplo",
      region: "MD",
      shifts: DEFAULT_SHIFTS,
      areas: DEFAULT_AREAS,
      rules: DEFAULT_RULES,
      customHolidays: [],
      workdayExceptions: [],
      onboarded: true,
    });
    boardStore.setBoard(createDemoBoard(now.getFullYear(), now.getMonth()));
    substitutesStore.replaceAll(DEMO_SUPLENTES);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-canvas pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col gap-5 px-4 py-6">
        <header className="flex items-center gap-3">
          <Mark className="size-10 shrink-0" />
          <div>
            <p className="text-xl font-bold">MedBoard</p>
            <p className="text-sm text-muted">Paso {step + 1} de 4</p>
          </div>
        </header>

        <ol className="flex gap-1.5" aria-label="Progreso del alta">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`} />
          ))}
        </ol>

        <div className="card-3d rounded-3xl bg-surface p-5">
          {step === 0 && <StepCentro d={d} patch={patch} />}
          {step === 1 && <StepTurnos d={d} patch={patch} />}
          {step === 2 && <StepReglas d={d} patch={patch} shifts={shifts} />}
          {step === 3 && <StepPlantilla d={d} patch={patch} shifts={shifts} />}
        </div>

        <div className="mt-auto flex items-center gap-2">
          {step > 0 && (
            <Button tone="neutral" size="md" onClick={() => setStep((s) => (s - 1) as Step)}>
              <Icon name="left" className="size-5" /> Atrás
            </Button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <Button tone="primary" size="md" disabled={step === 0 && !d.center.trim()} onClick={() => setStep((s) => (s + 1) as Step)}>
              Siguiente <Icon name="right" className="size-5" />
            </Button>
          ) : (
            <Button tone="primary" size="md" onClick={finish}>
              <Icon name="check" className="size-5" /> Empezar
            </Button>
          )}
        </div>

        <p className="text-center text-sm text-muted">
          ¿Solo quieres ver cómo funciona?{" "}
          <button type="button" onClick={useDemo} className="font-bold text-brand underline underline-offset-2">
            Probar con datos de ejemplo
          </button>
        </p>
      </div>
    </div>
  );
}

function StepCentro({ d, patch }: { d: Draft; patch: (p: Partial<Draft>) => void }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold">¿Dónde trabajas?</h2>
      <p className="text-sm text-muted">El nombre sale en los PDF del cuadrante y en los mensajes a las suplentes.</p>
      <label className="block">
        <span className="mb-1 block text-sm font-bold">Nombre del centro</span>
        <input
          className={INPUT}
          value={d.center}
          autoFocus
          placeholder="Centro de Salud…"
          onChange={(e) => patch({ center: e.target.value })}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-bold">Comunidad autónoma</span>
        <select className={INPUT} value={d.region} onChange={(e) => patch({ region: e.target.value as RegionCode })}>
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-muted">
          Sirve para proponer los festivos. El calendario laboral se publica cada año, así que conviene
          revisarlos en Ajustes.
        </span>
      </label>
    </section>
  );
}

function StepTurnos({ d, patch }: { d: Draft; patch: (p: Partial<Draft>) => void }) {
  const setArea = (i: number, p: Partial<AreaDef>) => patch({ areas: d.areas.map((a, j) => (i === j ? { ...a, ...p } : a)) });
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold">Turnos y equipos</h2>

      <div>
        <p className="text-sm font-bold">Turnos</p>
        <p className="text-sm text-muted">Mañana y tarde vienen puestos.</p>
        <label className="mt-2 flex min-h-11 items-center gap-2 text-[15px]">
          <input type="checkbox" className="size-5" checked={d.nights} onChange={(e) => patch({ nights: e.target.checked })} />
          Este centro también tiene turno de noche
        </label>
      </div>

      <div>
        <p className="text-sm font-bold">Equipos</p>
        <p className="mb-2 text-sm text-muted">Cómo se reparte la plantilla. Si en tu centro no hay pediatría, borra esa línea.</p>
        <ul className="space-y-2">
          {d.areas.map((a, i) => (
            <li key={a.id} className="flex items-center gap-2">
              <input
                className={INPUT}
                value={a.team}
                aria-label={`Nombre del equipo ${i + 1}`}
                onChange={(e) => setArea(i, { team: e.target.value, label: e.target.value })}
              />
              {d.areas.length > 1 && (
                <button
                  type="button"
                  aria-label={`Quitar ${a.team}`}
                  className="grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-canvas"
                  onClick={() =>
                    patch({
                      areas: d.areas.filter((_, j) => j !== i),
                      rules: d.rules.filter((r) => r.areaId !== a.id),
                    })
                  }
                >
                  <Icon name="close" className="size-5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function StepReglas({ d, patch, shifts }: { d: Draft; patch: (p: Partial<Draft>) => void; shifts: ShiftDef[] }) {
  const rules = d.rules.filter((r) => shifts.some((s) => s.id === r.shiftId));
  const set = (id: string, required: number) =>
    patch({ rules: d.rules.map((r) => (r.id === id ? { ...r, required: Math.max(0, required) } : r)) });

  const add = () => {
    const shiftId = shifts[0]?.id ?? "M";
    patch({
      rules: [...d.rules, { id: `R-${Date.now().toString(36)}`, shiftId, areaId: null, required: 1 }],
    });
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold">Mínimos de cobertura</h2>
      <p className="text-sm text-muted">
        Cuánta gente tiene que haber como mínimo. MedBoard avisa cuando un cambio deja el día por debajo.
      </p>
      <ul className="space-y-2">
        {rules.map((r) => (
          <li key={r.id} className="flex items-center gap-2 rounded-xl border border-line p-2">
            <select
              className={INPUT}
              value={r.shiftId}
              aria-label="Turno"
              onChange={(e) => patch({ rules: d.rules.map((x) => (x.id === r.id ? { ...x, shiftId: e.target.value } : x)) })}
            >
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              className={INPUT}
              value={r.areaId ?? ""}
              aria-label="Equipo"
              onChange={(e) => patch({ rules: d.rules.map((x) => (x.id === r.id ? { ...x, areaId: e.target.value || null } : x)) })}
            >
              <option value="">Todo el turno</option>
              {d.areas.map((a) => (
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
              onChange={(e) => set(r.id, Number(e.target.value))}
            />
            <button
              type="button"
              aria-label="Quitar regla"
              className="grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-canvas"
              onClick={() => patch({ rules: d.rules.filter((x) => x.id !== r.id) })}
            >
              <Icon name="close" className="size-5" />
            </button>
          </li>
        ))}
      </ul>
      <Button tone="neutral" size="sm" onClick={add}>
        <Icon name="plus" className="size-4" /> Añadir mínimo
      </Button>
    </section>
  );
}

function StepPlantilla({ d, patch, shifts }: { d: Draft; patch: (p: Partial<Draft>) => void; shifts: ShiftDef[] }) {
  const [name, setName] = useState("");
  const [area, setArea] = useState(d.areas[0]?.id ?? "");
  const [shift, setShift] = useState(shifts[0]?.id ?? "M");

  const add = () => {
    const clean = name.trim();
    if (!clean) return;
    patch({ staff: [...d.staff, newStaff(clean, area, shift)] });
    setName("");
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold">Tu plantilla</h2>
      <p className="text-sm text-muted">
        Solo el nombre con el que llamas a cada persona. No hace falta apellidos, ni DNI, ni nada más.
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-36 flex-1">
          <span className="mb-1 block text-sm font-bold">Nombre</span>
          <input
            className={INPUT}
            value={name}
            placeholder="Ana"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          />
        </label>
        {d.areas.length > 1 && (
          <label>
            <span className="mb-1 block text-sm font-bold">Equipo</span>
            <select className={INPUT} value={area} onChange={(e) => setArea(e.target.value)}>
              {d.areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.team}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span className="mb-1 block text-sm font-bold">Turno</span>
          <select className={INPUT} value={shift} onChange={(e) => setShift(e.target.value)}>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <Button tone="primary" size="md" onClick={add} disabled={!name.trim()}>
          <Icon name="plus" className="size-5" /> Añadir
        </Button>
      </div>

      {d.staff.length === 0 ? (
        <p className="rounded-xl bg-canvas p-3 text-sm text-muted">
          Puedes empezar sin plantilla y añadirla luego desde Ajustes.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {d.staff.map((s) => (
            <li key={s.id} className="flex items-center gap-2 px-3 py-2">
              <span className="flex-1 truncate text-[15px] font-bold">{s.name}</span>
              <span className="text-sm text-muted">
                {d.areas.find((a) => a.id === s.area)?.team} · {shifts.find((x) => x.id === s.baseShift)?.label}
              </span>
              <button
                type="button"
                aria-label={`Quitar a ${s.name}`}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-canvas"
                onClick={() => patch({ staff: d.staff.filter((x) => x.id !== s.id) })}
              >
                <Icon name="close" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

