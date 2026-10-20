import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MedBoard · Cuadrantes de enfermería",
    short_name: "MedBoard",
    description: "Cuadrante de turnos, suplencias y agenda de suplentes para equipos de enfermería",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f6f8fa",
    theme_color: "#00609c",
    lang: "es",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
