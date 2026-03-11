"""
Actualiza los teléfonos en el JSON de vacunatorios usando el CSV (mapeo CUIT → Teléfono).

Ejecutar desde la carpeta mapa/ (o donde esté este script):
  python3 update_phones.py

Requisito: vacunas.csv en la misma carpeta que este script.
"""
import json
import csv
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(SCRIPT_DIR, "vacunas.csv")
JSON_PATH = os.path.join(SCRIPT_DIR, "data", "vacunatorios_coordinates_con_barrios.json")

# Leer el CSV y crear un mapeo de CUIT -> Teléfono
cuit_to_phone = {}
with open(CSV_PATH, 'r', encoding='utf-8', newline='') as f:
    reader = csv.reader(f)
    next(reader)  # Saltar el header
    for row in reader:
        if len(row) >= 9:
            cuit = row[7].strip()  # Columna CUIT
            telefono = row[8].strip()  # Columna Teléfono
            if cuit and telefono:
                cuit_to_phone[cuit] = telefono

print(f"Mapeados {len(cuit_to_phone)} CUITs a teléfonos")

# Leer el JSON
with open(JSON_PATH, 'r', encoding='utf-8') as f:
    json_data = json.load(f)

# Actualizar los teléfonos
updated_count = 0
not_found_count = 0
not_found_cuits = set()

data = json_data.get('data', [])

for item in data:
    if 'telefono' in item:
        current_value = item['telefono']
        if current_value in cuit_to_phone:
            item['telefono'] = cuit_to_phone[current_value]
            updated_count += 1
        else:
            if current_value and '-' in current_value and len(current_value.split('-')) == 3:
                not_found_count += 1
                not_found_cuits.add(current_value)

print(f"Actualizados: {updated_count}")
print(f"CUITs no encontrados en el CSV: {not_found_count}")
if not_found_cuits:
    print(f"Ejemplos de CUITs no encontrados: {list(not_found_cuits)[:5]}")

# Guardar el JSON actualizado
with open(JSON_PATH, 'w', encoding='utf-8') as f:
    json.dump(json_data, f, ensure_ascii=False, indent=2)

print("JSON actualizado exitosamente!")
