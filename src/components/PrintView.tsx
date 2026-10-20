"use client";

import { useEffect, useState } from "react";
import { boardStore } from "@/lib/boardStore";
import { loadPdf } from "@/lib/PDFGenerator";
import { BackupPanel } from "./BackupPanel";
import { Button, Confirm, Icon } from "./ui";

const DOCS = [
  { kind: "roster", title: "Cuadrante del mes", text: "La sábana completa para colgar en el centro." },
  { kind: "admin", title: "Hoja para Administración", text: "Suplentes con DNI, teléfono y contrato. Lleva datos personales: mándala por el correo corporativo, mejor que por WhatsApp." },
] as const;

export function PrintView({ busy, onExport, onCalendar, onReset, onNotice }: { busy: boolean; onExport: (kind: "roster" | "admin") => void; onCalendar: () => void; onReset: () => void; onNotice: (text: string, undo?: boolean) => void }) {
  const [asking, setAsking] = useState(false);
  // Calienta jsPDF al entrar: el primer PDF sale al momento y queda en caché para usarlo sin conexión.
  useEffect(() => void loadPdf().catch(() => {}), []);
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      {DOCS.map((d) => (
        <section key={d.kind} className="card-3d rise-in rounded-3xl bg-surface p-4">
          <h2 className="text-[15px] font-bold">{d.title}</h2>
          <p className="mt-0.5 mb-3 text-sm text-muted">{d.text}</p>
          <Button tone="primary" className="w-full" disabled={busy} onClick={() => onExport(d.kind)}>
            <Icon name="print" className="size-5" /> {busy ? "Preparando…" : "Crear PDF y compartir"}
          </Button>
        </section>
      ))}
      <p className="px-1 text-xs text-muted">Pensados para impresora en blanco y negro: sin colores, letra grande y recuadros gruesos.</p>
      <section className="card-3d rise-in rounded-3xl bg-surface p-4">
        <h2 className="text-[15px] font-bold">Suplencias en Google Calendar</h2>
        <p className="mt-0.5 mb-3 text-sm text-muted">Un archivo .ics con cada jornada cubierta del mes (solo nombres, sin DNI ni teléfonos). Ábrelo en calendar.google.com → Configuración → Importar.</p>
        <Button className="w-full" onClick={onCalendar}>
          <Icon name="calendar" className="size-5" /> Exportar calendario del mes
        </Button>
      </section>
      <BackupPanel onDone={onNotice} />
      <Button
        tone="quiet"
        className="w-full"
        onClick={() => setAsking(true)}
      >
        <Icon name="undo" className="size-5" /> Restaurar cuadrante original
      </Button>
      {asking && (
        <Confirm
          title="¿Restaurar el cuadrante?"
          text="Vuelve al cuadrante original del PDF. Si te equivocas, podrás deshacerlo justo después."
          action="Sí, restaurar"
          onConfirm={() => {
            boardStore.reset();
            onReset();
          }}
          onClose={() => setAsking(false)}
        />
      )}
    </div>
  );
}
