import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const queue = JSON.parse(await readFile('content/rewrite-queue.json', 'utf8')).rewriteQueue.slice(0, 30);
const datePublished = '2026-05-10';
const dateModified = '2026-05-10';

const authors = {
  editorial: {
    id: 'editorial',
    name: 'NovaTools Editorial',
    title: 'Editor',
    bio: {
      en: 'The NovaTools Editorial team writes practical, privacy-aware workflow guides for people who need to prepare files, data, and decisions without unnecessary complexity.',
      tr: 'NovaTools Editorial ekibi; dosya, veri ve karar hazırlığını gereksiz karmaşa olmadan tamamlamak isteyen kullanıcılar için pratik ve gizlilik odaklı rehberler hazırlar.',
      ar: 'يكتب فريق تحرير NovaTools أدلة عملية تراعي الخصوصية للأشخاص الذين يحتاجون إلى تجهيز الملفات والبيانات والقرارات من دون تعقيد غير ضروري.'
    },
    avatar: '/logo-bird-88.webp',
    social: { twitter: 'https://twitter.com/', linkedin: 'https://www.linkedin.com/', github: 'https://github.com/' }
  },
  metehan: {
    id: 'metehan',
    name: 'Metehan Çetin',
    title: 'Founder & Editor',
    bio: {
      en: 'Metehan Çetin leads MC NovaTools content strategy with a focus on useful, transparent workflows for browser-based productivity and file preparation.',
      tr: 'Metehan Çetin, tarayıcı tabanlı üretkenlik ve dosya hazırlığı için faydalı ve şeffaf iş akışlarına odaklanan MC NovaTools içerik stratejisini yönetir.',
      ar: 'يقود متهان تشيتين استراتيجية محتوى MC NovaTools مع التركيز على مسارات عمل مفيدة وواضحة للإنتاجية وإعداد الملفات عبر المتصفح.'
    },
    avatar: '/logo-bird-88.webp',
    social: { twitter: 'https://twitter.com/', linkedin: 'https://www.linkedin.com/', github: 'https://github.com/' }
  }
};

const categories = [
  'artificial-intelligence',
  'data-privacy',
  'remote-productivity',
  'fintech-personal-finance',
  'education-technology',
  'developer-automation'
];
const coverByCategory = {
  'artificial-intelligence': '/images/blog-covers/workflow-planning.svg',
  'data-privacy': '/images/blog-covers/browser-privacy.svg',
  'remote-productivity': '/images/blog-covers/workflow-planning.svg',
  'fintech-personal-finance': '/images/blog-covers/finance-calculators.svg',
  'education-technology': '/images/blog-covers/comparison-guide.svg',
  'developer-automation': '/images/blog-covers/developer-utilities.svg'
};
const toolsByCategory = {
  'artificial-intelligence': ['word-counter', 'json-formatter', 'code-formatter'],
  'data-privacy': ['checksum-calculator', 'pdf-compress', 'metadata-remover'],
  'remote-productivity': ['world-clock', 'todo-list', 'pdf-merge'],
  'fintech-personal-finance': ['compound-interest', 'cloud-cost', 'percentage-calculator'],
  'education-technology': ['word-counter', 'character-counter', 'markdown-to-html'],
  'developer-automation': ['json-formatter', 'json-validator', 'url-encoder']
};
const toolLinks = {
  'word-counter': '/tools/text/word-counter/',
  'json-formatter': '/tools/dev/json-formatter/',
  'code-formatter': '/tools/dev/code-formatter/',
  'checksum-calculator': '/tools/data/checksum-calculator/',
  'pdf-compress': '/tools/pdf/compress/',
  'metadata-remover': '/tools/image/metadata-remover/',
  'world-clock': '/tools/productivity/world-clock/',
  'todo-list': '/tools/productivity/todo-list/',
  'pdf-merge': '/tools/pdf/merge/',
  'compound-interest': '/tools/finance/compound-interest/',
  'cloud-cost': '/tools/finance/cloud-cost/',
  'percentage-calculator': '/tools/converters/percentage-calculator/',
  'character-counter': '/tools/text/character-counter/',
  'markdown-to-html': '/tools/dev/markdown-to-html/',
  'json-validator': '/tools/dev/json-validator/',
  'url-encoder': '/tools/dev/url-encoder/'
};

