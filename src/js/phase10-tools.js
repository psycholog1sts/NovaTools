import { getExchangeRates } from './api/exchange.js';
import { getCryptoPrices } from './api/crypto.js';
import { getWeather } from './api/weather.js';
import { getStockQuote } from './api/stocks.js';

const $ = (selector) => document.querySelector(selector);
function words(input) {
  return (input.toLowerCase().match(/[\p{L}\p{N}']+/gu) || []).filter(Boolean);
}

function sentences(input) {
  return input.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean);
}

function syllables(word) {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!cleaned) return 1;
  const groups = cleaned.match(/[aeiouy]+/g) || [];
  const silentE = cleaned.endsWith('e') && groups.length > 1 ? 1 : 0;
  return Math.max(1, groups.length - silentE);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
}

function setStatus(message, type = 'info') {
  const status = $('#toolStatus');
  if (!status) return;
  status.textContent = message;
  status.dataset.type = type;
}

function topKeywords(input, limit = 8) {
  const stop = new Set(['the', 'and', 'for', 'you', 'that', 'with', 'this', 'from', 'are', 'but', 'not', 'your', 'bir', 've', 'ile', 'için', 'bu', 'çok', 'olan']);
  const counts = new Map();
  words(input).filter((word) => word.length > 2 && !stop.has(word)).forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function summarize(input) {
  const sourceSentences = sentences(input);
  const keywords = new Map(topKeywords(input, 30));
  return sourceSentences
    .map((sentence, index) => {
      const score = words(sentence).reduce((sum, word) => sum + (keywords.get(word) || 0), 0) + (index < 2 ? 2 : 0);
      return { sentence, score, index };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(4, Math.max(1, Math.ceil(sourceSentences.length * 0.3))))
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence)
    .join('. ');
}

function renderStats(input) {
  const wordList = words(input);
  const sentenceList = sentences(input);
  const characters = input.length;
  const syllableCount = wordList.reduce((sum, word) => sum + syllables(word), 0);
  const readingEase = wordList.length && sentenceList.length
    ? 206.835 - 1.015 * (wordList.length / sentenceList.length) - 84.6 * (syllableCount / wordList.length)
    : 0;
  const positive = ['good', 'great', 'excellent', 'happy', 'success', 'safe', 'love', 'iyi', 'harika', 'başarılı'];
  const negative = ['bad', 'poor', 'risk', 'error', 'fail', 'sad', 'hate', 'kötü', 'hata', 'risk'];
  const pos = wordList.filter((word) => positive.includes(word)).length;
  const neg = wordList.filter((word) => negative.includes(word)).length;
  const sentiment = pos === neg ? 'Neutral' : pos > neg ? 'Positive' : 'Negative';
  return { wordCount: wordList.length, sentenceCount: sentenceList.length, characters, readingEase, sentiment, keywords: topKeywords(input) };
}

function initTextSummarizer() {
  $('#runTool')?.addEventListener('click', () => {
    const input = $('#mainInput').value.trim();
    if (!input) return setStatus('Paste text first.', 'error');
    const result = summarize(input);
    $('#result').innerHTML = `<h3>Summary</h3><p>${escapeHtml(result || input)}</p>`;
    setStatus('Summary generated locally in your browser.', 'success');
  });
}

function initTextAnalysis() {
  $('#mainInput')?.addEventListener('input', () => {
    const stats = renderStats($('#mainInput').value);
    $('#result').innerHTML = `<div class="metric-grid">
      <div><strong>${stats.wordCount}</strong><span>Words</span></div>
      <div><strong>${stats.characters}</strong><span>Characters</span></div>
      <div><strong>${stats.sentenceCount}</strong><span>Sentences</span></div>
      <div><strong>${stats.readingEase.toFixed(1)}</strong><span>Flesch ease</span></div>
      <div><strong>${stats.sentiment}</strong><span>Keyword sentiment</span></div>
    </div><h3>Keyword density</h3><p>${stats.keywords.map(([word, count]) => `${escapeHtml(word)} (${count})`).join(', ') || 'No keywords yet.'}</p>`;
  });
  $('#mainInput')?.dispatchEvent(new Event('input'));
}

function initTranslator() {
  const dictionary = new Map([
    ['hello', 'merhaba'], ['world', 'dünya'], ['good morning', 'günaydın'], ['thank you', 'teşekkürler'], ['please', 'lütfen'],
    ['merhaba', 'hello'], ['dünya', 'world'], ['günaydın', 'good morning'], ['teşekkürler', 'thank you'], ['lütfen', 'please']
  ]);
  $('#runTool')?.addEventListener('click', () => {
    const input = $('#mainInput').value.trim().toLowerCase();
    if (!input) return setStatus('Enter a short phrase first.', 'error');
    const translated = dictionary.get(input) || input.split(/\s+/).map((part) => dictionary.get(part) || `[${part}]`).join(' ');
    $('#result').innerHTML = `<h3>Simple dictionary result</h3><p>${escapeHtml(translated)}</p><small>For production-grade translation, connect LibreTranslate through the same server-side proxy pattern documented for Phase 10.</small>`;
    setStatus('Dictionary translation completed locally.', 'success');
  });
}

function readExifLite(buffer) {
  const view = new DataView(buffer);
  if (view.getUint16(0) !== 0xffd8) return 'No JPEG EXIF header detected.';
  let offset = 2;
  while (offset < view.byteLength) {
    const marker = view.getUint16(offset);
    const size = view.getUint16(offset + 2);
    if (marker === 0xffe1) return `JPEG EXIF segment detected (${size} bytes). For privacy, remove location metadata before sharing images.`;
    offset += 2 + size;
  }
  return 'JPEG loaded, but no EXIF segment was found.';
}

function initExifViewer() {
  $('#fileInput')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    $('#result').innerHTML = `<h3>${escapeHtml(file.name)}</h3><p>Type: ${escapeHtml(file.type || 'unknown')}</p><p>Size: ${(file.size / 1024).toFixed(1)} KB</p><p>${escapeHtml(readExifLite(buffer))}</p>`;
    setStatus('Image metadata inspected locally.', 'success');
  });
}

