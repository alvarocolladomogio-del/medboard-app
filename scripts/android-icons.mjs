// Genera el logotipo web, los iconos PWA y los de Android (lanzador y arranque) desde assets/logo.png.
// Uso: node scripts/android-icons.mjs
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const SRC = "assets/logo.png";
const RES = "android/app/src/main/res";
const DENSITY = { ldpi: 0.75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const SPLASH_BG = "#f6f2ec";
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

// Solo el cuadrado del corcho, sin el margen transparente del original.
const tile = await sharp(SRC).trim().png().toBuffer();
const square = (px) => sharp(tile).resize(px, px).png().toBuffer();
const circle = async (px) =>
  sharp(await square(px))
    .composite([{ input: Buffer.from(`<svg width="${px}" height="${px}"><circle cx="${px / 2}" cy="${px / 2}" r="${px / 2}"/></svg>`), blend: "dest-in" }])
    .png()
    .toBuffer();

writeFileSync("public/logo.png", await square(256));
writeFileSync("src/app/icon.png", await square(64));
writeFileSync("src/app/apple-icon.png", await sharp(tile).resize(180, 180).flatten({ background: SPLASH_BG }).png().toBuffer());
mkdirSync("public/icons", { recursive: true });
for (const px of [192, 512]) writeFileSync(`public/icons/icon-${px}.png`, await square(px));
// Maskable: el lanzador recorta un círculo del 80 %; el corcho va centrado sobre crema.
const inner = 368;
await sharp({ create: { width: 512, height: 512, channels: 4, background: SPLASH_BG } })
  .composite([{ input: await square(inner), left: (512 - inner) / 2, top: (512 - inner) / 2 }])
  .png()
  .toFile("public/icons/maskable-512.png");

for (const [d, k] of Object.entries(DENSITY)) {
  const dir = `${RES}/mipmap-${d}`;
  mkdirSync(dir, { recursive: true });
  const legacy = Math.round(48 * k);
  writeFileSync(`${dir}/ic_launcher.png`, await square(legacy));
  writeFileSync(`${dir}/ic_launcher_round.png`, await circle(legacy));
  // Adaptable (108dp): el corcho entero dentro de la zona segura, sobre blanco.
  const full = Math.round(108 * k);
  writeFileSync(`${dir}/ic_launcher_foreground.png`, await square(full));
  writeFileSync(`${dir}/ic_launcher_background.png`, await sharp({ create: { width: full, height: full, channels: 4, background: WHITE } }).png().toBuffer());
}
const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background>
        <inset android:drawable="@mipmap/ic_launcher_background" android:inset="16.7%" />
    </background>
    <foreground>
        <inset android:drawable="@mipmap/ic_launcher_foreground" android:inset="16.7%" />
    </foreground>
</adaptive-icon>
`;
for (const f of ["ic_launcher", "ic_launcher_round"]) writeFileSync(`${RES}/mipmap-anydpi-v26/${f}.xml`, adaptive);
writeFileSync(`${RES}/values/ic_launcher_background.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FFFFFF</color>\n</resources>\n`);

const splashes = [["drawable", 480, 320]];
for (const [d, k] of Object.entries(DENSITY)) {
  if (d === "ldpi") continue;
  splashes.push([`drawable-port-${d}`, 320 * k, 480 * k], [`drawable-land-${d}`, 480 * k, 320 * k]);
}
for (const [dir, w, h] of splashes) {
  const side = Math.round(Math.min(w, h) * 0.42);
  await sharp({ create: { width: w, height: h, channels: 3, background: SPLASH_BG } })
    .composite([{ input: await square(side), left: Math.round((w - side) / 2), top: Math.round((h - side) / 2) }])
    .png()
    .toFile(`${RES}/${dir}/splash.png`);
}
console.log("Logotipo e iconos generados.");
