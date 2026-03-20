/**
 * Autonomous Legal Consciousness
 * Regulatory monitoring and self-healing compliance
 * Monitors government feeds and auto-updates tools
 */

// Regulatory sources by jurisdiction
const REGULATORY_SOURCES = {
  TR: {
    name: 'Türkiye',
    currency: 'TRY',
    feeds: [
      {
        id: 'gib-kkdf',
        name: 'KKDF/BSMV Updates',
        url: 'https://www.gib.gov.tr/feed/duyurular',
        type: 'rss',
        parser: 'trTaxParser',
        tools: ['finance/mortgage-tr', 'finance/kkdf-bsmv']
      },
      {
        id: 'tcmb-rates',
        name: 'Central Bank Rates',
        url: 'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Temel+Faaliyetler/Para+Politikas%C4%B1/Merkez+Bankas%C4%B1+Faiz+Oranlar%C4%B1/',
        type: 'html',
        parser: 'tcmbRateParser',
        tools: ['finance/mortgage-tr']
      },
      {
        id: 'resmi-gazete',
        name: 'Resmi Gazete',
        url: 'https://www.resmigazete.gov.tr/feed/ilanlar',
        type: 'rss',
        parser: 'resmiGazeteParser',
        tools: ['*']
      }
    ],
    keywords: ['KKDF', 'BSMV', 'faiz oranı', 'konut kredisi', 'vergi', 'resmi gazete']
  },
  US: {
    name: 'United States',
    currency: 'USD',
    feeds: [
      {
        id: 'federal-register',
        name: 'Federal Register',
        url: 'https://www.federalregister.gov/api/v1/documents.json?conditions[type][]=RULE',
        type: 'json',
        parser: 'federalRegisterParser',
        tools: ['finance/mortgage', 'finance/tax-us']
      },
      {
        id: 'irs-updates',
        name: 'IRS Updates',
        url: 'https://www.irs.gov/newsroom/rss',
        type: 'rss',
        parser: 'irsParser',
        tools: ['finance/tax-us']
      },
      {
        id: 'fed-rates',
        name: 'Federal Reserve Rates',
        url: 'https://www.federalreserve.gov/feeds/press_all.xml',
        type: 'rss',
        parser: 'fedRateParser',
        tools: ['finance/mortgage', 'finance/retirement']
      }
    ],
    keywords: ['interest rate', 'tax', 'mortgage', 'federal reserve', 'IRS']
  },
  EU: {
    name: 'European Union',
    currency: 'EUR',
    feeds: [
      {
        id: 'eur-lex',
        name: 'EUR-Lex',
        url: 'https://eur-lex.europa.eu/eu-feeds.html',
        type: 'rss',
        parser: 'eurLexParser',
        tools: ['*']
      },
      {
        id: 'ecb-rates',
        name: 'ECB Interest Rates',
        url: 'https://www.ecb.europa.eu/rss/press.html',
        type: 'rss',
        parser: 'ecbRateParser',
        tools: ['finance/mortgage']
      }
    ],
    keywords: ['GDPR', 'interest rate', 'ECB', 'regulation']
  }
};