function initAudioSpectrum() {
  let audioContext;
  $('#fileInput')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    audioContext = audioContext || new AudioContext();
    const buffer = await audioContext.decodeAudioData(await file.arrayBuffer());
    const channel = buffer.getChannelData(0);
    const buckets = Array.from({ length: 48 }, (_, i) => {
      const start = Math.floor((i / 48) * channel.length);
      const end = Math.floor(((i + 1) / 48) * channel.length);
      let peak = 0;
      for (let index = start; index < end; index += 1) peak = Math.max(peak, Math.abs(channel[index]));
      return peak;
    });
    $('#result').innerHTML = `<h3>Waveform preview</h3><div class="bars">${buckets.map((value) => `<span style="height:${Math.max(4, value * 120)}px"></span>`).join('')}</div><p>Duration: ${buffer.duration.toFixed(2)} seconds · Sample rate: ${buffer.sampleRate} Hz</p>`;
    setStatus('Audio preview generated locally.', 'success');
  });
}

async function runLive(loader, renderer) {
  try {
    setStatus('Loading live data…');
    const response = await loader();
    renderer(response.data, response);
    setStatus(response.stale ? 'Showing cached fallback because live data is unavailable.' : `Updated from ${response.data.provider}.`, response.stale ? 'warning' : 'success');
  } catch (error) {
    setStatus(error.message || 'Live data is temporarily unavailable.', 'error');
  }
}

function initExchange() {
  $('#runTool')?.addEventListener('click', () => runLive(
    () => getExchangeRates($('#baseInput').value || 'USD'),
    (data) => {
      const amount = Number($('#amountInput').value || 1);
      const target = ($('#targetInput').value || 'EUR').toUpperCase();
      const rate = data.rates[target];
      $('#result').innerHTML = rate ? `<h3>${amount} ${data.base} = ${(amount * rate).toFixed(4)} ${target}</h3><p>Rate date: ${data.date}</p>` : '<p>Target currency not available.</p>';
    }
  ));
}

