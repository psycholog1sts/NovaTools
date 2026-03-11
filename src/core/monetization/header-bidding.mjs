/**
 * Header Bidding 2.0 - Privacy-First Auction
 * Client-side auction without third-party cookies
 * Uses contextual targeting and first-party data only
 */

// Ad Unit Configuration
const AD_UNITS = {
  'sidebar': {
    sizes: [[336, 280], [300, 250], [250, 250]],
    slot: '/1234567/sidebar',
    targeting: { category: 'productivity', position: 'sidebar' }
  },
  'mobile-anchor': {
    sizes: [[320, 50], [320, 100]],
    slot: '/1234567/mobile-anchor',
    targeting: { category: 'productivity', position: 'bottom' }
  },
  'content-inline': {
    sizes: [[728, 90], [468, 60], [320, 100]],
    slot: '/1234567/content',
    targeting: { category: 'productivity', position: 'inline' }
  },
  'native': {
    sizes: ['fluid'],
    slot: '/1234567/native',
    targeting: { category: 'productivity', format: 'native' }
  }
};

// SSP (Supply Side Platform) Bidders - Privacy First
const BIDDERS = {
  // Contextual targeting only
  'contextual': {
    name: 'Contextual Exchange',
    endpoint: 'https://contextual-ads.example/bid',
    timeout: 500,
    currency: 'USD',
    bidCpmAdjustment: (cpm) => cpm // No adjustment
  },
  
  // First-party data targeting
  'firstparty': {
    name: 'First Party Exchange',
    endpoint: 'https://firstparty-ads.example/bid',
    timeout: 600,
    currency: 'USD',
    bidCpmAdjustment: (cpm) => cpm * 1.1 // 10% premium for quality
  },
  
  // Direct deals
  'direct': {
    name: 'Direct Deals',
    endpoint: null, // Inline
    timeout: 100,
    currency: 'USD',
    bidCpmAdjustment: (cpm) => cpm * 1.2 // 20% premium
  }
};

// Direct deals (guaranteed inventory)
const DIRECT_DEALS = [
  {
    id: 'deal-001',
    name: 'PDF Tools Sponsor',
    cpm: 5.00,
    targeting: { tool: ['pdf/*'] },
    sizes: [[336, 280]],
    creative: '<div>PDF Tools Premium Ad</div>' // Would be actual creative
  },
  {
    id: 'deal-002',
    name: 'Finance Calculator Sponsor',
    cpm: 8.00,
    targeting: { tool: ['finance/*'] },
    sizes: [[300, 250]],
    creative: '<div>Finance Tools Premium Ad</div>'
  }
];

export class HeaderBiddingAuction {
  constructor(options = {}) {
    this.options = {
      timeout: 1000,
      priceGranularity: 'high',
      enableSendAllBids: false,
      ...options
    };
    
    this.bids = new Map();
    this.winners = new Map();
    this.contextualData = null;
    this.floorPrices = new Map();
  }

  /**
   * Extract contextual data from page (privacy-safe)
   */
  async extractContextualData() {
    const url = window.location.pathname;
    const pathParts = url.split('/').filter(p => p);
    
    // Determine category from URL
    let category = 'general';
    let toolType = null;
    
    if (pathParts.includes('pdf')) {
      category = 'productivity';
      toolType = 'pdf';
    } else if (pathParts.includes('finance')) {
      category = 'finance';
      toolType = 'finance';
    } else if (pathParts.includes('image')) {
      category = 'creative';
      toolType = 'image';
    }

    // Get content signals (no personal data)
    const contentSignals = {
      wordCount: document.body.innerText.split(/\s+/).length,
      hasForm: !!document.querySelector('form'),
      hasFileInput: !!document.querySelector('input[type="file"]'),
      toolType,
      pageType: pathParts.includes('tools') ? 'tool' : 'landing'
    };

    this.contextualData = {
      url,
      category,
      keywords: this.extractKeywords(),
      signals: contentSignals,
      timestamp: Date.now()
    };

    return this.contextualData;
  }

  /**
   * Extract keywords from page content
   */
  extractKeywords() {
    const keywords = [];
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    
    if (metaKeywords) {
      keywords.push(...metaKeywords.content.split(',').map(k => k.trim()));
    }

    // Extract from headings
    const headings = document.querySelectorAll('h1, h2, h3');
    headings.forEach(h => {
      const words = h.innerText.toLowerCase().split(/\s+/);
      keywords.push(...words.filter(w => w.length > 4));
    });

    return [...new Set(keywords)].slice(0, 10);
  }

