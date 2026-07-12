#!/usr/bin/env python3
"""
scrape_santiago_businesses.py
─────────────────────────────
Descarga todos los negocios de Santiago, N.L. desde OpenStreetMap
(via Overpass API) y genera un CSV listo para contacto/outreach.

Uso:
    python3 scrape_santiago_businesses.py
    python3 scrape_santiago_businesses.py --radio 8   # radio en km (default 6)
    python3 scrape_santiago_businesses.py --out mis_negocios.csv

Salida: santiago_negocios_YYYY-MM-DD.csv
Columnas: nombre, categoria, subcategoria, telefono, website, email,
          direccion, lat, lng, whatsapp_link, estado_directorio

Sin dependencias pesadas — solo requests + csv (stdlib).
"""

import argparse
import csv
import json
import math
import sys
import time
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

# ── Centroide de Santiago, N.L. (plaza principal) ────────────────
CENTER_LAT = 25.4244
CENTER_LNG = -100.1514

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# ── Mapeo de tags OSM → categoría del directorio ─────────────────
CATEGORY_MAP: list[tuple[tuple[str, str], str, str]] = [
    # (tag_key, tag_value) → (categoria_dir, label)
    (("amenity", "restaurant"),       "restaurantes",   "Restaurantes"),
    (("amenity", "cafe"),             "cafes",          "Cafés & Panaderías"),
    (("amenity", "bar"),              "bares",          "Bares & Cantinas"),
    (("amenity", "fast_food"),        "restaurantes",   "Restaurantes"),
    (("amenity", "pub"),              "bares",          "Bares & Cantinas"),
    (("amenity", "bakery"),           "cafes",          "Cafés & Panaderías"),
    (("amenity", "pharmacy"),         "farmacia",       "Farmacias"),
    (("amenity", "clinic"),           "salud",          "Médicos & Salud"),
    (("amenity", "doctors"),          "salud",          "Médicos & Salud"),
    (("amenity", "hospital"),         "salud",          "Médicos & Salud"),
    (("amenity", "veterinary"),       "veterinaria",    "Veterinarias"),
    (("amenity", "bank"),             "bancos",         "Bancos & ATMs"),
    (("amenity", "atm"),              "bancos",         "Bancos & ATMs"),
    (("amenity", "fuel"),             "automotriz",     "Gasolineras & Mecánicos"),
    (("amenity", "car_wash"),         "automotriz",     "Gasolineras & Mecánicos"),
    (("amenity", "beauty_shop"),      "belleza",        "Salones & Estéticas"),
    (("amenity", "hairdresser"),      "belleza",        "Salones & Estéticas"),
    (("amenity", "gym"),              "bienestar",      "Bienestar & Spa"),
    (("amenity", "spa"),              "bienestar",      "Bienestar & Spa"),
    (("amenity", "hotel"),            "hospedaje",      "Hospedaje"),
    (("amenity", "guest_house"),      "hospedaje",      "Hospedaje"),
    (("tourism", "hotel"),            "hospedaje",      "Hospedaje"),
    (("tourism", "guest_house"),      "hospedaje",      "Hospedaje"),
    (("tourism", "attraction"),       "cultura",        "Historia & Cultura"),
    (("tourism", "museum"),           "cultura",        "Historia & Cultura"),
    (("shop", "florist"),             "floreria",       "Florería & Arreglos"),
    (("shop", "beauty"),              "belleza",        "Salones & Estéticas"),
    (("shop", "hairdresser"),         "belleza",        "Salones & Estéticas"),
    (("shop", "supermarket"),         "tiendas",        "Tiendas & Artesanías"),
    (("shop", "convenience"),         "tiendas",        "Tiendas & Artesanías"),
    (("shop", "clothes"),             "tiendas",        "Tiendas & Artesanías"),
    (("shop", "hardware"),            "servicios",      "Servicios & Delivery"),
    (("shop", "car_repair"),          "automotriz",     "Gasolineras & Mecánicos"),
    (("shop", "car_parts"),           "automotriz",     "Gasolineras & Mecánicos"),
    (("leisure", "fitness_centre"),   "bienestar",      "Bienestar & Spa"),
    (("leisure", "swimming_pool"),    "entretenimiento","Entretenimiento"),
    (("craft", "*"),                  "tiendas",        "Tiendas & Artesanías"),
]


def bbox_from_center(lat: float, lng: float, radius_km: float) -> tuple:
    """Retorna (min_lat, min_lng, max_lat, max_lng) para un radio en km."""
    d_lat = radius_km / 111.0
    d_lng = radius_km / (111.0 * math.cos(math.radians(lat)))
    return (lat - d_lat, lng - d_lng, lat + d_lat, lng + d_lng)


def build_overpass_query(bbox: tuple) -> str:
    s, w, n, e = bbox
    bbox_str = f"{s},{w},{n},{e}"

    tags = [
        '"amenity"~"restaurant|cafe|bar|fast_food|pub|bakery|pharmacy|clinic|doctors|hospital|veterinary|bank|atm|fuel|car_wash|beauty_shop|hairdresser|gym|spa|hotel|guest_house"',
        '"tourism"~"hotel|guest_house|attraction|museum"',
        '"shop"~"florist|beauty|hairdresser|supermarket|convenience|clothes|hardware|car_repair|car_parts"',
        '"leisure"~"fitness_centre|swimming_pool"',
        '"craft"',
    ]

    parts = []
    for tag in tags:
        parts.append(f'  node[{tag}]({bbox_str});')
        parts.append(f'  way[{tag}]({bbox_str});')

    query = f"""[out:json][timeout:60];
(
{chr(10).join(parts)}
);
out center tags;"""
    return query


