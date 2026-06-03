const ORIGIN = 'https://mc-novatools.com';
const ORGANIZATION_ID = `${ORIGIN}/#organization`;
const WEBSITE_ID = `${ORIGIN}/#website`;
const PRIMARY_AUTHOR_ID = `${ORIGIN}/author/metehan-cetin.html#person`;
const PRIMARY_AUTHOR_URL = `${ORIGIN}/author/metehan-cetin.html`;
const PRIMARY_AUTHOR_NAME = 'Metehan Çetin, LPC';

const TOOL_CATEGORY_MAP = {
  converters: 'UtilityApplication',
  data: 'DeveloperApplication',
  design: 'DesignApplication',
  dev: 'DeveloperApplication',
  finance: 'FinanceApplication',
  image: 'MultimediaApplication',
  pdf: 'BusinessApplication',
  productivity: 'ProductivityApplication',
  security: 'SecurityApplication',
  text: 'UtilityApplication'
};

const CATEGORY_LABELS = {
  converters: 'Converters',
  data: 'Data Tools',
  design: 'Design Tools',
  dev: 'Developer Tools',
  finance: 'Finance Tools',
  image: 'Image Tools',
  pdf: 'PDF Tools',
  productivity: 'Productivity Tools',
  security: 'Security Tools',
  text: 'Text Tools'
};

const cleanText = (value = '') => String(value).replace(/\s+/g, ' ').trim();

const stripHtml = (value = '') => cleanText(String(value).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' '));

const ensureAbsoluteUrl = (pathOrUrl = '/') => {
  const value = String(pathOrUrl || '/').trim();
  if (/^https?:\/\//i.test(value)) return normalizeCanonicalUrl(value);
  return normalizeCanonicalUrl(`${ORIGIN}${value.startsWith('/') ? value : `/${value}`}`);
};

const normalizeCanonicalUrl = (url) => {
  const parsed = new URL(String(url || ORIGIN), ORIGIN);
  parsed.hostname = 'mc-novatools.com';
  parsed.protocol = 'https:';
  parsed.hash = '';
  parsed.search = '';
  return parsed.toString().replace(/\/$/, parsed.pathname === '/' ? '/' : '');
};

const withFragment = (url, fragment) => `${normalizeCanonicalUrl(url)}#${fragment}`;

const defined = (value) => value !== undefined && value !== null && value !== '';

const compactObject = (object) => Object.fromEntries(Object.entries(object).filter(([, value]) => {
  if (Array.isArray(value)) return value.length > 0;
  return defined(value);
}));

const buildOffer = () => ({
  '@type': 'Offer',
  price: '0',
  priceCurrency: 'USD',
  description: 'Free to use'
});

const buildAuthorReference = () => ({ '@id': PRIMARY_AUTHOR_ID });
const buildOrganizationReference = () => ({ '@id': ORGANIZATION_ID });
const buildWebsiteReference = () => ({ '@id': WEBSITE_ID });

export const structuredDataConstants = {
  ORIGIN,
  ORGANIZATION_ID,
  WEBSITE_ID,
  PRIMARY_AUTHOR_ID,
  PRIMARY_AUTHOR_URL,
  PRIMARY_AUTHOR_NAME
};

export const buildHomeSchema = ({ url = `${ORIGIN}/`, name = 'MC NovaTools', description = 'Privacy-aware browser tools for files, finance, images, text, developer workflows, and everyday productivity.', dateModified } = {}) => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      name,
      url: `${ORIGIN}/`,
      description,
      inLanguage: 'en',
      publisher: buildOrganizationReference(),
      potentialAction: {
        '@type': 'SearchAction',
        target: `${ORIGIN}/?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    },
    {
      '@type': 'Organization',
      '@id': ORGANIZATION_ID,
      name: 'MC NovaTools',
      url: `${ORIGIN}/`,
      logo: `${ORIGIN}/logo-brand-260.webp`,
      email: 'support@mc-novatools.com',
      founder: buildAuthorReference()
    },
    {
      '@type': 'WebPage',
      '@id': withFragment(url, 'webpage'),
      url: normalizeCanonicalUrl(url),
      name,
      description,
      isPartOf: buildWebsiteReference(),
      publisher: buildOrganizationReference(),
      author: buildAuthorReference(),
      dateModified
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${ORIGIN}/#software`,
      name: 'MC NovaTools',
      applicationCategory: 'UtilityApplication',
      operatingSystem: 'Any (Browser-based)',
      url: `${ORIGIN}/`,
      offers: buildOffer(),
      featureList: [
        'Browser-based utility workflows',
        'Privacy-aware file preparation where client-side processing is supported',
        'PDF, image, finance, text, developer, data, and productivity tools',
        'No required account for public tools'
      ],
      dateModified
    }
  ]
});

