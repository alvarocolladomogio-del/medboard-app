"use client";

import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { dniStatus, maskDni } from "@/lib/dni";

type Tone = "primary" | "neutral" | "danger" | "wa" | "quiet";

const TONE: Record<Tone, string> = {
  primary: "bg-brand text-white [--depth:var(--color-brand-deep)] disabled:bg-line disabled:text-muted",
  neutral: "bg-white text-ink border border-line [--depth:var(--color-line)] disabled:text-muted/60",
  danger: "bg-white text-critical border border-critical/40 [--depth:#f2b8b8] disabled:text-muted/50 disabled:border-line",
  wa: "bg-wa text-white [--depth:var(--color-wa-deep)]",
  quiet: "text-muted hover:bg-white/70 !shadow-none",
};

const SIZE = { sm: "min-h-9 px-3 text-sm", md: "min-h-11 px-4 text-[15px]", lg: "min-h-12 px-5 text-base" } as const;

export const btnClass = (tone: Tone = "neutral", size: keyof typeof SIZE = "md", extra = "") =>
  `btn-3d inline-flex select-none items-center justify-center gap-2 rounded-xl font-bold outline-none focus-visible:ring-4 focus-visible:ring-brand/40 disabled:cursor-not-allowed ${TONE[tone]} ${SIZE[size]} ${extra}`;

export function Button({ tone, size, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; size?: keyof typeof SIZE }) {
  return <button type="button" {...props} className={btnClass(tone, size, className)} />;
}

export function WaLink({ href, children, size = "md", className = "" }: { href: string; children: ReactNode; size?: keyof typeof SIZE; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={btnClass("wa", size, className)}>
      <Icon name="wa" className="size-5" />
      {children}
    </a>
  );
}

let sheetSeq = 0;

/** Ventana emergente con entrada 3D: hoja inferior en móvil, tarjeta centrada en escritorio. */
export function Sheet({ title, kicker, onClose, children }: { title: ReactNode; kicker?: ReactNode; onClose: () => void; children: ReactNode }) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    // Botón «atrás» de Android/navegador: cierra la ventana en vez de salir de la pantalla.
    const token = ++sheetSeq;
    history.pushState({ ...history.state, mbSheet: token }, "");
    const onPop = () => history.state?.mbSheet !== token && close.current();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
      setTimeout(() => history.state?.mbSheet === token && history.back(), 0);
      opener?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="no-print fade-in fixed inset-0 z-50 flex items-end justify-center bg-ink/35 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="sheet-in card-3d max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-surface px-4 pt-2.5 pb-[max(1rem,env(safe-area-inset-bottom))] outline-none sm:max-w-lg sm:rounded-3xl sm:px-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden />
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {kicker && <p className="text-xs font-bold tracking-wide text-muted uppercase">{kicker}</p>}
            <h2 id={titleId} className="text-xl leading-tight font-bold">
              {title}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="grid size-9 shrink-0 place-items-center rounded-full bg-canvas text-muted hover:text-ink focus-visible:ring-4 focus-visible:ring-brand/40 focus-visible:outline-none">
            <Icon name="close" className="size-5" />
          </button>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Confirmación dentro de la app (sustituye a window.confirm): dos botones grandes y claros. */
export function Confirm({ title, text, action, onConfirm, onClose }: { title: string; text: ReactNode; action: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Sheet title={title} onClose={onClose}>
      <p className="mb-4 text-[15px]">{text}</p>
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          tone="danger"
          size="lg"
          className="flex-1"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {action}
        </Button>
        <Button tone="neutral" size="lg" className="flex-1" onClick={onClose}>
          No, volver
        </Button>
      </div>
    </Sheet>
  );
}

/** Pequeña vibración de confirmación (Android); se ignora donde no existe. */
export const haptic = (ms = 18): void => {
  try {
    navigator.vibrate?.(ms);
  } catch {}
};

const AVATAR_TONES = ["bg-cork-soft text-salmon-ink", "bg-brand-soft text-brand-deep", "bg-shift-t text-shift-t-ink", "bg-shift-m text-shift-m-ink", "bg-sub text-sub-ink"] as const;

/** Círculo con emoji o inicial; el color sale del nombre para que cada persona tenga siempre el mismo. */
export function Avatar({ name, emoji, tone, className = "size-9 text-sm" }: { name: string; emoji?: string; tone?: string; className?: string }) {
  const auto = AVATAR_TONES[[...name].reduce((n, ch) => n + ch.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full font-bold ${tone ?? auto} ${className}`}>
      {emoji || name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function Stars({ value = 0 }: { value?: number }) {
  if (!value) return null;
  return (
    <span className="text-xs tracking-tight text-cork" aria-label={`${value} de 5 estrellas`}>
      {"★".repeat(value)}
      <span className="text-line">{"★".repeat(5 - value)}</span>
    </span>
  );
}

const DNI_LABEL = { verified: "✓ DNI correcto", invalid: "DNI erróneo", missing: "Falta DNI" } as const;

/** DNI enmascarado ('***' + últimos 4 dígitos y letra) con su estado; nunca muestra el valor completo. */
export function DniBadge({ dni }: { dni: string }) {
  const status = dniStatus(dni);
  const cls = { verified: "bg-sub text-sub-ink", invalid: "bg-critical-soft text-critical", missing: "bg-canvas text-muted" }[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
      {status !== "missing" && <span className="font-mono text-muted">{maskDni(dni)}</span>}
      <span className={`rounded-md px-1.5 py-0.5 font-bold ${cls}`}>{DNI_LABEL[status]}</span>
    </span>
  );
}

const PATHS = {
  home: "M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5",
  grid: "M4 5h16v15H4zM4 10h16M9 5v15M14 5v15",
  people: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M18 20a5 5 0 0 0-3-4.6",
  print: "M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z",
  left: "M15 5 8 12l7 7",
  right: "m9 5 7 7-7 7",
  close: "M6 6l12 12M18 6 6 18",
  check: "m5 12.5 4.5 4.5L19 7",
  alert: "M12 4 2.5 20h19L12 4Zm0 6v4.5m0 3v.01",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  eyeOff: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 3l18 18",
  plus: "M12 5v14M5 12h14",
  undo: "M4 9h11a5 5 0 0 1 0 10H8M4 9l4-4M4 9l4 4",
  swap: "M7 7h12l-3-3M17 17H5l3 3",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  phone: "M5 4h3.5l1.5 4.5-2 1.2a11 11 0 0 0 6.3 6.3l1.2-2L20 15.5V19a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4.5 4.5",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-13v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z",
  down: "m6 9 6 6 6-6",
  lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3-2-.3a6 6 0 0 0-.6-1.5l1.2-1.6-1.7-1.7-1.6 1.2a6 6 0 0 0-1.5-.6L13.5 5h-3l-.3 2a6 6 0 0 0-1.5.6L7.1 6.4 5.4 8.1l1.2 1.6a6 6 0 0 0-.6 1.5l-2 .3v3l2 .3a6 6 0 0 0 .6 1.5l-1.2 1.6 1.7 1.7 1.6-1.2a6 6 0 0 0 1.5.6l.3 2h3l.3-2a6 6 0 0 0 1.5-.6l1.6 1.2 1.7-1.7-1.2-1.6a6 6 0 0 0 .6-1.5l2-.3v-3Z",
  wa: "",
} as const;

export function Icon({ name, className = "size-6" }: { name: keyof typeof PATHS; className?: string }) {
  if (name === "wa")
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
