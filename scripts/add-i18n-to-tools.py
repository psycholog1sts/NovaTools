#!/usr/bin/env python3
"""
MC NovaTools
Tool sayfalarına otomatik i18n anahtarları ekler.

Ne yapar:
1) Tool sayfalarına doğru i18n scriptini ekler: /i18n.js
2) Statik metin taşıyan güvenli HTML elemanlarına data-i18n ekler
3) title elemanına data-i18n ekler
4) placeholder ve title attribute'ları için data-i18n-* ekler
5) public/locales/en/translation.json içine İngilizce anahtarları yazar
6) Diğer locale dosyalarında eksik anahtar varsa İngilizce fallback yazar
   (böylece sayfa "key" göstermesin)

Not:
- Bu script gerçek çeviri üretmez.
- Ama yeni tool sayfalarının çoklu dil altyapısına otomatik bağlanmasını sağlar.
"""

import json
import re
from html import unescape
from pathlib import Path

SUPPORTED_LANGUAGES = [
    'en', 'tr', 'de', 'fr', 'es', 'pt', 'ru',
    'zh', 'ja', 'ko', 'ar', 'hi', 'it', 'pl', 'nl'
]

TOOLS_DIR = Path('src/tools')
LOCALES_DIR = Path('public/locales')

TEXT_TAGS = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'a', 'button', 'span', 'label', 'li'
]

SKIP_TEXT_PATTERNS = [
    re.compile(r'^\s*$'),
    re.compile(r'^[\W_]+$'),
    re.compile(r'^[\d\s\W_]+$'),
]

TITLE_PATTERN = re.compile(
    r'<title(?P<attrs>[^>]*)>(?P<text>.*?)</title>',
    re.IGNORECASE | re.DOTALL
)

TEXT_ELEMENT_PATTERN = re.compile(
    rf'<(?P<tag>{"|".join(TEXT_TAGS)})\b(?P<attrs>[^>]*)>(?P<text>[^<>]+?)</(?P=tag)>',
    re.IGNORECASE | re.DOTALL
)

PLACEHOLDER_PATTERN = re.compile(
    r'<(?P<tag>[a-zA-Z0-9:-]+)\b(?P<before>[^>]*?)\splaceholder="(?P<value>[^"]+)"(?P<after>[^>]*)>',
    re.IGNORECASE | re.DOTALL
)

TITLE_ATTR_PATTERN = re.compile(
    r'<(?P<tag>[a-zA-Z0-9:-]+)\b(?P<before>[^>]*?)\stitle="(?P<value>[^"]+)"(?P<after>[^>]*)>',
    re.IGNORECASE | re.DOTALL
)

I18N_SCRIPT_OLD_PATTERN = re.compile(
    r'<script[^>]+src="/src/i18n\.js"[^>]*>\s*</script>',
    re.IGNORECASE
)

I18N_SCRIPT_ANY_PATTERN = re.compile(
    r'<script[^>]+src="/i18n\.js"[^>]*>\s*</script>',
    re.IGNORECASE
)


def read_text(path: Path) -> str:
    return path.read_text(encoding='utf-8')


def write_text(path: Path, content: str) -> None:
    path.write_text(content, encoding='utf-8', newline='\n')


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        return {}


def save_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8'
    )


def set_nested(data: dict, dotted_key: str, value: str) -> None:
    parts = dotted_key.split('.')
    node = data

    for part in parts[:-1]:
        if part not in node or not isinstance(node[part], dict):
            node[part] = {}
        node = node[part]

    if parts[-1] not in node:
        node[parts[-1]] = value


def get_nested(data: dict, dotted_key: str):
    parts = dotted_key.split('.')
    node = data

    for part in parts:
        if not isinstance(node, dict) or part not in node:
            return None
        node = node[part]

    return node


def normalize_text(value: str) -> str:
    value = unescape(value)
    value = re.sub(r'\s+', ' ', value).strip()
    return value


def should_translate_text(value: str) -> bool:
    value = normalize_text(value)

    if not value:
        return False

    for pattern in SKIP_TEXT_PATTERNS:
        if pattern.fullmatch(value):
            return False

    return True


def namespace_from_path(file_path: Path) -> str:
    rel = file_path.as_posix()

    if rel.startswith('src/'):
        rel = rel[4:]

    if rel.endswith('/index.html'):
        rel = rel[:-11]
    elif rel.endswith('.html'):
        rel = rel[:-5]

    return rel.replace('/', '.')


def ensure_i18n_script(content: str) -> str:
    content = I18N_SCRIPT_OLD_PATTERN.sub(
        '<script src="/i18n.js" defer></script>',
        content
    )

    if I18N_SCRIPT_ANY_PATTERN.search(content):
        return content

    if '</head>' in content:
        return content.replace(
            '</head>',
            '  <script src="/i18n.js" defer></script>\n</head>',
            1
        )

    return content


def next_key(namespace: str, group: str, counters: dict) -> str:
    counters[group] = counters.get(group, 0) + 1
    return f'{namespace}.{group}.{counters[group]:03d}'


