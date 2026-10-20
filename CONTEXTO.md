# 🗓️ MedBoard — memoria de contexto

> Claude Code carga este archivo al abrirse en esta carpeta. Mantenlo al día:
> al terminar una tarea, reescribe «Último resumen» y añade una línea a «Registro de cambios».
> El bloque «Actividad reciente» se regenera solo (`indice contexto`).

## Qué es

App de cuadrantes de enfermería: cuadrante mensual, calendario, agenda del día, suplencias y agenda de suplentes, y exportación a PDF. Es la evolución de El Corcho, reescrita en Next.js.

Desde el 20-oct-2026 es un **producto para cualquier centro**, no una herramienta de un solo centro: arranca vacío, se da de alta desde la propia app (centro, comunidad, turnos, equipos, mínimos y plantilla) y todo se cambia en Ajustes.

Se exporta en estático y se empaqueta como APK Android con Capacitor. Todo se guarda en el dispositivo. Incluye pruebas unitarias con Vitest, end-to-end con Playwright y auditoría de accesibilidad con axe-core.

## Estado y prioridad

- Estado: Principal
- Categoría: Salud digital

## Reglas importantes

- Next.js de versión nueva: leer `node_modules/next/dist/docs/` antes de tocar APIs (ver AGENTS.md).
- Datos solo en el dispositivo; no es producto sanitario (aviso legal dentro de la app y en `docs/PRIVACIDAD.md`).
- **Nada de datos reales en el repositorio.** Las fixtures de `tests/` y la demo de `src/data/seed.ts` son inventadas. Los PDF y copias exportados están en `.gitignore`.
- **No añadir subtipos de ausencia** (baja, permiso, vacaciones): `AUS` sin motivo es lo que mantiene la app fuera del art. 9 del RGPD y fuera del MDR.
- Turnos, equipos, mínimos y festivos salen de `settingsStore`, nunca del código.

## Cómo se arranca

- `indice abrir medboard` → http://localhost:3101
- Instalar: `cd ~/proyectos/medboard && npm install`
- Desarrollo: `npm run dev -- -p 3101   # http://localhost:3101`
- Tests: `npm test && npm run test:e2e`
- APK: `npm run movil`

## Último resumen

_2026-10-20_
- **MedBoard ya es un producto publicable.** Se quitaron los datos reales (centro, plantilla y suplentes) y lo que estaba cableado al centro de origen: ahora hay alta guiada en 4 pasos y pantalla de Ajustes.
- Nuevo: `settings.ts` / `settingsStore.ts` (centro, comunidad, turnos, equipos, mínimos, festivos), `holidays.ts` (festivos calculados por CCAA y año, con Pascua), `dates.ts`, `Onboarding.tsx` y `Ajustes.tsx` (incluye ayuda y aviso legal). Más `docs/PRIVACIDAD.md` y README nuevo.
- Quien ya usaba la app **no pierde nada**: `settingsStore` migra el centro y conserva los festivos de 2026 de Madrid.
- Estado: 45 pruebas unitarias en verde, typecheck y lint limpios, `npm run build` correcto. **Los Playwright no se pueden ejecutar aquí**: faltan librerías del sistema (`sudo npx playwright install-deps`).
- Antes (18-oct): calendario, agenda del día, intro de corcho, PDF en el APK y seguridad (`docs/SEGURIDAD.md`).
- Siguiente paso: instalar las librerías y pasar el e2e; después, quitar la protección de acceso del despliegue para publicarla. Estudio de mercado y plan en el documento de viabilidad.

## Registro de cambios

- 2026-10-20 · Convertida en producto: alta guiada, Ajustes, festivos por comunidad, datos reales fuera del repositorio, privacidad y README.
- 2026-10-19 · Creada la memoria de contexto.

<!-- indice:auto:inicio -->
## Actividad reciente (automático)

_Generado por `indice contexto` el 2026-10-20. No editar a mano._

- Rama: **feat/agenda-suplentes**
- Cambios sin guardar en git: 6
  - `.claude/` (??)
  - `.playwright/` (??)
  - `.rtk/` (??)
  - `cuadrante_2026-10.pdf` (??)
  - `prompt_medboard.txt` (??)
  - `skills-lock.json` (??)

Últimos commits:

- 2026-10-18 · MedBoard: calendario, agenda, intro de corcho, PDF en el APK y seguridad
- 2026-10-14 · MedBoard: cuadrante, suplencias y agenda de suplentes con DNI
- 2026-10-06 · Initial commit from Create Next App
<!-- indice:auto:fin -->
