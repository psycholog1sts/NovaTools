#!/usr/bin/env python3
"""
MC NovaTools locale translation filler

Amaç:
- public/locales/en/translation.json dosyasını kaynak kabul eder
- hedef dillerde eksik veya İngilizce kalmış değerleri otomatik çevirir
- mevcut dolu çevirileri ezmez
- placeholder, template variable, URL, email, HTML tag, code benzeri yapıları korur

Kurulum:
    pip install deep-translator

Kullanım:
    python scripts/translate-locales.py
    python scripts/translate-locales.py --langs tr,de,fr
    python scripts/translate-locales.py --prefix tools.pdf.merge
    python scripts/translate-locales.py --force
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, List, Tuple

try:
    from deep_translator import GoogleTranslator
except ImportError:
    print("ERROR: deep-translator kurulu değil. Önce şunu çalıştır:")
    print("pip install deep-translator")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
LOCALES_DIR = ROOT / "public" / "locales"
SOURCE_LANG = "en"

SUPPORTED_LANGUAGES = [
    "tr", "de", "fr", "es", "pt", "ru", "zh", "ja", "ko", "ar", "hi", "it", "pl", "nl"
]

LANGUAGE_MAP = {
    "tr": "tr",
    "de": "de",
    "fr": "fr",
    "es": "es",
    "pt": "pt",
    "ru": "ru",
    "zh": "zh-CN",
    "ja": "ja",
    "ko": "ko",
    "ar": "ar",
    "hi": "hi",
    "it": "it",
    "pl": "pl",
    "nl": "nl",
}

PROTECTED_LITERALS = [
    "MC NovaTools",
    "NovaTools",
    "MC",
    "PDF",
    "JPG",
    "PNG",
    "HTML",
    "Word",
    "Excel",
    "PowerPoint",
    "OCR",
    "ZIP",
    "JSON",
    "CSV",
    "URL",
    "UUID",
    "Base64",
    "WebP",
    "AVIF",
    "BMI",
    "ASCII",
    "JavaScript",
    "CSS",
    "HTML",
]

TEMPLATE_RE = re.compile(r"\$\{.*?\}")
HTML_TAG_RE = re.compile(r"</?[^>]+>")
URL_RE = re.compile(r"https?://[^\s\"'>]+")
EMAIL_RE = re.compile(r"[\w\.-]+@[\w\.-]+\.\w+")
CODE_TICK_RE = re.compile(r"`[^`]+`")
MULTISPACE_RE = re.compile(r"\s+")
LEADING_TRAILING_SPACE_RE = re.compile(r"^(\s*)(.*?)(\s*)$", re.DOTALL)

SKIP_PATTERNS = [
    re.compile(r"^\s*$"),
    re.compile(r"^[\d\W_]+$"),
]


def load_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )


def flatten_dict(data: Dict[str, Any], prefix: str = "") -> Dict[str, Any]:
    result: Dict[str, Any] = {}

    for key, value in data.items():
        new_key = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            result.update(flatten_dict(value, new_key))
        else:
            result[new_key] = value

    return result


def set_nested(data: Dict[str, Any], dotted_key: str, value: Any) -> None:
    parts = dotted_key.split(".")
    node = data

    for part in parts[:-1]:
        if part not in node or not isinstance(node[part], dict):
            node[part] = {}
        node = node[part]

    node[parts[-1]] = value


def get_nested(data: Dict[str, Any], dotted_key: str) -> Any:
    parts = dotted_key.split(".")
    node: Any = data

    for part in parts:
        if not isinstance(node, dict) or part not in node:
            return None
        node = node[part]

    return node


def is_skippable_text(text: str) -> bool:
    if text is None:
        return True

    text = str(text)

    for pattern in SKIP_PATTERNS:
        if pattern.fullmatch(text):
            return True

    return False


def mask_patterns(text: str) -> Tuple[str, Dict[str, str]]:
    replacements: Dict[str, str] = {}
    index = 0

    def _mask(regex: re.Pattern, content: str) -> str:
        nonlocal index

        def repl(match: re.Match) -> str:
            nonlocal index
            token = f"__NTOKEN_{index}__"
            replacements[token] = match.group(0)
            index += 1
            return token

        return regex.sub(repl, content)

    masked = text

    for literal in PROTECTED_LITERALS:
        escaped = re.escape(literal)
        masked = _mask(re.compile(escaped), masked)

    masked = _mask(TEMPLATE_RE, masked)
    masked = _mask(HTML_TAG_RE, masked)
    masked = _mask(URL_RE, masked)
    masked = _mask(EMAIL_RE, masked)
    masked = _mask(CODE_TICK_RE, masked)

    return masked, replacements


def unmask_patterns(text: str, replacements: Dict[str, str]) -> str:
    restored = text
    for token, original in replacements.items():
        restored = restored.replace(token, original)
    return restored


def normalize_spaces(text: str) -> str:
    return MULTISPACE_RE.sub(" ", text).strip()


def translate_text(text: str, target_lang: str) -> str:
    if is_skippable_text(text):
        return text

    match = LEADING_TRAILING_SPACE_RE.match(text)
    if not match:
        return text

    leading, core, trailing = match.groups()

    if is_skippable_text(core):
        return text

    masked, replacements = mask_patterns(core)

    translator = GoogleTranslator(source="en", target=LANGUAGE_MAP[target_lang])

    translated = translator.translate(masked)
    if translated is None:
        return text

    translated = unmask_patterns(translated, replacements)
    translated = translated.replace(" __", "__").replace("__ ", "__")

    return f"{leading}{translated}{trailing}"


def should_translate_value(
    english_value: Any,
    target_value: Any,
    force: bool
) -> bool:
    if not isinstance(english_value, str):
        return False

    if is_skippable_text(english_value):
        return False

    if force:
        return True

    if target_value is None:
        return True

    if not isinstance(target_value, str):
        return True

    if normalize_spaces(target_value) == "":
        return True

    if normalize_spaces(target_value) == normalize_spaces(english_value):
        return True

    return False


def filter_keys(flat_keys: Dict[str, Any], prefix: str | None) -> Dict[str, Any]:
    if not prefix:
        return flat_keys
    return {k: v for k, v in flat_keys.items() if k.startswith(prefix)}


def translate_locale(
    source_flat: Dict[str, Any],
    target_data: Dict[str, Any],
    lang: str,
    prefix: str | None,
    force: bool,
    sleep_seconds: float
) -> Tuple[Dict[str, Any], int]:
    updated = 0
    filtered = filter_keys(source_flat, prefix)
    new_data = deepcopy(target_data)

    for key, english_value in filtered.items():
        current_value = get_nested(new_data, key)

        if not should_translate_value(english_value, current_value, force):
            continue

        try:
            translated = translate_text(str(english_value), lang)
            set_nested(new_data, key, translated)
            updated += 1
            print(f"[{lang}] updated: {key}")
            time.sleep(sleep_seconds)
        except Exception as exc:
            print(f"[{lang}] FAILED: {key} -> {exc}")

    return new_data, updated


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--langs",
        type=str,
        default=",".join(SUPPORTED_LANGUAGES),
        help="Virgülle ayrılmış dil listesi. Ör: tr,de,fr"
    )
    parser.add_argument(
        "--prefix",
        type=str,
        default=None,
        help="Sadece bu namespace altını çevir. Ör: tools.pdf.merge"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Mevcut çevirileri de yeniden üret"
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.25,
        help="Her çeviri arasında bekleme süresi"
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    langs = [x.strip() for x in args.langs.split(",") if x.strip()]
    invalid = [x for x in langs if x not in SUPPORTED_LANGUAGES]

    if invalid:
        print("ERROR: Desteklenmeyen diller:", ", ".join(invalid))
        sys.exit(1)

    source_path = LOCALES_DIR / SOURCE_LANG / "translation.json"
    if not source_path.exists():
        print(f"ERROR: Kaynak locale bulunamadı: {source_path}")
        sys.exit(1)

    source_data = load_json(source_path)
    source_flat = flatten_dict(source_data)

    total_updates = 0

    for lang in langs:
        target_path = LOCALES_DIR / lang / "translation.json"
        target_data = load_json(target_path)

        print(f"\n=== Translating locale: {lang} ===")
        new_data, updated = translate_locale(
            source_flat=source_flat,
            target_data=target_data,
            lang=lang,
            prefix=args.prefix,
            force=args.force,
            sleep_seconds=args.sleep
        )

        save_json(target_path, new_data)
        total_updates += updated
        print(f"[{lang}] total updated: {updated}")

    print("\nDone.")
    print(f"Total updated values: {total_updates}")


if __name__ == "__main__":
    main()