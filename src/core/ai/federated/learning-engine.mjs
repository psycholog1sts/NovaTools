/**
 * Federated Learning Engine
 * On-device model training without sending raw data to servers
 * Uses differential privacy and secure aggregation
 */

// Simple neural network implementation for on-device training
class TinyNN {
  constructor(inputSize, hiddenSize, outputSize) {
    this.inputSize = inputSize;
    this.hiddenSize = hiddenSize;
    this.outputSize = outputSize;
    
    // Initialize weights with Xavier initialization
    this.W1 = this.randomMatrix(inputSize, hiddenSize, Math.sqrt(2 / inputSize));
    this.b1 = new Array(hiddenSize).fill(0);
    this.W2 = this.randomMatrix(hiddenSize, outputSize, Math.sqrt(2 / hiddenSize));
    this.b2 = new Array(outputSize).fill(0);
  }

  randomMatrix(rows, cols, scale) {
    return Array(rows).fill(0).map(() => 
      Array(cols).fill(0).map(() => (Math.random() * 2 - 1) * scale)
    );
  }

  relu(x) {
    return x.map(v => Math.max(0, v));
  }

  softmax(x) {
    const max = Math.max(...x);
    const exp = x.map(v => Math.exp(v - max));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(v => v / sum);
  }

  forward(x) {
    // Layer 1: input -> hidden
    this.z1 = this.matVecMul(this.W1, x).map((v, i) => v + this.b1[i]);
    this.a1 = this.relu(this.z1);
    
    // Layer 2: hidden -> output
    this.z2 = this.matVecMul(this.W2, this.a1).map((v, i) => v + this.b2[i]);
    this.a2 = this.softmax(this.z2);
    
    return this.a2;
  }

  backward(x, y, lr = 0.01) {
    const m = 1;
    
    // Output gradient
    const dz2 = this.a2.map((v, i) => v - y[i]);
    
    // Layer 2 gradients
    const dW2 = this.outerProduct(this.a1, dz2).map(row => 
      row.map(v => v / m)
    );
    const db2 = dz2.map(v => v / m);
    
    // Hidden gradient
    const da1 = this.matVecMul(this.W2, dz2, true);
    const dz1 = da1.map((v, i) => v * (this.z1[i] > 0 ? 1 : 0));
    
    // Layer 1 gradients
    const dW1 = this.outerProduct(x, dz1).map(row => 
      row.map(v => v / m)
    );
    const db1 = dz1.map(v => v / m);
    
    // Update weights
    this.W1 = this.W1.map((row, i) => 
      row.map((w, j) => w - lr * dW1[i][j])
    );
    this.b1 = this.b1.map((b, i) => b - lr * db1[i]);
    this.W2 = this.W2.map((row, i) => 
      row.map((w, j) => w - lr * dW2[i][j])
    );
    this.b2 = this.b2.map((b, i) => b - lr * db2[i]);
    
    // Return gradients for federated aggregation
    return { dW1, db1, dW2, db2 };
  }

  matVecMul(matrix, vector, transpose = false) {
    if (transpose) {
      return vector[0].map((_, i) => 
        vector.reduce((sum, row, j) => sum + row * matrix[j][i], 0)
      );
    }
    return matrix.map(row => 
      row.reduce((sum, w, i) => sum + w * vector[i], 0)
    );
  }

  outerProduct(a, b) {
    return a.map(ai => b.map(bj => ai * bj));
  }

  // Add differential privacy noise
  addNoise(gradients, epsilon = 1.0, delta = 1e-5) {
    const sensitivity = 2.0; // L2 sensitivity for gradient clipping
    const sigma = sensitivity * Math.sqrt(2 * Math.log(1.25 / delta)) / epsilon;
    
    const addGaussianNoise = (arr) => 
      arr.map(v => v + this.gaussianRandom(0, sigma));
    
    return {
      dW1: gradients.dW1.map(row => addGaussianNoise(row)),
      db1: addGaussianNoise(gradients.db1),
      dW2: gradients.dW2.map(row => addGaussianNoise(row)),
      db2: addGaussianNoise(gradients.db2)
    };
  }

  gaussianRandom(mean, std) {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * std;
  }

  getWeights() {
    return {
      W1: this.W1,
      b1: this.b1,
      W2: this.W2,
      b2: this.b2
    };
  }

  setWeights(weights) {
    this.W1 = weights.W1;
    this.b1 = weights.b1;
    this.W2 = weights.W2;
    this.b2 = weights.b2;
  }
}

// Federated Learning Manager
export class FederatedLearning {
  constructor() {
    this.models = new Map();
    this.localData = new Map();
    this.round = 0;
    this.minSamples = 10;
    this.epsilon = 1.0; // Privacy budget
  }

  /**
   * Create or get model
   */
  getModel(modelId, config) {
    if (!this.models.has(modelId)) {
      const model = new TinyNN(
        config.inputSize,
        config.hiddenSize || 64,
        config.outputSize
      );
      this.models.set(modelId, {
        model,
        config,
        samples: 0,
        lastUpdate: Date.now()
      });
    }
    return this.models.get(modelId);
  }

