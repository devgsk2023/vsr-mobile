#!/usr/bin/env python3
"""
Re-geocodifica todos los vacunatorios usando la API de Google Maps.

Google Maps Geocoding API location_type:
  - ROOFTOP: dirección exacta (techo del edificio)
  - RANGE_INTERPOLATED: entre dos puntos exactos
  - GEOMETRIC_CENTER: centro de un área (calle, barrio)
  - APPROXIMATE: zona aproximada

Uso (desde la carpeta mapa/ o donde esté este script):
    python3 geocode_google.py
"""

import json
import os
import sys
import time
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime

# ── Config ── (rutas relativas al script)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
API_KEY = "AIzaSyBWMgpuf6kUK7eyheo1pUPx69nEhqMk86w"
DATA_FILE = os.path.join(SCRIPT_DIR, "data", "vacunatorios_coordinates_con_barrios.json")
BACKUP_FILE = DATA_FILE.replace(".json", "_pre_google_backup.json")

# Mapeo de location_type de Google a nuestro accuracy
ACCURACY_MAP = {
    "ROOFTOP": "HIGH",
    "RANGE_INTERPOLATED": "HIGH",
    "GEOMETRIC_CENTER": "MEDIUM",
    "APPROXIMATE": "LOW",
}

# Requests por segundo (Google permite 50, usamos 10 para ser conservadores)
RATE_LIMIT = 10
SAVE_EVERY = 50  # Guardar progreso cada N registros


def geocode(address):
    """Geocodifica una dirección con Google Maps API."""
    params = urllib.parse.urlencode({
        "address": address,
        "key": API_KEY,
        "region": "ar",
        "language": "es",
    })
    url = f"https://maps.googleapis.com/maps/api/geocode/json?{params}"

    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())

        if data["status"] == "OK" and data["results"]:
            result = data["results"][0]
            loc = result["geometry"]["location"]
            loc_type = result["geometry"].get("location_type", "APPROXIMATE")
            return {
                "lat": loc["lat"],
                "lng": loc["lng"],
                "accuracy": ACCURACY_MAP.get(loc_type, "MEDIUM"),
                "locationType": loc_type,
                "formattedAddress": result.get("formatted_address", ""),
                "success": True,
            }
        elif data["status"] == "ZERO_RESULTS":
            return {"success": False, "error": "sin resultados"}
        elif data["status"] == "OVER_QUERY_LIMIT":
            return {"success": False, "error": "rate_limit"}
        else:
            return {"success": False, "error": data.get("status", "unknown")}

    except Exception as e:
        return {"success": False, "error": str(e)}


def build_address(record):
    """Construye la dirección de búsqueda a partir del registro."""
    parts = []
    dom = record.get("domicilio", "")
    if dom:
        # Si el domicilio ya tiene ciudad/provincia (de un edit anterior), usarlo directo
        if "Argentina" in dom:
            return dom
        parts.append(dom)

    loc = record.get("localidad", "")
    if loc:
        parts.append(loc)

    prov = record.get("provincia", "")
    if prov:
        parts.append(prov)

    parts.append("Argentina")
    return ", ".join(parts)


