#!/usr/bin/env python3
"""
Normaliza los datos de vacunatorios para asegurar formato consistente.

Reglas aplicadas:
  - Title Case en: nombre, tipo, provincia, localidad, barrio, domicilio
  - Excepciones inteligentes: artículos/preposiciones en minúscula (de, del, la, las, los, el, y, e)
  - Siglas reconocidas se mantienen en mayúsculas (CAPS, UPA, CIC, SRL, SA, etc.)
  - Números romanos se mantienen en mayúsculas (I, II, III, IV, V, etc.)
  - Se eliminan dobles espacios
  - Se eliminan comas finales
  - Se recortan espacios al inicio y final (trim)

Uso (desde la carpeta mapa/):
  python3 normalize_data.py
"""

import json
import re
import sys
import os
from copy import deepcopy

# ── Configuración ── (rutas relativas al script)
INPUT_FILE = "data/vacunatorios_coordinates_con_barrios.json"
OUTPUT_FILE = "data/vacunatorios_coordinates_con_barrios.json"  # Sobreescribe
BACKUP_FILE = "data/vacunatorios_coordinates_con_barrios_backup.json"

# Palabras que van en minúscula (preposiciones/artículos), salvo al inicio
LOWERCASE_WORDS = {"de", "del", "la", "las", "los", "el", "y", "e", "en", "al", "a", "con", "por", "para", "sin"}

# Siglas que deben mantenerse en mayúsculas
UPPERCASE_WORDS = {
    "caps", "upa", "cic", "srl", "sa", "sas", "se", "ii", "iii", "iv", "vi",
    "vii", "viii", "ix", "xi", "xii", "xiii", "xiv", "xv", "xx", "i",
    "caba", "amba", "cic", "hpc", "higa", "imss", "cema",
    "meba", "osde", "ioma", "pami", "anses", "scs",
}

# Prefijos de calles / abreviaturas que se titulizan normal
STREET_ABBREVS = {"av", "av.", "avda", "avda.", "bv", "bv.", "blvd", "cnel", "gral", "dr", "dr.", "dra", "dra.", "sta", "sto"}


def smart_title_case(text):
    """Convierte texto a Title Case inteligente."""
    if not text or not text.strip():
        return text

    # Paso 1: limpiar
    text = text.strip()
    text = re.sub(r",\s*$", "", text)       # quitar coma final
    text = re.sub(r"\s{2,}", " ", text)      # quitar dobles espacios

    words = text.split(" ")
    result = []

    for i, word in enumerate(words):
        word_lower = word.lower()
        word_clean = re.sub(r"[^a-záéíóúüñ]", "", word_lower)  # solo letras

        # Siglas reconocidas → MAYÚSCULAS
        if word_clean in UPPERCASE_WORDS:
            result.append(word.upper())
        # Números romanos solos → MAYÚSCULAS
        elif re.match(r"^[IVXLCDM]+$", word.upper()) and len(word) <= 5 and word_clean in UPPERCASE_WORDS:
            result.append(word.upper())
        # Artículos/preposiciones → minúscula (salvo primera palabra)
        elif word_clean in LOWERCASE_WORDS and i > 0:
            result.append(word.lower())
        # Palabras con números (como "3er", "1ro") → minúscula parcial
        elif re.match(r"^\d", word):
            result.append(word)
        # Caso normal → Title Case
        else:
            result.append(capitalize_word(word))

    return " ".join(result)


def capitalize_word(word):
    """Capitaliza una palabra respetando acentos y caracteres especiales."""
    if not word:
        return word

    # Si tiene paréntesis al inicio, capitalizar lo de adentro
    if word.startswith("(") and len(word) > 1:
        return "(" + capitalize_word(word[1:])

    # Si contiene guión, capitalizar cada parte por separado
    if "-" in word and len(word) > 1:
        parts = word.split("-")
        return "-".join(capitalize_word(p) for p in parts)

    # Si contiene barra, capitalizar cada parte
    if "/" in word and len(word) > 1:
        parts = word.split("/")
        return "/".join(capitalize_word(p) for p in parts)

    # Capitalizar primera letra, resto en minúscula
    return word[0].upper() + word[1:].lower()