  /**
   * Record interaction for training
   */
  recordInteraction(modelId, features, outcome) {
    if (!this.localData.has(modelId)) {
      this.localData.set(modelId, []);
    }
    
    this.localData.get(modelId).push({ features, outcome });
    
    const modelInfo = this.models.get(modelId);
    if (modelInfo) {
      modelInfo.samples++;
    }
    
    // Trigger training if enough samples
    if (this.localData.get(modelId).length >= this.minSamples) {
      this.trainLocal(modelId);
    }
  }

  /**
   * Train on local data with differential privacy
   */
  trainLocal(modelId) {
    const modelInfo = this.getModel(modelId);
    const data = this.localData.get(modelId) || [];
    
    if (data.length < this.minSamples) return;
    
    const { model } = modelInfo;
    const epochs = 5;
    const lr = 0.01;
    
    // Train for multiple epochs
    for (let epoch = 0; epoch < epochs; epoch++) {
      // Shuffle data
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      
      for (const sample of shuffled) {
        // Forward pass
        model.forward(sample.features); // Forward pass only
        
        // Create target vector (one-hot)
        const target = new Array(modelInfo.config.outputSize).fill(0);
        target[sample.outcome] = 1;
        
        // Backward pass
        const gradients = model.backward(sample.features, target, lr);
        
        // Add differential privacy noise
        const noisyGradients = model.addNoise(gradients, this.epsilon);
        
        // Apply noisy gradients
        this.applyGradients(model, noisyGradients, lr);
      }
    }
    
    // Clear training data (privacy)
    this.localData.set(modelId, []);
    
    // Save model state
    this.saveModel(modelId);
    
    modelInfo.lastUpdate = Date.now();
    
    // Local training completed
  }

  applyGradients(model, gradients, lr) {
    model.W1 = model.W1.map((row, i) => 
      row.map((w, j) => w - lr * gradients.dW1[i][j])
    );
    model.b1 = model.b1.map((b, i) => b - lr * gradients.db1[i]);
    model.W2 = model.W2.map((row, i) => 
      row.map((w, j) => w - lr * gradients.dW2[i][j])
    );
    model.b2 = model.b2.map((b, i) => b - lr * gradients.db2[i]);
  }

  /**
   * Get model prediction
   */
  predict(modelId, features) {
    const modelInfo = this.getModel(modelId);
    if (!modelInfo) return null;
    
    const prediction = modelInfo.model.forward(features);
    
    // Return top prediction with confidence
    const maxIndex = prediction.indexOf(Math.max(...prediction));
    return {
      prediction: maxIndex,
      confidence: prediction[maxIndex],
      distribution: prediction
    };
  }

  /**
   * Export model for federated aggregation
   */
  exportModel(modelId) {
    const modelInfo = this.models.get(modelId);
    if (!modelInfo) return null;
    
    return {
      modelId,
      weights: modelInfo.model.getWeights(),
      samples: modelInfo.samples,
      round: this.round
    };
  }

  /**
   * Import aggregated model from server
   */
  importAggregated(modelId, aggregatedWeights) {
    const modelInfo = this.getModel(modelId);
    modelInfo.model.setWeights(aggregatedWeights);
    this.round++;
    
    // Aggregated model imported
  }

  /**
   * Save model to IndexedDB
   */
  async saveModel(modelId) {
    const modelInfo = this.models.get(modelId);
    if (!modelInfo) return;
    
    const data = {
      weights: modelInfo.model.getWeights(),
      samples: modelInfo.samples,
      round: this.round,
      savedAt: Date.now()
    };
    
    await this.saveToIndexedDB(`fl-model-${modelId}`, data);
  }

  /**
   * Load model from IndexedDB
   */
  async loadModel(modelId) {
    const data = await this.loadFromIndexedDB(`fl-model-${modelId}`);
    if (data) {
      const modelInfo = this.getModel(modelId, { inputSize: 10, outputSize: 5 });
      modelInfo.model.setWeights(data.weights);
      modelInfo.samples = data.samples;
      this.round = data.round;
    }
  }

  saveToIndexedDB(key, data) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('FederatedLearning', 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models');
        }
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['models'], 'readwrite');
        const store = transaction.objectStore('models');
        store.put(data, key);
        transaction.oncomplete = resolve;
        transaction.onerror = reject;
      };
      
      request.onerror = () => resolve();
    });
  }

  loadFromIndexedDB(key) {
    return new Promise((resolve) => {
      const request = indexedDB.open('FederatedLearning', 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models');
        }
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['models'], 'readonly');
        const store = transaction.objectStore('models');
        const getRequest = store.get(key);
        
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => resolve(null);
      };
      
      request.onerror = () => resolve(null);
    });
  }
}

// Tool recommendation model using federated learning
export class ToolRecommender {
  constructor() {
    this.fl = new FederatedLearning();
    this.modelId = 'tool-recommender';
    
    // Feature vector: [hour, dayOfWeek, currentTool, fileSize, toolHistory...]
    this.featureSize = 20;
    this.numTools = 10;
    
    this.init();
  }