def main():
    # Cargar datos
    print(f"\n  Geocodificación con Google Maps API")
    print(f"  ────────────────────────────────────\n")
    print(f"  Leyendo {DATA_FILE}...")

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        raw = json.load(f)

    data = raw.get("data", raw)
    total = len(data)
    print(f"  → {total} registros\n")

    # Backup
    print(f"  Creando backup en {BACKUP_FILE}...")
    with open(BACKUP_FILE, "w", encoding="utf-8") as f:
        json.dump(raw, f, ensure_ascii=False, indent=2)
    print(f"  → Backup creado\n")

    # Stats
    stats = {
        "total": total,
        "success": 0,
        "failed": 0,
        "rooftop": 0,
        "range_interpolated": 0,
        "geometric_center": 0,
        "approximate": 0,
        "skipped": 0,
        "errors": [],
    }

    start_time = time.time()
    last_save = 0

    print(f"  Geocodificando {total} registros...\n")
    print(f"  {'#':>5}  {'ID':>5}  {'Estado':12}  {'Tipo':22}  Nombre")
    print(f"  {'─'*80}")

    for i, record in enumerate(data):
        record_id = record.get("id", i)
        nombre = record.get("nombre", "?")[:30]

        # Construir dirección
        address = build_address(record)

        # Geocodificar
        result = geocode(address)

        if result["success"]:
            record["lat"] = result["lat"]
            record["lng"] = result["lng"]
            record["accuracy"] = result["accuracy"]
            record["geocodingMethod"] = "google"
            record["displayName"] = result["formattedAddress"]
            record["locationType"] = result["locationType"]

            stats["success"] += 1
            loc_type = result["locationType"].lower()
            if loc_type in stats:
                stats[loc_type] += 1

            status = f"✓ {result['accuracy']}"
            print(f"  {i+1:>5}  {record_id:>5}  {status:12}  {result['locationType']:22}  {nombre}")
        else:
            if result["error"] == "rate_limit":
                print(f"\n  ⚠ Rate limit alcanzado, esperando 2 segundos...")
                time.sleep(2)
                # Reintentar
                result = geocode(address)
                if result["success"]:
                    record["lat"] = result["lat"]
                    record["lng"] = result["lng"]
                    record["accuracy"] = result["accuracy"]
                    record["geocodingMethod"] = "google"
                    record["displayName"] = result["formattedAddress"]
                    record["locationType"] = result["locationType"]
                    stats["success"] += 1
                    print(f"  {i+1:>5}  {record_id:>5}  ✓ retry     {result['locationType']:22}  {nombre}")
                    continue

            stats["failed"] += 1
            stats["errors"].append({"id": record_id, "nombre": nombre, "error": result["error"], "address": address})
            print(f"  {i+1:>5}  {record_id:>5}  ✗ FAIL       {result.get('error','?'):22}  {nombre}")

        # Rate limiting
        time.sleep(1.0 / RATE_LIMIT)

        # Guardar progreso periódicamente
        if (i + 1) - last_save >= SAVE_EVERY:
            raw["data"] = data
            with open(DATA_FILE, "w", encoding="utf-8") as f:
                json.dump(raw, f, ensure_ascii=False, indent=2)
            last_save = i + 1
            elapsed = time.time() - start_time
            rate = (i + 1) / elapsed if elapsed > 0 else 0
            remaining = (total - i - 1) / rate if rate > 0 else 0
            print(f"\n  💾 Progreso guardado ({i+1}/{total}) — {rate:.1f} reg/s — ~{remaining:.0f}s restantes\n")

    # Guardar final
    elapsed = time.time() - start_time

    raw["metadata"] = {
        "generated": datetime.now().isoformat(),
        "version": "4.0",
        "source": "Google Maps Geocoding API",
        "geocodingProvider": "Google Maps",
        "description": "Datos geocodificados con Google Maps API para máxima precisión",
        "totalRequests": total,
        "elapsedSeconds": round(elapsed, 1),
    }
    raw["statistics"] = {
        "total": total,
        "success": stats["success"],
        "failed": stats["failed"],
        "successRate": f"{(stats['success']/total*100):.1f}%",
        "rooftop": stats["rooftop"],
        "rangeInterpolated": stats["range_interpolated"],
        "geometricCenter": stats["geometric_center"],
        "approximate": stats["approximate"],
        "highAccuracy": stats["rooftop"] + stats["range_interpolated"],
        "mediumAccuracy": stats["geometric_center"],
        "lowAccuracy": stats["approximate"],
    }
    raw["data"] = data

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(raw, f, ensure_ascii=False, indent=2)

    # Reporte
    print(f"\n  {'═'*60}")
    print(f"  REPORTE FINAL")
    print(f"  {'═'*60}")
    print(f"  Total:              {total}")
    print(f"  Exitosos:           {stats['success']} ({stats['success']/total*100:.1f}%)")
    print(f"  Fallidos:           {stats['failed']}")
    print(f"  ─────────────────────────────")
    print(f"  ROOFTOP:            {stats['rooftop']} (dirección exacta)")
    print(f"  RANGE_INTERPOLATED: {stats['range_interpolated']} (interpolado)")
    print(f"  GEOMETRIC_CENTER:   {stats['geometric_center']} (centro de zona)")
    print(f"  APPROXIMATE:        {stats['approximate']} (aproximado)")
    print(f"  ─────────────────────────────")
    print(f"  Tiempo:             {elapsed:.1f}s ({elapsed/60:.1f} min)")
    print(f"  Velocidad:          {total/elapsed:.1f} registros/s")
    print(f"  ─────────────────────────────")
    print(f"  Guardado en:        {DATA_FILE}")
    print(f"  Backup en:          {BACKUP_FILE}")

    if stats["errors"]:
        print(f"\n  Registros fallidos ({len(stats['errors'])}):")
        for err in stats["errors"][:20]:
            print(f"    [{err['id']}] {err['nombre']} — {err['error']}")
            print(f"         Dirección: {err['address'][:80]}")
        if len(stats["errors"]) > 20:
            print(f"    ... y {len(stats['errors'])-20} más")

    print(f"\n  ¡Listo!\n")


if __name__ == "__main__":
    main()
