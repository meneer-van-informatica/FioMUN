#!/usr/bin/env python3
"""Download only validated public site content, never private registration data."""
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

API = os.environ.get("FIOMUN_SITE_API", "")
OUTPUT = Path(__file__).resolve().parents[1] / "data/site-data.json"
PUBLIC = {"meta", "config", "theme", "assets", "menu", "pages", "cards", "programme", "details", "committees", "contacts", "registration"}
CONFIG = {"site_name","site_subtitle","site_year","site_language","site_status","contact_email","registration_mode","hero_image_url","conference_date","conference_location","conference_fee","theme_primary","theme_accent","registration_staff_form_url","registration_individual_form_url","registration_school_form_url"}
FORM = re.compile(r"https://(?:forms\.gle/[\w-]+|docs\.google\.com/forms/(?:u/\d+/)?d/(?:e/)?[\w-]+/viewform)(?:[?#][^\s<>\"']*)?", re.I)

def main():
    if not API.startswith("https://script.google.com/") or "?api=site" not in API:
        raise ValueError("Invalid public Apps Script API address")
    req = urllib.request.Request(API, headers={"User-Agent":"FioMUN-Public-Sync/1.0"})
    with urllib.request.urlopen(req, timeout=45) as response:
        raw = response.read(2000001)
    if len(raw) > 2000000:
        raise ValueError("Content too large")
    data = json.loads(raw.decode("utf-8"))
    if not isinstance(data, dict) or not isinstance(data.get("pages"), dict) or not data["pages"] or not isinstance(data.get("menu"), list) or not data["menu"]:
        raise ValueError("Missing public website content or login required")
    reg = data.get("registration")
    if data.get("formFields") or not isinstance(reg, dict) or reg.get("mode") != "closed" or not isinstance(reg.get("forms"), dict):
        raise ValueError("Legacy registration must be disabled")
    if not isinstance(data.get("config"), dict) or not isinstance(data.get("meta"), dict):
        raise ValueError("Invalid public metadata")
    clean = {k:v for k,v in data.items() if k in PUBLIC}
    clean["config"] = {k:v for k,v in data["config"].items() if k in CONFIG}
    clean["registration"] = {"mode":"closed","contactEmail":reg.get("contactEmail",""),
        "forms":{k:(value if isinstance(value,str) and FORM.fullmatch(value) else "") for k in ("staff","individual","school") for value in [reg["forms"].get(k,"")]}}
    text = json.dumps(clean, indent=2, sort_keys=True, ensure_ascii=False).replace("\u2014","-") + "\n"
    temp = OUTPUT.with_suffix(".tmp")
    temp.write_text(text, encoding="utf-8")
    temp.replace(OUTPUT)
    print("Public FioMUN content synchronized")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("Content sync failed:",exc,file=sys.stderr)
        sys.exit(1)
