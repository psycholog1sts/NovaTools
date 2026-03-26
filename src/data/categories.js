/**
 * MC NovaTools - Category System
 * Modern, scalable category architecture
 */

export const categories = [
  {
    slug: 'pdf-tools',
    name: 'PDF Tools',
    shortName: 'PDF',
    description: 'Convert, merge, split, compress and edit PDF files with powerful browser-based tools.',
    shortDescription: 'Edit and convert PDFs',
    icon: 'file-text',
    color: '#EF4444',
    gradient: 'from-red-500/20 to-orange-500/20',
    featured: true,
    toolCount: 0,
    tags: ['pdf', 'convert', 'merge', 'split', 'compress'],
    meta: {
      title: 'Free PDF Tools Online - Merge, Split, Convert | NovaTools',
      description: 'Free online PDF tools: merge PDFs, split pages, compress files, convert to Word/Excel. 100% private, works in your browser.',
      keywords: 'pdf merge, pdf split, pdf compress, pdf to word, pdf editor'
    }
  },
  {
    slug: 'image-tools',
    name: 'Image Tools',
    shortName: 'Image',
    description: 'Compress, convert, resize, and enhance images. Support for WebP, AVIF, PNG, JPG and more.',
    shortDescription: 'Optimize and edit images',
    icon: 'image',
    color: '#8B5CF6',
    gradient: 'from-purple-500/20 to-pink-500/20',
    featured: true,
    toolCount: 0,
    tags: ['image', 'compress', 'convert', 'resize', 'webp'],
    meta: {
      title: 'Free Image Tools - Compress, Convert, Resize | NovaTools',
      description: 'Free image optimization tools: compress images, convert formats, resize photos. WebP, AVIF, PNG, JPG support.',
      keywords: 'image compressor, convert image, webp converter, resize photo'
    }
  },
  {
    slug: 'finance-tools',
    name: 'Finance Tools',
    shortName: 'Finance',
    description: 'Mortgage calculators, compound interest, tax estimators, retirement planners and more financial tools.',
    shortDescription: 'Calculators for your money',
    icon: 'trending-up',
    color: '#10B981',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    featured: true,
    toolCount: 0,
    tags: ['finance', 'mortgage', 'tax', 'calculator', 'investment'],
    meta: {
      title: 'Free Financial Calculators - Mortgage, Tax, Investment | NovaTools',
      description: 'Free financial tools: mortgage calculator, tax estimator, compound interest, retirement planner. Plan your financial future.',
      keywords: 'mortgage calculator, tax calculator, compound interest, retirement planner'
    }
  },
  {
    slug: 'text-writing',
    name: 'Text & Writing',
    shortName: 'Text',
    description: 'Word counter, case converter, text diff, Lorem ipsum generator and other writing utilities.',
    shortDescription: 'Writing and text utilities',
    icon: 'type',
    color: '#3B82F6',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    featured: true,
    toolCount: 0,
    tags: ['text', 'word', 'count', 'convert', 'write'],
    meta: {
      title: 'Free Text Tools - Word Counter, Converter | NovaTools',
      description: 'Free writing tools: word counter, case converter, text diff checker, Lorem ipsum generator. Perfect for writers and students.',
      keywords: 'word counter, case converter, text diff, lorem ipsum'
    }
  },
  {
    slug: 'developer-tools',
    name: 'Developer Tools',
    shortName: 'Dev',
    description: 'JSON formatter, regex tester, base64 converter, code minifiers and developer utilities.',
    shortDescription: 'Tools for developers',
    icon: 'code',
    color: '#F59E0B',
    gradient: 'from-amber-500/20 to-yellow-500/20',
    featured: true,
    toolCount: 0,
    tags: ['developer', 'json', 'code', 'regex', 'base64'],
    meta: {
      title: 'Free Developer Tools - JSON, Regex, Code | NovaTools',
      description: 'Free developer utilities: JSON formatter, regex tester, base64 converter, code minifier. Built for developers.',
      keywords: 'json formatter, regex tester, base64 converter, code minifier'
    }
  },
  {
    slug: 'converters',
    name: 'Converters',
    shortName: 'Convert',
    description: 'Unit converter, currency converter, time converter, number base converter and more.',
    shortDescription: 'Convert anything',
    icon: 'repeat',
    color: '#EC4899',
    gradient: 'from-pink-500/20 to-rose-500/20',
    featured: true,
    toolCount: 0,
    tags: ['converter', 'unit', 'currency', 'time', 'calculation'],
    meta: {
      title: 'Free Online Converters - Units, Currency, Time | NovaTools',
      description: 'Free converters: units, currency, time zones, number bases. Accurate and easy to use.',
      keywords: 'unit converter, currency converter, time converter, calculator'
    }
  },
  {
    slug: 'calculator-tools',
    name: 'Calculators',
    shortName: 'Calculate',
    description: 'Scientific calculator, percentage calculator, BMI calculator, age calculator and more.',
    shortDescription: 'All types of calculators',
    icon: 'calculator',
    color: '#06B6D4',
    gradient: 'from-cyan-500/20 to-sky-500/20',
    featured: false,
    toolCount: 0,
    tags: ['calculator', 'math', 'scientific', 'bmi', 'percentage'],
    meta: {
      title: 'Free Online Calculators - Scientific, BMI, Math | NovaTools',
      description: 'Free calculators: scientific, BMI, percentage, age calculator. Simple and accurate tools.',
      keywords: 'calculator, scientific calculator, bmi calculator, math tools'
    }
  },
  {
    slug: 'security-tools',
    name: 'Security Tools',
    shortName: 'Security',
    description: 'Password generator, hash generator, UUID generator, encryption tools and security utilities.',
    shortDescription: 'Protect your data',
    icon: 'shield',
    color: '#6366F1',
    gradient: 'from-indigo-500/20 to-violet-500/20',
    featured: false,
    toolCount: 0,
    tags: ['security', 'password', 'hash', 'encrypt', 'uuid'],
    meta: {
      title: 'Free Security Tools - Password, Hash, Encrypt | NovaTools',
      description: 'Free security tools: password generator, hash generator, UUID generator, encryption. Keep your data safe.',
      keywords: 'password generator, hash generator, uuid, encryption tools'
    }
  },
  {
    slug: 'social-media-tools',
    name: 'Social Media',
    shortName: 'Social',
    description: 'YouTube thumbnail downloader, Instagram photo downloader, hashtag generator and social tools.',
    shortDescription: 'Tools for social platforms',
    icon: 'share-2',
    color: '#F97316',
    gradient: 'from-orange-500/20 to-red-500/20',
    featured: false,
    toolCount: 0,
    tags: ['social', 'youtube', 'instagram', 'download', 'hashtag'],
    meta: {
      title: 'Free Social Media Tools - YouTube, Instagram | NovaTools',
      description: 'Free social media tools: YouTube thumbnail downloader, Instagram photo downloader, hashtag generator.',
      keywords: 'youtube downloader, instagram downloader, hashtag generator'
    }
  },
  {
    slug: 'productivity-tools',
    name: 'Productivity',
    shortName: 'Productivity',
    description: 'Todo lists, notes, Pomodoro timer, habit tracker and productivity utilities.',
    shortDescription: 'Boost your productivity',
    icon: 'zap',
    color: '#84CC16',
    gradient: 'from-lime-500/20 to-green-500/20',
    featured: false,
    toolCount: 0,
    tags: ['productivity', 'timer', 'todo', 'notes', 'tracker'],
    meta: {
      title: 'Free Productivity Tools - Timer, Todo, Notes | NovaTools',
      description: 'Free productivity tools: Pomodoro timer, todo lists, notes, habit tracker. Get more done.',
      keywords: 'pomodoro timer, todo list, habit tracker, productivity'
    }
  },
  {
    slug: 'data-tools',
    name: 'Data Tools',
    shortName: 'Data',
    description: 'CSV to JSON, JSON to CSV, SQL formatter, file organizers and data manipulation tools.',
    shortDescription: 'Work with data',
    icon: 'database',
    color: '#14B8A6',
    gradient: 'from-teal-500/20 to-emerald-500/20',
    featured: false,
    toolCount: 0,
    tags: ['data', 'csv', 'json', 'sql', 'file'],
    meta: {
      title: 'Free Data Tools - CSV, JSON, SQL | NovaTools',
      description: 'Free data tools: CSV to JSON converter, SQL formatter, file organizers. Work smarter with data.',
      keywords: 'csv to json, sql formatter, data converter, file organizer'
    }
  },
  {
    slug: 'design-tools',
    name: 'Design Tools',
    shortName: 'Design',
    description: 'Logo maker, business card creator, mockup generator, wireframe tools and design utilities.',
    shortDescription: 'Create visuals',
    icon: 'palette',
    color: '#D946EF',
    gradient: 'from-fuchsia-500/20 to-purple-500/20',
    featured: false,
    toolCount: 0,
    tags: ['design', 'logo', 'mockup', 'wireframe', 'create'],
    meta: {
      title: 'Free Design Tools - Logo, Mockup, Wireframe | NovaTools',
      description: 'Free design tools: logo maker, business card creator, mockup generator. Create stunning visuals.',
      keywords: 'logo maker, mockup generator, wireframe tool, design creator'
    }
  }
];

/**
 * Get category by slug
 */
export function getCategory(slug) {
  return categories.find(c => c.slug === slug) || null;
}

/**
 * Get featured categories
 */
export function getFeaturedCategories() {
  return categories.filter(c => c.featured);
}

/**
 * Get all category slugs for routing
 */
export function getCategorySlugs() {
  return categories.map(c => c.slug);
}

export default categories;
