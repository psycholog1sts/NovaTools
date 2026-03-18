/**
 * Generative Tool Synthesis (GTS) - WebLLM Engine
 * Zero-code tool generation using Llama 3 70B (4-bit quantized)
 * Runs entirely in-browser via WebGPU
 */

// Model configuration
const MODEL_CONFIG = {
  model: 'Llama-3-70B-Instruct-q4f32_1',
  modelUrl: 'https://huggingface.co/mlc-ai/Llama-3-70B-Instruct-q4f32_1-MLC',
  contextWindow: 8192,
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 4096
};

// Tool generation prompt templates
const PROMPT_TEMPLATES = {
  toolGeneration: `You are an expert web developer specializing in privacy-first, zero-server tools.
Generate a complete tool based on the user request.

TOOL REQUEST: {{request}}

Generate a tool with the following structure:

1. META JSON (tool metadata):
{
  "id": "unique-tool-id",
  "name": "Tool Name",
  "category": "finance|pdf|image|dev|utility",
  "description": "SEO-optimized description (150-160 chars)",
  "keywords": ["keyword1", "keyword2"],
  "tier": 1,
  "schema": {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "...",
    "description": "...",
    "applicationCategory": "..."
  }
}

2. LOGIC (JavaScript module):
- Use vanilla JS with JSDoc types
- Import from '/src/core/utils/index.mjs'
- All processing must be client-side
- No external API calls
- Use Web Workers for heavy computation

3. UI (HTML structure):
- Semantic HTML5
- ARIA labels for accessibility
- Responsive design classes
- No inline styles

4. TESTS (fast-check property-based tests):
- Generate tests for edge cases
- Property-based testing for mathematical functions

Respond in this exact format:
---META---
[JSON metadata]
---LOGIC---
[javascript code]
---UI---
[html code]
---TESTS---
[test code]
---END---`,

  uiRefinement: `Refine this UI for better conversion and accessibility:

CURRENT UI:
{{currentUI}}

IMPROVEMENTS NEEDED:
1. Better visual hierarchy
2. Clearer call-to-action
3. Improved accessibility (ARIA)
4. Mobile-first responsive design
5. Dark mode support

Provide only the improved HTML with inline comments explaining changes.`,

  logicOptimization: `Optimize this code for performance:

CURRENT CODE:
{{currentCode}}

OPTIMIZATION TARGETS:
1. Reduce time complexity
2. Minimize memory allocations
3. Add Web Worker support for heavy operations
4. Implement chunked processing for large datasets
5. Add proper error handling

Provide only the optimized code with comments.`
};

export class WebLLMEngine {
  constructor() {
    this.chat = null;
    this.engine = null;
    this.isInitialized = false;
    this.cache = new Map();
    this.callbacks = new Map();
  }

  /**
   * Initialize WebLLM engine
   */
  async init(onProgress = null) {
    if (this.isInitialized) return true;

    try {
      // Try to load WebLLM from CDN if available
      if (window.MLCEngine) {
        this.engine = await window.MLCEngine.create(MODEL_CONFIG.model, {
          initProgressCallback: (progress) => {
            onProgress?.(progress);
          }
        });

        this.chat = new this.engine.ChatModule();
        await this.chat.reload(MODEL_CONFIG.model, {
          temperature: MODEL_CONFIG.temperature,
          topP: MODEL_CONFIG.topP,
          maxGenLen: MODEL_CONFIG.maxTokens
        });

        this.isInitialized = true;
        return true;
      }
      
      // Fall back to simulation mode
      console.warn('[WebLLM] MLCEngine not available, using simulation mode');
      return this.initSimulationMode(onProgress);
    } catch (error) {
      console.error('[WebLLM] Initialization failed:', error);
      return this.initSimulationMode(onProgress);
    }
  }

  /**
   * Generate tool from natural language request
   */
  async generateTool(request, onStream = null) {
    if (!this.isInitialized) {
      await this.init();
    }

    const prompt = PROMPT_TEMPLATES.toolGeneration
      .replace('{{request}}', request);

    const response = await this.generate(prompt, onStream);
    return this.parseToolOutput(response);
  }

