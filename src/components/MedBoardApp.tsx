"use client";

import { Suspense, lazy, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { boardStore, useBoard } from "@/lib/boardStore";
import { MONTHS, monthDays } from "@/lib/calendar";
import { generateAdminPdf } from "@/lib/AdminPDFGenerator";
import { generateRosterPdf, shareFile, sharePdf } from "@/lib/PDFGenerator";
import { coverageEntries, pendingSlots } from "@/lib/roster";
import { useSuplentes } from "@/lib/substitutesStore";
import { useSettings } from "@/lib/settingsStore";
import type { Code, IsoDate } from "@/lib/types";
import { validateMonth, type Verdict } from "@/lib/ValidationEngine";
import { CalendarHome, type CoverDraft } from "./CalendarHome";
import { Intro, Logo } from "./Intro";
import { Icon, haptic } from "./ui";

/* Pestañas secundarias en trozos aparte: la primera carga solo trae Inicio.
   Se precargan en reposo para que todo funcione también sin conexión. */
const loaders = {
  grid: () => import("./CalendarGrid"),
  editor: () => import("./CellEditor"),
  subs: () => import("./SuplentesView"),
  print: () => import("./PrintView"),
  cover: () => import("./QuickCover"),
  settings: () => import("./Ajustes"),
};
const CalendarGrid = lazy(() => loaders.grid().then((m) => ({ default: m.CalendarGrid })));
const CellEditor = lazy(() => loaders.editor().then((m) => ({ default: m.CellEditor })));
const SuplentesView = lazy(() => loaders.subs().then((m) => ({ default: m.SuplentesView })));
const PrintView = lazy(() => loaders.print().then((m) => ({ default: m.PrintView })));
const QuickCover = lazy(() => loaders.cover().then((m) => ({ default: m.QuickCover })));
const Ajustes = lazy(() => loaders.settings().then((m) => ({ default: m.Ajustes })));
const Onboarding = lazy(() => import("./Onboarding").then((m) => ({ default: m.Onboarding })));

const whenIdle = (fn: () => void): (() => void) => {
  if ("requestIdleCallback" in window) {
    const id = requestIdleCallback(fn, { timeout: 4000 });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(fn, 2500);
  return () => clearTimeout(id);
};

type Toast = { tone: "ok" | "warn" | "error"; text: string; undo?: boolean };
type Selection = { staffId: string; date: IsoDate };
type Tab = "home" | "grid" | "subs" | "print" | "ajustes";

const TABS: ReadonlyArray<{ id: Tab; label: string; icon: "calendar" | "grid" | "people" | "print" | "gear" }> = [
  { id: "home", label: "Calendario", icon: "calendar" },
  { id: "grid", label: "Cuadrante", icon: "grid" },
  { id: "subs", label: "Agenda", icon: "people" },
  { id: "print", label: "Imprimir", icon: "print" },
  { id: "ajustes", label: "Ajustes", icon: "gear" },
];

/* La pestaña vive en el #hash: el botón «atrás» de Android vuelve a la pestaña anterior. */
const isTab = (v: string): v is Tab => TABS.some((t) => t.id === v);
const readTab = (): Tab => {
  const h = location.hash.slice(1);
  return isTab(h) ? h : "home";
};
const goTab = (t: Tab) => {
  window.location.hash = t;
};
const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

const TOAST_STYLE: Record<Toast["tone"], string> = {
  ok: "bg-ink text-white",
  warn: "bg-salmon-ink text-white",
  error: "bg-critical text-white",
};

export function MedBoardApp() {
  const board = useBoard();
  const agenda = useSuplentes();
  const settings = useSettings();
  const [{ year, month }, setView] = useState({ year: 2026, month: 9 });
  const tab = useSyncExternalStore(subscribeHash, readTab, () => "home" as Tab);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<CoverDraft | null>(null);

  useEffect(() => boardStore.ensureMonth(year, month), [year, month]);
  useEffect(() => whenIdle(() => Object.values(loaders).forEach((load) => load().catch(() => {}))), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.undo ? 7000 : 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const days = useMemo(() => monthDays(year, month), [year, month]);
  const statuses = useMemo(() => validateMonth(board, year, month), [board, year, month]);
  const pending = useMemo(() => pendingSlots(board, year, month), [board, year, month]);
  const covered = useMemo(() => coverageEntries(board, agenda, year, month), [board, agenda, year, month]);
  const critical = useMemo(() => [...statuses.values()].filter((s) => !s.ok), [statuses]);

  const report = useCallback((v: Verdict) => {
    if (!v.allowed) setToast({ tone: "error", text: `No se puede: ${v.reason}` });
    else {
      haptic();
      setToast(v.warning ? { tone: "warn", text: `Guardado. Ojo: ${v.warning}`, undo: true } : { tone: "ok", text: "✓ Guardado", undo: true });
    }
  }, []);

  const setTab = (t: Tab) => {
    if (t !== tab) goTab(t);
    window.scrollTo({ top: 0 });
  };

  const undo = () => {
    setToast(boardStore.undo() ? { tone: "ok", text: "↺ Cambio deshecho" } : { tone: "warn", text: "No hay nada que deshacer" });
  };

  const open = useCallback((staffId: string, date: IsoDate) => {
    setSelected({ staffId, date });
    setEditing(true);
  }, []);

  const quick = useCallback(
    (staffId: string, date: IsoDate, code: Code) => {
      setSelected({ staffId, date });
      report(boardStore.dispatch({ kind: "set", staffId, date, code }));
    },
    [report],
  );

  const shiftMonth = (delta: number) =>
    setView(({ year: y, month: m }) => {
      const d = new Date(y, m + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const exportIcs = async () => {
    const { monthIcs } = await import("@/lib/calendarExport");
    const name = `suplencias_${year}-${String(month + 1).padStart(2, "0")}.ics`;
    try {
      const res = await shareFile(new Blob([monthIcs(board, agenda, year, month)], { type: "text/calendar" }), name, "Suplencias del mes");
      setToast({ tone: "ok", text: res === "shared" ? "✓ Calendario listo para enviar" : `✓ Guardado en Descargas: ${name}` });
    } catch {
      setToast({ tone: "error", text: "No se pudo crear el calendario. Prueba otra vez." });
    }
  };

  const exportPdf = async (kind: "roster" | "admin") => {
    setBusy(true);
    try {
      const tag = `${year}-${String(month + 1).padStart(2, "0")}`;
      const blob = kind === "roster" ? await generateRosterPdf(board, agenda, year, month) : await generateAdminPdf(board, agenda, year, month);
      const name = kind === "roster" ? `cuadrante_${tag}.pdf` : `suplencias_admin_${tag}.pdf`;
      const res = await sharePdf(blob, name, kind === "roster" ? "Cuadrante" : "Suplencias · Administración");
      setToast({ tone: "ok", text: res === "shared" ? "✓ PDF listo para enviar" : `✓ Guardado en Descargas: ${name}` });
    } catch {
      setToast({ tone: "error", text: "No se pudo crear el PDF. Prueba otra vez." });
    } finally {
      setBusy(false);
    }
  };

  if (!settings.onboarded) {
    return (
      <Suspense fallback={null}>
        <Onboarding onDone={() => setTab("home")} />
      </Suspense>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenido" className="sr-only z-[60] rounded-xl bg-brand px-4 py-3 font-bold text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Saltar al contenido
      </a>
      <Intro center={settings.center} />
      <h1 className="sr-only">
        MedBoard · {MONTHS[month]} {year}
      </h1>
      <header className="no-print sticky top-0 z-40 border-b border-line/70 bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2 sm:px-5">
          <Logo className="size-9 shrink-0" />
          <div className="flex flex-1 items-center justify-center gap-0.5">
            <button onClick={() => shiftMonth(-1)} className="grid size-10 place-items-center rounded-full text-muted hover:bg-surface active:scale-90" aria-label="Mes anterior">
              <Icon name="left" className="size-5" />
            </button>
            <span key={`${year}-${month}`} className="fade-in min-w-32 text-center text-lg font-bold">
              {MONTHS[month]} <span className="font-normal text-muted">{year}</span>
            </span>
            <button onClick={() => shiftMonth(1)} className="grid size-10 place-items-center rounded-full text-muted hover:bg-surface active:scale-90" aria-label="Mes siguiente">
              <Icon name="right" className="size-5" />
            </button>
          </div>
          <span
            role="status"
            aria-label={critical.length ? `${critical.length} día(s) sin personal suficiente` : "Todo cubierto"}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold ${critical.length ? "bg-critical text-white" : "bg-sub text-sub-ink"}`}
          >
            <Icon name={critical.length ? "alert" : "check"} className="size-4" />
            {critical.length > 0 && <span className="sm:hidden">{critical.length}</span>}
            <span className="hidden sm:inline">{critical.length ? `${critical.length} día(s) sin personal` : "Todo cubierto"}</span>
          </span>
        </div>
      </header>

      <main id="contenido" key={tab} className="fade-in flex-1 px-3 pt-3 pb-36 sm:px-5">
        <Suspense fallback={<p className="py-16 text-center text-muted">Cargando…</p>}>
          {tab === "home" && (
            <CalendarHome board={board} agenda={agenda} days={days} statuses={statuses} pending={pending} covered={covered} critical={critical} onOpenCell={open} onCover={setDraft} />
          )}
          {tab === "grid" && <CalendarGrid board={board} agenda={agenda} days={days} statuses={statuses} selected={selected ?? undefined} onOpen={open} onQuick={quick} />}
          {tab === "subs" && <SuplentesView board={board} agenda={agenda} covered={covered} />}
          {tab === "ajustes" && <Ajustes board={board} year={year} onNotice={(text) => setToast({ tone: "ok", text })} />}
          {tab === "print" && <PrintView busy={busy} onExport={exportPdf} onCalendar={exportIcs} onNotice={(text, undo) => setToast({ tone: "ok", text, undo })} onReset={() => setToast({ tone: "ok", text: "✓ Cuadrante restaurado", undo: true })} />}
        </Suspense>
      </main>

      {tab === "home" && (
        <button
          type="button"
          onClick={() => setDraft({})}
          className="btn-3d no-print fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 flex min-h-13 items-center gap-2 rounded-2xl bg-brand pr-5 pl-4 text-[15px] font-bold text-white [--depth:var(--color-brand-deep)] focus-visible:ring-4 focus-visible:ring-brand/40 focus-visible:outline-none"
        >
          <Icon name="plus" className="size-5" /> Apuntar falta
        </button>
      )}

      <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md" aria-label="Secciones">
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {TABS.map((t) => {
            const active = tab === t.id;
            const badge = t.id === "home" ? pending.length : 0;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex min-h-16 w-full flex-col items-center justify-center gap-1 text-xs font-bold transition ${active ? "text-brand-deep" : "text-muted"}`}
                >
                  <span className={`grid h-8 w-14 place-items-center rounded-full transition-all duration-300 group-active:scale-90 ${active ? "bg-brand-soft" : ""}`}>
                    <Icon name={t.icon} className="size-5" />
                  </span>
                  {t.label}
                  {badge > 0 && (
                    <span className="pop-in absolute top-1.5 left-[calc(50%+0.5rem)] grid h-5 min-w-5 place-items-center rounded-full bg-salmon px-1 text-[11px] text-white">{badge}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {draft && (
        <Suspense fallback={null}>
          <QuickCover board={board} agenda={agenda} days={days} initial={draft} onClose={() => setDraft(null)} />
        </Suspense>
      )}

      {editing && selected && (
        <Suspense fallback={null}>
          <CellEditor board={board} agenda={agenda} staffId={selected.staffId} date={selected.date} onClose={() => setEditing(false)} onVerdict={report} />
        </Suspense>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`rise-in fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex w-max max-w-[94vw] -translate-x-1/2 items-center gap-2 rounded-2xl py-1.5 pr-1.5 pl-4 text-[15px] font-bold shadow-xl ${TOAST_STYLE[toast.tone]}`}
        >
          <span className="py-1.5">{toast.text}</span>
          {toast.undo && (
            <button type="button" onClick={undo} className="min-h-10 shrink-0 rounded-xl bg-white/20 px-3.5 underline-offset-4 hover:bg-white/30 focus-visible:ring-4 focus-visible:ring-white/60 focus-visible:outline-none">
              Deshacer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