def update_title(content: str, namespace: str, extracted: dict, counters: dict) -> str:
    def repl(match):
        attrs = match.group('attrs') or ''
        text = match.group('text') or ''

        if 'data-i18n=' in attrs:
            return match.group(0)

        normalized = normalize_text(text)
        if not should_translate_text(normalized):
            return match.group(0)

        key = f'{namespace}.meta.title'
        extracted[key] = normalized
        return f'<title{attrs} data-i18n="{key}">{text}</title>'

    return TITLE_PATTERN.sub(repl, content, count=1)


def update_text_nodes(content: str, namespace: str, extracted: dict, counters: dict) -> str:
    def repl(match):
        tag = match.group('tag')
        attrs = match.group('attrs') or ''
        text = match.group('text') or ''

        if 'data-i18n=' in attrs:
            return match.group(0)

        normalized = normalize_text(text)
        if not should_translate_text(normalized):
            return match.group(0)

        key = next_key(namespace, 'text', counters)
        extracted[key] = normalized
        return f'<{tag}{attrs} data-i18n="{key}">{text}</{tag}>'

    return TEXT_ELEMENT_PATTERN.sub(repl, content)


def update_placeholder_attrs(content: str, namespace: str, extracted: dict, counters: dict) -> str:
    def repl(match):
        tag = match.group('tag')
        before = match.group('before') or ''
        value = match.group('value') or ''
        after = match.group('after') or ''

        full_attrs = f'{before} placeholder="{value}"{after}'

        if 'data-i18n-placeholder=' in full_attrs:
            return match.group(0)

        normalized = normalize_text(value)
        if not should_translate_text(normalized):
            return match.group(0)

        key = next_key(namespace, 'placeholder', counters)
        extracted[key] = normalized

        return (
            f'<{tag}{before} placeholder="{value}"'
            f' data-i18n-placeholder="{key}"{after}>'
        )

    return PLACEHOLDER_PATTERN.sub(repl, content)


def update_title_attrs(content: str, namespace: str, extracted: dict, counters: dict) -> str:
    def repl(match):
        tag = match.group('tag')
        before = match.group('before') or ''
        value = match.group('value') or ''
        after = match.group('after') or ''

        full_attrs = f'{before} title="{value}"{after}'

        if 'data-i18n-title=' in full_attrs:
            return match.group(0)

        normalized = normalize_text(value)
        if not should_translate_text(normalized):
            return match.group(0)

        key = next_key(namespace, 'title', counters)
        extracted[key] = normalized

        return (
            f'<{tag}{before} title="{value}"'
            f' data-i18n-title="{key}"{after}>'
        )

    return TITLE_ATTR_PATTERN.sub(repl, content)


def load_locale_maps():
    locale_maps = {}

    for lang in SUPPORTED_LANGUAGES:
        locale_path = LOCALES_DIR / lang / 'translation.json'
        locale_maps[lang] = load_json(locale_path)

    return locale_maps


def save_locale_maps(locale_maps: dict):
    for lang, data in locale_maps.items():
        locale_path = LOCALES_DIR / lang / 'translation.json'
        save_json(locale_path, data)


def merge_translations_into_locales(extracted: dict, locale_maps: dict):
    for key, english_value in extracted.items():
        if get_nested(locale_maps['en'], key) is None:
            set_nested(locale_maps['en'], key, english_value)

        for lang in SUPPORTED_LANGUAGES:
            if lang == 'en':
                continue

            if get_nested(locale_maps[lang], key) is None:
                set_nested(locale_maps[lang], key, english_value)


def should_skip_file(file_path: Path) -> bool:
    file_str = file_path.as_posix()
    return any(x in file_str for x in ['demo-', 'experimental', '/test/'])


def process_file(file_path: Path, locale_maps: dict) -> bool:
    try:
        original = read_text(file_path)
        content = original

        namespace = namespace_from_path(file_path)
        counters = {}
        extracted = {}

        content = ensure_i18n_script(content)
        content = update_title(content, namespace, extracted, counters)
        content = update_placeholder_attrs(content, namespace, extracted, counters)
        content = update_title_attrs(content, namespace, extracted, counters)
        content = update_text_nodes(content, namespace, extracted, counters)

        if extracted:
            merge_translations_into_locales(extracted, locale_maps)

        if content != original:
            write_text(file_path, content)
            print(f'Updated: {file_path}')
        else:
            print(f'No change: {file_path}')

        return True

    except Exception as exc:
        print(f'Error processing {file_path}: {exc}')
        return False


def main():
    if not TOOLS_DIR.exists():
        print(f'Tools directory not found: {TOOLS_DIR}')
        return

    locale_maps = load_locale_maps()

    updated = 0
    skipped = 0
    failed = 0

    html_files = sorted(TOOLS_DIR.rglob('index.html'))

    for html_file in html_files:
        if should_skip_file(html_file):
            skipped += 1
            continue

        if process_file(html_file, locale_maps):
            updated += 1
        else:
            failed += 1

    save_locale_maps(locale_maps)

    print('\nSummary:')
    print(f'  Updated: {updated}')
    print(f'  Skipped: {skipped}')
    print(f'  Failed: {failed}')


if __name__ == '__main__':
    main()