  /**
   * Set floor price for ad unit
   */
  setFloorPrice(adUnit, floorCpm) {
    this.floorPrices.set(adUnit, floorCpm);
  }

  /**
   * Run auction for all ad units
   */
  async runAuction(adUnits = Object.keys(AD_UNITS)) {
    // Extract contextual data
    await this.extractContextualData();

    // Set dynamic floor prices based on context
    this.setDynamicFloors();

    // Collect bids from all sources
    const bidPromises = [];

    // Get direct deal bids
    bidPromises.push(this.getDirectDeals(adUnits));

    // Get contextual bids
    bidPromises.push(this.requestBids('contextual', adUnits));

    // Get first-party bids
    bidPromises.push(this.requestBids('firstparty', adUnits));

    // Wait for bids with timeout
    const results = await Promise.allSettled(
      bidPromises.map(p => this.withTimeout(p, this.options.timeout))
    );

    // Process results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        this.processBids(result.value);
      }
    });

    // Select winners
    this.selectWinners(adUnits);

    // Render winning ads
    this.renderAds();

    return this.winners;
  }

  /**
   * Set dynamic floor prices based on context
   */
  setDynamicFloors() {
    const baseFloor = 0.50; // $0.50 CPM base
    
    // Increase floor for high-value contexts
    let multiplier = 1.0;
    
    if (this.contextualData.category === 'finance') {
      multiplier = 2.0; // Finance keywords = higher value
    } else if (this.contextualData.signals.hasFileInput) {
      multiplier = 1.5; // File upload pages = engaged users
    }

    Object.keys(AD_UNITS).forEach(unit => {
      this.floorPrices.set(unit, baseFloor * multiplier);
    });
  }

  /**
   * Get direct deal bids
   */
  async getDirectDeals(adUnits) {
    const bids = [];
    
    for (const deal of DIRECT_DEALS) {
      // Check targeting
      if (this.matchesTargeting(deal.targeting)) {
        for (const adUnit of adUnits) {
          const unitConfig = AD_UNITS[adUnit];
          
          // Check size match
          const sizeMatch = deal.sizes.some(size => 
            unitConfig.sizes.some(unitSize => 
              Array.isArray(unitSize) && 
              unitSize[0] === size[0] && 
              unitSize[1] === size[1]
            )
          );

          if (sizeMatch) {
            bids.push({
              bidder: 'direct',
              adUnit,
              cpm: deal.cpm,
              creative: deal.creative,
              dealId: deal.id,
              currency: 'USD',
              ttl: 3600
            });
          }
        }
      }
    }

    return bids;
  }

  /**
   * Check if current context matches targeting
   */
  matchesTargeting(targeting) {
    if (targeting.tool) {
      const currentTool = this.contextualData.signals.toolType;
      return targeting.tool.some(pattern => {
        if (pattern.includes('*')) {
          const prefix = pattern.replace('/*', '');
          return currentTool === prefix;
        }
        return currentTool === pattern;
      });
    }
    return true;
  }

  /**
   * Request bids from a bidder
   */
  async requestBids(bidderKey, adUnits) {
    const bidder = BIDDERS[bidderKey];
    if (!bidder || !bidder.endpoint) return [];

    // Build bid request
    const bidRequest = {
      id: `req-${Date.now()}`,
      imp: adUnits.map(unit => ({
        id: unit,
        banner: {
          format: AD_UNITS[unit].sizes.map(s => ({ w: s[0], h: s[1] }))
        },
        bidfloor: this.floorPrices.get(unit) || 0.50,
        bidfloorcur: 'USD'
      })),
      site: {
        page: window.location.href,
        cat: [this.contextualData.category],
        keywords: this.contextualData.keywords.join(',')
      },
      device: {
        ua: navigator.userAgent,
        language: navigator.language
      },
      tmax: bidder.timeout
    };

    try {
      // In real implementation, this would make actual HTTP requests
      // For demo, simulate bid responses
      return this.simulateBidResponse(bidderKey, adUnits);
    } catch (error) {
      console.warn(`Bid request failed for ${bidderKey}:`, error);
      return [];
    }
  }

  /**
   * Simulate bid responses (replace with actual API calls)
   */
  simulateBidResponse(bidderKey, adUnits) {
    const bids = [];
    
    // Simulate 30% fill rate
    for (const adUnit of adUnits) {
      if (Math.random() > 0.7) {
        const floor = this.floorPrices.get(adUnit) || 0.50;
        const cpm = floor + Math.random() * 3; // $0.50-$3.50 above floor
        
        bids.push({
          bidder: bidderKey,
          adUnit,
          cpm: parseFloat(cpm.toFixed(2)),
          creative: `<div>Bid from ${bidderKey}</div>`,
          currency: 'USD',
          ttl: 300
        });
      }
    }

    return bids;
  }

  /**
   * Add timeout to promise
   */
  withTimeout(promise, timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ]);
  }

  /**
   * Process incoming bids
   */
  processBids(bids) {
    for (const bid of bids) {
      if (!this.bids.has(bid.adUnit)) {
        this.bids.set(bid.adUnit, []);
      }
      
      // Apply bid CPM adjustment
      const bidder = BIDDERS[bid.bidder];
      if (bidder && bidder.bidCpmAdjustment) {
        bid.adjustedCpm = bidder.bidCpmAdjustment(bid.cpm);
      } else {
        bid.adjustedCpm = bid.cpm;
      }

      this.bids.get(bid.adUnit).push(bid);
    }
  }

  /**
   * Select winning bid for each ad unit
   */
  selectWinners(adUnits) {
    for (const adUnit of adUnits) {
      const bids = this.bids.get(adUnit) || [];
      const floor = this.floorPrices.get(adUnit) || 0.50;

      // Filter by floor price
      const validBids = bids.filter(b => b.adjustedCpm >= floor);

      if (validBids.length === 0) {
        this.winners.set(adUnit, null);
        continue;
      }

      // Sort by adjusted CPM
      validBids.sort((a, b) => b.adjustedCpm - a.adjustedCpm);

      // Winner takes all
      const winner = validBids[0];
      
      // Calculate second price if applicable
      if (validBids.length > 1) {
        winner.clearingPrice = validBids[1].adjustedCpm + 0.01;
      } else {
        winner.clearingPrice = floor;
      }

      this.winners.set(adUnit, winner);
    }
  }

  /**
   * Render winning ads
   */
  renderAds() {
    for (const [adUnit, winner] of this.winners) {
      const container = document.getElementById(`ad-${adUnit}`);
      if (!container) continue;

      if (winner) {
        // Render winning creative
        container.innerHTML = winner.creative;
        container.setAttribute('data-winning-bidder', winner.bidder);
        container.setAttribute('data-cpm', winner.cpm);

        // Report impression
        this.reportImpression(adUnit, winner);
      } else {
        // Render house ad or collapse
        this.renderHouseAd(container, adUnit);
      }
    }
  }

  /**
   * Render house ad when no bids
   */
  renderHouseAd(container, adUnit) {
    const houseAds = {
      'sidebar': '<div class="house-ad">Try our Pro Tools</div>',
      'mobile-anchor': '<div class="house-ad">Upgrade Now</div>',
      'native': '<div class="house-ad">Explore More Tools</div>'
    };

    container.innerHTML = houseAds[adUnit] || '';
    container.classList.add('house-ad-container');
  }

  /**
   * Report impression for analytics
   */
  reportImpression(adUnit, winner) {
    // Privacy-safe reporting (no user identifiers)
    const impression = {
      adUnit,
      bidder: winner.bidder,
      cpm: winner.cpm,
      clearingPrice: winner.clearingPrice,
      category: this.contextualData.category,
      timestamp: Date.now(),
      // Hashed session ID (not personally identifiable)
      session: btoa(Date.now().toString()).slice(0, 8)
    };

    // Send to analytics (batched)
    this.queueAnalytics('impression', impression);
  }

  /**
   * Queue analytics event
   */
  queueAnalytics(event, data) {
    // Store in session storage for batching
    const queue = JSON.parse(sessionStorage.getItem('ad-analytics') || '[]');
    queue.push({ event, data, time: Date.now() });
    sessionStorage.setItem('ad-analytics', JSON.stringify(queue.slice(-100)));

    // Flush if queue is large
    if (queue.length >= 10) {
      this.flushAnalytics();
    }
  }

  /**
   * Flush analytics queue
   */
  async flushAnalytics() {
    const queue = JSON.parse(sessionStorage.getItem('ad-analytics') || '[]');
    if (queue.length === 0) return;

    // Send to analytics endpoint
    try {
      await fetch('/api/analytics/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: queue }),
        keepalive: true
      });
      
      sessionStorage.removeItem('ad-analytics');
    } catch (error) {
      console.warn('Analytics flush failed:', error);
    }
  }
}

