# MedBoard

Cuadrante de turnos, suplencias y agenda de suplentes para equipos de enfermería.

Montar el cuadrante del mes es tedioso; cubrir una falta a las siete de la mañana es una carrera. MedBoard
hace las dos cosas desde el móvil: detecta el hueco, propone quién puede cubrirlo, escribe el WhatsApp y
saca el PDF para el tablón y la hoja para Administración.

**Los datos no salen del dispositivo.** No hay servidor, ni cuentas, ni analítica, ni publicidad, ni
librerías de terceros en tiempo de ejecución. Funciona sin conexión.

## Qué hace

- **Cuadrante mensual** con turnos configurables y permutas, y deshacer en todo.
- **Mínimos de cobertura por turno y equipo**: rechaza en el momento cualquier cambio que deje un día por
  debajo del mínimo del centro.
- **Suplencias**: detecta las faltas sin cubrir y ordena a las suplentes por equipo y valoración.
- **Agenda de suplentes** con DNI validado (se muestra enmascarado), teléfono y tipo de contrato.
- **Avisos por WhatsApp** con el mensaje ya redactado, sin API ni coste por mensaje.
- **PDF del cuadrante** para el tablón y **hoja de Administración** con los DNI.
- **Exportación a calendario** (`.ics`) y **copia de seguridad cifrada** (AES-GCM 256, PBKDF2-SHA256 con
  310.000 iteraciones).
- **Festivos calculados** por comunidad autónoma y año, corregibles a mano.

## Qué no hace, a propósito

- **No pregunta el motivo de una ausencia.** Solo apunta que alguien no está. Así no trata datos de salud
  (art. 9 del RGPD). No añadas subtipos de ausencia sin leer antes `docs/SEGURIDAD.md`.
- **No es un producto sanitario.** Organiza turnos; no toma decisiones clínicas. La planilla oficial sigue
  siendo la de Supervisión o Dirección.
- **No sincroniza entre dispositivos.** Un centro, un dispositivo, una copia de seguridad.

## Empezar

```bash
npm install
npm run dev -- -p 3101   # http://localhost:3101
```

La primera vez la app pide el nombre del centro, la comunidad autónoma, los turnos, los mínimos y la
plantilla. Todo se cambia después en **Ajustes**. También hay un botón para probarla con datos de ejemplo.

## Comprobaciones

```bash
npm test          # 45 pruebas unitarias (Vitest)
npm run test:e2e  # build + Playwright, incluye auditoría de accesibilidad con axe-core
npm run lint
```

En Linux, Playwright necesita librerías del sistema: `sudo npx playwright install-deps`.

## Publicar

Es una aplicación web instalable (PWA) exportada en estático, así que se publica subiendo `out/` a
cualquier alojamiento:

```bash
npm run build     # genera out/
```

Para el APK de Android con Capacitor:

```bash
npm run movil
```

## Documentación

- [`docs/PRIVACIDAD.md`](docs/PRIVACIDAD.md) — política de privacidad, también dentro de la app.
- [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md) — qué guarda, dónde, y las medidas de seguridad del APK.
- [`AGENTS.md`](AGENTS.md) — notas para agentes sobre esta versión de Next.js.

## Stack

Next.js 16 (App Router, export estático), React 19, TypeScript, Tailwind 4, Capacitor 8, jsPDF.
Vitest y Playwright para las pruebas.

## Datos de prueba

Las fixtures de `tests/` y los datos de ejemplo de `src/data/seed.ts` son **inventados**. Este
repositorio es público: no se suben nombres, DNI ni teléfonos de personas reales.

## Licencia

Sin garantía de ningún tipo. Quien use la aplicación es responsable de comprobar que su cuadrante es
correcto.
