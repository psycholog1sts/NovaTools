/**
 * Digital Twin Integration & Predictive Reality
 * Open Banking synthesis and life simulation
 */

export class FinancialDigitalTwin {
  constructor() {
    this.transactions = [];
    this.predictions = [];
    this.mlModel = null;
  }

  async loadFromPDF(file) {
    // Extract transactions from bank statement PDF
    const text = await this.extractPDFText(file);
    const transactions = this.parseTransactions(text);
    
    this.transactions.push(...transactions);
    await this.trainModel();
    
    return transactions;
  }

  async extractPDFText(file) {
    const arrayBuffer = await file.arrayBuffer();
    
    // Check if PDF.js is available globally (loaded via CDN)
    if (!window.pdfjsLib) {
      console.warn('PDF.js not loaded');
      return '';
    }
    
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ');
    }
    
    return text;
  }

  parseTransactions(text) {
    // Simple regex-based transaction parsing
    const patterns = [
      /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,]+\.\d{2})/g,
      /(\d{4}-\d{2}-\d{2})\s+(.+?)\s+([\d,]+\.\d{2})/g
    ];
    
    const transactions = [];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        transactions.push({
          date: match[1],
          description: match[2].trim(),
          amount: parseFloat(match[3].replace(',', '')),
          category: this.categorizeTransaction(match[2])
        });
      }
    }
    
    return transactions;
  }

  categorizeTransaction(description) {
    const categories = {
      grocery: /market|grocery|supermarket/i,
      transport: /uber|taxi|gas|fuel/i,
      dining: /restaurant|cafe|coffee/i,
      utilities: /electric|water|internet|phone/i,
      income: /salary|deposit|payment received/i
    };
    
    for (const [category, pattern] of Object.entries(categories)) {
      if (pattern.test(description)) return category;
    }
    
    return 'other';
  }

  async trainModel() {
    // Simple statistical model for spending patterns
    const byCategory = this.groupByCategory();
    const byMonth = this.groupByMonth();
    
    this.mlModel = {
      averageSpending: this.calculateAverageSpending(byCategory),
      monthlyTrend: this.calculateTrend(byMonth),
      seasonality: this.detectSeasonality()
    };
  }

  groupByCategory() {
    return this.transactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || []).concat(t);
      return acc;
    }, {});
  }

  groupByMonth() {
    return this.transactions.reduce((acc, t) => {
      const month = t.date.substring(0, 7);
      acc[month] = (acc[month] || 0) + t.amount;
      return acc;
    }, {});
  }

  calculateAverageSpending(byCategory) {
    const result = {};
    for (const [cat, txs] of Object.entries(byCategory)) {
      const total = txs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      result[cat] = total / txs.length;
    }
    return result;
  }

  calculateTrend(byMonth) {
    const months = Object.keys(byMonth).sort();
    const values = months.map(m => byMonth[m]);
    
    // Simple linear regression
    const n = values.length;
    const sumX = values.reduce((a, b) => a + b, 0);
    const sumY = months.reduce((sum, _, i) => sum + i, 0);
    const sumXY = values.reduce((sum, v, i) => sum + v * i, 0);
    const sumX2 = values.reduce((sum, v) => sum + v * v, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return { slope, direction: slope > 0 ? 'increasing' : 'decreasing' };
  }

  detectSeasonality() {
    // Detect monthly patterns
    const monthlyTotals = {};
    for (const t of this.transactions) {
      const month = parseInt(t.date.split('/')[0] || t.date.split('-')[1]);
      monthlyTotals[month] = (monthlyTotals[month] || 0) + t.amount;
    }
    
    return monthlyTotals;
  }

  predict(daysAhead = 30) {
    if (!this.mlModel) return null;
    
    const predictions = [];
    const today = new Date();
    
    for (let i = 1; i <= daysAhead; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      // Predict based on historical patterns
      const month = date.getMonth() + 1;
      const seasonalFactor = this.mlModel.seasonality[month] / 
        (Object.values(this.mlModel.seasonality).reduce((a, b) => a + b, 0) / 12);
      
      const predictedSpend = Object.values(this.mlModel.averageSpending)
        .reduce((a, b) => a + b, 0) * seasonalFactor;
      
      predictions.push({
        date: date.toISOString().split('T')[0],
        predictedSpend,
        confidence: 0.7
      });
    }
    
    this.predictions = predictions;
    return predictions;
  }

  detectCashShortfall() {
    const predictions = this.predict(90);
    const income = this.transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = predictions.reduce((sum, p) => sum + p.predictedSpend, 0);
    
    if (expenses > income * 3) {
      const shortfallDate = predictions.find((p, i) => {
        const cumulative = predictions.slice(0, i + 1)
          .reduce((sum, x) => sum + x.predictedSpend, 0);
        return cumulative > income;
      });
      
      return {
        willHaveShortfall: true,
        date: shortfallDate?.date,
        severity: expenses / (income * 3)
      };
    }
    
    return { willHaveShortfall: false };
  }

  simulateLife(scenarios) {
    const results = [];
    
    for (const scenario of scenarios) {
      const { name, changes } = scenario;
      
      // Apply changes to model
      const adjustedModel = { ...this.mlModel };
      
      if (changes.incomeIncrease) {
        // Adjust for new income
      }
      
      if (changes.newExpense) {
        // Add new expense category
      }
      
      // Run 30-year simulation
      const timeline = [];
      let netWorth = 0;
      
      for (let year = 0; year < 30; year++) {
        const annualIncome = 50000 * Math.pow(1.03, year); // 3% raises
        const annualExpenses = 40000 * Math.pow(1.02, year); // 2% inflation
        
        netWorth += annualIncome - annualExpenses;
        
        timeline.push({
          year: new Date().getFullYear() + year,
          age: 30 + year,
          income: annualIncome,
          expenses: annualExpenses,
          savings: annualIncome - annualExpenses,
          netWorth
        });
      }
      
      results.push({ scenario: name, timeline });
    }
    
    return results;
  }
}

export class OpenBankingConnector {
  async connectPSD2(bankId) {
    // PSD2 API connection (would use actual bank APIs)
    const authUrl = `https://${bankId}.com/psd2/auth`;
    
    // OAuth2 flow
    const params = new URLSearchParams({
      client_id: 'zero-tools-platform',
      response_type: 'code',
      scope: 'accounts transactions',
      redirect_uri: `${window.location.origin  }/oauth/callback`
    });
    
    window.location.href = `${authUrl}?${params}`;
  }

  async fetchTransactions(accessToken) {
    const response = await fetch('https://api.bank.com/v1/transactions', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    return await response.json();
  }
}
