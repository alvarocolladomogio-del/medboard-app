# Política de privacidad · MedBoard

_Última actualización: 20 de octubre de 2026._

MedBoard es una herramienta para organizar el cuadrante de turnos y las suplencias de un equipo de
enfermería. Esta página explica qué datos trata la aplicación y dónde están. El texto resumido también
está dentro de la app, en **Ajustes → Privacidad y aviso legal**.

## Resumen en una línea

**Los datos no salen de tu dispositivo.** MedBoard no tiene servidor, no envía nada por la red, no
lleva analítica ni publicidad y no carga librerías de terceros al ejecutarse.

## Quién trata los datos

Quien instala y usa la aplicación. No hay un prestador de servicio detrás que reciba los datos: no se
transmiten a ningún sitio, así que nadie más puede acceder a ellos.

## Qué datos guarda y dónde

| Dato | Dónde se guarda | ¿Sale del dispositivo? |
|---|---|---|
| Nombre del centro, turnos, equipos y mínimos | Almacenamiento local del dispositivo | No |
| Plantilla: nombre de cada profesional | Almacenamiento local del dispositivo | Solo en los PDF que compartes a mano |
| Cuadrante: turnos y ausencias, **sin el motivo** | Almacenamiento local del dispositivo | Solo en los PDF o el `.ics` que compartes a mano |
| Agenda de suplentes: nombre, DNI, teléfono, contrato | Almacenamiento local del dispositivo | Solo en la hoja de Administración y en la copia de seguridad cifrada |

En la aplicación Android el almacenamiento vive en el entorno aislado de la app, con la copia
automática del sistema desactivada. En la versión web vive en el navegador del dispositivo.

## Por qué nunca se pregunta el motivo de una falta

Para no tratar datos de salud. El cuadrante solo apunta que alguien no está, nunca por qué. Es una
decisión de minimización del artículo 5.1.c del RGPD y evita el artículo 9. **No escribas diagnósticos
ni motivos médicos en ningún campo de la aplicación.**

## Si guardas datos de otras personas

La agenda de suplentes contiene datos de terceros. Si la usas:

1. Avísales de que guardas su nombre, DNI y teléfono y para qué. Es el deber de información del
   artículo 13 del RGPD.
2. Bórralos cuando te lo pidan: **Agenda → la ficha → Borrar ficha**.
3. La hoja de Administración lleva el DNI. Mándala por correo corporativo, no por mensajería personal,
   y no la dejes a la vista en papel.

Si usas la aplicación en un dispositivo personal para datos de tu trabajo, conviene que tu centro lo
conozca y lo autorice.

## Qué sale de la aplicación, y solo cuando tú lo haces

- **PDF del cuadrante**: nombres y turnos. Sin DNI ni teléfonos.
- **Hoja de Administración (PDF)**: incluye DNI, porque es su finalidad.
- **Calendario `.ics`**: nombres y fechas. Nunca DNI ni teléfonos.
- **Mensajes de WhatsApp**: se abre tu aplicación de mensajería con el texto escrito. MedBoard no envía
  nada por su cuenta ni accede a tus contactos.
- **Copia de seguridad**: cifrada con AES-GCM de 256 bits y una clave derivada de tu contraseña con
  PBKDF2-SHA256 y 310.000 iteraciones. Sin esa contraseña no se puede recuperar; tampoco por nosotros.

## Cookies y seguimiento

Ninguno. No hay cookies, ni identificadores de publicidad, ni estadísticas de uso.

## Tus datos los borras tú

Desinstalar la aplicación, o borrar los datos del sitio en el navegador, elimina todo de forma
definitiva. **Haz una copia cifrada antes**: no hay ninguna otra forma de recuperarlos.

## Esto no es un producto sanitario

MedBoard organiza turnos. No toma decisiones clínicas, no trata pacientes y no sustituye a la planilla
oficial de tu centro, que es la de Supervisión o Dirección. Se ofrece tal cual, gratis y sin garantía:
quien la usa es responsable de comprobar que su cuadrante es correcto.

Los festivos que propone la aplicación son un cálculo orientativo, no una fuente oficial. El calendario
laboral lo publica cada año tu comunidad autónoma, y la app te deja corregirlo en Ajustes.