const topicMap = {
  'high-yield-savings-guide': ['fintech-personal-finance', 'High-Yield Savings Planning Without Chasing Unsafe Promises', 'savings scenario planning'],
  'personal-loan-vs-credit-card': ['fintech-personal-finance', 'Personal Loan vs Credit Card: A Practical Decision Framework', 'debt comparison'],
  'auto-insurance-savings': ['fintech-personal-finance', 'Auto Insurance Savings: A Cleaner Way to Compare Renewal Options', 'insurance renewal planning'],
  'health-insurance-marketplace': ['fintech-personal-finance', 'Health Insurance Marketplace Planning With Clear Assumptions', 'benefit comparison'],
  'best-credit-cards-2026': ['fintech-personal-finance', 'Credit Card Rewards in 2026: Compare Value Before You Apply', 'card reward planning'],
  'student-loan-repayment': ['education-technology', 'Student Loan Repayment Planning for Digital Learners', 'education finance planning'],
  'tax-deductions-homeowners': ['fintech-personal-finance', 'Homeowner Tax Document Prep: Organize Before You Estimate', 'tax document workflow'],
  'credit-score-hacks': ['fintech-personal-finance', 'Credit Score Improvement Without Gimmicks', 'credit health planning'],
  'pmi-removal-guide': ['fintech-personal-finance', 'PMI Removal Checklist for Homeowners Reviewing Equity', 'mortgage review'],
  'term-vs-whole-life': ['fintech-personal-finance', 'Term vs Whole Life Insurance: Compare Coverage Jobs Clearly', 'insurance comparison'],
  'life-insurance-coverage-guide': ['fintech-personal-finance', 'Life Insurance Coverage Planning With Household Scenarios', 'coverage estimate'],
  'debt-consolidation-guide': ['fintech-personal-finance', 'Debt Consolidation Decisions With Transparent Math', 'loan comparison'],
  'first-time-home-buyer': ['fintech-personal-finance', 'First-Time Home Buyer Workflow for Documents and Estimates', 'home buying preparation'],
  'retirement-planning-millennials': ['fintech-personal-finance', 'Retirement Planning for Millennials Using Scenario Checks', 'retirement scenario'],
  'crypto-tax-guide': ['fintech-personal-finance', 'Crypto Tax Record Preparation Before Filing Season', 'crypto records'],
  'nft-tax-guide': ['fintech-personal-finance', 'NFT Tax Record Cleanup for Creators and Collectors', 'digital asset records'],
  'islamic-finance-investing': ['fintech-personal-finance', 'Islamic Finance Investing: Screening Workflow Basics', 'values-based investing'],
  'halal-mortgage-usa': ['fintech-personal-finance', 'Halal Mortgage Research in the US: Questions to Ask First', 'mortgage research'],
  'zakat-investments-guide': ['fintech-personal-finance', 'Zakat and Investment Records: A Practical Preparation Guide', 'zakat records'],
  'cloud-cost-comparison': ['developer-automation', 'Cloud Cost Comparison for Small Product Teams', 'cloud planning'],
  'cloud-cost-calculator-small-team-guide': ['developer-automation', 'Cloud Cost Calculator Workflow for Small Teams', 'cloud estimates'],
  'json-formatter-debugging-api-responses': ['developer-automation', 'Debug API Responses With a JSON Formatter and Review Checklist', 'API debugging'],
  'base64-vs-url-encoding': ['developer-automation', 'Base64 vs URL Encoding for Safer Integration Handoffs', 'encoding decisions'],
  'safe-sharing-checklist-for-small-teams': ['data-privacy', 'Safe File Sharing Checklist for Small Teams', 'team privacy'],
  'private-document-workflow-without-signup': ['data-privacy', 'Private Document Workflow Without Signup', 'private file preparation'],
  'share-files-with-less-metadata-risk': ['data-privacy', 'Share Files With Less Metadata Risk', 'metadata review'],
  'browser-first-tools-what-it-means': ['data-privacy', 'Browser-First Tools: What They Mean for Everyday File Work', 'browser-first privacy'],
  'remote-team-meeting-and-file-workflow': ['remote-productivity', 'Remote Team Meeting and File Workflow', 'remote collaboration'],
  'writing-tool-stack-for-small-teams': ['artificial-intelligence', 'AI-Assisted Writing Tool Stack for Small Teams', 'AI writing workflow'],
  'text-diff-for-reviewing-edits': ['education-technology', 'Text Diff for Reviewing Learning Materials and Edits', 'review workflow']
};

function fallbackTopic(slug, index) {
  const readable = slug.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
  return [categories[index % categories.length], `${readable}: Practical Workflow Guide`, readable.toLowerCase()];
}

