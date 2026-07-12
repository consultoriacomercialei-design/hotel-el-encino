#!/usr/bin/env python3
"""
enrich_with_places.py
─────────────────────
Enriquece el CSV de santiago_negocios con datos de Google Places API:
  • Teléfono
  • Website
  • Horario de apertura
  • Rating y número de reseñas

Luego genera link de WhatsApp outreach listo para invitarlos al directorio.

Costo estimado: ~$4 USD para 80 negocios (Text Search + Place Details).

Uso:
    python3 scripts/enrich_with_places.py
    python3 scripts/enrich_with_places.py --input santiago_negocios_2026-05-02.csv
    python3 scripts/enrich_with_places.py --dry-run   # muestra primeros 5 sin consumir API

Requiere:
    GOOGLE_PLACES_API_KEY en .env.local o en el entorno
"""

import argparse
import csv
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

# ── Leer .env.local automáticamente ──────────────────────────────
def load_env_local(base_dir: Path) -> None:
    env_path = base_dir / ".env.local"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val

BASE_DIR = Path(__file__).parent.parent
load_env_local(BASE_DIR)

PLACES_KEY = os.environ.get("GOOGLE_PLACES_API_KEY", "")

# Places API (New) endpoints
TEXTSEARCH_NEW_URL = "https://places.googleapis.com/v1/places:searchText"
DETAILS_NEW_URL    = "https://places.googleapis.com/v1/places/{place_id}"
SEARCH_FIELD_MASK  = "places.id,places.displayName,places.internationalPhoneNumber,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.regularOpeningHours"
DETAILS_FIELD_MASK = "id,displayName,internationalPhoneNumber,nationalPhoneNumber,websiteUri,rating,userRatingCount,regularOpeningHours"

# Pausa entre requests para no superar 10 QPS
REQUEST_DELAY = 0.12   # segundos


# ── HTTP helper (GET) ─────────────────────────────────────────────
def get_json(url: str, headers: dict | None = None) -> dict:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "HotelElEncinoDirectorio/1.0", **(headers or {})},
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


# ── HTTP helper (POST JSON) ───────────────────────────────────────
def post_json(url: str, body: dict, headers: dict | None = None) -> dict:
    payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "HotelElEncinoDirectorio/1.0",
            **(headers or {}),
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


# ── Google Places (New): buscar por nombre + coords ───────────────
def text_search(name: str, lat: float, lng: float) -> str | None:
    """Retorna place_id del primer resultado, o None."""
    body = {
        "textQuery": f"{name} Santiago Nuevo Leon Mexico",
        "locationBias": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": 800.0,
            }
        },
        "maxResultCount": 1,
    }
    hdrs = {
        "X-Goog-Api-Key": PLACES_KEY,
        "X-Goog-FieldMask": SEARCH_FIELD_MASK,
    }
    data = post_json(TEXTSEARCH_NEW_URL, body, hdrs)
    places = data.get("places", [])
    if not places:
        return None
    return places[0].get("id")  # resource name like "places/ChIJ..."


# ── Google Places (New): obtener detalles por place_id ───────────
def place_details(place_id: str) -> dict:
    """place_id puede ser resource name 'places/XXX' o bare ID."""
    if not place_id.startswith("places/"):
        place_id = f"places/{place_id}"
    url = f"https://places.googleapis.com/v1/{place_id}"
    hdrs = {
        "X-Goog-Api-Key": PLACES_KEY,
        "X-Goog-FieldMask": DETAILS_FIELD_MASK,
    }
    return get_json(url, hdrs)


# ── Formatear horario ─────────────────────────────────────────────
def format_hours(opening_hours: dict) -> str:
    # New API uses weekdayDescriptions instead of weekday_text
    periods = opening_hours.get("weekdayDescriptions") or opening_hours.get("weekday_text", [])
    return " | ".join(periods[:3]) if periods else ""   # lunes-miércoles como muestra


# ── WhatsApp outreach link ────────────────────────────────────────
REGISTRO_BASE = "https://hotelelencino.com/mi-negocio/registro"

def wa_link(phone: str, name: str, lat: float = 0, lng: float = 0,
            website: str = "", categoria: str = "") -> str:
    if not phone:
        return ""
    digits = "".join(c for c in phone if c.isdigit())
    if not digits.startswith("52") and len(digits) == 10:
        digits = "52" + digits

    # Link de registro personalizado con datos pre-llenados
    reg_params = urllib.parse.urlencode({
        "ref":    "outreach",
        "n":      name,
        "t":      phone,
        "lat":    str(round(lat, 6)) if lat else "",
        "lng":    str(round(lng, 6)) if lng else "",
        "web":    website,
        "cat":    categoria,
    })
    reg_url = f"{REGISTRO_BASE}?{reg_params}"

    msg = urllib.parse.quote(
        f"Hola, {name}! 👋 Soy del Hotel El Encino de Santiago, N.L. "
        f"Estamos creando un directorio turístico gratuito para apoyar a los negocios "
        f"locales del municipio. Me gustaría incluirlos con su información, foto y "
        f"ubicación en el mapa. ¿Les interesa? ¡Es completamente gratis! 🙏\n\n"
        f"Pueden registrarse aquí en menos de 2 minutos: {reg_url}"
    )
    return f"https://wa.me/{digits}?text={msg}"