  /**
   * Generate response from LLM
   */
  async generate(prompt, onStream = null) {
    if (!this.isInitialized) {
      throw new Error('WebLLM not initialized');
    }

    // Simulation mode
    if (this.simulationMode) {
      return this.simulateGeneration(prompt, onStream);
    }

    try {
      const messages = [
        { role: 'system', content: 'You are an expert web developer.' },
        { role: 'user', content: prompt }
      ];

      let response = '';
      
      const completion = await this.chat.completions.create({
        messages,
        stream: true,
        temperature: MODEL_CONFIG.temperature,
        max_tokens: MODEL_CONFIG.maxTokens
      });

      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content || '';
        response += content;
        onStream?.(content, response);
      }

      return response;
    } catch (error) {
      console.error('[WebLLM] Generation failed:', error);
      throw error;
    }
  }

  /**
   * Parse tool generation output
   */
  parseToolOutput(output) {
    const sections = {
      meta: this.extractSection(output, 'META'),
      logic: this.extractSection(output, 'LOGIC'),
      ui: this.extractSection(output, 'UI'),
      tests: this.extractSection(output, 'TESTS')
    };

    return {
      meta: JSON.parse(sections.meta),
      logic: sections.logic,
      ui: sections.ui,
      tests: sections.tests,
      timestamp: Date.now(),
      hash: this.generateHash(output)
    };
  }

  extractSection(output, sectionName) {
    const regex = new RegExp(`---${sectionName}---([\\s\\S]*?)(?=---|$)`);
    const match = output.match(regex);
    return match ? match[1].trim() : '';
  }

  generateHash(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Refine existing tool UI
   */
  async refineUI(currentUI, feedback = '') {
    const prompt = `${PROMPT_TEMPLATES.uiRefinement
      .replace('{{currentUI}}', currentUI)
       }\n\nUSER FEEDBACK: ${  feedback}`;

    return this.generate(prompt);
  }

  /**
   * Optimize tool logic
   */
  async optimizeLogic(currentCode) {
    const prompt = PROMPT_TEMPLATES.logicOptimization
      .replace('{{currentCode}}', currentCode);

    return this.generate(prompt);
  }

  /**
   * Check if model is cached
   */
  async isModelCached() {
    const cache = await caches.open('webllm-model-cache');
    const keys = await cache.keys();
    return keys.length > 0;
  }

  /**
   * Get memory usage
   */
  getMemoryUsage() {
    if (!this.engine) return null;
    return {
      gpu: this.engine.gpuMemoryUsage?.() || 0,
      js: performance.memory?.usedJSHeapSize || 0
    };
  }

  /**
   * Simulate generation for demo purposes
   */
  async simulateGeneration(prompt, onStream) {
    const simulatedResponse = `---META---
{
  "id": "generated-${Date.now()}",
  "name": "AI Generated Tool",
  "category": "finance",
  "description": "Auto-generated calculator tool",
  "keywords": ["calculator", "finance"],
  "tier": 1
}
---LOGIC---
export function calculate(input) { return input * 2; }
---UI---
<div class="tool"><input id="in"><button>Calc</button></div>
---TESTS---
test('calc', () => { expect(calculate(2)).toBe(4); });
---END---`;

    const chunks = simulatedResponse.split(' ');
    let response = '';
    
    for (const chunk of chunks) {
      await new Promise(r => setTimeout(r, 50));
      response += `${chunk  } `;
      onStream?.(`${chunk  } `, response);
    }

    return response;
  }

  /**
   * Simulation mode when WebLLM not available
   */
  async initSimulationMode(onProgress) {
    // Simulate loading progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 100));
      onProgress?.({ progress: i / 100 });
    }
    
    this.isInitialized = true;
    this.simulationMode = true;
    return true;
  }
}

// Tool Builder for assembling generated components
export class ToolBuilder {
  constructor() {
    this.components = new Map();
  }

  /**
   * Build complete tool from generated parts
   */
  async buildTool(generatedTool) {
    const { meta, logic, ui, tests } = generatedTool;
    
    // Create tool directory structure
    const toolPath = `src/tools/${meta.category}/${meta.id}`;
    
    // Assemble files
    const files = {
      'meta.json': JSON.stringify(meta, null, 2),
      'logic.mjs': this.wrapLogic(logic, meta),
      'index.html': this.wrapHTML(ui, meta),
      'logic.test.mjs': this.wrapTests(tests, meta)
    };

    // Save to OPFS (Origin Private File System)
    await this.saveToOPFS(toolPath, files);

    // Register in service worker
    await this.registerTool(meta);

    return {
      path: toolPath,
      files,
      url: `/src/tools/${meta.category}/${meta.id}/`
    };
  }

