import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Geist_Mono } from "next/font/google";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

/* Atkinson Hyperlegible: diseñada para baja visión (distingue I/l/1, O/0). */
const hyper = Atkinson_Hyperlegible({ variable: "--font-hyper", subsets: ["latin"], weight: ["400", "700"] });
/* Solo para DNI y teléfonos: no compite con la fuente principal en la primera carga. */
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], preload: false });

export const metadata: Metadata = {
  title: "MedBoard · Cuadrantes de enfermería",
  description: "Cuadrante de turnos, suplencias y agenda de suplentes. Los datos no salen del dispositivo.",
  applicationName: "MedBoard",
  appleWebApp: { capable: true, title: "MedBoard", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#f6f2ec", width: "device-width", initialScale: 1, viewportFit: "cover" };

/* Solo recursos propios: aunque se colara texto malicioso en una ficha, no podría cargar ni enviar nada fuera.
   'unsafe-inline' lo exige el export estático de Next (scripts de hidratación en línea). */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-src 'none'",
].join("; ");

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${hyper.variable} ${geistMono.variable} h-full antialiased`}>
      {process.env.NODE_ENV === "production" && (
        <head>
          <meta httpEquiv="Content-Security-Policy" content={CSP} />
          <meta name="referrer" content="no-referrer" />
        </head>
      )}
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
