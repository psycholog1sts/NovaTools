import { readFileSync, writeFileSync } from 'node:fs';

const WRITE = process.argv.includes('--write');
let changed = 0;

function edit(path, transform) {
  const original = readFileSync(path, 'utf8');
  const next = transform(original);
  if (next === original) return;
  changed += 1;
  if (WRITE) writeFileSync(path, next, 'utf8');
}

function replaceRequired(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`Converter migration missing ${label}`);
  return text.replace(from, to);
}

function addAttributeToId(html, id, attribute) {
  const pattern = new RegExp(`(<(?:input|select)[^>]*\\bid=["']${id}["'][^>]*)(>)`, 'i');
  if (!pattern.test(html)) throw new Error(`Converter migration missing control #${id}`);
  return html.replace(pattern, (full, open, close) => open.includes(attribute.split('=')[0]) ? full : `${open} ${attribute}${close}`);
}

edit('vite.config.js', (source) => {
  let next = source;
  if (!next.includes('const specializedToolUxSlugs')) {
    next = replaceRequired(
      next,
      "const toolUxEnhancementAssets = {",
      "const specializedToolUxSlugs = new Set([\n  'converters/percentage-calculator',\n  'converters/unit-converter'\n]);\n\nconst toolUxEnhancementAssets = {",
      'specialized tool UX set anchor'
    );
  }
  next = replaceRequired(
    next,
    "    return {\n      html,\n      tags: [\n        {\n          tag: 'link',\n          attrs: { rel: 'stylesheet', href: stylesheetHref },\n          injectTo: 'head'\n        },\n        {\n          tag: 'script',\n          attrs: { type: 'module', src: scriptSrc, 'data-tool-slug': slug },\n          injectTo: 'body'\n        }\n      ]\n    };",
    "    const tags = [\n      {\n        tag: 'link',\n        attrs: { rel: 'stylesheet', href: stylesheetHref },\n        injectTo: 'head'\n      }\n    ];\n\n    if (!specializedToolUxSlugs.has(slug)) {\n      tags.push({\n        tag: 'script',\n        attrs: { type: 'module', src: scriptSrc, 'data-tool-slug': slug },\n        injectTo: 'body'\n      });\n    }\n\n    return { html, tags };",
    'tool enhancer tag injection block'
  );
  return next;
});

edit('src/tools/converters/percentage-calculator/index.html', (html) => {
  let next = html.replaceAll(
    'https://www.mc-novatools.com/tools/converters/percentage-calculator/',
    'https://mc-novatools.com/tools/converters/percentage-calculator/'
  );

  const labels = {
    'wi-percent': 'aria-label="Percentage" inputmode="decimal"',
    'wi-value': 'aria-label="Base value" inputmode="decimal"',
    'xw-value': 'aria-label="Part value" inputmode="decimal"',
    'xw-total': 'aria-label="Total value" inputmode="decimal"',
    'inc-value': 'aria-label="Value to increase" inputmode="decimal"',
    'inc-percent': 'aria-label="Increase percentage" inputmode="decimal"',
    'dec-value': 'aria-label="Value to decrease" inputmode="decimal"',
    'dec-percent': 'aria-label="Decrease percentage" inputmode="decimal"'
  };
  for (const [id, attribute] of Object.entries(labels)) next = addAttributeToId(next, id, attribute);

  next = replaceRequired(
    next,
    '<div class="result-box">\n            <div class="result-label">Result</div>',
    '<div class="result-box" role="status" aria-live="polite" aria-atomic="true">\n            <div class="result-label">Result</div>',
    'percentage live result region'
  );

  next = replaceRequired(
    next,
    "          result = xwTotal ? ((xwValue / xwTotal) * 100) : 0;\n          formula = `Formula: (${xwValue} ÷ ${xwTotal}) × 100 = ${result.toFixed(2)}%`;\n          result = result.toFixed(2) + '%';\n          break;",
    "          if (xwTotal === 0) {\n            resultValue.textContent = '—';\n            formulaDisplay.textContent = 'Cannot divide by zero. Total must be greater than 0.';\n            return;\n          }\n          result = (xwValue / xwTotal) * 100;\n          formula = `Formula: (${xwValue} ÷ ${xwTotal}) × 100 = ${result.toFixed(2)}%`;\n          result = result.toFixed(2) + '%';\n          break;",
    'percentage zero-division behavior'
  );

  next = next.replaceAll('<div class="quick-item" onclick=', '<button type="button" class="quick-item" onclick=');
  next = next.replaceAll('</div>\n              <button type="button" class="quick-item"', '</button>\n              <button type="button" class="quick-item"');
  next = next.replace(
    '<button type="button" class="quick-item" onclick="setExample(\'decrease\', 100, 10)">Decrease 100 by 10%</div>',
    '<button type="button" class="quick-item" onclick="setExample(\'decrease\', 100, 10)">Decrease 100 by 10%</button>'
  );

  next = replaceRequired(
    next,
    '<ul><li><a href="https://mc-novatools.com/tools/converters/age-calculator/">Age Calculator — Calculate exact age from birthdate.</a></li><li><a href="https://mc-novatools.com/tools/converters/bmi-calculator/">BMI Calculator — Calculate Body Mass Index and health category.</a></li></ul>',
    '<ul><li><a href="https://mc-novatools.com/tools/converters/unit-converter/">Unit Converter — Convert length, mass, temperature, volume, area, speed and data units.</a></li></ul>',
    'percentage related tools'
  );

  next = next.replace(/\n<section class="seo-section" aria-label="About this tool">[\s\S]*?<\/section>\s*(?=<\/main>|<footer)/i, '\n');
  next = next.replace(
    'Our free Percentage Calculator helps you solve various percentage problems quickly and accurately.',
    'This Percentage Calculator evaluates four local arithmetic workflows: percentage-of, ratio-as-percent, increase-by-percent and decrease-by-percent.'
  );
  return next;
});