function initCrypto() {
  $('#runTool')?.addEventListener('click', () => runLive(
    () => getCryptoPrices(),
    (data) => {
      $('#result').innerHTML = `<div class="metric-grid">${Object.entries(data.coins).map(([id, coin]) => `<div><strong>$${Number(coin.usd).toLocaleString()}</strong><span>${id} · ${Number(coin.usd_24h_change || 0).toFixed(2)}%</span></div>`).join('')}</div>`;
    }
  ));
}

function initWeather() {
  $('#runTool')?.addEventListener('click', () => runLive(
    () => getWeather($('#cityInput').value || 'Istanbul'),
    (data) => {
      $('#result').innerHTML = `<h3>${escapeHtml(data.place.name)}, ${escapeHtml(data.place.country || '')}</h3><p>${data.current.temperature_2m} ${data.units.temperature_2m}, humidity ${data.current.relative_humidity_2m}${data.units.relative_humidity_2m}, wind ${data.current.wind_speed_10m} ${data.units.wind_speed_10m}</p>`;
    }
  ));
}

function initStocks() {
  $('#runTool')?.addEventListener('click', () => runLive(
    () => getStockQuote($('#symbolInput').value || 'AAPL'),
    (data) => {
      const price = data.meta.regularMarketPrice || data.lastClose;
      $('#result').innerHTML = `<h3>${escapeHtml(data.symbol)}: ${price ? Number(price).toFixed(2) : 'N/A'} ${escapeHtml(data.currency || '')}</h3><p>Exchange: ${escapeHtml(data.meta.exchangeName || 'Unknown')} · Previous close: ${data.meta.previousClose || 'N/A'}</p>`;
    }
  ));
}

function parseDelimited(input) {
  const lines = input.trim().split(/\r?\n/).filter(Boolean);
  const delimiter = lines[0]?.includes('\t') ? '\t' : ',';
  return lines.map((line) => line.split(delimiter).map((cell) => cell.trim()));
}

function initCsvJsonSummarizer() {
  $('#runTool')?.addEventListener('click', () => {
    const input = $('#mainInput').value.trim();
    if (!input) return setStatus('Paste CSV or JSON first.', 'error');
    try {
      let rows;
      if (input.startsWith('{') || input.startsWith('[')) {
        const parsed = JSON.parse(input);
        rows = Array.isArray(parsed) ? parsed : [parsed];
        const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
        $('#result').innerHTML = `<h3>JSON summary</h3><p>${rows.length} records · ${keys.length} fields</p><p>${keys.map(escapeHtml).join(', ')}</p>`;
      } else {
        rows = parseDelimited(input);
        const header = rows[0] || [];
        $('#result').innerHTML = `<h3>CSV summary</h3><p>${Math.max(0, rows.length - 1)} rows · ${header.length} columns</p><p>${header.map(escapeHtml).join(', ')}</p>`;
      }
      setStatus('Data summarized locally.', 'success');
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });
}

function initChartBuilder() {
  $('#runTool')?.addEventListener('click', () => {
    const rows = parseDelimited($('#mainInput').value).map(([label, value]) => [label, Number(value)]).filter(([, value]) => Number.isFinite(value));
    const max = Math.max(...rows.map(([, value]) => value), 1);
    $('#result').innerHTML = `<h3>Bar chart</h3><div class="chart-bars">${rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong style="width:${(value / max) * 100}%">${value}</strong></div>`).join('')}</div>`;
    setStatus('Chart rendered locally.', 'success');
  });
}

const initializers = {
  'text-summarizer': initTextSummarizer,
  'text-analysis': initTextAnalysis,
  'simple-translator': initTranslator,
  'exif-viewer': initExifViewer,
  'audio-spectrum': initAudioSpectrum,
  'live-exchange': initExchange,
  'crypto-prices': initCrypto,
  'weather-lookup': initWeather,
  'stock-lookup': initStocks,
  'csv-json-summarizer': initCsvJsonSummarizer,
  'chart-builder': initChartBuilder
};

const tool = document.body.dataset.tool;
initializers[tool]?.();