// Tax calculation formulas by jurisdiction
const TAX_FORMULAS = {
  TR: {
    mortgage: {
      baseRate: 0.015, // Base monthly interest
      kkdfRate: 0.15,  // KKDF (Resource Utilization Support Fund)
      bsmvRate: 0.05,  // BSMV (Banking and Insurance Transaction Tax)
      calculate: (principal, annualRate, months, rates) => {
        const monthlyRate = annualRate / 12;
        const kkdf = monthlyRate * rates.kkdf;
        const bsmv = monthlyRate * rates.bsmv;
        const totalRate = monthlyRate + kkdf + bsmv;
        
        const payment = principal * 
          (totalRate * Math.pow(1 + totalRate, months)) / 
          (Math.pow(1 + totalRate, months) - 1);
        
        return {
          monthlyPayment: payment,
          totalPayment: payment * months,
          totalInterest: (payment * months) - principal,
          kkdfAmount: principal * kkdf * months,
          bsmvAmount: principal * bsmv * months
        };
      }
    }
  },
  US: {
    mortgage: {
      calculate: (principal, annualRate, months, propertyTax = 0, insurance = 0) => {
        const monthlyRate = annualRate / 12;
        const principalInterest = principal * 
          (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
          (Math.pow(1 + monthlyRate, months) - 1);
        
        return {
          monthlyPayment: principalInterest + propertyTax + insurance,
          principalInterest,
          propertyTax,
          insurance,
          totalPayment: (principalInterest + propertyTax + insurance) * months
        };
      }
    }
  }
};

export class RegulatoryMonitor {
  constructor() {
    this.sources = REGULATORY_SOURCES;
    this.lastCheck = new Map();
    this.detectedChanges = [];
    this.listeners = new Map();
    this.formulaCache = new Map();
  }

  /**
   * Initialize monitoring
   */
  async init() {
    // Schedule periodic checks
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      
      // Register for periodic sync if available
      if ('periodicSync' in registration) {
        try {
          await registration.periodicSync.register('regulatory-check', {
            minInterval: 24 * 60 * 60 * 1000 // Daily
          });
        } catch (e) {
          console.warn('[Legal] Periodic sync not available:', e);
        }
      }
    }

    // Load cached formulas
    await this.loadFormulaCache();
  }

  /**
   * Check all regulatory sources
   */
  async checkAll() {
    const results = [];
    
    for (const [jurisdiction, config] of Object.entries(this.sources)) {
      for (const feed of config.feeds) {
        try {
          const changes = await this.checkFeed(jurisdiction, feed);
          if (changes.length > 0) {
            results.push(...changes);
          }
        } catch (error) {
          console.error(`[Legal] Failed to check ${feed.id}:`, error);
        }
      }
    }

    if (results.length > 0) {
      await this.processChanges(results);
    }

    return results;
  }

  /**
   * Check individual feed
   */
  async checkFeed(jurisdiction, feed) {
    const lastCheck = this.lastCheck.get(feed.id) || 0;
    const changes = [];

    try {
      const response = await fetch(feed.url, {
        headers: {
          'Accept': 'application/rss+xml, application/json, text/html',
          'If-Modified-Since': new Date(lastCheck).toUTCString()
        }
      });

      if (response.status === 304) {
        return changes; // No changes
      }

      const content = await response.text();
      const parsed = await this.parseContent(content, feed.type, feed.parser);

      for (const item of parsed) {
        if (new Date(item.date).getTime() > lastCheck) {
          // Check if relevant to our tools
          const relevance = this.calculateRelevance(item, jurisdiction);
          if (relevance.score > 0.5) {
            changes.push({
              ...item,
              jurisdiction,
              feed: feed.id,
              relevance,
              affectedTools: feed.tools
            });
          }
        }
      }

      this.lastCheck.set(feed.id, Date.now());
    } catch (error) {
      console.warn(`[Legal] Feed check failed for ${feed.id}:`, error);
    }

    return changes;
  }

  /**
   * Parse different content types
   */
  async parseContent(content, type, parser) {
    switch (type) {
      case 'rss':
        return this.parseRSS(content);
      case 'json':
        return JSON.parse(content).results || [];
      case 'html':
        return this.parseHTML(content, parser);
      default:
        return [];
    }
  }

  parseRSS(xml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const items = doc.querySelectorAll('item');
    
    return Array.from(items).map(item => ({
      title: item.querySelector('title')?.textContent || '',
      description: item.querySelector('description')?.textContent || '',
      date: item.querySelector('pubDate')?.textContent || new Date().toISOString(),
      link: item.querySelector('link')?.textContent || ''
    }));
  }

  parseHTML(html, parserType) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Use specific parser based on type
    switch (parserType) {
      case 'tcmbRateParser':
        return this.parseTCMBRates(doc);
      default:
        return [];
    }
  }

  parseTCMBRates(doc) {
    // Extract rates from TCMB HTML
    const rates = [];
    const rows = doc.querySelectorAll('table.data-table tr');
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const rateName = cells[0].textContent.trim();
        const rateValue = cells[1].textContent.trim();
        
        if (rateName && rateValue) {
          rates.push({
            title: `TCMB ${rateName}`,
            description: `New rate: ${rateValue}`,
            date: new Date().toISOString(),
            type: 'interest-rate',
            value: parseFloat(rateValue.replace(',', '.'))
          });
        }
      }
    });
    
    return rates;
  }

  /**
   * Calculate relevance score for regulatory item
   */
  calculateRelevance(item, jurisdiction) {
    const keywords = this.sources[jurisdiction].keywords;
    const text = `${item.title} ${item.description}`.toLowerCase();
    
    let matches = 0;
    const matchedKeywords = [];
    
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        matches++;
        matchedKeywords.push(keyword);
      }
    }
    
    const score = Math.min(matches / 3, 1); // Max score with 3+ matches
    
    return { score, keywords: matchedKeywords };
  }

  /**
   * Process detected changes
   */
  async processChanges(changes) {
    for (const change of changes) {
      this.detectedChanges.push(change);
      
      // Emit event
      this.emit('change-detected', change);
      
      // Auto-heal if possible
      if (change.type === 'interest-rate' || change.type === 'tax-rate') {
        await this.autoHealFormulas(change);
      }
      
      // Update disclaimers
      await this.updateDisclaimers(change);
    }

    // Save changes to OPFS
    await this.persistChanges();
  }

  /**
   * Auto-heal calculation formulas
   */
  async autoHealFormulas(change) {
    const { jurisdiction, type, value, affectedTools } = change;
    
    // Update formula cache
    if (type === 'interest-rate') {
      this.formulaCache.set(`${jurisdiction}.baseRate`, value);
    } else if (type === 'tax-rate' && change.taxType) {
      this.formulaCache.set(`${jurisdiction}.${change.taxType}`, value);
    }

    // Save updated formulas
    await this.saveFormulaCache();

    // Notify affected tools
    for (const tool of affectedTools) {
      this.emit('formula-update', {
        tool,
        jurisdiction,
        changes: this.formulaCache
      });
    }

    // Trigger tool regeneration if needed
    if (change.requiresToolUpdate) {
      await this.regenerateTool(change);
    }
  }

  /**
   * Update legal disclaimers
   */
  async updateDisclaimers(change) {
    const template = this.generateDisclaimerTemplate(change);
    
    // Store updated disclaimer
    const root = await navigator.storage.getDirectory();
    const disclaimersDir = await root.getDirectoryHandle('legal-disclaimers', { create: true });
    const fileHandle = await disclaimersDir.getFileHandle(`${change.jurisdiction}.json`, { create: true });
    
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify({
      ...change,
      disclaimer: template,
      updatedAt: Date.now()
    }, null, 2));
    await writable.close();

    this.emit('disclaimer-updated', { jurisdiction: change.jurisdiction, template });
  }

  /**
   * Generate disclaimer text using templates
   */
  generateDisclaimerTemplate(change) {
    const templates = {
      TR: {
        mortgage: `Hesaplama ${new Date().toLocaleDateString('tr-TR')} tarihli verilere göre yapılmaktadır. 
KKDF oranı %${(this.formulaCache.get('TR.kkdfRate') || 15) * 100}, 
BSMV oranı %${(this.formulaCache.get('TR.bsmvRate') || 5) * 100} olarak uygulanmaktadır.
Merkez Bankası politika faizi: %${this.formulaCache.get('TR.baseRate') || 15}.
Bu hesaplama tahmini değerler sunar, kesin sonuçlar için bankanıza danışınız.`,
        default: `Bu hesaplama ${new Date().toLocaleDateString('tr-TR')} tarihli mevzuata göre yapılmaktadır. 
Hesaplanan değerler tahmini olup, resmi kurumların ilan ettiği güncel oranları yansıtmaktadır.`
      },
      US: {
        mortgage: `Calculations based on rates as of ${new Date().toLocaleDateString('en-US')}.
Federal Reserve rates are subject to change.
This calculator provides estimates only; consult your lender for exact figures.`,
        tax: `Tax calculations based on current IRS regulations as of ${new Date().toLocaleDateString('en-US')}.
Tax laws are subject to change; consult a tax professional for advice.`,
        default: `This calculation is based on regulations as of ${new Date().toLocaleDateString('en-US')}.
Calculated values are estimates and reflect official rates published by relevant authorities.`
      },
      EU: {
        default: `Calculation based on EU regulations as of ${new Date().toLocaleDateString()}.
Subject to GDPR Article 22 considerations for automated decision-making.`
      }
    };

    const jurisdictionTemplates = templates[change.jurisdiction] || templates.US;
    return jurisdictionTemplates[change.toolType] || jurisdictionTemplates.default;
  }

  /**
   * Regenerate tool with updated formulas
   */
  async regenerateTool(change) {
    // This would integrate with GTS to regenerate the tool

    this.emit('regenerate-tool', change);
  }

  /**
   * Get current formula cache
   */
  getFormulaCache(jurisdiction = null) {
    if (jurisdiction) {
      const formulas = {};
      for (const [key, value] of this.formulaCache) {
        if (key.startsWith(jurisdiction)) {
          formulas[key] = value;
        }
      }
      return formulas;
    }
    return Object.fromEntries(this.formulaCache);
  }

  /**
   * Load formula cache from storage
   */
  async loadFormulaCache() {
    try {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle('formula-cache.json');
      const file = await fileHandle.getFile();
      const data = JSON.parse(await file.text());
      
      this.formulaCache = new Map(Object.entries(data));
    } catch (e) {
      // Initialize with defaults
      this.formulaCache = new Map([
        ['TR.kkdfRate', 0.15],
        ['TR.bsmvRate', 0.05],
        ['TR.baseRate', 0.015]
      ]);
    }
  }

  /**
   * Save formula cache to storage
   */
  async saveFormulaCache() {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle('formula-cache.json', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(Object.fromEntries(this.formulaCache)));
    await writable.close();
  }

  /**
   * Persist detected changes
   */
  async persistChanges() {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle('regulatory-changes.json', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(this.detectedChanges.slice(-100))); // Keep last 100
    await writable.close();
  }

  /**
   * Get change history
   */
  async getChangeHistory(jurisdiction = null, limit = 50) {
    let changes = this.detectedChanges;
    
    if (jurisdiction) {
      changes = changes.filter(c => c.jurisdiction === jurisdiction);
    }
    
    return changes.slice(-limit).reverse();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

// Auto-commit to GitHub functionality
export class LegalAutoCommit {
  constructor(githubToken) {
    this.token = githubToken;
    this.owner = 'your-org';
    this.repo = 'zero-tools-platform';
  }

  async createCommit(changes, message) {
    if (!this.token) {
      console.warn('[Legal] No GitHub token configured');
      return null;
    }

    try {
      // Get current branch reference
      const refResponse = await fetch(
        `https://api.github.com/repos/${this.owner}/${this.repo}/git/ref/heads/main`,
        { headers: { 'Authorization': `token ${this.token}` } }
      );
      const ref = await refResponse.json();
      const currentCommit = ref.object.sha;

      // Create blob for each changed file
      const blobs = await Promise.all(changes.map(async change => {
        const response = await fetch(
          `https://api.github.com/repos/${this.owner}/${this.repo}/git/blobs`,
          {
            method: 'POST',
            headers: {
              'Authorization': `token ${this.token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              content: btoa(unescape(encodeURIComponent(change.content))),
              encoding: 'base64'
            })
          }
        );
        const data = await response.json();
        return { path: change.path, sha: data.sha };
      }));

      // Create tree
      const treeResponse = await fetch(
        `https://api.github.com/repos/${this.owner}/${this.repo}/git/trees`,
        {
          method: 'POST',
          headers: {
            'Authorization': `token ${this.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            base_tree: currentCommit,
            tree: blobs.map(b => ({
              path: b.path,
              mode: '100644',
              type: 'blob',
              sha: b.sha
            }))
          })
        }
      );
      const tree = await treeResponse.json();

      // Create commit
      const commitResponse = await fetch(
        `https://api.github.com/repos/${this.owner}/${this.repo}/git/commits`,
        {
          method: 'POST',
          headers: {
            'Authorization': `token ${this.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `[Legal Auto-Update] ${message}`,
            tree: tree.sha,
            parents: [currentCommit]
          })
        }
      );
      const commit = await commitResponse.json();

      // Update reference
      await fetch(
        `https://api.github.com/repos/${this.owner}/${this.repo}/git/refs/heads/main`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `token ${this.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sha: commit.sha })
        }
      );


      return commit;
    } catch (error) {
      console.error('[Legal] Auto-commit failed:', error);
      return null;
    }
  }
}

// Singleton
let regulatoryMonitor = null;

export function getRegulatoryMonitor() {
  if (!regulatoryMonitor) regulatoryMonitor = new RegulatoryMonitor();
  return regulatoryMonitor;
}

export { REGULATORY_SOURCES, TAX_FORMULAS };
