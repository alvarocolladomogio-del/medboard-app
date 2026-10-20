import { MONTHS, monthDays } from "./calendar";
import { getCell } from "./roster";
import { areaTeam, codeShort } from "./labels";
import { ruleLabel, type RuleDef } from "./settings";
import { settingsStore } from "./settingsStore";
import { countFor, validateDay } from "./ValidationEngine";
import { ABSENCE, type Board, type SuplenteHabitual } from "./types";

const LOCKED_W = 4;

export async function loadPdf() {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  return { jsPDF, autoTable };
}

export const stamp = () => new Date().toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });

/** PDF Cuadrante · A4 apaisado · alto contraste para impresión B/N. */
export async function generateRosterPdf(board: Board, agenda: readonly SuplenteHabitual[], year: number, month: number): Promise<Blob> {
  const { jsPDF, autoTable } = await loadPdf();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const days = monthDays(year, month);
  const subs = new Map(agenda.map((s) => [s.id, s.alias]));

  doc.setFont("helvetica", "bold").setFontSize(13);
  doc.text(`CUADRANTE ${MONTHS[month].toUpperCase()} ${year} · ${board.center}`, 8, 10);

  const head = [["Titular", "", ...days.map((d) => `${d.letter}\n${d.day}`)]];
  const staffRows = board.staff.map((s) => [
    s.name.toUpperCase(),
    areaTeam(s.area).slice(0, 3).toUpperCase(),
    ...days.map((d) => {
      if (d.locked) return "";
      const cell = getCell(board, s.id, d.iso);
      if (!cell) return "";
      if (cell.code === ABSENCE) return ABSENCE;
      const short = codeShort(cell.code);
      return cell.subId ? `${short}*\n${subs.get(cell.subId) ?? ""}` : short;
    }),
  ]);
  const locked = days.filter((d) => d.locked).length;
  const workingW = (doc.internal.pageSize.getWidth() - 12 - 34 - locked * LOCKED_W) / (days.length - locked);
  const statuses = days.map((d) => (d.locked ? null : validateDay(board, d.iso)));
  const settings = settingsStore.get();
  const metric = (rule: RuleDef) => [
    `${ruleLabel(settings, rule)} >=${rule.required}`,
    "",
    ...statuses.map((s) => {
      if (!s) return "";
      const failed = s.violations.some((v) => v.ruleId === rule.id);
      return `${failed ? "!" : ""}${countFor(s.coverage, rule)}`;
    }),
  ];
  const foot = settings.rules.map(metric);

  // Filas altas que llenan la hoja: se lee de lejos colgado en el tablón.
  const rowH = Math.min(11, (doc.internal.pageSize.getHeight() - 14 - 12 - 16) / (staffRows.length + foot.length));

  autoTable(doc, {
    startY: 14,
    margin: { left: 6, right: 6 },
    head,
    body: [...staffRows, ...foot],
    theme: "grid",
    styles: { font: "helvetica", fontSize: 9, halign: "center", valign: "middle", cellPadding: 0.6, lineColor: 0, lineWidth: 0.2, textColor: 0, minCellHeight: rowH },
    headStyles: { fillColor: 255, textColor: 0, fontStyle: "bold", lineWidth: 0.4, fontSize: 8.5, minCellHeight: 9 },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold", cellWidth: 26 },
      1: { cellWidth: 8, fontSize: 7 },
      ...Object.fromEntries(days.map((d, i) => [i + 2, { cellWidth: d.locked ? LOCKED_W : workingW }])),
    },
    didParseCell: ({ cell, column, row, section }) => {
      const day = days[column.index - 2];
      if (!day) return;
      if (day.locked) {
        cell.styles.fillColor = 215;
        if (section === "head") cell.styles.fontSize = 6;
        return;
      }
      if (section !== "body") return;
      const text = cell.text.join("\n");
      if (row.index >= staffRows.length) {
        if (text.startsWith("!")) {
          cell.text = [`!${text.slice(1)}`];
          Object.assign(cell.styles, { fontStyle: "bold", fontSize: 11, lineWidth: 0.9 });
        }
        return;
      }
      // B/N sin manchas de tóner: la falta sin cubrir va recuadrada en grueso; la cubierta, en gris claro con el nombre.
      if (text === "AUS") Object.assign(cell.styles, { fontStyle: "bold", fontSize: 7.5, lineWidth: 0.9 });
      else if (text.includes("*")) Object.assign(cell.styles, { fillColor: 225, fontStyle: "bold", fontSize: 6.5 });
      else cell.styles.fontStyle = "bold";
    },
  });

  const y = doc.internal.pageSize.getHeight() - 8;
  doc.setFont("helvetica", "normal").setFontSize(7);
  doc.text(
    "M mañana · T tarde · AUS (recuadro grueso) = falta SIN cubrir · M* con nombre (fondo gris claro) = cubierta por esa suplente · gris: fin de semana/festivo · !N en totales = ratio incumplido",
    8,
    y,
  );
  doc.text(`Generado ${stamp()} · Documento de apoyo; la planilla oficial vinculante es la emitida por Supervisión/Dirección.`, 8, y + 4);
  return doc.output("blob");
}

const toBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

/** En el APK el WebView no descarga blobs: se escribe en la caché privada y se abre la hoja nativa de compartir. */
async function shareNative(blob: Blob, filename: string, title: string): Promise<void> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([import("@capacitor/filesystem"), import("@capacitor/share")]);
  const { uri } = await Filesystem.writeFile({ path: filename, data: await toBase64(blob), directory: Directory.Cache });
  try {
    await Share.share({ title, dialogTitle: title, files: [uri] });
  } catch (err) {
    if (!/cancel/i.test(String((err as Error)?.message ?? err))) throw err;
  }
}

/** Comparte cualquier archivo: hoja nativa (APK), Web Share API (WhatsApp / email) o descarga como último recurso. */
export async function shareFile(blob: Blob, filename: string, title: string): Promise<"shared" | "downloaded"> {
  const { Capacitor } = await import("@capacitor/core");
  if (Capacitor.isNativePlatform()) {
    await shareNative(blob, filename, title);
    return "shared";
  }
  const file = new File([blob], filename, { type: blob.type });
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (err) {
      if ((err as DOMException).name === "AbortError") return "shared";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}

export const sharePdf = (blob: Blob, filename: string, title: string) => shareFile(blob, filename, title);
