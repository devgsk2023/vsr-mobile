#!/usr/bin/env python3
"""
Servidor local Flask para el panel de vacunatorios.

Sirve archivos estáticos y expone una API REST para leer/actualizar registros.
Diseñado con endpoints REST estándar para facilitar migración a Supabase.

Uso:
    python3 server.py
    → Abre http://localhost:5000/panel.html
"""

import json
import os
import threading
from datetime import datetime, timezone

from flask import Flask, jsonify, request, send_from_directory, abort

# ── Config ──
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DATA_FILE = os.path.join(DATA_DIR, "vacunatorios_coordinates_con_barrios.json")
PORT = 5050

app = Flask(__name__, static_folder=".", static_url_path="")

# Lock para escritura concurrente segura
write_lock = threading.Lock()


# ═══════════════════════════════════
#  Helpers
# ═══════════════════════════════════

def load_data():
    """Carga los datos del JSON."""
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        raw = json.load(f)
    return raw


def save_data(raw):
    """Guarda los datos al JSON de forma segura."""
    with write_lock:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(raw, f, ensure_ascii=False, indent=2)


def find_record(data_list, record_id):
    """Busca un registro por ID."""
    for i, record in enumerate(data_list):
        if record.get("id") == record_id:
            return i, record
    return None, None


# ═══════════════════════════════════
#  Archivos estáticos
# ═══════════════════════════════════

@app.route("/")
def index():
    return send_from_directory(".", "panel.html")


@app.route("/<path:path>")
def static_files(path):
    # No servir archivos de la API como estáticos
    if path.startswith("api/"):
        abort(404)
    return send_from_directory(".", path)


# ═══════════════════════════════════
#  API REST
# ═══════════════════════════════════

@app.route("/api/vacunatorios", methods=["GET"])
def get_vacunatorios():
    """
    GET /api/vacunatorios
    Query params opcionales: provincia, localidad, tipo, validated, accuracy
    """
    raw = load_data()
    data = raw.get("data", raw) if isinstance(raw, dict) else raw

    # Filtros opcionales
    provincia = request.args.get("provincia")
    localidad = request.args.get("localidad")
    tipo = request.args.get("tipo")
    validated = request.args.get("validated")
    accuracy = request.args.get("accuracy")

    if provincia:
        data = [d for d in data if d.get("provincia") == provincia]
    if localidad:
        data = [d for d in data if d.get("localidad") == localidad]
    if tipo:
        data = [d for d in data if d.get("tipo") == tipo]
    if validated is not None:
        if validated.lower() == "true":
            data = [d for d in data if d.get("validated") is True]
        elif validated.lower() == "false":
            data = [d for d in data if not d.get("validated")]
    if accuracy:
        data = [d for d in data if d.get("accuracy") == accuracy.upper()]

    return jsonify({"data": data, "total": len(data)})


@app.route("/api/vacunatorios/<int:record_id>", methods=["GET"])
def get_vacunatorio(record_id):
    """GET /api/vacunatorios/:id"""
    raw = load_data()
    data = raw.get("data", raw) if isinstance(raw, dict) else raw
    _, record = find_record(data, record_id)

    if record is None:
        return jsonify({"error": "Registro no encontrado"}), 404

    return jsonify(record)


@app.route("/api/vacunatorios/<int:record_id>", methods=["PATCH"])
def update_vacunatorio(record_id):
    """
    PATCH /api/vacunatorios/:id
    Body JSON con los campos a actualizar.
    Campos permitidos: lat, lng, accuracy, geocodingMethod, validated, validatedAt
    """
    raw = load_data()
    data = raw.get("data", []) if isinstance(raw, dict) else raw
    idx, record = find_record(data, record_id)

    if record is None:
        return jsonify({"error": "Registro no encontrado"}), 404

    body = request.get_json()
    if not body:
        return jsonify({"error": "Body vacío"}), 400

    # Campos permitidos para actualización
    allowed_fields = {
        "lat", "lng", "accuracy", "geocodingMethod",
        "validated", "validatedAt",
        "nombre", "tipo", "provincia", "localidad", "barrio",
        "domicilio", "telefono", "codigoPostal",
        "apVacuna", "apVacunaMenor"
    }

    updated_fields = []
    for key, value in body.items():
        if key in allowed_fields:
            record[key] = value
            updated_fields.append(key)

    if not updated_fields:
        return jsonify({"error": "Ningún campo válido para actualizar"}), 400

    # Actualizar en la lista
    data[idx] = record

    # Guardar
    if isinstance(raw, dict):
        raw["data"] = data
    save_data(raw)

    return jsonify({
        "success": True,
        "updated": updated_fields,
        "record": record
    })


@app.route("/api/vacunatorios/batch", methods=["PATCH"])
def batch_update():
    """
    PATCH /api/vacunatorios/batch
    Body: { "ids": [1, 2, 3], "fields": { "validated": true, ... } }
    Actualiza múltiples registros a la vez.
    """
    raw = load_data()
    data = raw.get("data", []) if isinstance(raw, dict) else raw

    body = request.get_json()
    if not body or "ids" not in body or "fields" not in body:
        return jsonify({"error": "Se requieren 'ids' y 'fields'"}), 400

    ids = set(body["ids"])
    fields = body["fields"]
    allowed_fields = {
        "lat", "lng", "accuracy", "geocodingMethod",
        "validated", "validatedAt"
    }

    updated_count = 0
    for record in data:
        if record.get("id") in ids:
            for key, value in fields.items():
                if key in allowed_fields:
                    record[key] = value
            updated_count += 1

    if isinstance(raw, dict):
        raw["data"] = data
    save_data(raw)

    return jsonify({"success": True, "updatedCount": updated_count})


@app.route("/api/stats", methods=["GET"])
def get_stats():
    """GET /api/stats — Estadísticas de validación."""
    raw = load_data()
    data = raw.get("data", raw) if isinstance(raw, dict) else raw

    total = len(data)
    validated = sum(1 for d in data if d.get("validated") is True)
    pending = total - validated

    high = sum(1 for d in data if d.get("accuracy") == "HIGH")
    medium = sum(1 for d in data if d.get("accuracy") == "MEDIUM")
    low = sum(1 for d in data if d.get("accuracy") == "LOW")
    manual = sum(1 for d in data if d.get("geocodingMethod") == "manual")

    provincias = len(set(d.get("provincia", "") for d in data if d.get("provincia")))
    tipos = len(set(d.get("tipo", "") for d in data if d.get("tipo")))

    return jsonify({
        "total": total,
        "validated": validated,
        "pending": pending,
        "validatedPercent": round((validated / total) * 100, 1) if total else 0,
        "accuracy": {
            "high": high,
            "medium": medium,
            "low": low,
        },
        "manual": manual,
        "provincias": provincias,
        "tipos": tipos,
    })


# ═══════════════════════════════════
#  Main
# ═══════════════════════════════════

if __name__ == "__main__":
    print(f"\n  Panel de Vacunatorios")
    print(f"  ─────────────────────")
    print(f"  http://localhost:{PORT}/panel.html")
    print(f"  API: http://localhost:{PORT}/api/vacunatorios")
    print(f"  Data: {DATA_FILE}\n")
    app.run(host="0.0.0.0", port=PORT, debug=True)