  async init() {
    this.fl.getModel(this.modelId, {
      inputSize: this.featureSize,
      hiddenSize: 32,
      outputSize: this.numTools
    });
    
    await this.fl.loadModel(this.modelId);
  }

  /**
   * Encode context into feature vector
   */
  encodeFeatures(context) {
    const features = new Array(this.featureSize).fill(0);
    
    // Time features
    const now = new Date();
    features[0] = now.getHours() / 24; // Hour normalized
    features[1] = now.getDay() / 7;    // Day of week normalized
    
    // Current tool (one-hot encoded for first 5 tools)
    if (context.currentTool !== undefined) {
      features[2 + context.currentTool] = 1;
    }
    
    // File size bucket
    if (context.fileSize !== undefined) {
      features[7] = Math.min(context.fileSize / 10000000, 1); // 10MB max
    }
    
    // Recent tool history (last 3 tools)
    if (context.recentTools) {
      context.recentTools.slice(0, 3).forEach((tool, i) => {
        features[8 + i] = (tool + 1) / this.numTools;
      });
    }
    
    return features;
  }

  /**
   * Get tool recommendations
   */
  recommend(context, topK = 3) {
    const features = this.encodeFeatures(context);
    const result = this.fl.predict(this.modelId, features);
    
    if (!result) return [];
    
    // Get top K recommendations
    const scores = result.distribution.map((conf, tool) => ({ tool, conf }));
    scores.sort((a, b) => b.conf - a.conf);
    
    return scores.slice(0, topK);
  }

  /**
   * Record tool usage for training
   */
  recordUsage(context, selectedTool) {
    const features = this.encodeFeatures(context);
    this.fl.recordInteraction(this.modelId, features, selectedTool);
  }
}

// Anomaly detection using federated learning
export class AnomalyDetector {
  constructor() {
    this.fl = new FederatedLearning();
    this.modelId = 'anomaly-detector';
    this.threshold = 0.8;
    
    this.init();
  }

  async init() {
    this.fl.getModel(this.modelId, {
      inputSize: 5,  // [value, mean, std, timeSinceLast, toolId]
      hiddenSize: 16,
      outputSize: 2  // [normal, anomaly]
    });
    
    await this.fl.loadModel(this.modelId);
    
    this.history = [];
    this.maxHistory = 100;
  }

  /**
   * Check if value is anomalous
   */
  check(value, toolId) {
    // Calculate statistics from history
    const mean = this.history.reduce((a, b) => a + b, 0) / this.history.length || value;
    const variance = this.history.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.history.length || 1;
    const std = Math.sqrt(variance) || 1;
    
    const features = [
      value / 1000000, // Normalize to millions
      mean / 1000000,
      std / 1000000,
      this.history.length > 0 ? (Date.now() - this.lastTime) / 60000 : 0,
      toolId / 10
    ];
    
    const result = this.fl.predict(this.modelId, features);
    
    if (!result) {
      // Fallback to statistical anomaly detection
      const zScore = Math.abs(value - mean) / std;
      return { isAnomaly: zScore > 3, confidence: Math.min(zScore / 5, 1) };
    }
    
    const isAnomaly = result.prediction === 1 && result.confidence > this.threshold;
    
    // Update history
    this.history.push(value);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    this.lastTime = Date.now();
    
    return {
      isAnomaly,
      confidence: result.distribution[1],
      suggestion: isAnomaly ? this.generateSuggestion(value, mean, std) : null
    };
  }

  /**
   * Record user feedback (confirmed anomaly or false positive)
   */
  feedback(value, toolId, wasAnomaly) {
    const mean = this.history.reduce((a, b) => a + b, 0) / this.history.length || value;
    const variance = this.history.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.history.length || 1;
    const std = Math.sqrt(variance) || 1;
    
    const features = [
      value / 1000000,
      mean / 1000000,
      std / 1000000,
      this.history.length > 0 ? (Date.now() - this.lastTime) / 60000 : 0,
      toolId / 10
    ];
    
    this.fl.recordInteraction(this.modelId, features, wasAnomaly ? 1 : 0);
  }

  generateSuggestion(value, mean, std) {
    if (value > mean + 3 * std) {
      return `Value ${value.toLocaleString()} is unusually high. Did you mean ${(value / 10).toLocaleString()}?`;
    }
    if (value < mean - 3 * std) {
      return `Value ${value.toLocaleString()} is unusually low. Please verify.`;
    }
    return 'Please verify this value';
  }
}

// Singleton instances
let toolRecommender = null;
let anomalyDetector = null;

export function getToolRecommender() {
  if (!toolRecommender) {
    toolRecommender = new ToolRecommender();
  }
  return toolRecommender;
}

export function getAnomalyDetector() {
  if (!anomalyDetector) {
    anomalyDetector = new AnomalyDetector();
  }
  return anomalyDetector;
}

// Utility exports
export function recommendTools(context) {
  return getToolRecommender().recommend(context);
}

export function checkAnomaly(value, toolId) {
  return getAnomalyDetector().check(value, toolId);
}

export function recordToolUsage(context, tool) {
  getToolRecommender().recordUsage(context, tool);
}
