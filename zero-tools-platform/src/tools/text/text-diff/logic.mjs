/**
 * Text Diff Logic Module
 * Compare two texts and find differences
 */

/**
 * Calculate diff between two texts
 * @param {string} oldText - Original text
 * @param {string} newText - Modified text
 * @param {Object} options - Diff options
 * @returns {Array} Array of diff operations
 */
export function diff(oldText, newText, options = {}) {
  const { ignoreCase = false, ignoreWhitespace = false } = options;
  
  if (!oldText) oldText = '';
  if (!newText) newText = '';
  
  if (ignoreCase) {
    oldText = oldText.toLowerCase();
    newText = newText.toLowerCase();
  }
  
  if (ignoreWhitespace) {
    oldText = oldText.replace(/\s+/g, ' ').trim();
    newText = newText.replace(/\s+/g, ' ').trim();
  }
  
  // Simple line-by-line diff
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  
  const result = [];
  let oldIndex = 0;
  let newIndex = 0;
  
  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    const oldLine = oldLines[oldIndex];
    const newLine = newLines[newIndex];
    
    if (oldLine === undefined) {
      // Added line
      result.push({ type: 'add', line: newLine, lineNum: newIndex + 1 });
      newIndex++;
    } else if (newLine === undefined) {
      // Removed line
      result.push({ type: 'remove', line: oldLine, lineNum: oldIndex + 1 });
      oldIndex++;
    } else if (oldLine === newLine) {
      // Unchanged
      result.push({ type: 'same', line: oldLine, oldLineNum: oldIndex + 1, newLineNum: newIndex + 1 });
      oldIndex++;
      newIndex++;
    } else {
      // Changed - check if next lines match
      const nextOldMatch = newLines.slice(newIndex + 1).indexOf(oldLine);
      const nextNewMatch = oldLines.slice(oldIndex + 1).indexOf(newLine);
      
      if (nextOldMatch !== -1 && (nextNewMatch === -1 || nextOldMatch < nextNewMatch)) {
        // Lines were added
        result.push({ type: 'add', line: newLine, lineNum: newIndex + 1 });
        newIndex++;
      } else if (nextNewMatch !== -1) {
        // Lines were removed
        result.push({ type: 'remove', line: oldLine, lineNum: oldIndex + 1 });
        oldIndex++;
      } else {
        // Line was modified
        const wordDiff = diffWords(oldLine, newLine);
        result.push({ 
          type: 'change', 
          oldLine, 
          newLine, 
          oldLineNum: oldIndex + 1,
          newLineNum: newIndex + 1,
          wordDiff 
        });
        oldIndex++;
        newIndex++;
      }
    }
  }
  
  return result;
}

/**
 * Diff at word level
 * @param {string} oldText - Original text
 * @param {string} newText - Modified text
 * @returns {Array} Word-level diff
 */
function diffWords(oldText, newText) {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);
  
  const result = [];
  let i = 0, j = 0;
  
  while (i < oldWords.length || j < newWords.length) {
    if (i >= oldWords.length) {
      result.push({ type: 'add', text: newWords[j] });
      j++;
    } else if (j >= newWords.length) {
      result.push({ type: 'remove', text: oldWords[i] });
      i++;
    } else if (oldWords[i] === newWords[j]) {
      result.push({ type: 'same', text: oldWords[i] });
      i++;
      j++;
    } else {
      result.push({ type: 'remove', text: oldWords[i] });
      result.push({ type: 'add', text: newWords[j] });
      i++;
      j++;
    }
  }
  
  return result;
}

/**
 * Character-level diff
 * @param {string} oldText - Original text
 * @param {string} newText - Modified text
 * @returns {Array} Character diff
 */
export function diffChars(oldText, newText) {
  if (!oldText) oldText = '';
  if (!newText) newText = '';
  
  const m = oldText.length;
  const n = newText.length;
  
  // Dynamic programming matrix
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldText[i - 1] === newText[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // Backtrack to find diff
  const result = [];
  let i = m, j = n;
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldText[i - 1] === newText[j - 1]) {
      result.unshift({ type: 'same', char: oldText[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'add', char: newText[j - 1] });
      j--;
    } else {
      result.unshift({ type: 'remove', char: oldText[i - 1] });
      i--;
    }
  }
  
  return result;
}

/**
 * Generate unified diff format
 * @param {string} oldText - Original text
 * @param {string} newText - Modified text
 * @param {string} oldHeader - Header for old file
 * @param {string} newHeader - Header for new file
 * @returns {string} Unified diff
 */
export function unifiedDiff(oldText, newText, oldHeader = 'old', newHeader = 'new') {
  const differences = diff(oldText, newText);
  
  let output = `--- ${oldHeader}\n+++ ${newHeader}\n`;
  let oldLine = 1, newLine = 1;
  
  const hunks = [];
  let currentHunk = [];
  
  differences.forEach((item) => {
    if (item.type === 'same') {
      if (currentHunk.length > 0) {
        hunks.push(currentHunk);
        currentHunk = [];
      }
      oldLine++;
      newLine++;
    } else {
      currentHunk.push({ ...item, oldLine, newLine });
      if (item.type === 'remove') oldLine++;
      if (item.type === 'add') newLine++;
    }
  });
  
  if (currentHunk.length > 0) {
    hunks.push(currentHunk);
  }
  
  // Format hunks
  hunks.forEach(hunk => {
    const _context = 3;
    void _context;
    output += `@@ -${hunk[0].oldLine},${hunk.filter(i => i.type !== 'add').length} +${hunk[0].newLine},${hunk.filter(i => i.type !== 'remove').length} @@\n`;
    
    hunk.forEach(item => {
      if (item.type === 'remove') output += `-${item.line}\n`;
      else if (item.type === 'add') output += `+${item.line}\n`;
      else output += ` ${item.line}\n`;
    });
  });
  
  return output;
}

/**
 * Calculate similarity percentage
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {number} Similarity percentage (0-100)
 */
export function similarity(text1, text2) {
  if (!text1 && !text2) return 100;
  if (!text1 || !text2) return 0;
  
  const charDiff = diffChars(text1, text2);
  const same = charDiff.filter(c => c.type === 'same').length;
  
  return Math.round((same / Math.max(text1.length, text2.length)) * 100);
}

/**
 * Get diff statistics
 * @param {Array} differences - Diff result
 * @returns {Object} Statistics
 */
export function getStats(differences) {
  const added = differences.filter(d => d.type === 'add').length;
  const removed = differences.filter(d => d.type === 'remove').length;
  const changed = differences.filter(d => d.type === 'change').length;
  const unchanged = differences.filter(d => d.type === 'same').length;
  
  return {
    added,
    removed,
    changed,
    unchanged,
    total: differences.length,
    netChange: added - removed
  };
}

export default { diff, diffChars, unifiedDiff, similarity, getStats };
