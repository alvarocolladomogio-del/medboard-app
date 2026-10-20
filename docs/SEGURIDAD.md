# Seguridad y privacidad · MedBoard

Auditoría del 18/10/2026. App de uso personal (una sola usuaria, un solo móvil, sin servidor).

## Qué datos guarda y dónde

| Dato | Dónde | Sale del móvil |
|---|---|---|
| Cuadrante (turnos, ausencias sin motivo) | `localStorage` del WebView, sandbox de Android | Solo en los PDF/ICS que se comparten a mano |
| Agenda de suplentes (nombre, DNI, teléfono, contrato) | Ídem | Hoja de Administración (PDF) y copia cifrada |

- **Sin red:** no hay servidor, analítica, anuncios ni librerías de terceros en tiempo de ejecución. Permiso único: `INTERNET` (lo pide Capacitor; la CSP bloquea cualquier conexión).
- **Minimización (art. 5.1.c RGPD):** el cuadrante solo apunta «AUS», nunca el motivo (baja, permiso…). Así no se tratan datos de salud (art. 9). **No escribir motivos médicos en ningún campo.**
- El `.ics` de Google Calendar y los mensajes de WhatsApp llevan solo nombres, nunca DNI ni teléfono.

## Medidas aplicadas

| Riesgo | Medida |
|---|---|
| Extraer datos por USB (`adb run-as`, depurador del WebView) | APK con `debuggable=false` y `webContentsDebuggingEnabled=false` |
| Copias en la nube o al cambiar de móvil | `allowBackup=false` + `data_extraction_rules.xml` (excluye todo) |
| Pérdida del móvil o reinstalación | Copia de seguridad **cifrada** (AES-GCM 256 + PBKDF2-SHA256, 310 000 iteraciones) en Imprimir → Copia de seguridad |
| Inyección de código (XSS) | React escapa todo el texto; CSP `default-src 'self'`, `connect-src 'self'`, `object-src 'none'`, `form-action 'none'` |
| Tráfico sin cifrar | `usesCleartextTraffic=false`, `androidScheme: https`, sin contenido mixto |
| Dependencias vulnerables | `npm audit --omit=dev`: 0 vulnerabilidades |
| Restaurar una copia por error | No borra fichas de la agenda (fusiona por id) y el cuadrante se puede deshacer |

## Lo que tienes que hacer tú (no depende del código)

1. **Bloqueo de pantalla** con PIN/huella. Android ya cifra el almacenamiento, pero solo protege si el móvil está bloqueado.
2. **Bloqueo de la app** (Xiaomi): Ajustes → Aplicaciones → Bloqueo de aplicaciones → MedBoard.
3. **Copia cifrada al mes**, guardada en tu correo o Drive. Apunta la contraseña: sin ella no se recupera.
4. **Hoja de Administración** (lleva DNI): mándala por **correo corporativo** (@salud.madrid.org), no por WhatsApp. Si va en papel, no la dejes en el tablón.
5. **Informar a las suplentes** de que guardas su nombre, DNI y teléfono solo para gestionar sus suplencias y tramitarlas con Administración (deber de información, art. 13 RGPD). Mensaje tipo:
   > «Guardo tu nombre, DNI y teléfono en mi agenda de suplencias solo para avisarte y para que Administración tramite tus contratos. Si quieres que lo borre, dímelo.»
6. **Si una suplente pide que se borren sus datos**: Agenda → su ficha → Borrar ficha (solo se puede si no tiene jornadas asignadas).
7. **La planilla oficial es la de Supervisión/Dirección.** MedBoard es una herramienta de apoyo (así lo dice el pie de los PDF). Para datos de trabajo en un móvil personal, la AEPD exige que se justifique qué datos y para qué. Si la Dirección pide formalizarlo, enséñale esta hoja.

## Cómo instalar sin perder datos

`npm run movil` (USB). Mantiene la misma firma, así que `install -r` conserva los datos. **No desinstales la app**: borraría los datos. Si hace falta, primero haz una copia cifrada.

> El script `scripts/importar-corcho.mjs` usaba el depurador del WebView, que ahora está desactivado. Ya no hace falta: los datos de El Corcho ya están dentro.
