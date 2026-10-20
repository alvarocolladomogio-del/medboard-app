#!/usr/bin/env bash
# Compila MedBoard como APK y lo instala por USB (sin borrar los datos del móvil).
set -euo pipefail
cd "$(dirname "$0")/.."

export JAVA_HOME="${JAVA_HOME:-$HOME/.local/jdk/jdk-21.0.12.1+1}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/.local/android-sdk}"
# El USB solo lo ve Windows (WSL no tiene acceso), y en este equipo el puerto 5037 de adb está bloqueado.
ADB_WIN="${ADB_WIN:-/mnt/c/Users/alvar/AppData/Local/Android/Sdk/platform-tools/adb.exe}"
ADB_PORT="${ADB_PORT:-5038}"
APK=android/app/build/outputs/apk/debug/app-debug.apk
APK_WIN_DIR=/mnt/c/Users/alvar/AppData/Local/Temp
adb() { (cd /mnt/c && "$ADB_WIN" -P "$ADB_PORT" "$@"); }

npx next build
npx cap sync android
[ -f android/local.properties ] || echo "sdk.dir=$ANDROID_HOME" > android/local.properties
(cd android && ./gradlew assembleDebug -q)

adb start-server >/dev/null 2>&1 </dev/null &
sleep 3
if [ -z "$(adb devices | sed 1d | grep -w device)" ]; then
  echo "APK listo en $APK, pero no hay ningún móvil conectado por USB (con depuración USB activada)." >&2
  exit 1
fi
cp "$APK" "$APK_WIN_DIR/medboard-debug.apk"
adb install -r 'C:\Users\alvar\AppData\Local\Temp\medboard-debug.apk'
echo "MedBoard actualizado en el móvil."