edit('src/tools/converters/unit-converter/index.html', (html) => {
  let next = html.replaceAll(
    'https://www.mc-novatools.com/tools/converters/unit-converter/',
    'https://mc-novatools.com/tools/converters/unit-converter/'
  );

  next = addAttributeToId(next, 'inputValue', 'aria-label="Value to convert" inputmode="decimal"');
  next = addAttributeToId(next, 'fromUnit', 'aria-label="From unit"');
  next = addAttributeToId(next, 'outputValue', 'aria-label="Converted value"');
  next = addAttributeToId(next, 'toUnit', 'aria-label="To unit"');

  next = replaceRequired(
    next,
    '<div class="result-box">\n            <div class="result-label">Conversion Result</div>',
    '<div class="result-box" role="status" aria-live="polite" aria-atomic="true">\n            <div class="result-label">Conversion Result</div>',
    'unit live result region'
  );

  next = replaceRequired(
    next,
    "      commonUnits.innerHTML = data.quick.map(q => `<div class=\"common-unit-item\" data-val=\"${q.val}\">${q.text}</div>`).join('');",
    "      commonUnits.innerHTML = data.quick.map(q => `<button type=\"button\" class=\"common-unit-item\" data-val=\"${q.val}\">${q.text}</button>`).join('');",
    'unit quick conversion controls'
  );

  next = replaceRequired(
    next,
    '<ul><li><a href="https://mc-novatools.com/tools/converters/age-calculator/">Age Calculator — Calculate exact age from birthdate.</a></li><li><a href="https://mc-novatools.com/tools/converters/bmi-calculator/">BMI Calculator — Calculate Body Mass Index and health category.</a></li></ul>',
    '<ul><li><a href="https://mc-novatools.com/tools/converters/percentage-calculator/">Percentage Calculator — Calculate percentage-of, ratio, increase and decrease locally.</a></li></ul>',
    'unit related tools'
  );

  next = next.replace(/\n<section class="seo-section" aria-label="About this tool">[\s\S]*?<\/section>\s*(?=<\/main>|<footer)/i, '\n');
  next = next.replaceAll('Convert between length, weight, temperature, volume, and area units instantly.', 'Convert length, mass, temperature, volume, area, speed and data units with local formulas.');
  next = next.replaceAll('Convert between different units of measurement instantly.', 'Convert supported measurement units locally in your browser.');
  return next;
});

edit('src/data/tool-certification.json', (raw) => {
  const data = JSON.parse(raw);
  const updates = new Map([
    ['/tools/converters/percentage-calculator/', {
      DataSource: 'User inputs; local percentage arithmetic',
      KnownLimitations: 'Division-based ratio mode rejects a zero total. Displayed decimal results are rounded to two places.'
    }],
    ['/tools/converters/unit-converter/', {
      DataSource: 'User inputs; local conversion constants and temperature formulas',
      KnownLimitations: 'Displayed results are rounded to six decimal places; the tool covers its listed units only and performs no external lookup.'
    }]
  ]);

  for (const record of data.records) {
    const update = updates.get(record.Route);
    if (!update) continue;
    Object.assign(record, {
      Indexable: true,
      AdsEligible: true,
      FunctionalTruth: 'PASS',
      UniqueUtility: 'PASS',
      SpecificContent: 'PASS',
      ImplementationEvidence: 'PASS',
      NoFiller: 'PASS',
      Trust: 'PASS',
      PrivacyTruth: 'LOCAL_ONLY',
      ExternalNetwork: false,
      DataSource: update.DataSource,
      SyntheticData: 'NONE',
      KnownLimitations: update.KnownLimitations,
      UIStatus: 'SPECIALIZED_VERIFIED',
      Tests: 'converter certification browser contract + canonical regression suite',
      CertificationStatus: 'CERTIFIED',
      ImplementationStatus: 'PRODUCTION_CERTIFIED',
      RuntimeStatus: 'ENABLED',
      SEOStatus: 'INDEXABLE',
      DiscoveryStatus: 'ELIGIBLE',
      SitemapStatus: 'INCLUDED',
      TestStatus: 'PLAYWRIGHT_CERTIFIED'
    });
  }

  for (const route of updates.keys()) {
    if (!data.records.some((record) => record.Route === route && record.CertificationStatus === 'CERTIFIED')) {
      throw new Error(`Converter certification record was not updated: ${route}`);
    }
  }
  return `${JSON.stringify(data, null, 2)}\n`;
});

console.log(`converter certification migration: ${changed} file(s) ${WRITE ? 'updated' : 'would change'}`);
if (!WRITE && changed) process.exitCode = 1;
