/**
 * Tool Controller
 * Centralized tool registration, validation, and execution framework
 */

import { ValidationEngine } from './validation-engine.mjs';
import { ErrorHandler } from './error-handler.mjs';

class ToolController {
  constructor() {
    this.tools = new Map();
    this.hooks = new Map();
    this.validationEngine = new ValidationEngine();
  }

  /**
   * Register a tool with the system
   * @param {string} id - Unique tool identifier
   * @param {Object} config - Tool configuration
   * @param {Function} handler - Tool execution function
   */
  registerTool(id, config, handler) {
    if (this.tools.has(id)) {
      console.warn(`Tool "${id}" is being redefined`);
    }

    this.tools.set(id, {
      id,
      config: {
        name: config.name,
        description: config.description,
        category: config.category,
        icon: config.icon || '🛠️',
        inputs: config.inputs || [],
        outputs: config.outputs || [],
        fileUpload: config.fileUpload || null,
        ...config
      },
      handler
    });
  }

  /**
   * Execute a tool with validated inputs
   * @param {string} toolId - Tool identifier
   * @param {Object} inputs - Tool inputs
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeTool(toolId, inputs = {}, options = {}) {
    const tool = this.tools.get(toolId);
    
    if (!tool) {
      throw new Error(`Tool "${toolId}" not found`);
    }

    const context = {
      toolId,
      startTime: performance.now(),
      inputs,
      options
    };

    // Run pre-execution hooks
    await this.runHooks('beforeExecute', context);

    try {
      // Validate inputs
      const validation = this.validationEngine.validate(inputs, tool.config.inputs);
      if (!validation.valid) {
        const error = new Error(`Validation failed: ${validation.errors.join(', ')}`);
        error.name = 'ValidationError';
        error.errors = validation.errors;
        throw error;
      }

      // Execute tool
      const result = await tool.handler(validation.sanitized, context);

      // Run post-execution hooks
      context.result = result;
      context.endTime = performance.now();
      context.duration = context.endTime - context.startTime;
      
      await this.runHooks('afterExecute', context);

      return {
        success: true,
        data: result,
        duration: context.duration
      };

    } catch (error) {
      context.error = error;
      await this.runHooks('onError', context);
      
      return {
        success: false,
        error: ErrorHandler.classify(error),
        duration: performance.now() - context.startTime
      };
    }
  }

  /**
   * Register a lifecycle hook
   * @param {string} event - Event name (beforeExecute, afterExecute, onError)
   * @param {Function} handler - Hook handler
   */
  addHook(event, handler) {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }
    this.hooks.get(event).push(handler);
  }

  /**
   * Run all hooks for an event
   * @param {string} event - Event name
   * @param {Object} context - Execution context
   */
  async runHooks(event, context) {
    const hooks = this.hooks.get(event) || [];
    for (const hook of hooks) {
      await hook(context);
    }
  }

  /**
   * Get all registered tools
   * @returns {Array} List of tool metadata
   */
  getTools() {
    return Array.from(this.tools.values()).map(t => ({
      id: t.id,
      ...t.config
    }));
  }

  /**
   * Get tools by category
   * @param {string} category - Category name
   * @returns {Array} Filtered tools
   */
  getToolsByCategory(category) {
    return this.getTools().filter(t => t.category === category);
  }

  /**
   * Get tool configuration
   * @param {string} toolId - Tool identifier
   * @returns {Object|null} Tool config
   */
  getToolConfig(toolId) {
    const tool = this.tools.get(toolId);
    return tool ? tool.config : null;
  }

  /**
   * Check if tool exists
   * @param {string} toolId - Tool identifier
   * @returns {boolean}
   */
  hasTool(toolId) {
    return this.tools.has(toolId);
  }
}

// Singleton instance
export const toolController = new ToolController();

// Convenience exports
export const registerTool = (id, config, handler) => toolController.registerTool(id, config, handler);
export const executeTool = (id, inputs, options) => toolController.executeTool(id, inputs, options);
export const getTools = () => toolController.getTools();

export default toolController;
