/**
 * Lorem Ipsum Generator Logic Module
 * Professional placeholder text generation
 */

const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'ut', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'ut', 'aliquip', 'ex', 'ea',
  'commodo', 'consequat', 'duis', 'aute', 'irure', 'dolor', 'in', 'reprehenderit',
  'in', 'voluptate', 'velit', 'esse', 'cillum', 'dolore', 'eu', 'fugiat', 'nulla',
  'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident',
  'sunt', 'in', 'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id',
  'est', 'laborum', 'sed', 'ut', 'perspiciatis', 'unde', 'omnis', 'iste', 'natus',
  'error', 'sit', 'voluptatem', 'accusantium', 'doloremque', 'laudantium',
  'totam', 'rem', 'aperiam', 'eaque', 'ipsa', 'quae', 'ab', 'illo', 'inventore',
  'veritatis', 'et', 'quasi', 'architecto', 'beatae', 'vitae', 'dicta', 'sunt',
  'explicabo', 'nemo', 'enim', 'ipsam', 'voluptatem', 'quia', 'voluptas', 'sit',
  'aspernatur', 'aut', 'odit', 'aut', 'fugit', 'sed', 'quia', 'consequuntur',
  'magni', 'dolores', 'eos', 'qui', 'ratione', 'voluptatem', 'sequi', 'nesciunt'
];

const FUNNY_WORDS = [
  'purr', 'meow', 'woof', 'bork', 'blep', 'mlem', 'boop', 'snoot', 'floof',
  'chonk', 'smol', 'thicc', 'longboi', 'doggo', 'pupper', 'kitteh', 'birb',
  'snek', 'danger', 'noodle', 'nope', 'rope', 'zoomies', 'sploot', 'derp',
  'heckin', 'bamboozled', 'thicc', 'chonker', 'fur', 'baby', 'tippy', 'taps'
];

const CORPORATE_WORDS = [
  'synergy', 'leverage', 'paradigm', 'holistic', 'streamline', 'bandwidth',
  'circle', 'back', 'ping', 'loop', 'in', 'touch', 'actionable', 'insights',
  'deliverables', 'moving', 'parts', 'low', 'hanging', 'fruit', 'boil',
  'the', 'ocean', 'move', 'needle', 'best', 'practices', 'core', 'competency',
  'value', 'add', 'ideate', 'disrupt', 'innovative', 'scalable', 'sustainable'
];

/**
 * Generate random integer
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get random word from array
 * @param {string[]} words - Word array
 * @returns {string} Random word
 */
function getRandomWord(words) {
  return words[Math.floor(Math.random() * words.length)];
}

/**
 * Capitalize first letter
 * @param {string} text - Input text
 * @returns {string} Capitalized text
 */
function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Generate words
 * @param {number} count - Number of words
 * @param {string} type - Word type (lorem, funny, corporate)
 * @returns {string} Generated words
 */
export function generateWords(count, type = 'lorem') {
  const wordPool = type === 'funny' ? FUNNY_WORDS : 
                   type === 'corporate' ? CORPORATE_WORDS : 
                   LOREM_WORDS;
  
  const words = [];
  for (let i = 0; i < count; i++) {
    words.push(getRandomWord(wordPool));
  }
  return words.join(' ');
}

/**
 * Generate sentences
 * @param {number} count - Number of sentences
 * @param {string} type - Word type
 * @returns {string} Generated sentences
 */
export function generateSentences(count, type = 'lorem') {
  const sentences = [];
  
  for (let i = 0; i < count; i++) {
    const wordCount = randomInt(8, 20);
    const words = generateWords(wordCount, type);
    sentences.push(`${capitalize(words)}.`);
  }
  
  return sentences.join(' ');
}

/**
 * Generate paragraphs
 * @param {number} count - Number of paragraphs
 * @param {string} type - Word type
 * @returns {string} Generated paragraphs
 */
export function generateParagraphs(count, type = 'lorem') {
  const paragraphs = [];
  
  for (let i = 0; i < count; i++) {
    const sentenceCount = randomInt(4, 8);
    paragraphs.push(generateSentences(sentenceCount, type));
  }
  
  return paragraphs.join('\n\n');
}

/**
 * Generate list items
 * @param {number} count - Number of items
 * @param {string} type - Word type
 * @returns {string[]} Generated items
 */
export function generateListItems(count, type = 'lorem') {
  const items = [];
  
  for (let i = 0; i < count; i++) {
    const wordCount = randomInt(3, 8);
    items.push(capitalize(generateWords(wordCount, type)));
  }
  
  return items;
}

/**
 * Generate HTML
 * @param {number} paragraphs - Number of paragraphs
 * @param {string} type - Word type
 * @returns {string} HTML output
 */
export function generateHTML(paragraphs, type = 'lorem') {
  const text = generateParagraphs(paragraphs, type);
  return text.split('\n\n').map(p => `<p>${p}</p>`).join('\n');
}

/**
 * Generate with options
 * @param {Object} options - Generation options
 * @returns {Object} Generated content
 */
export function generate(options = {}) {
  const {
    type = 'lorem',
    format = 'paragraphs',
    count = 3,
    startWithLorem = true
  } = options;
  
  let result;
  
  switch (format) {
    case 'words':
      result = generateWords(count, type);
      break;
    case 'sentences':
      result = generateSentences(count, type);
      break;
    case 'paragraphs':
      result = generateParagraphs(count, type);
      break;
    case 'list':
      result = generateListItems(count, type);
      break;
    case 'html':
      result = generateHTML(count, type);
      break;
    default:
      result = generateParagraphs(count, type);
  }
  
  if (startWithLorem && typeof result === 'string' && !result.toLowerCase().startsWith('lorem')) {
    result = `Lorem ipsum ${result.charAt(0).toLowerCase()}${result.slice(1)}`;
  }
  
  return {
    text: result,
    wordCount: typeof result === 'string' ? result.split(/\s+/).length : result.length,
    charCount: typeof result === 'string' ? result.length : result.join('').length
  };
}

export default { generate, generateParagraphs, generateSentences, generateWords };
