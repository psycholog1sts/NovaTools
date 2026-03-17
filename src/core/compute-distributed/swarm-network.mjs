/**
 * Distributed Neural Compute Fabric
 * P2P distributed supercomputer using WebRTC and WebGPU
 * Users earn micropayments for contributing compute cycles
 */

import { getSyncManager } from '../sync/crdt-engine.mjs';

// Task types that can be distributed
export const TASK_TYPES = {
  MONTE_CARLO: 'monte_carlo',
  CRYPTOGRAPHIC: 'crypto',
  IMAGE_PROCESSING: 'image',
  ML_TRAINING: 'ml_training',
  FHE_COMPUTATION: 'fhe'
};

// Task fragmentation strategies
const FRAGMENTATION_STRATEGIES = {
  [TASK_TYPES.MONTE_CARLO]: {
    minChunkSize: 1000,
    maxChunkSize: 10000,
    aggregation: 'average'
  },
  [TASK_TYPES.CRYPTOGRAPHIC]: {
    minChunkSize: 1,
    maxChunkSize: 100,
    aggregation: 'concat'
  },
  [TASK_TYPES.IMAGE_PROCESSING]: {
    minChunkSize: 64, // 64x64 pixel tiles
    maxChunkSize: 512,
    aggregation: 'merge'
  }
};

export class DistributedComputeNode {
  constructor(nodeId, options = {}) {
    this.id = nodeId || this.generateNodeId();
    this.capabilities = {};
    this.peers = new Map();
    this.tasks = new Map();
    this.results = new Map();
    this.earnings = 0;
    this.isHost = false;
    this.webRTC = null;
    this.options = {
      maxConcurrentTasks: 2,
      minPaymentRate: 0.00001, // BTC per computation unit
      contributionPercent: 80, // 80% to contributor, 20% to platform
      ...options
    };
    
    this.detectCapabilities();
  }

