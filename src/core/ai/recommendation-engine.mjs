/**
 * Intelligent Tool Recommendation Engine
 * Local ML-based tool suggestions
 */

// Tool relationship graph
const TOOL_RELATIONSHIPS = {
  'pdf/merge': {
    next: ['pdf/compress', 'pdf/split'],
    related: ['image/compress'],
    confidence: { 'pdf/compress': 0.75, 'pdf/split': 0.60, 'image/compress': 0.40 }
  },
  'pdf/compress': {
    next: ['pdf/merge', 'pdf/split'],
    related: ['image/compress'],
    confidence: { 'pdf/merge': 0.65, 'pdf/split': 0.55, 'image/compress': 0.50 }
  },
  'image/compress': {
    next: ['pdf/compress', 'image/convert'],
    related: ['pdf/merge'],
    confidence: { 'pdf/compress': 0.60, 'image/convert': 0.70, 'pdf/merge': 0.35 }
  },
  'finance/mortgage-tr': {
    next: ['finance/compound-interest'],
    related: ['finance/cloud-cost'],
    geoBoost: { 'TR': 1.0, 'default': 0.3 }
  },
  'finance/compound-interest': {
    next: ['finance/mortgage-tr'],
    related: ['finance/cloud-cost'],
    confidence: { 'finance/mortgage-tr': 0.50, 'finance/cloud-cost': 0.40 }
  }
};

// User behavior patterns
const USER_PATTERNS = {
  sequenceFrequencies: new Map(),
  toolUsageCounts: new Map()
};

/**
 * Get tool recommendations based on current context
 */
export function getRecommendations(currentTool, userContext = {}) {
  const recommendations = [];
  const relationships = TOOL_RELATIONSHIPS[currentTool];
  
  if (!relationships) return recommendations;
  
  // Get next tools
  if (relationships.next) {
    relationships.next.forEach(tool => {
      let confidence = relationships.confidence?.[tool] || 0.50;
      
      // Geo boost
      if (relationships.geoBoost && userContext.country) {
        const boost = relationships.geoBoost[userContext.country] || relationships.geoBoost.default || 1;
        confidence *= boost;
      }
      
      // Usage history boost
      const usageCount = USER_PATTERNS.toolUsageCounts.get(tool) || 0;
      if (usageCount > 0) {
        confidence += Math.min(0.15, usageCount * 0.05);
      }
      
      recommendations.push({
        tool,
        type: 'next',
        confidence: Math.min(confidence, 1.0),
        reason: getRecommendationReason(tool, 'next')
      });
    });
  }
  
  // Get related tools
  if (relationships.related) {
    relationships.related.forEach(tool => {
      let confidence = relationships.confidence?.[tool] || 0.40;
      
      recommendations.push({
        tool,
        type: 'related',
        confidence: Math.min(confidence, 1.0),
        reason: getRecommendationReason(tool, 'related')
      });
    });
  }
  
  // Sort by confidence
  recommendations.sort((a, b) => b.confidence - a.confidence);
  
  // Return top 3 above threshold
  return recommendations
    .filter(r => r.confidence >= 0.40)
    .slice(0, 3);
}

function getRecommendationReason(tool, type) {
  const reasons = {
    next: {
      'pdf/compress': 'PDF dosyanızı optimize edin',
      'pdf/merge': 'Birden fazla PDF birleştirin',
      'pdf/split': 'PDF sayfalarını ayırın',
      'image/compress': 'Görsel dosyalarınızı sıkıştırın',
      'finance/compound-interest': 'Yatırım getirinizi hesaplayın',
      'finance/mortgage-tr': 'Konut kredisi hesaplayın'
    },
    related: {
      'pdf/compress': 'Benzer işlem için PDF aracı',
      'image/compress': 'Görsel optimizasyonu',
      'finance/cloud-cost': 'Bulut maliyet analizi'
    }
  };
  
  return reasons[type]?.[tool] || 'İlgili araç';
}

/**
 * Track user tool usage for personalization
 */
export function trackToolUsage(tool, metadata = {}) {
  // Update usage count
  const currentCount = USER_PATTERNS.toolUsageCounts.get(tool) || 0;
  USER_PATTERNS.toolUsageCounts.set(tool, currentCount + 1);
  
  // Store in localStorage for persistence
  try {
    const history = JSON.parse(localStorage.getItem('zerotools_history') || '[]');
    history.push({ tool, timestamp: Date.now(), metadata });
    
    // Keep last 50 entries
    if (history.length > 50) history.shift();
    
    localStorage.setItem('zerotools_history', JSON.stringify(history));
  } catch {
    // localStorage not available
  }
}

/**
 * Get personalized recommendations based on history
 */
export function getPersonalizedRecommendations() {
  try {
    const history = JSON.parse(localStorage.getItem('zerotools_history') || '[]');
    if (history.length === 0) return [];
    
    // Find most used tool category
    const categoryCounts = {};
    history.forEach(h => {
      const category = h.tool.split('/')[0];
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    const topCategory = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    
    if (!topCategory) return [];
    
    // Suggest tools from same category
    const suggestions = {
      pdf: ['pdf/compress', 'pdf/merge', 'pdf/split'],
      image: ['image/compress', 'image/convert'],
      finance: ['finance/compound-interest', 'finance/mortgage-tr'],
      dev: ['dev/json-formatter', 'dev/regex-tester']
    };
    
    const usedTools = new Set(history.map(h => h.tool));
    
    return (suggestions[topCategory] || [])
      .filter(tool => !usedTools.has(tool))
      .map(tool => ({
        tool,
        type: 'personalized',
        confidence: 0.70,
        reason: 'Sık kullandığınız kategoriden'
      }));
  } catch {
    return [];
  }
}

/**
 * Render recommendation widget
 */
export function renderRecommendationWidget(recommendations, containerId = 'recommendations') {
  const container = document.getElementById(containerId);
  if (!container || recommendations.length === 0) return;
  
  container.innerHTML = `
    <div class="bg-blue-50 rounded-lg p-4 mt-6">
      <h4 class="font-semibold text-blue-900 mb-2">Önerilen Araçlar</h4>
      <div class="space-y-2">
        ${recommendations.map(rec => `
          <a href="/src/tools/${rec.tool}/" 
             class="flex items-center justify-between p-2 bg-white rounded hover:bg-blue-100 transition-colors">
            <span class="text-sm text-gray-700">${rec.reason}</span>
            <span class="text-xs text-blue-600">${Math.round(rec.confidence * 100)}% eşleşme</span>
          </a>
        `).join('')}
      </div>
    </div>
  `;
  
  container.classList.remove('hidden');
}

/**
 * Check if recommendations should be shown
 */
export function shouldShowRecommendations() {
  // Don't show if user recently dismissed
  try {
    const dismissed = localStorage.getItem('zerotools_recommendations_dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      if (Date.now() - dismissedTime < 24 * 60 * 60 * 1000) {
        return false;
      }
    }
  } catch {}
  
  return true;
}

export function dismissRecommendations() {
  try {
    localStorage.setItem('zerotools_recommendations_dismissed', Date.now().toString());
  } catch {}
}
