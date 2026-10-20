import { MONTHS, workingDays } from "./calendar";
import { dniStatus, normalizeDni } from "./dni";
import { areaName, shiftName } from "./labels";
import { loadPdf, stamp } from "./PDFGenerator";
import { coverageEntries, groupBy } from "./roster";
import type { Board, IsoDate, SuplenteHabitual } from "./types";

const DNI_COL = 2;
const MARGIN = 10;
const HEAD = ["NOMBRE COMPLETO", "TELÉFONO", "DNI", "CENTRO HABITUAL", "TIPO DE CONTRATO", "TURNO", "TITULAR", "FECHAS", "DÍAS"];

/** DNI completo desde la ficha persistente; los no válidos se marcan para que Administración no los tramite a ciegas. */
function dniCell(sub: SuplenteHabitual): string {
  const status = dniStatus(sub.dni);
  if (status === "missing") return "PENDIENTE\n____________";
  return status === "verified" ? normalizeDni(sub.dni) : `${normalizeDni(sub.dni)} (REVISAR)`;
}

/** "34615602204" → "615 602 204": el prefijo sobra en una hoja interna y en grupos se dicta sin errores. */
export function phoneText(raw: string): string {
  const d = raw.replace(/\D/g, "").replace(/^(0034|34)(?=\d{9}$)/, "");
  return d.length === 9 ? d.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3") : raw || "—";
}

/** Días laborables consecutivos como rango: "05–09/10, 13/10". */
export function compactDates(dates: readonly IsoDate[], working: readonly IsoDate[]): string {
  const idx = [...new Set(dates)].map((d) => working.indexOf(d)).filter((i) => i >= 0).sort((a, b) => a - b);
  const dd = (i: number) => working[i].slice(8);
  const mm = (i: number) => working[i].slice(5, 7);
  const out: string[] = [];
  for (let k = 0; k < idx.length; k++) {
    const start = idx[k];
    while (idx[k + 1] === idx[k] + 1) k++;
    out.push(start === idx[k] ? `${dd(start)}/${mm(start)}` : `${dd(start)}–${dd(idx[k])}/${mm(idx[k])}`);
  }
  return out.join(", ");
}

/** PDF Admin · tabla por contrato de suplencia · solo negro sobre blanco para impresión B/N. */
export async function generateAdminPdf(board: Board, agenda: readonly SuplenteHabitual[], year: number, month: number): Promise<Blob> {
  const { jsPDF, autoTable } = await loadPdf();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const working = workingDays(year, month);
  const groups = Object.values(groupBy(coverageEntries(board, agenda, year, month), (e) => `${e.sub.id}|${e.staff.id}|${e.shift}`)).sort(
    (a, b) => a[0].sub.nombreCompleto.localeCompare(b[0].sub.nombreCompleto, "es") || a[0].date.localeCompare(b[0].date),
  );
  const unverified = new Set(groups.filter((g) => dniStatus(g[0].sub.dni) !== "verified").map((g) => g[0].sub.id)).size;
  const people = new Set(groups.map((g) => g[0].sub.id)).size;
  const shifts = groups.reduce((n, g) => n + g.length, 0);
  const title = `SUPLENCIAS · ${MONTHS[month].toUpperCase()} ${year}`;

  doc.setTextColor(0).setDrawColor(0);
  doc.setFont("helvetica", "bold").setFontSize(18).text(title, MARGIN, 15);
  doc.setFont("helvetica", "normal").setFontSize(11).text(`${board.center} · Hoja para Administración`, MARGIN, 22);
  doc.setFont("helvetica", "bold").text(`${people} suplente(s) · ${shifts} jornada(s)`, W - MARGIN, 22, { align: "right" });
  doc.setLineWidth(0.8).line(MARGIN, 25, W - MARGIN, 25);

  autoTable(doc, {
    startY: 29,
    margin: { left: MARGIN, right: MARGIN, top: 16, bottom: 16 },
    head: [HEAD],
    body: groups.length
      ? groups.map((g) => {
          const { sub, staff, shift } = g[0];
          return [
            sub.nombreCompleto || "(sin nombre)",
            phoneText(sub.telefono),
            dniCell(sub),
            sub.centroHabitual || "—",
            `${sub.contrato}\n${areaName(staff.area)}`,
            shiftName(shift),
            staff.name,
            compactDates(g.map((e) => e.date), working),
            String(g.length),
          ];
        })
      : [[{ content: "Sin suplencias registradas este mes.", colSpan: HEAD.length, styles: { halign: "center", fontStyle: "italic" } }]],
    theme: "grid",
    styles: { font: "helvetica", fontSize: 10, cellPadding: { top: 2.4, bottom: 2.4, left: 2, right: 2 }, lineColor: 0, lineWidth: 0.25, textColor: 0, valign: "middle", overflow: "linebreak" },
    headStyles: { fillColor: 255, textColor: 0, fontStyle: "bold", fontSize: 8.5, lineWidth: { top: 0.25, right: 0.25, bottom: 0.9, left: 0.25 } },
    alternateRowStyles: { fillColor: 235 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 46 },
      1: { font: "courier", fontStyle: "bold", cellWidth: 27 },
      [DNI_COL]: { font: "courier", fontStyle: "bold", fontSize: 11, cellWidth: 34 },
      3: { cellWidth: 32 },
      4: { cellWidth: 40 },
      5: { cellWidth: 18 },
      6: { cellWidth: 22 },
      8: { halign: "center", fontStyle: "bold", fontSize: 12, cellWidth: 19 },
    },
    didParseCell: ({ cell, column, section }) => {
      if (section !== "body" || column.index !== DNI_COL) return;
      const text = cell.text.join("");
      // Sin bloques negros (gastan tóner y emborronan): recuadro grueso y hueco para escribir el DNI a mano.
      if (text.startsWith("PENDIENTE") || text.endsWith("(REVISAR)")) Object.assign(cell.styles, { fillColor: 255, lineWidth: 0.9, fontSize: 10 });
    },
    didDrawPage: ({ pageNumber }) => {
      if (pageNumber === 1) return;
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(0).text(`${title} · ${board.center}`, MARGIN, 10);
    },
  });

  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  if (y > H - 40) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text("DNI con RECUADRO GRUESO = pendiente (escríbalo en la línea) o a revisar · Fechas: días laborables; '05–09/10' = del 5 al 9 ambos incluidos.", MARGIN, y);
  if (unverified) doc.setFont("helvetica", "bold").text(`ATENCIÓN: ${unverified} suplente(s) sin DNI válido.`, MARGIN, y + 5);
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text("Firma y sello Supervisión:", MARGIN, y + 18);
  doc.setLineWidth(0.4).line(MARGIN + 48, y + 18, MARGIN + 140, y + 18);
  doc.text("Fecha:", MARGIN + 150, y + 18);
  doc.line(MARGIN + 163, y + 18, MARGIN + 210, y + 18);

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(0);
    doc.text(`Generado ${stamp()} · MedBoard`, MARGIN, H - 7);
    doc.text(`Página ${p} de ${pages}`, W - MARGIN, H - 7, { align: "right" });
  }
  return doc.output("blob");
}