// Ad Refresh Manager
export class AdRefreshManager {
  constructor(auction) {
    this.auction = auction;
    this.refreshTimers = new Map();
    this.minRefreshInterval = 30000; // 30 seconds minimum
    this.viewabilityThreshold = 0.5;
  }

  /**
   * Start auto-refresh for ad unit
   */
  startRefresh(adUnit, interval = 60000) {
    if (this.refreshTimers.has(adUnit)) {
      clearInterval(this.refreshTimers.get(adUnit));
    }

    const timer = setInterval(async () => {
      // Check viewability before refreshing
      const container = document.getElementById(`ad-${adUnit}`);
      if (container && this.isViewable(container)) {
        await this.auction.runAuction([adUnit]);
      }
    }, Math.max(interval, this.minRefreshInterval));

    this.refreshTimers.set(adUnit, timer);
  }

  /**
   * Check if ad is viewable
   */
  isViewable(element) {
    const rect = element.getBoundingClientRect();
    const viewHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewWidth = window.innerWidth || document.documentElement.clientWidth;

    const visibleHeight = Math.min(rect.bottom, viewHeight) - Math.max(rect.top, 0);
    const visibleWidth = Math.min(rect.right, viewWidth) - Math.max(rect.left, 0);

    const visibleArea = Math.max(0, visibleHeight) * Math.max(0, visibleWidth);
    const elementArea = rect.width * rect.height;

    return (visibleArea / elementArea) >= this.viewabilityThreshold;
  }