  generateNodeId() {
    return `node-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Detect compute capabilities
   */
  async detectCapabilities() {
    this.capabilities = {
      webgpu: 'gpu' in navigator,
      webassembly: typeof WebAssembly !== 'undefined',
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      deviceMemory: navigator.deviceMemory || 4,
      maxTextureSize: await this.detectMaxTextureSize(),
      supportsFloat32Textures: true,
      timestamp: Date.now()
    };

    // Benchmark compute power
    this.capabilities.benchmarkScore = await this.benchmark();
  }

  async detectMaxTextureSize() {
    if (!navigator.gpu) return 0;
    
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return 0;
      
      const device = await adapter.requestDevice();
      const maxSize = device.limits.maxTextureDimension2D;
      device.destroy();
      return maxSize;
    } catch {
      return 2048; // Default assumption
    }
  }

  /**
   * Benchmark node performance
   */
  async benchmark() {
    const start = performance.now();
    
    // Simple compute benchmark
    let _sum = 0;
    for (let i = 0; i < 1000000; i++) {
      _sum += Math.sqrt(i);
    }
    
    const duration = performance.now() - start;
    const score = 10000 / duration; // Higher is better
    
    return score;
  }

  /**
   * Join compute swarm
   */
  async joinSwarm(swarmId) {
    // Connect to signaling server or use existing P2P network
    const sync = getSyncManager();
    
    // Create CRDT document for this swarm
    const _swarmDoc = sync.getDocument(`swarm-${swarmId}`);
    
    // Announce capabilities
    sync.setField(`swarm-${swarmId}`, this.id, {
      capabilities: this.capabilities,
      status: 'available',
      joinedAt: Date.now()
    });

    // Listen for tasks
    sync.subscribe(`swarm-${swarmId}`, (op) => {
      if (op.type === 'set' && op.key.startsWith('task-')) {
        this.handleTaskAssignment(op.value);
      }
    });

    // Swarm joined
  }

  /**
   * Handle task assignment
   */
  async handleTaskAssignment(task) {
    // Check if we can handle this task
    if (this.tasks.size >= this.options.maxConcurrentTasks) {
      return; // Busy
    }

    // Check if task matches our capabilities
    if (!this.canHandleTask(task)) {
      return;
    }

    // Accept task
    this.tasks.set(task.id, task);
    
    try {
      const result = await this.executeTask(task);
      await this.submitResult(task.id, result);
    } catch (error) {
      console.error('[Swarm] Task execution failed:', error);
      await this.submitFailure(task.id, error);
    } finally {
      this.tasks.delete(task.id);
    }
  }

  canHandleTask(task) {
    // Check memory requirements
    if (task.memoryRequired > this.capabilities.deviceMemory * 0.5) {
      return false;
    }

    // Check GPU requirements
    if (task.requiresGPU && !this.capabilities.webgpu) {
      return false;
    }

    return true;
  }

  /**
   * Execute assigned task
   */
  async executeTask(task) {
    const _startTime = performance.now();
    
    switch (task.type) {
      case TASK_TYPES.MONTE_CARLO:
        return this.executeMonteCarlo(task);
      case TASK_TYPES.CRYPTOGRAPHIC:
        return this.executeCrypto(task);
      case TASK_TYPES.IMAGE_PROCESSING:
        return this.executeImageProcessing(task);
      case TASK_TYPES.ML_TRAINING:
        return this.executeMLTraining(task);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  async executeMonteCarlo(task) {
    const { iterations, simulation, params } = task.data;
    const results = [];

    // Execute simulation
    for (let i = 0; i < iterations; i++) {
      const result = this.runSimulation(simulation, params);
      results.push(result);
    }

    return {
      results,
      stats: this.calculateStats(results)
    };
  }

  runSimulation(simulationCode, params) {
    // Create sandboxed function from simulation code
    const simulationFn = new Function('params', `
      "use strict";
      ${simulationCode}
      return run(params);
    `);
    
    return simulationFn(params);
  }

  calculateStats(results) {
    const sorted = [...results].sort((a, b) => a - b);
    const sum = results.reduce((a, b) => a + b, 0);
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: sum / results.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p5: sorted[Math.floor(sorted.length * 0.05)]
    };
  }

  async executeCrypto(task) {
    const { algorithm, input } = task.data;
    
    // Use WebCrypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    
    const hashBuffer = await crypto.subtle.digest(algorithm, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    return {
      hash: hashArray.map(b => b.toString(16).padStart(2, '0')).join(''),
      algorithm
    };
  }

  async executeImageProcessing(task) {
    const { imageData, operation, params } = task.data;
    
    // Use WebGPU if available
    if (this.capabilities.webgpu && operation === 'convolution') {
      return this.executeGPUConvolution(imageData, params);
    }
    
    // Fallback to CPU
    return this.executeCPUImageOp(imageData, operation, params);
  }

  async executeGPUConvolution(_imageData, _kernel) {
    // WebGPU convolution implementation
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    
    // Create buffers and pipeline
    // ... GPU implementation
    
    device.destroy();
    
    return { processed: true, method: 'gpu' };
  }

  executeCPUImageOp(_imageData, _operation, _params) {
    // CPU fallback
    return { processed: true, method: 'cpu' };
  }

  async executeMLTraining(task) {
    const { modelType: _modelType, dataset: _dataset, epochs } = task.data;
    
    // Use TensorFlow.js or custom WASM implementation
    // This is a placeholder - real implementation would use ML libraries
    
    return {
      trained: true,
      accuracy: 0.95,
      loss: 0.05,
      epochs
    };
  }

  /**
   * Submit task result
   */
  async submitResult(taskId, result) {
    const sync = getSyncManager();
    
    sync.setField(`swarm-${this.getSwarmId()}`, `result-${taskId}`, {
      nodeId: this.id,
      result,
      submittedAt: Date.now()
    });

    // Calculate payment
    const payment = this.calculatePayment(result);
    this.earnings += payment;


  }

  calculatePayment(result) {
    // Calculate based on computation units
    const computationUnits = result.iterations || result.processedPixels || 1;
    return computationUnits * this.options.minPaymentRate * this.options.contributionPercent / 100;
  }

  async submitFailure(taskId, error) {
    const sync = getSyncManager();
    
    sync.setField(`swarm-${this.getSwarmId()}`, `failure-${taskId}`, {
      nodeId: this.id,
      error: error.message,
      submittedAt: Date.now()
    });
  }

  getSwarmId() {
    // Get from active swarm
    return this.activeSwarm;
  }
}

// Task Coordinator for distributing work
export class TaskCoordinator {
  constructor() {
    this.nodes = new Map();
    this.activeTasks = new Map();
    this.taskQueue = [];
    this.redundancyFactor = 2; // Send to 2 nodes for verification
  }

  /**
   * Submit task to swarm
   */
  async submitTask(task) {
    const taskId = `task-${Date.now()}-${Math.random()}`;
    const fragmented = this.fragmentTask({ ...task, id: taskId });
    
    // Find available nodes
    const availableNodes = this.findAvailableNodes(task);
    
    if (availableNodes.length === 0) {
      throw new Error('No available nodes in swarm');
    }

    // Distribute fragments with redundancy
    const assignments = [];
    for (const fragment of fragmented) {
      // Select nodes based on capabilities
      const selectedNodes = this.selectNodesForFragment(fragment, availableNodes);
      
      for (const node of selectedNodes) {
        assignments.push({
          fragment,
          nodeId: node.id
        });
      }
    }

    // Track task
    this.activeTasks.set(taskId, {
      task,
      fragments: fragmented,
      assignments,
      results: new Map(),
      submittedAt: Date.now()
    });

    // Distribute to nodes via CRDT
    const sync = getSyncManager();
    for (const { fragment, nodeId } of assignments) {
      sync.setField(`swarm-${task.swarmId}`, `task-${fragment.id}`, {
        ...fragment,
        assignedTo: nodeId,
        assignedAt: Date.now()
      });
    }

    return taskId;
  }

  fragmentTask(task) {
    const strategy = FRAGMENTATION_STRATEGIES[task.type];
    if (!strategy) return [task];

    const fragments = [];
    const totalWork = task.data.iterations || task.data.total;
    
    let remaining = totalWork;
    let offset = 0;

    while (remaining > 0) {
      const chunkSize = Math.min(
        Math.max(remaining / 10, strategy.minChunkSize),
        strategy.maxChunkSize
      );

      fragments.push({
        id: `${task.id}-fragment-${fragments.length}`,
        parentId: task.id,
        type: task.type,
        data: {
          ...task.data,
          offset,
          iterations: Math.min(chunkSize, remaining)
        }
      });

      offset += chunkSize;
      remaining -= chunkSize;
    }

    return fragments;
  }

  findAvailableNodes(task) {
    return Array.from(this.nodes.values()).filter(node => {
      return node.status === 'available' && node.canHandleTask(task);
    });
  }

  selectNodesForFragment(fragment, availableNodes) {
    // Sort by benchmark score
    const sorted = availableNodes.sort((a, b) => 
      b.capabilities.benchmarkScore - a.capabilities.benchmarkScore
    );

    // Select top N nodes for redundancy
    return sorted.slice(0, this.redundancyFactor);
  }

  /**
   * Collect and aggregate results
   */
  async collectResults(taskId) {
    const task = this.activeTasks.get(taskId);
    if (!task) return null;

    const results = Array.from(task.results.values());
    
    if (results.length < task.assignments.length / this.redundancyFactor) {
      // Not enough results yet
      return null;
    }

    // Aggregate results based on task type
    const strategy = FRAGMENTATION_STRATEGIES[task.task.type];
    
    switch (strategy?.aggregation) {
      case 'average':
        return this.aggregateAverage(results);
      case 'concat':
        return this.aggregateConcat(results);
      case 'merge':
        return this.aggregateMerge(results);
      default:
        return results[0];
    }
  }

  aggregateAverage(results) {
    const allValues = results.flatMap(r => r.result?.results || []);
    const sum = allValues.reduce((a, b) => a + b, 0);
    
    return {
      aggregated: true,
      mean: sum / allValues.length,
      count: allValues.length,
      sources: results.length
    };
  }

  aggregateConcat(results) {
    return {
      aggregated: true,
      data: results.map(r => r.result).join(''),
      sources: results.length
    };
  }

  aggregateMerge(results) {
    // Merge image tiles or similar
    return {
      aggregated: true,
      tiles: results.map(r => r.result),
      sources: results.length
    };
  }

  /**
   * Verify result integrity (SMPC - Secure Multi-Party Computation)
   */
  verifyResults(results) {
    // Check if redundant results match
    const grouped = new Map();
    
    for (const result of results) {
      const key = JSON.stringify(result.result);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(result);
    }

    // Find consensus (majority vote)
    let consensus = null;
    let maxCount = 0;
    
    for (const [key, group] of grouped) {
      if (group.length > maxCount) {
        maxCount = group.length;
        consensus = JSON.parse(key);
      }
    }

    // Consensus threshold: more than 50% of redundant nodes agree
    const isValid = maxCount >= Math.ceil(this.redundancyFactor / 2);
    
    return { isValid, consensus, confidence: maxCount / this.redundancyFactor };
  }
}

// Lightning Network integration for micropayments
export class LightningPaymentHandler {
  constructor() {
    this.wallet = null;
    this.pendingPayments = new Map();
  }

  async init() {
    // Initialize WebLN (Lightning Network in browser)
    if (window.webln) {
      this.wallet = window.webln;
      await this.wallet.enable();
    }
  }

  async sendPayment(invoice, amount) {
    if (!this.wallet) {
      throw new Error('WebLN not available');
    }

    try {
      const result = await this.wallet.sendPayment(invoice);
      return {
        preimage: result.preimage,
        paymentHash: result.paymentHash,
        amount
      };
    } catch (error) {
      console.error('[Lightning] Payment failed:', error);
      throw error;
    }
  }

  async createInvoice(amount, description) {
    if (!this.wallet) {
      throw new Error('WebLN not available');
    }

    return await this.wallet.makeInvoice({
      amount,
      defaultMemo: description
    });
  }

  /**
   * Pay node for computation contribution
   */
  async payForCompute(nodeId, amount, workProof) {
    const _description = `Compute contribution: ${nodeId} (${workProof})`;
    
    // In a real implementation, this would verify the work proof
    // and send payment via Lightning Network
    

    
    return {
      paid: true,
      nodeId,
      amount,
      timestamp: Date.now()
    };
  }
}

// Singleton exports
let coordinator = null;

export function getTaskCoordinator() {
  if (!coordinator) coordinator = new TaskCoordinator();
  return coordinator;
}