export const buildToolPageSchema = ({ url, name, description, category, version, created, updated, keywords = [], howToSteps = [], faqs = [], clientSide = false, dateModified } = {}) => {
  const canonicalUrl = normalizeCanonicalUrl(url);
  const toolName = cleanText(name || 'NovaTools Browser Tool');
  const safeDescription = cleanText(description || `${toolName} is a free browser-based utility from MC NovaTools.`);
  const softwareId = withFragment(canonicalUrl, 'software');
  const featureList = [
    clientSide ? 'Browser-side processing where the tool supports local file handling' : 'Browser-based workflow with visible input and output review steps',
    'Free to use',
    'No account required for the public tool',
    'Designed for desktop and mobile browsers',
    'Includes practical limits and manual review guidance'
  ];

  return {
    '@context': 'https://schema.org',
    '@graph': [
      compactObject({
        '@type': 'WebPage',
        '@id': withFragment(canonicalUrl, 'webpage'),
        url: canonicalUrl,
        name: `${toolName} — Free Online Tool`,
        description: safeDescription,
        isPartOf: buildWebsiteReference(),
        publisher: buildOrganizationReference(),
        datePublished: created,
        dateModified: dateModified || updated,
        author: buildAuthorReference(),
        mainEntity: { '@id': softwareId }
      }),
      compactObject({
        '@type': 'SoftwareApplication',
        '@id': softwareId,
        name: toolName,
        description: safeDescription,
        applicationCategory: TOOL_CATEGORY_MAP[category] || 'UtilityApplication',
        operatingSystem: 'Any (Browser-based)',
        url: canonicalUrl,
        keywords: keywords.length ? keywords.join(', ') : undefined,
        offers: buildOffer(),
        featureList,
        softwareVersion: version,
        dateModified: dateModified || updated
      }),
      {
        '@type': 'FAQPage',
        '@id': withFragment(canonicalUrl, 'faq'),
        mainEntity: faqs.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: answer
          }
        }))
      },
      {
        '@type': 'HowTo',
        '@id': withFragment(canonicalUrl, 'howto'),
        name: `How to Use ${toolName}`,
        description: `A practical workflow for using ${toolName} and reviewing the result before sharing it.`,
        totalTime: 'PT2M',
        step: howToSteps.map((step, index) => ({
          '@type': 'HowToStep',
          position: index + 1,
          name: step.name,
          text: step.text,
          url: `${canonicalUrl}#step-${index + 1}`
        }))
      }
    ]
  };
};

export const buildBlogPostSchema = ({ url, headline, description, image, datePublished, dateModified, section, wordCount, proficiencyLevel = 'Beginner to Intermediate' } = {}) => {
  const canonicalUrl = normalizeCanonicalUrl(url);
  const articleId = withFragment(canonicalUrl, 'article');
  const pageId = withFragment(canonicalUrl, 'webpage');

  return {
    '@context': 'https://schema.org',
    '@graph': [
      compactObject({
        '@type': 'WebPage',
        '@id': pageId,
        url: canonicalUrl,
        name: headline,
        description,
        isPartOf: buildWebsiteReference(),
        publisher: buildOrganizationReference(),
        author: buildAuthorReference(),
        datePublished,
        dateModified,
        mainEntity: { '@id': articleId }
      }),
      compactObject({
        '@type': 'TechArticle',
        '@id': articleId,
        headline,
        description,
        image: image ? ensureAbsoluteUrl(image) : undefined,
        author: buildAuthorReference(),
        publisher: buildOrganizationReference(),
        datePublished,
        dateModified,
        mainEntityOfPage: { '@id': pageId },
        articleSection: section,
        wordCount,
        proficiencyLevel
      })
    ]
  };
};