# ── Procesar un negocio ───────────────────────────────────────────
def enrich_row(row: dict, dry_run: bool = False) -> dict:
    name = row["nombre"]
    lat  = float(row["lat"])
    lng  = float(row["lng"])

    enriched = dict(row)
    enriched["places_encontrado"] = "no"
    enriched["telefono_places"]   = ""
    enriched["website_places"]    = ""
    enriched["horario"]           = ""
    enriched["rating"]            = ""
    enriched["total_reseñas"]     = ""
    enriched["whatsapp_outreach"] = ""

    if dry_run:
        enriched["places_encontrado"] = "dry_run"
        return enriched

    try:
        time.sleep(REQUEST_DELAY)
        place_id = text_search(name, lat, lng)
        if not place_id:
            return enriched

        time.sleep(REQUEST_DELAY)
        details = place_details(place_id)

        # Places API (New) field names differ from legacy
        phone   = details.get("internationalPhoneNumber") or details.get("nationalPhoneNumber") or ""
        website = details.get("websiteUri") or ""
        rating  = str(details.get("rating", ""))
        reviews = str(details.get("userRatingCount", ""))
        hours   = format_hours(details.get("regularOpeningHours", {}))

        enriched["places_encontrado"] = "si"
        enriched["telefono_places"]   = phone
        enriched["website_places"]    = website
        enriched["rating"]            = rating
        enriched["total_reseñas"]     = reviews
        enriched["horario"]           = hours
        enriched["whatsapp_outreach"] = wa_link(
            phone, name,
            lat=lat, lng=lng,
            website=website,
            categoria=enriched.get("categoria", ""),
        )

        # Si ya tenía teléfono del OSM, lo conservamos; si no, usamos el de Places
        if not enriched.get("telefono") and phone:
            enriched["telefono"] = phone

    except Exception as e:
        enriched["notas"] = f"error: {e}"

    return enriched


# ── Main ─────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input",   type=str, default="",    help="CSV de entrada (default: más reciente en scripts/)")
    parser.add_argument("--out",     type=str, default="",    help="CSV de salida")
    parser.add_argument("--dry-run", action="store_true",     help="Procesa solo los primeros 5 sin llamar a la API")
    args = parser.parse_args()

    if not PLACES_KEY and not args.dry_run:
        print("ERROR: GOOGLE_PLACES_API_KEY no encontrada.")
        print("  Agrégala a .env.local o expórtala en el shell:")
        print("  export GOOGLE_PLACES_API_KEY=AIza...")
        sys.exit(1)

    # Encontrar CSV de entrada
    scripts_dir = BASE_DIR / "scripts"
    if args.input:
        in_path = Path(args.input) if Path(args.input).is_absolute() else scripts_dir / args.input
    else:
        csvs = sorted(scripts_dir.glob("santiago_negocios_*.csv"))
        if not csvs:
            print("ERROR: No se encontró ningún CSV de santiago_negocios_*.csv")
            print("  Corre primero: python3 scripts/scrape_santiago_businesses.py")
            sys.exit(1)
        in_path = csvs[-1]

    out_stem = in_path.stem.replace("negocios", "outreach")
    out_path = scripts_dir / (args.out or f"{out_stem}_enriched.csv")

    print(f"\n{'='*55}")
    print(f"  Google Places Enrichment")
    print(f"  Entrada:  {in_path.name}")
    print(f"  Salida:   {out_path.name}")
    print(f"  API Key:  {'***' + PLACES_KEY[-6:] if PLACES_KEY else 'NO CONFIGURADA'}")
    if args.dry_run:
        print(f"  MODO: DRY RUN — solo primeros 5, sin API calls")
    print(f"{'='*55}\n")

    # Leer CSV
    with open(in_path, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    if args.dry_run:
        rows = rows[:5]

    print(f"  Procesando {len(rows)} negocios...\n")

    enriched_rows  = []
    found          = 0
    with_phone     = 0

    for i, row in enumerate(rows, 1):
        name = row["nombre"]
        print(f"  [{i:3d}/{len(rows)}] {name[:40]:<40}", end=" ", flush=True)

        result = enrich_row(row, dry_run=args.dry_run)
        enriched_rows.append(result)

        if result["places_encontrado"] == "si":
            found += 1
            phone = result["telefono_places"]
            if phone:
                with_phone += 1
                print(f"✓ {phone}")
            else:
                print("✓ (sin tel)")
        elif result["places_encontrado"] == "dry_run":
            print("(dry run)")
        else:
            print("— no encontrado")

    # Escribir CSV enriquecido
    if enriched_rows:
        fieldnames = list(enriched_rows[0].keys())
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(enriched_rows)

    print(f"\n  ─────────────────────────────────────")
    print(f"  Encontrados en Google Places: {found}/{len(rows)}")
    print(f"  Con teléfono (outreach listo): {with_phone}")
    print(f"  CSV guardado: {out_path.resolve()}")
    print(f"\n  Abre el CSV en Google Sheets.")
    print(f"  Columna 'whatsapp_outreach' → link directo para invitar.\n")


if __name__ == "__main__":
    main()