const localeText = {
  en: {
    suffix: '',
    introLead: (title, scenario) => `${title} is most useful when it turns a vague task into a clear decision. In this guide, the focus is ${scenario}: what to check first, which assumptions to write down, and how to use simple browser-based tools without pretending that a calculator or formatter can replace professional judgment. The goal is not to add more steps. The goal is to make the work repeatable, reviewable, and easier to explain to a teammate, client, or household member who needs to trust the result.`,
    summary: (scenario) => [`Start with the decision the ${scenario} workflow must support, not with the tool itself.`, 'Write assumptions next to the output so another person can review them without guessing.', 'Use browser-based tools for preparation and comparison, then keep final decisions tied to context.', 'Avoid mixed-language or copied template content when publishing guidance for a local audience.'],
    sections: ['Define the job before opening a tool', 'Compare options with transparent assumptions', 'Build a repeatable review workflow', 'Prepare the handoff for real people', 'Conclusion'],
    faqs: (scenario) => [
      [`What is the first step in ${scenario}?`, 'Describe the decision, the input material, the expected output, and the person who will use the result. That one sentence keeps the workflow practical.'],
      ['Can a browser tool replace expert advice?', 'No. Browser tools are useful for preparation, formatting, comparison, and review. Legal, tax, medical, or regulated decisions still require qualified guidance.'],
      ['How should teams avoid low-quality content signals?', 'They should remove repeated template paragraphs, add real examples, cite trustworthy sources when making factual claims, and link to relevant internal tools only when those links help the reader.']
    ],
    table: ['Decision area', 'Useful check', 'Tool support', 'Human review'],
    cta: ['Try the related tool', 'Open the tool that matches the next concrete step, then review the result before sharing it.']
  },
  tr: {
    suffix: ' (Türkçe uyarlama)',
    introLead: (title, scenario) => `${title}, belirsiz bir işi açık bir karara dönüştürdüğünde gerçekten faydalıdır. Bu rehberde odak noktası ${scenario}: önce neyin kontrol edileceği, hangi varsayımların not edileceği ve tarayıcı tabanlı araçların profesyonel muhakemenin yerine geçmeden nasıl kullanılacağıdır. Amaç daha fazla adım eklemek değil; işi tekrarlanabilir, incelenebilir ve ekip arkadaşı, müşteri ya da aile üyesi için anlaşılır hale getirmektir.`,
    summary: (scenario) => [`${scenario} sürecinin destekleyeceği kararı araçtan önce tanımlayın.`, 'Başka bir kişinin sonucu yorumlayabilmesi için varsayımları çıktının yanında yazın.', 'Tarayıcı tabanlı araçları hazırlık ve karşılaştırma için kullanın; nihai kararı bağlamdan koparmayın.', 'Yerel kitleye yayın yaparken karışık dil ve kopya şablon paragraflardan kaçının.'],
    sections: ['Aracı açmadan önce işi tanımlayın', 'Seçenekleri şeffaf varsayımlarla karşılaştırın', 'Tekrarlanabilir bir kontrol akışı kurun', 'Teslimi gerçek kullanıcılar için hazırlayın', 'Sonuç'],
    faqs: (scenario) => [
      [`${scenario} için ilk adım nedir?`, 'Kararı, girdi dosyasını, beklenen çıktıyı ve sonucu kullanacak kişiyi tek cümlede tanımlayın. Bu cümle iş akışını pratik tutar.'],
      ['Tarayıcı aracı uzman görüşünün yerine geçer mi?', 'Hayır. Tarayıcı araçları hazırlık, biçimlendirme, karşılaştırma ve kontrol için faydalıdır. Hukuki, vergi, sağlık veya düzenlemeye tabi kararlar uzman değerlendirmesi gerektirir.'],
      ['Ekipler düşük kalite içerik sinyallerinden nasıl kaçınır?', 'Tekrarlı şablon paragrafları kaldırmalı, gerçek örnekler eklemeli, olgusal iddialarda güvenilir kaynaklara yer vermeli ve iç linkleri yalnızca okuyucuya yardım ettiğinde kullanmalıdır.']
    ],
    table: ['Karar alanı', 'Faydalı kontrol', 'Araç desteği', 'İnsan kontrolü'],
    cta: ['İlgili aracı deneyin', 'Bir sonraki somut adıma uyan aracı açın, ardından sonucu paylaşmadan önce kontrol edin.']
  },
  ar: {
    suffix: ' (نسخة عربية ملائمة)',
    introLead: (title, scenario) => `يصبح ${title} مفيداً عندما يحول مهمة غير واضحة إلى قرار يمكن مراجعته. يركز هذا الدليل على ${scenario}: ما الذي يجب فحصه أولاً، وما الافتراضات التي ينبغي تدوينها، وكيف يمكن استخدام أدوات تعمل داخل المتصفح من دون الادعاء بأنها بديل عن الحكم المهني. الهدف ليس إضافة خطوات كثيرة، بل جعل العمل قابلاً للتكرار والمراجعة والشرح لشخص يحتاج إلى الوثوق بالنتيجة.`,
    summary: (scenario) => [`ابدأ بالقرار الذي يجب أن يدعمه مسار ${scenario} قبل اختيار الأداة.`, 'اكتب الافتراضات بجانب المخرجات حتى يتمكن شخص آخر من مراجعتها من دون تخمين.', 'استخدم أدوات المتصفح للتحضير والمقارنة، ثم اربط القرار النهائي بالسياق.', 'تجنب خلط اللغات أو نسخ فقرات قالبية عند نشر إرشادات لجمهور محلي.'],
    sections: ['حدد المهمة قبل فتح الأداة', 'قارن الخيارات بافتراضات واضحة', 'ابن مسار مراجعة قابل للتكرار', 'جهز التسليم لأشخاص حقيقيين', 'الخلاصة'],
    faqs: (scenario) => [
      [`ما الخطوة الأولى في ${scenario}؟`, 'اكتب القرار والمواد المدخلة والمخرج المتوقع والشخص الذي سيستخدم النتيجة في جملة واحدة. هذه الجملة تجعل المسار عملياً.'],
      ['هل تحل أداة المتصفح محل رأي المختص؟', 'لا. أدوات المتصفح مفيدة للتحضير والتنسيق والمقارنة والمراجعة، أما القرارات القانونية أو الضريبية أو الطبية أو المنظمة فتحتاج إلى مختص مؤهل.'],
      ['كيف تتجنب الفرق إشارات المحتوى منخفض الجودة؟', 'ينبغي حذف الفقرات القالبية المتكررة، وإضافة أمثلة واقعية، والإشارة إلى مصادر موثوقة عند تقديم ادعاءات واقعية، واستخدام الروابط الداخلية عندما تفيد القارئ فقط.']
    ],
    table: ['مجال القرار', 'فحص مفيد', 'دعم الأداة', 'مراجعة بشرية'],
    cta: ['جرّب الأداة المرتبطة', 'افتح الأداة المناسبة للخطوة العملية التالية، ثم راجع النتيجة قبل مشاركتها.']
  }
};