export const buildCategoryPageSchema = ({ url, name, description, items = [], dateModified } = {}) => {
  const canonicalUrl = normalizeCanonicalUrl(url);
  const itemListId = withFragment(canonicalUrl, 'itemlist');

  return {
    '@context': 'https://schema.org',
    '@graph': [
      compactObject({
        '@type': 'CollectionPage',
        '@id': withFragment(canonicalUrl, 'webpage'),
        name,
        description,
        url: canonicalUrl,
        isPartOf: buildWebsiteReference(),
        publisher: buildOrganizationReference(),
        author: buildAuthorReference(),
        dateModified,
        mainEntity: { '@id': itemListId }
      }),
      {
        '@type': 'ItemList',
        '@id': itemListId,
        name,
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          url: normalizeCanonicalUrl(item.url)
        }))
      }
    ]
  };
};

export const buildAuthorPageSchema = ({ url, name = PRIMARY_AUTHOR_NAME, description, jobTitle = 'Founder, Editor and Browser Workflow Reviewer', image, dateModified } = {}) => {
  const canonicalUrl = normalizeCanonicalUrl(url || PRIMARY_AUTHOR_URL);
  const personId = withFragment(canonicalUrl, 'person');
  const profileId = withFragment(canonicalUrl, 'webpage');

  return {
    '@context': 'https://schema.org',
    '@graph': [
      compactObject({
        '@type': 'ProfilePage',
        '@id': profileId,
        url: canonicalUrl,
        name: `${name} Author Profile`,
        description,
        isPartOf: buildWebsiteReference(),
        publisher: buildOrganizationReference(),
        dateModified,
        mainEntity: { '@id': personId }
      }),
      compactObject({
        '@type': 'Person',
        '@id': personId,
        name,
        jobTitle,
        url: canonicalUrl,
        image: image ? ensureAbsoluteUrl(image) : undefined,
        worksFor: buildOrganizationReference(),
        knowsAbout: [
          'Browser-based privacy workflows',
          'PDF processing',
          'Image optimization',
          'Web development utilities',
          'Accessibility-aware content',
          'Responsible calculator disclaimers'
        ],
        description
      })
    ]
  };
};

export const buildEditorialAuthorPageSchema = ({ url, name = 'NovaTools Editorial Review', description, dateModified } = {}) => {
  const canonicalUrl = normalizeCanonicalUrl(url);
  const orgId = withFragment(canonicalUrl, 'editorial');
  const profileId = withFragment(canonicalUrl, 'webpage');

  return {
    '@context': 'https://schema.org',
    '@graph': [
      compactObject({
        '@type': 'ProfilePage',
        '@id': profileId,
        url: canonicalUrl,
        name: `${name} Author Profile`,
        description,
        isPartOf: buildWebsiteReference(),
        publisher: buildOrganizationReference(),
        dateModified,
        mainEntity: { '@id': orgId }
      }),
      compactObject({
        '@type': 'Organization',
        '@id': orgId,
        name,
        url: canonicalUrl,
        parentOrganization: buildOrganizationReference(),
        description
      })
    ]
  };
};

export const makeDefaultToolFaqs = (toolName, clientSide = false) => [
  {
    question: `Is ${toolName} free to use?`,
    answer: `Yes. ${toolName} is available as a free online MC NovaTools utility with no required account for the public tool.`
  },
  {
    question: clientSide ? 'Are my files uploaded to a server?' : 'How should I handle sensitive inputs?',
    answer: clientSide
      ? 'Where this tool supports local file handling, processing runs in your browser so files do not need to leave your device. Review any visible page notes before using regulated or highly sensitive material.'
      : 'Only enter the information required for the task, avoid unnecessary secrets, and review the page notes before using regulated or highly sensitive material.'
  },
  {
    question: `What should I check before using the ${toolName} result?`,
    answer: 'Review the input assumptions, output format, visible errors, file names, and destination requirements before sharing or relying on the result.'
  }
];

export const makeDefaultHowToSteps = (toolName) => [
  {
    name: 'Prepare the input',
    text: `Open ${toolName}, confirm the expected input type, and choose only the file, text, or values needed for the task.`
  },
  {
    name: 'Run the browser tool',
    text: 'Use the visible controls on the page to process the input while keeping the browser tab open until the result is ready.'
  },
  {
    name: 'Review and save the result',
    text: 'Inspect the output, check for formatting or assumption issues, then download, copy, or discard the result based on your workflow.'
  }
];

export const inferCategoryLabel = (category) => CATEGORY_LABELS[category] || 'Online Tools';
export const toPlainText = stripHtml;
export const toCanonicalUrl = normalizeCanonicalUrl;
export const toAbsoluteUrl = ensureAbsoluteUrl;