  /**
   * Stop refresh for ad unit
   */
  stopRefresh(adUnit) {
    if (this.refreshTimers.has(adUnit)) {
      clearInterval(this.refreshTimers.get(adUnit));
      this.refreshTimers.delete(adUnit);
    }
  }

  /**
   * Stop all refreshes
   */
  stopAll() {
    for (const [adUnit, timer] of this.refreshTimers) {
      clearInterval(timer);
    }
    this.refreshTimers.clear();
  }
}

// Lazy load ads (Intersection Observer)
export class LazyAdLoader {
  constructor(auction) {
    this.auction = auction;
    this.observer = null;
    this.pendingUnits = new Set();
  }

  /**
   * Initialize lazy loading
   */
  init() {
    if (!('IntersectionObserver' in window)) {
      // Fallback: load all immediately
      this.auction.runAuction();
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      {
        rootMargin: '100px', // Start loading 100px before visible
        threshold: 0
      }
    );

    // Observe all ad slots
    document.querySelectorAll('[data-ad-slot]').forEach(el => {
      this.observer.observe(el);
      this.pendingUnits.add(el.dataset.adSlot);
    });
  }

  handleIntersection(entries) {
    const unitsToLoad = [];

    for (const entry of entries) {
      if (entry.isIntersecting) {
        const adUnit = entry.target.dataset.adSlot;
        unitsToLoad.push(adUnit);
        this.observer.unobserve(entry.target);
        this.pendingUnits.delete(adUnit);
      }
    }

    if (unitsToLoad.length > 0) {
      this.auction.runAuction(unitsToLoad);
    }
  }
}

// Singleton instances
let auction = null;
let refreshManager = null;
let lazyLoader = null;

export function getHeaderBiddingAuction() {
  if (!auction) auction = new HeaderBiddingAuction();
  return auction;
}

export function getAdRefreshManager() {
  if (!refreshManager) refreshManager = new AdRefreshManager(getHeaderBiddingAuction());
  return refreshManager;
}

export function getLazyAdLoader() {
  if (!lazyLoader) lazyLoader = new LazyAdLoader(getHeaderBiddingAuction());
  return lazyLoader;
}

// Utility exports
export async function runAdAuction(adUnits) {
  return getHeaderBiddingAuction().runAuction(adUnits);
}

export function startAdRefresh(adUnit, interval) {
  return getAdRefreshManager().startRefresh(adUnit, interval);
}

export function initLazyAds() {
  return getLazyAdLoader().init();
}

// Performance metrics
export function getAdMetrics() {
  const auction = getHeaderBiddingAuction();
  
  return {
    winners: Array.from(auction.winners.entries()).map(([unit, bid]) => ({
      adUnit: unit,
      bidder: bid?.bidder || 'none',
      cpm: bid?.cpm || 0
    })),
    contextualData: auction.contextualData,
    floorPrices: Array.from(auction.floorPrices.entries())
  };
}
