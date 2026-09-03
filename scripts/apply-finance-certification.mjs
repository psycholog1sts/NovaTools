import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const WRITE = process.argv.includes('--write');
let changed = 0;

function edit(path, transform) {
  const original = readFileSync(path, 'utf8');
  const next = transform(original);
  if (next === original) return;
  changed += 1;
  if (WRITE) writeFileSync(path, next, 'utf8');
}

function mustReplace(text, search, replacement, label) {
  if (!text.includes(search)) throw new Error(`Finance certification migration could not find: ${label}`);
  return text.replace(search, replacement);
}

const p0Path = 'src/tools/finance/p0-batch2.mjs';
edit(p0Path, (source) => {
  let next = source;
  next = mustReplace(
    next,
    "    if (response.stale) warning = 'Fiyatlar geçici olarak güncellenemiyor; önbellekteki son bilinen CoinGecko yanıtı gösteriliyor.';\n",
    '',
    'unreachable crypto stale branch'
  );
  next = mustReplace(
    next,
    "      { value: 'Kadın 58 / Erkek 60+', label: 'SGK 4A yaş notu' }",
    "      { value: `${years} yıl`, label: 'Hedefe kalan süre' }",
    'unsupported retirement SGK age output'
  );
  next = mustReplace(
    next,
    '    ])}<div class="chart-container"><h3>Yaşa göre birikim</h3>${canvasHtml(\'retirementChart\', \'line\', series, \'Emeklilik birikim grafiği\')}</div><p class="finance-note">SGK yaş/prim günü koşulları statü ve başlangıç tarihine göre değişebilir; 3600/4500/5400 gün seçenekleri için SGK kaydı kontrol edilmelidir. Emeklilik hesaplamaları tahminidir, kesin bilgi için SGK ve mali müşavire danışın.</p>`',
    '    ])}<div class="chart-container"><h3>Yaşa göre birikim</h3>${canvasHtml(\'retirementChart\', \'line\', series, \'Emeklilik birikim grafiği\')}</div><p class="finance-note">Projeksiyon, seçtiğiniz getiri ve enflasyon oranlarının dönem boyunca sabit kaldığını varsayar. Devlet emekliliği/SGK aylığı bu hesaplamaya dahil değildir.</p>`',
    'retirement SGK implementation note'
  );
  next = mustReplace(
    next,
    "  const chart = base.rows.slice(0, Math.max(base.rows.length, extra.rows.length)).filter((_, index) => index % Math.max(1, Math.ceil(base.rows.length / 24)) === 0).map((row, index) => ({ label: String(row.month), current: row.balance, extra: extra.rows[Math.min(index, extra.rows.length - 1)]?.balance || 0 }));",
    "  const chart = base.rows.slice(0, Math.max(base.rows.length, extra.rows.length)).filter((_, index) => index % Math.max(1, Math.ceil(base.rows.length / 24)) === 0).map((row) => ({ label: String(row.month), current: row.balance, extra: extra.rows[Math.min(row.month - 1, extra.rows.length - 1)]?.balance || 0 }));",
    'student-loan chart month alignment'
  );
  next = mustReplace(
    next,
    "    'crypto-prices': `<p class=\"finance-note\">BTC, ETH, SOL, XRP ve ADA fiyatları 30 saniyede bir yenilenir. Canlı istekler NovaTools live-data uç noktası üzerinden CoinGecko kaynağına gider.</p><button class=\"btn\" type=\"submit\">Fiyatları yenile</button>`,",
    "    'crypto-prices': `<p class=\"finance-note\">BTC, ETH, SOL, XRP ve ADA için CoinGecko snapshot'ı tarayıcıda 5 dakika önbelleğe alınır. Otomatik yenileme de 5 dakikada bir çalışır; sonuçta sağlayıcının veri çekim zamanı gösterilir.</p><button class=\"btn\" type=\"submit\">Fiyatları kontrol et</button>`,",
    'crypto refresh copy'
  );
  next = mustReplace(
    next,
    "    cryptoTimer = window.setInterval(run, 30000);",
    "    cryptoTimer = window.setInterval(run, 5 * 60 * 1000);",
    'crypto refresh interval'
  );
  return next;
});

edit('src/tools/finance/mortgage-refinance.mjs', (source) => {
  let next = source;
  next = mustReplace(next, ' * Turkey mode applies KKDF and BSMV to the periodic interest rate so the', ' * Optional KKDF and BSMV assumptions are applied to the periodic interest rate so the', 'mortgage tax comment');
  next = mustReplace(next, 'const DEFAULT_KKDF_RATE = 15;', 'const DEFAULT_KKDF_RATE = 0;', 'mortgage default KKDF');
  next = mustReplace(next, 'const DEFAULT_BSMV_RATE = 5;', 'const DEFAULT_BSMV_RATE = 0;', 'mortgage default BSMV');
  return next;
});