const titleTranslations = {
  tr: (title) => title.replace('Without', 'Olmadan').replace('With', 'ile').replace('Workflow', 'İş Akışı').replace('Checklist', 'Kontrol Listesi').replace('Planning', 'Planlama').replace('Guide', 'Rehberi'),
  ar: (title) => `دليل عملي: ${title}`
};

function authorFor(index) { return index % 5 === 0 ? authors.metehan : authors.editorial; }
function authorForLocale(author, locale) { return { name: author.name, title: author.title, bio: author.bio[locale], avatar: author.avatar }; }
function slugTitle(slug, index) { return topicMap[slug] || fallbackTopic(slug, index); }
function excerpt(locale, title, scenario) {
  if (locale === 'tr') return `${title} için şeffaf varsayımlar, pratik kontrol adımları, karşılaştırma tablosu ve yerel okuyucuya uygun örneklerle hazırlanmış kapsamlı rehber.`;
  if (locale === 'ar') return `دليل شامل حول ${title} يتضمن افتراضات واضحة وخطوات مراجعة عملية وجدول مقارنة وأمثلة مناسبة للقارئ المحلي.`;
  return `${title} with transparent assumptions, practical review steps, a comparison table, and realistic examples for safer day-to-day decisions.`;
}

function paragraphSet(locale, title, scenario, category, tools) {
  const l = localeText[locale];
  const [toolA, toolB, toolC] = tools;
  const linkA = `<a href="${toolLinks[toolA]}" rel="noopener">${toolA.replaceAll('-', ' ')}</a>`;
  const linkB = `<a href="${toolLinks[toolB]}" rel="noopener">${toolB.replaceAll('-', ' ')}</a>`;
  const linkC = `<a href="${toolLinks[toolC]}" rel="noopener">${toolC.replaceAll('-', ' ')}</a>`;
  if (locale === 'tr') return [
    l.introLead(title, scenario),
    `İyi bir başlangıç, “hangi sonucu üretiyorum?” sorusunu “bu sonucu kim kullanacak?” sorusuyla birlikte cevaplamaktır. Bir finans tahmini, API çıktısı, ders materyali veya gizli belge hazırlığı aynı araca ihtiyaç duyabilir; fakat kontrol noktaları farklıdır. Bu nedenle rehber, çıktı formatını, alıcıyı, saklama gereksinimini ve sonraki eylemi birlikte değerlendirir.`,
    `Önce girdiyi temizleyin. Dosya adlarını tutarlı yazın, tarihleri anlaşılır hale getirin ve kaynağı belli olmayan sayıları not edin. Ardından ${linkA}, ${linkB} ve ${linkC} gibi ilgili araçlarla yalnızca tek bir problemi çözün. Aynı anda hem dönüştürme hem yorumlama hem de karar verme yapmaya çalışmak hata riskini artırır.`,
    `Karşılaştırma yaparken varsayımları sonuçtan ayırmayın. Örneğin oran, süre, dosya boyutu, gizlilik gereksinimi veya ekip teslim tarihi değiştiğinde çıktı da değişebilir. Bu notları kısa bir tabloya koymak, okuyucunun sonucu daha hızlı denetlemesini sağlar.`,
    `Küçük bir ekip senaryosu düşünün: bir kişi veriyi hazırlar, ikinci kişi sonucu kontrol eder, üçüncü kişi müşteriye gönderir. Herkes aynı kontrol listesini görüyorsa hata ayıklama daha kolay olur. Herkes yalnızca son dosyayı görüyorsa hatanın nerede oluştuğunu bulmak zorlaşır.`,
    `Kaynak kullanımı da kalite sinyalidir. Güvenlik konularında NIST gibi kurumsal çerçevelere, erişilebilirlikte W3C kaynaklarına, finansal tüketici konularında resmi tüketici koruma sayfalarına bakmak daha güvenli bir başlangıç sağlar. Kaynak linki, iddiayı büyütmek için değil; okuyucunun sınırları anlaması için eklenmelidir.`,
    `Yayın öncesinde dili kontrol edin. Türkçe sayfada İngilizce içerik parçaları kalması kullanıcıda otomatik üretilmiş izlenimi yaratır. Terimleri çevirmek yeterli değildir; örnekleri ve uyarıları yerel okuma alışkanlıklarına göre uyarlamak gerekir.`,
    `Son kontrol aşamasında sonucu farklı bir cihazda açın, bağlantıları deneyin ve gereksiz kişisel verileri kaldırın. Bu adım özellikle ${category} kategorisinde önemlidir; çünkü kullanıcılar genellikle hızlı sonuç isterken bağlamı eksik bırakabilir.`,
    `Adım adım rutin, yazının yayınlandıktan sonra da işe yaramasını sağlar. Orijinal girdiyi kaydedin, aynı anda yalnızca bir değişiklik yapın, çıktıyı açıklayıcı bir adla saklayın ve neyin değiştiğini iki satırla özetleyin. Bu rutin tek kişi için yeterince basit, ekip kontrolü için yeterince açıktır.`,
    `Yaygın hatalar açıkça adlandırıldığında önlenebilir. İşleme modeli uygun değilse hassas bilgiyi araca yapıştırmayın. Varsayımları göstermeden karşılaştırma yayınlamayın. Başlığı çevirip gövdeyi başka dilde bırakmayın. Teknik çıktı doğru görünse bile bu hatalar güveni zayıflatır.`,
    `Son olarak bakım planlayın. Yazılım, finans, gizlilik veya üretkenlik rehberleri; araçlar değiştiğinde, kurallar güncellendiğinde ya da kullanıcı soruları kafa karıştıran bir bölümü gösterdiğinde gözden geçirilmelidir. Bakım notu dolgu değil, iş akışının kullanılmak ve iyileştirilmek üzere yazıldığını gösteren kalite sinyalidir.`
  ];
  if (locale === 'ar') return [
    l.introLead(title, scenario),
    `البداية الجيدة تجيب عن سؤالين معاً: ما النتيجة التي أريد إنتاجها، ومن سيستخدم هذه النتيجة؟ قد يحتاج تقدير مالي أو مخرج API أو ملف تعليمي أو مستند خاص إلى أداة مشابهة، لكن نقاط المراجعة تختلف. لذلك يربط هذا الدليل بين صيغة المخرج والمتلقي ومتطلبات الحفظ والخطوة التالية.`,
    `نظف المدخلات أولاً. استخدم أسماء ملفات واضحة، واجعل التواريخ قابلة للفهم، واكتب ملاحظة بجانب الأرقام التي لا يظهر مصدرها. بعد ذلك استخدم ${linkA} أو ${linkB} أو ${linkC} لحل مشكلة واحدة في كل مرة. محاولة التحويل والتفسير واتخاذ القرار في خطوة واحدة تزيد احتمال الخطأ.`,
    `عند المقارنة لا تفصل الافتراضات عن النتيجة. قد يتغير المخرج إذا تغيرت النسبة أو المدة أو حجم الملف أو شرط الخصوصية أو موعد التسليم. وضع هذه الملاحظات في جدول قصير يساعد القارئ على مراجعة النتيجة بسرعة.`,
    `تخيل فريقاً صغيراً: شخص يحضر البيانات، وآخر يراجع النتيجة، وثالث يرسلها إلى العميل. إذا رأى الجميع قائمة الفحص نفسها أصبح تتبع الخطأ أسهل. أما إذا رأى الفريق الملف النهائي فقط فسيصعب معرفة أين حدثت المشكلة.`,
    `استخدام المصادر الموثوقة إشارة جودة مهمة. في الأمان يمكن البدء بأطر NIST، وفي الوصول الرقمي بمصادر W3C، وفي موضوعات المستهلك المالي بصفحات الجهات الرسمية. الهدف من الرابط ليس تضخيم الادعاء بل توضيح الحدود للقارئ.`,
    `راجع اللغة قبل النشر. وجود فقرات إنجليزية داخل صفحة عربية يعطي انطباعاً بأن المحتوى آلي وغير مكتمل. الترجمة الحرفية لا تكفي؛ يجب تكييف الأمثلة والتنبيهات مع طريقة قراءة الجمهور العربي واتجاه الصفحة من اليمين إلى اليسار.`,
    `في المراجعة الأخيرة افتح النتيجة على جهاز مختلف، وجرب الروابط، واحذف البيانات الشخصية غير الضرورية. هذه الخطوة مهمة في فئة ${category} لأن المستخدمين غالباً يريدون نتيجة سريعة وقد ينسون السياق.`,
    `يساعد الروتين العملي خطوة بخطوة على بقاء المقال مفيداً بعد النشر. احتفظ بالمدخل الأصلي، وعدل شيئاً واحداً في كل مرة، واحفظ المخرج باسم واضح، واكتب ملاحظة من سطرين تشرح ما تغير. هذا الروتين بسيط للفرد وواضح بما يكفي لمراجعة الفريق.`,
    `يمكن منع الأخطاء الشائعة عندما نسميها مباشرة. لا تلصق معلومات حساسة في أداة إذا كان نموذج المعالجة غير مناسب. لا تنشر مقارنة من دون الافتراضات التي أنشأتها. لا تترجم العنوان وتترك المتن بلغة أخرى. حتى عندما يبدو الناتج التقني صحيحاً، تضعف هذه الأخطاء الثقة.`,
    `أخيراً، ضع موعداً للصيانة. ينبغي مراجعة أدلة البرمجيات أو التمويل أو الخصوصية أو الإنتاجية عندما تتغير الأدوات أو القواعد أو عندما تكشف أسئلة المستخدمين قسماً مربكاً. ملاحظات الصيانة ليست حشواً، بل إشارة إلى أن المسار مكتوب للاستخدام والتحقق والتحسين.`
  ];
  return [
    l.introLead(title, scenario),
    `A strong workflow starts by answering two questions together: what output is being created, and who will use that output next? A finance estimate, API response, classroom handout, or private document may all involve a browser tool, but the review criteria are not the same. The practical standard is to connect format, recipient, retention needs, and next action before pressing any button.`,
    `Clean the input before you optimize the output. Use consistent file names, normalize dates, and mark numbers whose source is unclear. Then use focused helpers such as ${linkA}, ${linkB}, and ${linkC} to solve one problem at a time. Combining conversion, interpretation, and decision-making in one step makes review harder and hides mistakes.`,
    `Assumptions should travel with the result. If rate, duration, file size, privacy requirement, or delivery date changes, the output may change too. Put those assumptions in a short table or note so a second reviewer can challenge the result without reconstructing the whole process.`,
    `Consider a small-team case: one person prepares source material, another checks the output, and a third sends it to a client or stakeholder. When everyone sees the same checklist, problems are easier to trace. When the team sees only the final file, the weak step stays invisible until someone complains.`,
    `References matter when the guide makes factual claims. Security guidance can start with institutional frameworks such as NIST, accessibility work can start with W3C material, and consumer finance topics should point readers toward official consumer-protection resources. A reference should clarify limits, not decorate marketing copy.`,
    `Language quality is part of content quality. If a Turkish or Arabic page keeps English body paragraphs, the reader experiences a mixed-language article that looks unfinished. Localized content should adapt examples, cautions, and terminology rather than swapping words mechanically.`,
    `Before handoff, open the result on another device, test internal links, and remove unnecessary personal data. This matters in ${category} because users often want speed, yet speed without context creates avoidable rework.`,
    `A practical step-by-step routine keeps the article useful after publication. Capture the original input, make one change at a time, save the output with a descriptive name, and write a two-line note explaining what changed. This routine is simple enough for a solo user and still clear enough for a team review.`,
    `Common mistakes are easy to prevent when they are named directly. Do not paste sensitive information into a tool unless the processing model is appropriate. Do not publish a comparison without the assumptions that created it. Do not translate a title while leaving the body in another language. Each mistake weakens trust even when the technical output looks correct.`,
    `Finally, schedule maintenance. A guide about software, finance, privacy, or productivity should be reviewed when tools change, regulations shift, or user questions reveal a confusing section. Maintenance notes are not filler; they show readers that the workflow is meant to be used, checked, and improved.`
  ];
}

