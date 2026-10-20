"use client";

import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    /* En el APK (Capacitor) los archivos ya van dentro de la app: no hace falta caché offline. */
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator) || "Capacitor" in window) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}