const financeDir = resolve('src/tools/finance');
for (const name of readdirSync(financeDir)) {
  const page = resolve(financeDir, name, 'index.html');
  try {
    if (!statSync(page).isFile()) continue;
  } catch {
    continue;
  }
  edit(page, (html) => {
    let next = html;
    next = next.replaceAll(`https://mc-novatools.com/finance/${name}/`, `https://mc-novatools.com/tools/finance/${name}/`);
    next = next.replaceAll(`https://www.mc-novatools.com/finance/${name}/`, `https://www.mc-novatools.com/tools/finance/${name}/`);
    next = next.replace(
      /<li><a href="https:\/\/mc-novatools\.com\/tools\/finance\/cloud-cost\/">Cloud Cost Calculator[^<]*<\/a>[^<]*<\/li>/g,
      '<li><a href="https://mc-novatools.com/tools/finance/roi-calculator/">ROI Calculator — Calculate return on investment and annualized return locally.</a></li>'
    );
    return next;
  });
}

edit('src/tools/finance/mortgage-refinance/index.html', (html) => {
  let next = html;
  next = next.replace(/(<input[^>]+id="kkdfRate"[^>]+value=")15("[^>]*>)/, '$10$2');
  next = next.replace(/(<input[^>]+id="bsmvRate"[^>]+value=")5("[^>]*>)/, '$10$2');
  next = next.replace('"100% free and client-side"', '"Editable KKDF and BSMV assumptions"');
  next = next.replace('Yes. All calculations are performed entirely in your browser (100% client-side). No data is ever sent to our servers. Your financial information stays completely private on your device.', 'The loan figures you enter are used by the calculator in your browser. They are not submitted to NovaTools as part of the calculation. Site-level resources and consented analytics are separate from the calculator inputs.');
  next = next.replace('Refinancing makes sense when interest rates drop at least 0.5%–1% below your current rate, when you have good credit to qualify for the best rates, and when you plan to stay in your home long enough to reach the break-even point. This calculator helps you determine that threshold precisely.', 'There is no universal rate-drop threshold. Compare your entered rate, remaining term, new term, closing costs, and any applicable KKDF/BSMV assumptions, then verify the actual offer and tax treatment with the lender before deciding.');
  next = next.replace('Turkey mortgage refinance calculator with KKDF/BSMV, amortization table, and TRY estimates.', 'Mortgage refinance scenario calculator with editable KKDF/BSMV assumptions, amortization table, and TRY estimates.');
  next = next.replace(/Free Turkish mortgage calculator with KKDF and BSMV tax calculations\. Calculate monthly payments and total interest\./g, 'Compare refinance scenarios with editable KKDF/BSMV assumptions, monthly payments, break-even time and amortization.');
  return next;
});

edit('src/tools/finance/compound-interest/index.html', (html) => html.replace(
  '<li>This is a mathematical projection, not financial advice — for an actual savings or investment decision, factor in fees, taxes, and your own risk tolerance</li></ul>',
  '<li>This is a mathematical projection, not financial advice — for an actual savings or investment decision, factor in fees, taxes, and your own risk tolerance</li><li>The input is labelled as a monthly contribution. For non-monthly compounding choices, the implementation aggregates the same annual contribution amount into each compounding interval, so contribution timing is an approximation.</li></ul>'
));

edit('src/tools/finance/crypto-prices/index.html', (html) => {
  let next = html;
  next = next.replaceAll('market cap, hacim ve grafikle izleyin', 'market cap ve hacimle izleyin');
  next = next.replace(
    '<li>This is market data, not investment advice — it doesn\'t account for your personal financial situation or risk tolerance</li></ul>',
    '<li>This is market data, not investment advice — it doesn\'t account for your personal financial situation or risk tolerance</li><li>Successful responses use CoinGecko simple-price data for both USD and TRY. NovaTools caches a snapshot for 5 minutes. If no usable provider response is available, the interface explicitly labels static example fallback values instead of presenting them as current market data.</li></ul>'
  );
  return next;
});

edit('src/tools/finance/stock-lookup/index.html', (html) => {
  let next = html;
  next = next.replaceAll('fiyat, değişim, hacim, favoriler ve mobil uyumlu sparkline grafiği gösterir.', 'fiyat, değişim ve hacim gösterir; sağlayıcı kapanış serisi mevcutsa kısa bir kapanış grafiği de gösterir.');
  next = next.replaceAll('fiyat, değişim, hacim, favoriler ve mini sparkline grafiği alın.', 'fiyat, değişim ve hacim alın; sağlayıcı kapanış serisi mevcutsa kısa bir kapanış grafiği görün.');
  next = next.replace(
    '<li>For an actual trade, confirm the live price on your brokerage platform at the moment of the transaction</li></ul>',
    '<li>For an actual trade, confirm the live price on your brokerage platform at the moment of the transaction</li><li>Successful lookups use Yahoo Finance data through NovaTools live-data and a 15-minute browser cache. If the provider is unavailable for one of the small built-in example symbols, the UI labels the static fallback and omits a history chart rather than fabricating one.</li></ul>'
  );
  return next;
});

console.log(`finance certification migration: ${changed} file(s) ${WRITE ? 'updated' : 'would change'}`);
if (!WRITE && changed) process.exitCode = 1;
