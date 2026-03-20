/**
 * Smart Form Validation with AI
 * Anomaly detection and fuzzy logic for error prevention
 */

const ERROR_PATTERNS = {
  interestRate: [
    { pattern: /^50$/, suggestion: 5.0, reason: 'Yıllık faiz oranı muhtemelen %5.0 olmalı' },
    { pattern: /^100$/, suggestion: 10.0, reason: 'Yıllık faiz oranı muhtemelen %10.0 olmalı' },
    { pattern: /^25$/, suggestion: 2.5, reason: 'Yıllık faiz oranı muhtemelen %2.5 olmalı' },
  ],
  loanAmount: [
    { pattern: /^5000$/, suggestion: 500000, reason: 'Konut kredisi tutarı muhtemelen 500.000 TL olmalı' },
    { pattern: /^10000$/, suggestion: 1000000, reason: 'Konut kredisi tutarı muhtemelen 1.000.000 TL olmalı' },
  ],
  term: [
    { pattern: /^([2-9][0-9])$/, check: (val) => val <= 30, suggestion: (val) => val * 12, reason: 'Yıl yerine ay olarak giriş yaptınız?' }
  ]
};

export function detectAnomaly(field, value, _context = {}) {
  const anomalies = [];
  const numValue = parseFloat(value);
  
  switch (field) {
    case 'interestRate':
      if (numValue > 50) {
        anomalies.push({
          field,
          current: value,
          suggested: numValue / 10,
          reason: 'Faiz oranı çok yüksek. Ondalık hatası olabilir.',
          severity: 'critical',
          confidence: 0.95
        });
      }
      if (numValue < 1 && numValue > 0) {
        anomalies.push({
          field,
          current: value,
          suggested: numValue * 100,
          reason: 'Faiz oranı yüzde olarak mı girilmeli?',
          severity: 'medium',
          confidence: 0.70
        });
      }
      break;
      
    case 'loanAmount':
      if (numValue < 50000 && numValue > 1000) {
        anomalies.push({
          field,
          current: value,
          suggested: numValue * 1000,
          reason: 'Konut kredisi tutarı çok düşük. Bin katı olabilir.',
          severity: 'medium',
          confidence: 0.80
        });
      }
      break;
      
    case 'term':
      if (numValue > 360) {
        anomalies.push({
          field,
          current: value,
          suggested: 360,
          reason: 'Vade 360 aydan (30 yıl) uzun olamaz.',
          severity: 'critical',
          confidence: 0.99
        });
      }
      break;
  }
  
  // Check pattern matches
  const patterns = ERROR_PATTERNS[field] || [];
  patterns.forEach(({ pattern, suggestion, reason, check }) => {
    const match = value.toString().match(pattern);
    if (match && (!check || check(numValue))) {
      const suggestedValue = typeof suggestion === 'function' ? suggestion(numValue) : suggestion;
      anomalies.push({
        field,
        current: value,
        suggested: suggestedValue,
        reason,
        severity: 'high',
        confidence: 0.85
      });
    }
  });
  
  return anomalies;
}

export function validateWithSmartSuggestions(formData) {
  const results = { valid: true, anomalies: [], suggestions: [] };
  
  Object.entries(formData).forEach(([field, value]) => {
    const anomalies = detectAnomaly(field, value, formData);
    if (anomalies.length > 0) {
      results.anomalies.push(...anomalies);
      results.valid = false;
      
      anomalies
        .filter(a => a.confidence > 0.80 && a.suggested)
        .forEach(a => {
          results.suggestions.push({
            field: a.field,
            from: a.current,
            to: a.suggested,
            reason: a.reason,
            apply: () => ({ ...formData, [a.field]: a.suggested })
          });
        });
    }
  });
  
  return results;
}

/**
 * Get correction suggestion for a single field
 */
export function suggestCorrection(field, value) {
  const anomalies = detectAnomaly(field, value);
  
  if (anomalies.length === 0) {
    return null;
  }
  
  const best = anomalies.reduce((a, b) => a.confidence > b.confidence ? a : b);
  
  return {
    field,
    original: value,
    suggested: best.suggested,
    reason: best.reason,
    confidence: best.confidence
  };
}