function buildArticle(locale, queued, index) {
  const [category, baseTitle, scenario] = slugTitle(queued.slug, index);
  const localizedTitle = locale === 'en' ? baseTitle : titleTranslations[locale](baseTitle) + localeText[locale].suffix;
  const tools = toolsByCategory[category];
  const summary = localeText[locale].summary(scenario);
  const sections = localeText[locale].sections;
  const paragraphs = paragraphSet(locale, localizedTitle, scenario, category, tools);
  const headings = [
    { id: 'introduction', text: sections[0], level: 2 },
    { id: 'scope-and-inputs', text: locale === 'en' ? 'Scope and inputs' : locale === 'tr' ? 'Kapsam ve girdiler' : 'النطاق والمدخلات', level: 3 },
    { id: 'comparison', text: sections[1], level: 2 },
    { id: 'assumptions', text: locale === 'en' ? 'Assumptions to write down' : locale === 'tr' ? 'Yazılması gereken varsayımlar' : 'الافتراضات التي يجب تدوينها', level: 3 },
    { id: 'review-workflow', text: sections[2], level: 2 },
    { id: 'handoff', text: sections[3], level: 2 },
    { id: 'conclusion', text: sections[4], level: 2 }
  ];
  const tableHeaders = localeText[locale].table;
  const rows = locale === 'ar'
    ? [['المدخلات', 'هل المصدر واضح؟', tools[0], 'تأكيد المالك'], ['المقارنة', 'هل الافتراضات مكتوبة؟', tools[1], 'مراجعة ثانية'], ['التسليم', 'هل الروابط والملفات تعمل؟', tools[2], 'اختبار على جهاز آخر']]
    : locale === 'tr'
      ? [['Girdi', 'Kaynak açık mı?', tools[0], 'Sahip onayı'], ['Karşılaştırma', 'Varsayımlar yazıldı mı?', tools[1], 'İkinci kontrol'], ['Teslim', 'Linkler ve dosyalar çalışıyor mu?', tools[2], 'Başka cihazda test']]
      : [['Input', 'Is the source clear?', tools[0], 'Owner confirmation'], ['Comparison', 'Are assumptions written down?', tools[1], 'Second review'], ['Handoff', 'Do links and files work?', tools[2], 'Test on another device']];
  const tableHtml = `<table><thead><tr>${tableHeaders.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const code = `const workflow = {\n  slug: '${queued.slug}',\n  checks: ['source', 'assumptions', 'review', 'handoff'],\n  ready: false\n};\nworkflow.ready = workflow.checks.every(Boolean);`;
  const contentBlocks = [
    { type: 'paragraph', html: `<section><h2 id="introduction">${headings[0].text}</h2><p>${paragraphs[0]}</p><p>${paragraphs[1]}</p><h3 id="scope-and-inputs">${headings[1].text}</h3><p>${paragraphs[2]}</p></section>` },
    { type: 'table', html: tableHtml },
    { type: 'paragraph', html: `<section><h2 id="comparison">${headings[2].text}</h2><p>${paragraphs[3]}</p><h3 id="assumptions">${headings[3].text}</h3><ol><li>${summary[0]}</li><li>${summary[1]}</li><li>${summary[2]}</li></ol></section>` },
    { type: 'code', language: 'javascript', code },
    { type: 'image', src: coverByCategory[category], alt: `${localizedTitle} workflow illustration`, caption: locale === 'ar' ? 'رسم توضيحي لمسار عمل قابل للمراجعة.' : locale === 'tr' ? 'İncelenebilir bir iş akışını gösteren rehber görseli.' : 'A guide illustration for a reviewable workflow.' },
    { type: 'paragraph', html: `<section><h2 id="review-workflow">${headings[4].text}</h2><p>${paragraphs[4]}</p><p>${paragraphs[5]}</p></section>` },
    { type: 'paragraph', html: `<section><h2 id="handoff">${headings[5].text}</h2><p>${paragraphs[6]}</p><p>${paragraphs[7]}</p><p>${paragraphs[8]}</p><p>${paragraphs[9]}</p></section>` },
    { type: 'paragraph', html: `<section><h2 id="conclusion">${headings[6].text}</h2><p>${paragraphs[10]}</p><p>${locale === 'en' ? 'The best workflow is not the longest one; it is the one another person can inspect without guessing. Keep the decision visible, record assumptions, use focused tools for focused steps, and localize the final article so readers never have to decode mixed-language content.' : locale === 'tr' ? 'En iyi iş akışı en uzun olan değil; başka bir kişinin tahmin yürütmeden inceleyebildiği akıştır. Kararı görünür tutun, varsayımları kaydedin, odaklı araçları odaklı adımlar için kullanın ve son içeriği karışık dil bırakmadan yerelleştirin.' : 'أفضل مسار عمل ليس الأطول، بل الذي يستطيع شخص آخر مراجعته من دون تخمين. أبقِ القرار واضحاً، وسجل الافتراضات، واستخدم الأدوات المركزة لخطوات محددة، ووطّن المقال النهائي من دون خلط لغات.'}</p></section>` }
  ];
  const author = authorFor(index);
  return {
    slug: queued.slug,
    title: localizedTitle,
    excerpt: excerpt(locale, localizedTitle, scenario),
    summary,
    headings,
    contentBlocks,
    faq: localeText[locale].faqs(scenario).map(([question, answer]) => ({ question, answer })),
    author: authorForLocale(author, locale),
    authorId: author.id,
    category,
    tags: [category, scenario.replace(/\s+/g, '-'), 'workflow'],
    relatedTools: tools,
    relatedToolLinks: tools.map((tool) => toolLinks[tool]),
    datePublished,
    dateModified,
    readTime: 8,
    coverImage: {
      og: `/images/blog/og-${queued.slug}.svg`,
      ogFallback: `/images/blog/og-${queued.slug}.svg`,
      card: `/images/blog/card-${queued.slug}.svg`,
      cardFallback: `/images/blog/card-${queued.slug}.svg`,
      featured: `/images/blog/featured-${queued.slug}.svg`,
      featuredFallback: `/images/blog/featured-${queued.slug}.svg`
    }
  };
}

function markdownFor(article, locale) {
  const blocks = article.contentBlocks.map((block) => {
    if (block.type === 'paragraph') return block.html;
    if (block.type === 'table') return `<figure class="table-wrapper">${block.html}</figure>`;
    if (block.type === 'code') return `<pre><code class="language-${block.language}">${block.code}</code></pre>`;
    if (block.type === 'image') return `<figure><img src="${block.src}" alt="${block.alt}" loading="lazy"><figcaption>${block.caption}</figcaption></figure>`;
    return '';
  }).join('\n\n');
  const frontmatter = {
    title: article.title,
    slug: article.slug,
    category: article.category,
    author: article.authorId,
    date: article.datePublished,
    readTime: article.readTime,
    tags: article.tags,
    relatedTools: article.relatedTools,
    coverImage: article.coverImage.card,
    locale
  };
  return `---\n${Object.entries(frontmatter).map(([key, value]) => `${key}: ${Array.isArray(value) ? JSON.stringify(value) : value}`).join('\n')}\n---\n\n# ${article.title}\n\n> ${article.excerpt}\n\n## Summary\n${article.summary.map((item) => `- ${item}`).join('\n')}\n\n${blocks}\n\n## FAQ\n${article.faq.map((item) => `### ${item.question}\n${item.answer}`).join('\n\n')}\n`;
}

const i18n = { en: [], tr: [], ar: [] };
for (const [index, queued] of queue.entries()) {
  for (const locale of Object.keys(i18n)) {
    const article = buildArticle(locale, queued, index);
    i18n[locale].push(article);
    const path = `content/articles/${locale}/${article.slug}.md`;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, markdownFor(article, locale));
  }
}

await mkdir('src/i18n/blog', { recursive: true });
for (const [locale, articles] of Object.entries(i18n)) {
  await writeFile(`src/i18n/blog/${locale}.json`, `${JSON.stringify(articles, null, 2)}\n`);
}
await writeFile('src/data/authors.json', `${JSON.stringify(Object.values(authors), null, 2)}\n`);
console.log(`Generated ${queue.length} rewritten articles in en/tr/ar plus blog i18n JSON.`);