  wrapLogic(logic, meta) {
    return `/**
 * ${meta.name}
 * Auto-generated by GTS (Generative Tool Synthesis)
 * Generated: ${new Date().toISOString()}
 */

import { formatBytes, trackEvent, generateId } from '../../../core/utils/index.mjs';

${logic}

// Auto-initialize
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initTool?.();
  });
}
`;
  }

  wrapHTML(ui, meta) {
    return `<!DOCTYPE html>
<html lang="${meta.locale || 'en'}" data-tool-id="${meta.id}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meta.name} | ZeroTools</title>
  <meta name="description" content="${meta.description}">
  <meta name="keywords" content="${meta.keywords?.join(', ')}">
  <link rel="stylesheet" href="/src/styles/index.css">
  <script type="application/ld+json">${JSON.stringify(meta.schema)}</script>
</head>
<body>
  <main class="container">
    <h1>${meta.name}</h1>
    <p class="tool-description">${meta.description}</p>
    
    ${ui}
    
    <footer class="generated-by">
      <small>🔮 Generated by AI • <a href="/src/tools/demo-phase8/">GTS Engine</a></small>
    </footer>
  </main>
  
  <script type="module" src="./logic.mjs"></script>
</body>
</html>`;
  }

  wrapTests(tests, meta) {
    return `/**
 * ${meta.name} - Property-based Tests
 * Auto-generated by GTS
 */

import { test, fc } from '@fast-check/vitest';
import * as logic from './logic.mjs';

${tests}
`;
  }

  /**
   * Save files to Origin Private File System
   */
  async saveToOPFS(path, files) {
    const root = await navigator.storage.getDirectory();
    
    // Create directory structure
    const parts = path.split('/');
    let current = root;
    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create: true });
    }

    // Write files
    for (const [filename, content] of Object.entries(files)) {
      const fileHandle = await current.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    }

    // Tool saved to OPFS: path
  }

  /**
   * Register tool in service worker
   */
  async registerTool(meta) {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({
        type: 'REGISTER_TOOL',
        tool: meta
      });
    }

    // Update tools manifest in OPFS
    await this.updateToolsManifest(meta);
  }

  async updateToolsManifest(toolMeta) {
    const root = await navigator.storage.getDirectory();
    const manifestHandle = await root.getFileHandle('generated-tools.json', { create: true });
    
    let manifest = [];
    try {
      const file = await manifestHandle.getFile();
      const text = await file.text();
      manifest = JSON.parse(text);
    } catch (e) {
      // New manifest
    }

    manifest.push({
      ...toolMeta,
      generatedAt: Date.now(),
      version: '1.0.0'
    });

    const writable = await manifestHandle.createWritable();
    await writable.write(JSON.stringify(manifest, null, 2));
    await writable.close();
  }
}

// Tool Template Library for common patterns
export const TOOL_TEMPLATES = {
  calculator: {
    inputs: ['number', 'number'],
    outputs: ['number'],
    validations: ['non-zero', 'positive'],
    ui: 'form-with-result'
  },
  converter: {
    inputs: ['value', 'fromUnit', 'toUnit'],
    outputs: ['convertedValue'],
    validations: ['valid-unit'],
    ui: 'dropdown-converter'
  },
  analyzer: {
    inputs: ['file'],
    outputs: ['report'],
    validations: ['file-type', 'file-size'],
    ui: 'file-upload-with-charts'
  },
  validator: {
    inputs: ['text'],
    outputs: ['isValid', 'errors'],
    validations: [],
    ui: 'text-input-with-feedback'
  }
};

// Singleton instances
let webLLMEngine = null;
let toolBuilder = null;

export function getWebLLMEngine() {
  if (!webLLMEngine) webLLMEngine = new WebLLMEngine();
  return webLLMEngine;
}

export function getToolBuilder() {
  if (!toolBuilder) toolBuilder = new ToolBuilder();
  return toolBuilder;
}

// Utility exports
export async function generateTool(request, onProgress) {
  const engine = getWebLLMEngine();
  const generated = await engine.generateTool(request, onProgress);
  const builder = getToolBuilder();
  return builder.buildTool(generated);
}

export async function refineTool(toolId, feedback) {
  const engine = getWebLLMEngine();
  // Load existing tool and refine
  const root = await navigator.storage.getDirectory();
  const toolHandle = await root.getDirectoryHandle(toolId);
  const htmlHandle = await toolHandle.getFileHandle('index.html');
  const file = await htmlHandle.getFile();
  const currentUI = await file.text();
  
  return engine.refineUI(currentUI, feedback);
}

export { MODEL_CONFIG, PROMPT_TEMPLATES };
