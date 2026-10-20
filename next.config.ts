import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* App 100 % cliente: se exporta estática a `out/`, que Capacitor empaqueta en el APK. */
  output: "export",
};

export default nextConfig;
