package com.alvarocollado.medboard

import com.getcapacitor.BridgeActivity

/**
 * Punto de entrada de la app en Android.
 *
 * MedBoard es una aplicación web que Capacitor empaqueta en un WebView: toda la lógica del
 * cuadrante vive en `src/`. Esta clase solo arranca el puente, así que aquí no se añade
 * lógica de negocio ni nada que toque datos de personas.
 */
class MainActivity : BridgeActivity()