def fetch_overpass(query: str) -> dict:
    data = urllib.parse.urlencode({"data": query}).encode()
    req  = urllib.request.Request(
        OVERPASS_URL,
        data=data,
        headers={"User-Agent": "HotelElEncinoDirectorio/1.0 (directorio@hotelelencino.com)"},
    )
    print("  Consultando Overpass API...", end=" ", flush=True)
    with urllib.request.urlopen(req, timeout=90) as resp:
        raw = resp.read()
    print("OK")
    return json.loads(raw)


def classify(tags: dict) -> tuple[str, str]:
    for (key, val), cat, label in CATEGORY_MAP:
        tag_val = tags.get(key, "")
        if val == "*" and tag_val:
            return cat, label
        if tag_val == val:
            return cat, label
    return "servicios", "Servicios & Delivery"


def extract_phone(tags: dict) -> str:
    raw = tags.get("phone") or tags.get("contact:phone") or tags.get("mobile") or ""
    # Normalizar a +52 si es número mexicano sin código
    raw = raw.strip().replace(" ", "").replace("-", "")
    if raw and not raw.startswith("+"):
        if raw.startswith("52"):
            raw = "+" + raw
        elif len(raw) == 10:
            raw = "+52" + raw
    return raw


def whatsapp_link(phone: str, name: str) -> str:
    if not phone:
        return ""
    digits = "".join(c for c in phone if c.isdigit())
    msg = urllib.parse.quote(
        f"Hola, vi tu negocio ({name}) y me gustaría invitarlos al Directorio Turístico de Hotel El Encino en Santiago, N.L. ¡Es gratis y los ponemos en el mapa!"
    )
    return f"https://wa.me/{digits}?text={msg}"


def process_elements(elements: list) -> list[dict]:
    seen: set[str] = set()
    rows = []

    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name", "").strip()
        if not name:
            continue

        # Deduplicar por nombre+coords aproximadas
        if el["type"] == "way":
            center = el.get("center", {})
            lat = center.get("lat")
            lng = center.get("lon")
        else:
            lat = el.get("lat")
            lng = el.get("lon")

        if not lat or not lng:
            continue

        key = f"{name}|{round(lat, 4)}|{round(lng, 4)}"
        if key in seen:
            continue
        seen.add(key)

        cat, label  = classify(tags)
        phone       = extract_phone(tags)
        website     = tags.get("website") or tags.get("contact:website") or ""
        email       = tags.get("email") or tags.get("contact:email") or ""
        address     = (
            tags.get("addr:full")
            or " ".join(filter(None, [
                tags.get("addr:street", ""),
                tags.get("addr:housenumber", ""),
            ]))
        ).strip()

        rows.append({
            "nombre":            name,
            "categoria":         cat,
            "label":             label,
            "telefono":          phone,
            "website":           website,
            "email":             email,
            "direccion":         address,
            "lat":               round(lat, 6),
            "lng":               round(lng, 6),
            "whatsapp_outreach": whatsapp_link(phone, name),
            "estado_directorio": "pendiente",  # pendiente / invitado / registrado
            "notas":             "",
        })

    return sorted(rows, key=lambda r: r["nombre"].lower())


def write_csv(rows: list[dict], path: Path) -> None:
    if not rows:
        print("  Sin resultados para escribir.")
        return
    fieldnames = list(rows[0].keys())
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main():
    parser = argparse.ArgumentParser(description="Scraper de negocios OSM para Santiago N.L.")
    parser.add_argument("--radio",  type=float, default=6.0, help="Radio de búsqueda en km (default: 6)")
    parser.add_argument("--out",    type=str,   default="",  help="Nombre del archivo CSV de salida")
    args = parser.parse_args()

    out_file = Path(args.out) if args.out else Path(f"santiago_negocios_{date.today()}.csv")

    print(f"\n{'='*55}")
    print(f"  Directorio Turístico — Scraper OSM")
    print(f"  Centro: {CENTER_LAT}, {CENTER_LNG}")
    print(f"  Radio:  {args.radio} km")
    print(f"  Salida: {out_file}")
    print(f"{'='*55}\n")

    bbox  = bbox_from_center(CENTER_LAT, CENTER_LNG, args.radio)
    print(f"  Bounding box: {bbox[0]:.4f},{bbox[1]:.4f} → {bbox[2]:.4f},{bbox[3]:.4f}")

    query = build_overpass_query(bbox)

    try:
        data = fetch_overpass(query)
    except Exception as e:
        print(f"\n  Error al consultar Overpass: {e}", file=sys.stderr)
        sys.exit(1)

    elements = data.get("elements", [])
    print(f"  Elementos OSM encontrados: {len(elements)}")

    rows = process_elements(elements)
    print(f"  Negocios únicos con nombre: {len(rows)}")

    if rows:
        # Stats por categoría
        from collections import Counter
        cats = Counter(r["label"] for r in rows)
        print("\n  Por categoría:")
        for label, count in cats.most_common():
            print(f"    {count:3d}  {label}")

        con_tel = sum(1 for r in rows if r["telefono"])
        con_web = sum(1 for r in rows if r["website"])
        print(f"\n  Con teléfono:  {con_tel}/{len(rows)}")
        print(f"  Con website:   {con_web}/{len(rows)}")

    write_csv(rows, out_file)
    print(f"\n  CSV guardado: {out_file.resolve()}")
    print(f"\n  Próximo paso: abrir el CSV en Excel/Sheets")
    print(f"  Columna 'whatsapp_outreach' tiene el link directo para invitarlos.\n")


if __name__ == "__main__":
    main()
