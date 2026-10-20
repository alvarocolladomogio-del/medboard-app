// Traspasa los datos de El Corcho a MedBoard en el móvil (por USB, con las herramientas del WebView).
// Uso: node scripts/importar-corcho.mjs <copia-el-corcho-localStorage.json> [puerto=9334]
// Requiere la app abierta y `adb forward tcp:<puerto> localabstract:webview_devtools_remote_<pid>`.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const [file, port = "9334"] = process.argv.slice(2);
const jiti = createJiti(import.meta.url, { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } });
const { importCorcho } = await jiti.import("../src/lib/corchoImport.ts");
const { CENTER, DEFAULT_CONTRACT, SUPLENTES_BASE, createSeedBoard } = await jiti.import("../src/data/seed.ts");

const backup = JSON.parse(readFileSync(file, "utf8"));
const centro = JSON.parse(backup.el_corcho_centros).activo;
const db = JSON.parse(backup[`elcorcho_${centro}_db`]);
const suplentes = JSON.parse(backup[`elcorcho_${centro}_suplentes`]);

const page = (await (await fetch(`http://localhost:${port}/json`)).json()).find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0;
const evaluate = (expression) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    ws.addEventListener("message", function on(m) {
      const r = JSON.parse(m.data);
      if (r.id !== id) return;
      ws.removeEventListener("message", on);
      if (r.result?.exceptionDetails) reject(new Error(r.result.exceptionDetails.text));
      else resolve(r.result?.result?.value);
    });
    ws.send(JSON.stringify({ id, method: "Runtime.evaluate", params: { expression, returnByValue: true } }));
  });

const current = JSON.parse(await evaluate(`JSON.stringify([localStorage.getItem("medboard:v1"), localStorage.getItem("medboard:suplentes:v1")])`));
// Copia de lo que había en MedBoard antes del traspaso, junto a la copia de El Corcho.
writeFileSync(file.replace(/[^/]*$/, `medboard-antes-del-traspaso-${Date.now()}.json`), JSON.stringify({ "medboard:v1": current[0], "medboard:suplentes:v1": current[1] }));
const board = current[0] ? JSON.parse(current[0]) : createSeedBoard();
const agenda = current[1] ? JSON.parse(current[1]) : SUPLENTES_BASE;
const res = importCorcho(board, agenda, db, suplentes, { center: CENTER, contract: DEFAULT_CONTRACT });

await evaluate(`localStorage.setItem("medboard:v1", ${JSON.stringify(JSON.stringify(res.board))}); localStorage.setItem("medboard:suplentes:v1", ${JSON.stringify(JSON.stringify(res.agenda))}); location.reload(); true`);
ws.close();
console.log(JSON.stringify(res.summary, null, 2));
