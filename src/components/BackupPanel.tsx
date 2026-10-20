"use client";

import { useRef, useState } from "react";
import { decryptBackup, encryptBackup, mergeAgenda, MIN_PASSWORD, type BackupData } from "@/lib/backup";
import { boardStore } from "@/lib/boardStore";
import { shareFile } from "@/lib/PDFGenerator";
import { substitutesStore } from "@/lib/substitutesStore";
import { Button, Confirm, Icon } from "./ui";

const INPUT = "w-full min-h-11 rounded-xl border border-line bg-surface px-3 text-[15px] focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none";
const ERRORS: Record<string, string> = {
  short: `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.`,
  password: "Contraseña incorrecta.",
  format: "Ese archivo no es una copia de MedBoard.",
};

/** Copia cifrada: crear (hoja de compartir) y restaurar (sin borrar fichas; el cuadrante se puede deshacer). */
export function BackupPanel({ onDone }: { onDone: (text: string, undo?: boolean) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<BackupData | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const create = async () => {
    setError("");
    try {
      const text = await encryptBackup({ board: boardStore.getSnapshot(), agenda: substitutesStore.list() }, password);
      const name = `medboard-copia-${new Date().toISOString().slice(0, 10)}.json`;
      await shareFile(new Blob([text], { type: "application/json" }), name, "Copia de MedBoard");
      onDone("✓ Copia cifrada creada. Guárdala en tu correo o Drive.");
    } catch (e) {
      setError(ERRORS[(e as Error).message] ?? "No se pudo crear la copia.");
    }
  };

  const open = async (f: File | undefined) => {
    if (!f) return;
    setError("");
    try {
      setPending(await decryptBackup(await f.text(), password));
    } catch (e) {
      setError(ERRORS[(e as Error).message] ?? "No se pudo leer la copia.");
    } finally {
      if (file.current) file.current.value = "";
    }
  };

  return (
    <section className="card-3d rise-in rounded-3xl bg-surface p-4">
      <h2 className="flex items-center gap-2 text-[15px] font-bold">
        <Icon name="lock" className="size-4" /> Copia de seguridad cifrada
      </h2>
      <p className="mt-0.5 mb-3 text-sm text-muted">Los datos solo viven en este móvil. Haz una copia de vez en cuando: sin la contraseña nadie puede abrirla (ni tú, apúntala).</p>
      <label className="mb-1 block text-xs font-bold text-muted uppercase" htmlFor="backup-pass">
        Contraseña de la copia
      </label>
      <input id="backup-pass" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
      {error && (
        <p role="alert" className="mt-1 text-sm font-bold text-critical">
          {error}
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button tone="primary" size="sm" onClick={create} disabled={password.length < MIN_PASSWORD}>
          Crear copia
        </Button>
        <Button size="sm" onClick={() => file.current?.click()} disabled={password.length < MIN_PASSWORD}>
          Restaurar copia
        </Button>
      </div>
      <input ref={file} type="file" accept="application/json,.json" className="hidden" aria-label="Archivo de copia" onChange={(e) => open(e.target.files?.[0])} />
      {pending && (
        <Confirm
          title="¿Restaurar esta copia?"
          text={`El cuadrante pasa a ser el de la copia (podrás deshacerlo). Las ${pending.agenda.length} fichas de la copia se actualizan y no se borra ninguna de las que ya tienes.`}
          action="Sí, restaurar"
          onConfirm={() => {
            boardStore.restore(pending.board);
            substitutesStore.replaceAll(mergeAgenda(substitutesStore.list(), pending.agenda));
            onDone("✓ Copia restaurada", true);
          }}
          onClose={() => setPending(null)}
        />
      )}
    </section>
  );
}
