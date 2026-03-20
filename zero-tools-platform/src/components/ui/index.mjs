/**
 * UI Components Index
 * Central export for all reusable Web Components
 */

// Import all components (they self-register)
import './file-dropzone.mjs';

// Export for manual registration if needed
export { FileDropzone } from './file-dropzone.mjs';

// Component registry for dynamic loading
export const UI_COMPONENTS = {
  'file-dropzone': () => import('./file-dropzone.mjs')
};

/**
 * Lazy load a component on demand
 * @param {string} name - Component tag name (without extension)
 */
export async function loadComponent(name) {
  const loader = UI_COMPONENTS[name];
  if (!loader) {
    console.warn(`Component ${name} not found in registry`);
    return null;
  }
  
  try {
    const module = await loader();
    return module;
  } catch (error) {
    console.error(`Failed to load component ${name}:`, error);
    return null;
  }
}

/**
 * Check if component is registered
 * @param {string} tagName 
 */
export function isComponentRegistered(tagName) {
  return customElements.get(tagName) !== undefined;
}

/**
 * Wait for component to be defined
 * @param {string} tagName 
 * @param {number} timeout 
 */
export function whenDefined(tagName, timeout = 5000) {
  return Promise.race([
    customElements.whenDefined(tagName),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Component ${tagName} timeout`)), timeout)
    )
  ]);
}