def clean_address_number_words(text):
    """Elimina palabras innecesarias de 'número' en direcciones.
    Ej: 'Calle 43 Numero 439' → 'Calle 43 439'
        'Av. 7 N° 1198'       → 'Av. 7 1198'
        'Calle 14 Nro. 4998'  → 'Calle 14 4998'
    """
    if not text:
        return text
    # Orden importa: patrones más largos primero
    # Cada patrón captura la palabra + espacios que le siguen
    text = re.sub(r'\bNumero\s+', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\bNúmero\s+', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\bNro\.?\s+', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\bNúm\.?\s+', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\bNum\.?\s+', '', text, flags=re.IGNORECASE)
    text = re.sub(r'N[°º]\s*', '', text)
    text = re.sub(r'n[°º]\s*', '', text)
    text = re.sub(r'N\.º\s*', '', text)
    # Limpiar dobles espacios que puedan quedar
    text = re.sub(r'\s{2,}', ' ', text).strip()
    return text


def normalize_record(record):
    """Normaliza un registro individual."""
    fields_to_normalize = ["nombre", "tipo", "provincia", "localidad", "barrio", "domicilio"]

    for field in fields_to_normalize:
        value = record.get(field)
        if value and isinstance(value, str) and value.strip():
            record[field] = smart_title_case(value)

    # Domicilio: limpiar palabras de "número" innecesarias
    dom = record.get("domicilio")
    if dom and isinstance(dom, str):
        record["domicilio"] = clean_address_number_words(dom)

    # Teléfono: solo limpiar espacios
    tel = record.get("telefono")
    if tel and isinstance(tel, str):
        record["telefono"] = re.sub(r"\s{2,}", " ", tel.strip())

    # Código postal: limpiar
    cp = record.get("codigoPostal")
    if cp and isinstance(cp, str):
        record["codigoPostal"] = cp.strip()

    return record


def analyze_changes(original, normalized):
    """Compara datos originales y normalizados, retorna estadísticas."""
    changes = {field: 0 for field in ["nombre", "tipo", "provincia", "localidad", "barrio", "domicilio", "telefono"]}
    examples = {field: [] for field in changes}

    for orig, norm in zip(original, normalized):
        for field in changes:
            ov = orig.get(field, "") or ""
            nv = norm.get(field, "") or ""
            if ov != nv:
                changes[field] += 1
                if len(examples[field]) < 5:
                    examples[field].append((ov, nv))

    return changes, examples


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(script_dir, INPUT_FILE)
    output_path = os.path.join(script_dir, OUTPUT_FILE)
    backup_path = os.path.join(script_dir, BACKUP_FILE)

    # Leer
    print(f"Leyendo {input_path}...")
    with open(input_path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    data = raw.get("data", raw) if isinstance(raw, dict) else raw
    metadata = raw.get("metadata", {}) if isinstance(raw, dict) else {}
    statistics = raw.get("statistics", {}) if isinstance(raw, dict) else {}

    print(f"  → {len(data)} registros cargados\n")

    # Backup
    print(f"Creando backup en {backup_path}...")
    with open(backup_path, "w", encoding="utf-8") as f:
        json.dump(raw, f, ensure_ascii=False, indent=2)
    print("  → Backup creado\n")

    # Normalizar
    original_data = deepcopy(data)
    normalized_data = [normalize_record(deepcopy(r)) for r in data]

    # Analizar cambios
    changes, examples = analyze_changes(original_data, normalized_data)

    print("=" * 60)
    print("  REPORTE DE NORMALIZACIÓN")
    print("=" * 60)

    total_changes = sum(changes.values())
    print(f"\n  Total de campos modificados: {total_changes}\n")

    for field, count in changes.items():
        marker = "✓" if count > 0 else "·"
        print(f"  {marker} {field:15s} → {count:5d} cambios")
        for orig, norm in examples[field]:
            print(f"      ANTES: {orig[:70]}")
            print(f"      AHORA: {norm[:70]}")
            print()

    print("=" * 60)

    # Guardar
    output = {
        "metadata": {
            **metadata,
            "normalized": True,
            "normalization_note": "Datos normalizados a Title Case consistente. Backup en vacunatorios_coordinates_con_barrios_backup.json"
        },
        "statistics": statistics,
        "data": normalized_data,
    }

    print(f"\nGuardando en {output_path}...")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"  → {len(normalized_data)} registros guardados")
    print(f"  → {total_changes} campos normalizados")
    print("\n¡Listo!")


if __name__ == "__main__":
    main()
