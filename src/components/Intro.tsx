"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const KEY = "medboard:intro";
const noop = () => () => {};
const readSeen = () => {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

/** Logotipo de El Corcho (assets/logo.png → public/logo.png con scripts/android-icons.mjs). */
export function Logo({ className = "size-10" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="MedBoard" width={256} height={256} className={`rounded-[22%] ${className}`} />;
}

/** Pantalla de entrada (una vez por sesión). Toca para saltar. */
export function Intro({ center }: { center?: string }) {
  const seen = useSyncExternalStore(noop, readSeen, () => false);
  const [phase, setPhase] = useState<"show" | "out" | "done">("show");

  useEffect(() => {
    if (seen) return;
    const t1 = setTimeout(() => setPhase("out"), 3700);
    const t2 = setTimeout(() => setPhase("done"), 4100);
    return () => [t1, t2].forEach(clearTimeout);
  }, [seen]);

  useEffect(() => {
    if (phase !== "done") return;
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
  }, [phase]);

  if (seen || phase === "done") return null;

  return (
    <div
      onClick={() => setPhase("out")}
      onAnimationEnd={(e) => e.animationName === "intro-out" && setPhase("done")}
      className={`cork-board no-print fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 ${phase === "out" ? "intro-out" : ""}`}
      role="presentation"
    >
      {/* 1 · El logo entra girando y se va; 2 · en el corcho, la suplente ocupa el sitio de la enfermera que falta. */}
      <div className="relative h-44 w-72 [perspective:900px] [transform-style:preserve-3d]">
        <div className="intro-logo absolute inset-0 m-auto size-32 drop-shadow-[0_18px_24px_rgba(60,30,10,0.45)]">
          <Logo className="size-32" />
        </div>
        <div className="absolute inset-0 flex items-center justify-between [transform-style:preserve-3d]">
          <div className="swap-a">
            <Note emoji="👩‍⚕️" role="Enfermera" tag="Ausente" delay="1250ms" tilt="-rotate-3" />
          </div>
          <span className="swap-arrows text-3xl font-bold text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]" aria-hidden>
            ⇄
          </span>
          <div className="swap-b">
            <Note emoji="🧑‍⚕️" role="Suplente" tag="Disponible" delay="1450ms" tilt="rotate-2" covered />
          </div>
        </div>
      </div>
      <div className="note-drop relative rounded-md bg-[#fffdf6] px-6 py-3 text-center shadow-[0_10px_18px_rgba(60,30,10,0.35)]" style={{ animationDelay: "2700ms" }}>
        <Pin />
        <p className="text-3xl font-bold tracking-tight text-ink">MedBoard</p>
        <p className="mt-0.5 text-base text-muted">{center?.trim() || "Cuadrantes de enfermería"}</p>
      </div>
    </div>
  );
}

function Pin() {
  return <span aria-hidden className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ff8a7a,#c0392b_60%,#7b1d14)] shadow-[0_3px_3px_rgba(0,0,0,0.4)]" />;
}

function Note({ emoji, role, tag, delay, tilt, covered }: { emoji: string; role: string; tag: string; delay: string; tilt: string; covered?: boolean }) {
  return (
    <div className={`note-drop relative flex w-24 flex-col items-center rounded-md bg-[#fffdf6] px-2 pt-3 pb-2 shadow-[0_10px_18px_rgba(60,30,10,0.35)] ${tilt}`} style={{ animationDelay: delay }}>
      <Pin />
      <span className="text-4xl leading-none" aria-hidden>
        {emoji}
      </span>
      <p className="mt-1 text-sm font-bold text-ink">{role}</p>
      <p className="text-xs font-bold text-muted uppercase">{tag}</p>
      {covered && <span className="stamp absolute -right-3 -bottom-3 rounded-md border-2 border-brand bg-surface px-1.5 text-xs font-bold text-brand uppercase">✓ Cubierto</span>}
    </div>
  );
}
