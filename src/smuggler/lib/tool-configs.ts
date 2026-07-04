/**
 * Tool configuration registry.
 *
 * Each tool maps to a config that drives the generic ToolPageEngine:
 *  - fields: the input controls rendered in the left panel
 *  - outputLabel: the right panel heading ("Your Generated Hooks" → "Your Generated Titles")
 *  - analysisTitle: the bottom analysis heading
 *  - metrics: which score metrics to show (varies by category)
 *  - countField: whether to show the "number of results" selector
 *
 * Tools without an explicit config fall back to a category-based default.
 */
import type { SmugglerTool } from '../data/tools';

export type FieldType =
  | 'textarea'
  | 'text'
  | 'select'
  | 'platform'
  | 'count'
  | 'tone'
  | 'language';

export interface FieldConfig {
  type: FieldType;
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  optional?: boolean;
  maxLength?: number;
  rows?: number;
  options?: string[];
  counts?: number[];
  defaultValue?: string | number;
}

export interface MetricConfig {
  label: string;
  key: 'curiosity' | 'specificity' | 'benefitDriven' | 'emotionalImpact';
}

export interface ToolConfig {
  toolId: string;
  fields: FieldConfig[];
  outputLabel: string;
  outputItemNoun: string;
  analysisTitle: string;
  metrics: MetricConfig[];
  countField: boolean;
  defaultCount: number;
  countOptions: number[];
}

/* ---------- Category-based metric presets ---------- */

const METRICS = {
  writing: [
    { label: 'Clarity', key: 'curiosity' as const },
    { label: 'Engagement', key: 'specificity' as const },
    { label: 'Readability', key: 'benefitDriven' as const },
    { label: 'Actionability', key: 'emotionalImpact' as const },
  ],
  seo: [
    { label: 'Search Intent', key: 'curiosity' as const },
    { label: 'Click Appeal', key: 'specificity' as const },
    { label: 'Keyword Relevance', key: 'benefitDriven' as const },
    { label: 'Ranking Potential', key: 'emotionalImpact' as const },
  ],
  video: [
    { label: 'Hook Strength', key: 'curiosity' as const },
    { label: 'Retention', key: 'specificity' as const },
    { label: 'CTR Potential', key: 'benefitDriven' as const },
    { label: 'Shareability', key: 'emotionalImpact' as const },
  ],
  social: [
    { label: 'Engagement', key: 'curiosity' as const },
    { label: 'Virality', key: 'specificity' as const },
    { label: 'Relevance', key: 'benefitDriven' as const },
    { label: 'Brand Voice', key: 'emotionalImpact' as const },
  ],
  repurpose: [
    { label: 'Accuracy', key: 'curiosity' as const },
    { label: 'Adaptation', key: 'specificity' as const },
    { label: 'Value', key: 'benefitDriven' as const },
    { label: 'Readability', key: 'emotionalImpact' as const },
  ],
  business: [
    { label: 'Professionalism', key: 'curiosity' as const },
    { label: 'Clarity', key: 'specificity' as const },
    { label: 'Persuasiveness', key: 'benefitDriven' as const },
    { label: 'Completeness', key: 'emotionalImpact' as const },
  ],
  ai: [
    { label: 'Effectiveness', key: 'curiosity' as const },
    { label: 'Clarity', key: 'specificity' as const },
    { label: 'Specificity', key: 'benefitDriven' as const },
    { label: 'Reusability', key: 'emotionalImpact' as const },
  ],
  hook: [
    { label: 'Curiosity', key: 'curiosity' as const },
    { label: 'Specificity', key: 'specificity' as const },
    { label: 'Benefit Driven', key: 'benefitDriven' as const },
    { label: 'Emotional Impact', key: 'emotionalImpact' as const },
  ],
};

/* ---------- Shared field presets ---------- */

const AUDIENCES = [
  'Content Creators', 'Marketers', 'Entrepreneurs', 'Educators',
  'Fitness Enthusiasts', 'Tech Professionals', 'Small Business Owners',
  'Students', 'General Audience',
];

const TONES = ['Casual', 'Engaging & Direct', 'Professional', 'Humorous', 'Controversial', 'Inspirational'];
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Hindi', 'Japanese', 'Portuguese', 'Arabic'];

const PLATFORMS_FIELD: FieldConfig = {
  type: 'platform',
  key: 'platform',
  label: 'Platform',
  defaultValue: 'YouTube',
};

const TONE_FIELD: FieldConfig = {
  type: 'tone',
  key: 'tone',
  label: 'Tone',
  options: TONES,
  defaultValue: 'Casual',
};

const LANGUAGE_FIELD: FieldConfig = {
  type: 'language',
  key: 'language',
  label: 'Language',
  options: LANGUAGES,
  defaultValue: 'English',
};

const AUDIENCE_FIELD: FieldConfig = {
  type: 'select',
  key: 'audience',
  label: 'Audience (Optional)',
  optional: true,
  options: AUDIENCES,
  defaultValue: 'Content Creators',
};

const COUNT_FIELD = (defaults: { count: number; options?: number[] }): FieldConfig => ({
  type: 'count',
  key: 'count',
  label: 'Number of results',
  counts: defaults.options ?? [5, 10, 15, 20],
  defaultValue: defaults.count,
});

function topicField(label: string, placeholder: string, maxLength = 500): FieldConfig {
  return {
    type: 'textarea',
    key: 'content',
    label,
    placeholder,
    required: true,
    maxLength,
    rows: 3,
    defaultValue: '',
  };
}

/* ---------- Per-tool configs ---------- */

interface ToolConfigInput {
  fields: FieldConfig[];
  outputLabel: string;
  outputItemNoun: string;
  analysisTitle: string;
  metrics: MetricConfig[];
  countField?: boolean;
  defaultCount?: number;
  countOptions?: number[];
}

const CONFIGS: Record<string, ToolConfigInput> = {
  /* ===== WRITING ===== */
  'ai-writer': {
    fields: [
      topicField('What do you want to write about?', 'e.g., A blog post about productivity tips for remote workers...'),
      AUDIENCE_FIELD, TONE_FIELD, LANGUAGE_FIELD,
      COUNT_FIELD({ count: 5 }),
    ],
    outputLabel: 'Your Generated Content',
    outputItemNoun: 'content',
    analysisTitle: 'Why this content works?',
    metrics: METRICS.writing,
  },
  'script-writer': {
    fields: [
      topicField('What is your video/podcast about?', 'e.g., 5 morning habits of successful entrepreneurs...'),
      { type: 'select', key: 'format', label: 'Script Format', options: ['YouTube Video', 'Podcast Episode', 'TikTok/Reel', 'Webinar', 'Short Film'], defaultValue: 'YouTube Video' },
      AUDIENCE_FIELD, TONE_FIELD, LANGUAGE_FIELD,
      COUNT_FIELD({ count: 3 }),
    ],
    outputLabel: 'Your Generated Scripts',
    outputItemNoun: 'script',
    analysisTitle: 'Why these scripts work?',
    metrics: METRICS.video,
  },
  'email-writer': {
    fields: [
      topicField('What is the email about?', 'e.g., Follow-up email to a potential sponsor after a pitch meeting...'),
      { type: 'select', key: 'emailType', label: 'Email Type', options: ['Cold Outreach', 'Follow-up', 'Newsletter', 'Sponsorship Pitch', 'Thank You', 'Collaboration'], defaultValue: 'Follow-up' },
      TONE_FIELD, LANGUAGE_FIELD,
      COUNT_FIELD({ count: 3 }),
    ],
    outputLabel: 'Your Generated Emails',
    outputItemNoun: 'email',
    analysisTitle: 'Why these emails work?',
    metrics: METRICS.business,
  },
  'blog-ideas': {
    fields: [
      topicField('What is your blog niche or topic?', 'e.g., Personal finance for millennials, sustainable living, AI tools...'),
      AUDIENCE_FIELD,
      COUNT_FIELD({ count: 10 }),
    ],
    outputLabel: 'Your Blog Post Ideas',
    outputItemNoun: 'idea',
    analysisTitle: 'Why these ideas work?',
    metrics: METRICS.writing,
  },
  'blog-outline-generator': {
    fields: [
      topicField('What is your blog post topic?', 'e.g., How to start a podcast in 2025...'),
      AUDIENCE_FIELD, TONE_FIELD,
      COUNT_FIELD({ count: 1, options: [1, 2, 3] }),
    ],
    outputLabel: 'Your Blog Outlines',
    outputItemNoun: 'outline',
    analysisTitle: 'Why this outline works?',
    metrics: METRICS.writing,
  },
  'blog-intro-generator': {
    fields: [
      topicField('What is your blog post about?', 'e.g., The benefits of intermittent fasting for busy professionals...'),
      TONE_FIELD, LANGUAGE_FIELD,
      COUNT_FIELD({ count: 5 }),
    ],
    outputLabel: 'Your Generated Intros',
    outputItemNoun: 'intro',
    analysisTitle: 'Why these intros work?',
    metrics: METRICS.writing,
  },
  'blog-conclusion-generator': {
    fields: [
      topicField('Paste your blog post (or a summary):', 'e.g., A 1000-word post about time management techniques...'),
      { type: 'select', key: 'ctaType', label: 'CTA Type', options: ['Comment', 'Share', 'Subscribe', 'Read More', 'Buy', 'Newsletter'], defaultValue: 'Subscribe' },
      TONE_FIELD,
      COUNT_FIELD({ count: 5 }),
    ],
    outputLabel: 'Your Generated Conclusions',
    outputItemNoun: 'conclusion',
    analysisTitle: 'Why these conclusions work?',
    metrics: METRICS.writing,
  },
  'faq-generator': {
    fields: [
      topicField('What topic or page is this FAQ for?', 'e.g., A SaaS pricing page, a fitness app landing page, a product FAQ...'),
      AUDIENCE_FIELD,
      COUNT_FIELD({ count: 10, options: [5, 10, 15, 20] }),
    ],
    outputLabel: 'Your Generated FAQs',
    outputItemNoun: 'FAQ',
    analysisTitle: 'Why these FAQs work?',
    metrics: METRICS.writing,
  },
  'content-improver': {
    fields: [
      topicField('Paste the content you want to improve:', 'e.g., [paste your existing content here]...', 2000, ),
      { type: 'select', key: 'improveGoal', label: 'Improvement Goal', options: ['More Engaging', 'More Concise', 'More Professional', 'More Persuasive', 'Better SEO', 'More Readable'], defaultValue: 'More Engaging' },
      TONE_FIELD,
      COUNT_FIELD({ count: 3 }),
    ],
    outputLabel: 'Your Improved Content',
    outputItemNoun: 'version',
    analysisTitle: 'Why these improvements work?',
    metrics: METRICS.writing,
  },
  'grammar-checker': {
    fields: [
      topicField('Paste your text to check:', 'e.g., [paste your text here]...', 2000),
      LANGUAGE_FIELD,
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Grammar Check Results',
    outputItemNoun: 'correction',
    analysisTitle: 'Analysis Summary',
    metrics: METRICS.writing,
  },
  'rewrite-tool': {
    fields: [
      topicField('Paste the text you want to rewrite:', 'e.g., [paste your text here]...', 2000),
      { type: 'select', key: 'rewriteStyle', label: 'Rewrite Style', options: ['More Casual', 'More Professional', 'More Persuasive', 'Simpler', 'More Formal', 'More Creative'], defaultValue: 'More Professional' },
      TONE_FIELD, LANGUAGE_FIELD,
      COUNT_FIELD({ count: 3 }),
    ],
    outputLabel: 'Your Rewritten Content',
    outputItemNoun: 'version',
    analysisTitle: 'Why these rewrites work?',
    metrics: METRICS.writing,
  },
  'humanizer': {
    fields: [
      topicField('Paste the AI-generated text to humanize:', 'e.g., [paste your AI-generated text here]...', 2000),
      { type: 'select', key: 'humanizeStyle', label: 'Writing Style', options: ['Conversational', 'Professional', 'Storytelling', 'Casual Blog', 'Friendly Expert'], defaultValue: 'Conversational' },
      LANGUAGE_FIELD,
      COUNT_FIELD({ count: 3 }),
    ],
    outputLabel: 'Your Humanized Content',
    outputItemNoun: 'version',
    analysisTitle: 'Why this sounds more human',
    metrics: METRICS.writing,
  },
  'summarizer': {
    fields: [
      topicField('Paste the content to summarize:', 'e.g., [paste your long article, transcript, or document here]...', 4000),
      { type: 'select', key: 'summaryLength', label: 'Summary Length', options: ['1 Sentence', '3 Sentences', '1 Paragraph', 'Bullet Points', 'Detailed'], defaultValue: 'Bullet Points' },
      LANGUAGE_FIELD,
      COUNT_FIELD({ count: 3 }),
    ],
    outputLabel: 'Your Summaries',
    outputItemNoun: 'summary',
    analysisTitle: 'Summary Analysis',
    metrics: METRICS.writing,
  },
  'paraphraser': {
    fields: [
      topicField('Paste the paragraph to paraphrase:', 'e.g., [paste your paragraph here]...', 1000),
      { type: 'select', key: 'paraphraseStyle', label: 'Style', options: ['Keep Meaning', 'Simplify', 'Expand', 'Formalize', 'Casual'], defaultValue: 'Keep Meaning' },
      LANGUAGE_FIELD,
      COUNT_FIELD({ count: 3 }),
    ],
    outputLabel: 'Your Paraphrased Text',
    outputItemNoun: 'version',
    analysisTitle: 'Why these paraphrases work?',
    metrics: METRICS.writing,
  },
  'story-writer': {
    fields: [
      topicField('What is your story about?', 'e.g., A detective discovers their partner is the criminal they\'ve been chasing...'),
      { type: 'select', key: 'genre', label: 'Genre', options: ['Thriller', 'Sci-Fi', 'Drama', 'Comedy', 'Horror', 'Romance', 'Adventure'], defaultValue: 'Thriller' },
      { type: 'select', key: 'storyLength', label: 'Story Length', options: ['Flash Fiction (100 words)', 'Short (500 words)', 'Medium (1000 words)', 'Long (2000 words)'], defaultValue: 'Short (500 words)' },
      TONE_FIELD, LANGUAGE_FIELD,
      COUNT_FIELD({ count: 3 }),
    ],
    outputLabel: 'Your Generated Stories',
    outputItemNoun: 'story',
    analysisTitle: 'Why these stories work?',
    metrics: METRICS.writing,
  },

  /* ===== SEO ===== */
  'title-optimizer': {
    fields: [
      topicField('What is your content about?', 'e.g., 10 productivity apps for remote teams...'),
      PLATFORMS_FIELD, AUDIENCE_FIELD, TONE_FIELD,
      COUNT_FIELD({ count: 10 }),
    ],
    outputLabel: 'Your Optimized Titles',
    outputItemNoun: 'title',
    analysisTitle: 'Why these titles work?',
    metrics: METRICS.seo,
  },
  'seo-analyzer': {
    fields: [
      topicField('Paste your content to analyze for SEO:', 'e.g., [paste your blog post or article here]...', 4000),
      { type: 'text', key: 'targetKeyword', label: 'Target Keyword', placeholder: 'e.g., productivity tips' },
      LANGUAGE_FIELD,
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'SEO Analysis Results',
    outputItemNoun: 'finding',
    analysisTitle: 'SEO Score Breakdown',
    metrics: METRICS.seo,
  },
  'keyword-research': {
    fields: [
      topicField('What is your niche or topic?', 'e.g., Personal finance, vegan cooking, home workouts...'),
      AUDIENCE_FIELD,
      COUNT_FIELD({ count: 15, options: [10, 15, 20, 25] }),
    ],
    outputLabel: 'Your Keyword Opportunities',
    outputItemNoun: 'keyword',
    analysisTitle: 'Keyword Analysis',
    metrics: METRICS.seo,
  },
  'keyword-clustering': {
    fields: [
      topicField('Paste your keyword list (one per line):', 'e.g., productivity tips\ntime management\nmorning routine\n...', 2000),
      { type: 'select', key: 'clusterStrategy', label: 'Clustering Strategy', options: ['By Topic', 'By Intent', 'By Funnel Stage', 'By Difficulty'], defaultValue: 'By Topic' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Keyword Clusters',
    outputItemNoun: 'cluster',
    analysisTitle: 'Cluster Analysis',
    metrics: METRICS.seo,
  },
  'meta-title-generator': {
    fields: [
      topicField('What is your page about?', 'e.g., A landing page for a productivity app...'),
      { type: 'text', key: 'targetKeyword', label: 'Target Keyword (Optional)', placeholder: 'e.g., productivity app', optional: true },
      COUNT_FIELD({ count: 10 }),
    ],
    outputLabel: 'Your Meta Titles',
    outputItemNoun: 'meta title',
    analysisTitle: 'Why these meta titles work?',
    metrics: METRICS.seo,
  },
  'meta-description-generator': {
    fields: [
      topicField('What is your page about?', 'e.g., A blog post about the best productivity tools...'),
      { type: 'text', key: 'targetKeyword', label: 'Target Keyword (Optional)', placeholder: 'e.g., productivity tools', optional: true },
      COUNT_FIELD({ count: 5 }),
    ],
    outputLabel: 'Your Meta Descriptions',
    outputItemNoun: 'meta description',
    analysisTitle: 'Why these descriptions work?',
    metrics: METRICS.seo,
  },
  'schema-generator': {
    fields: [
      topicField('Describe your page/page type:', 'e.g., A product page for a $49 productivity course, an FAQ page about shipping...'),
      { type: 'select', key: 'schemaType', label: 'Schema Type', options: ['Article', 'Product', 'FAQ', 'Recipe', 'Event', 'Organization', 'Person', 'LocalBusiness', 'Review'], defaultValue: 'Article' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your JSON-LD Schema',
    outputItemNoun: 'schema',
    analysisTitle: 'Schema Analysis',
    metrics: METRICS.seo,
  },
  'faq-schema-generator': {
    fields: [
      topicField('Paste your FAQs (or describe the topic):', 'e.g., Q: What is your return policy? A: We offer 30-day returns...', 2000),
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your FAQ Schema',
    outputItemNoun: 'schema',
    analysisTitle: 'Schema Analysis',
    metrics: METRICS.seo,
  },
  'content-gap-analyzer': {
    fields: [
      topicField('Describe your niche and competitors:', 'e.g., I run a fitness blog. Competitors: nerdfitness.com, nerdfitness.com. My site covers workouts but not nutrition...', 2000),
      { type: 'text', key: 'yourSite', label: 'Your Site (Optional)', placeholder: 'e.g., myfitnessblog.com' },
      COUNT_FIELD({ count: 10 }),
    ],
    outputLabel: 'Content Gap Opportunities',
    outputItemNoun: 'opportunity',
    analysisTitle: 'Gap Analysis',
    metrics: METRICS.seo,
  },
  'trend-finder': {
    fields: [
      topicField('What is your niche?', 'e.g., AI tools, sustainable fashion, home workouts, crypto...'),
      { type: 'select', key: 'timeframe', label: 'Trend Timeframe', options: ['Rising (3 months)', 'Hot (1 month)', 'Emerging (1 week)', 'Yearly'], defaultValue: 'Rising (3 months)' },
      PLATFORMS_FIELD,
      COUNT_FIELD({ count: 10 }),
    ],
    outputLabel: 'Trending Topics',
    outputItemNoun: 'trend',
    analysisTitle: 'Trend Analysis',
    metrics: METRICS.seo,
  },
  'viral-topic-finder': {
    fields: [
      topicField('What is your niche?', 'e.g., Productivity, personal finance, fitness, tech reviews...'),
      PLATFORMS_FIELD, AUDIENCE_FIELD,
      COUNT_FIELD({ count: 10 }),
    ],
    outputLabel: 'Viral Topic Ideas',
    outputItemNoun: 'topic',
    analysisTitle: 'Why these topics can go viral',
    metrics: METRICS.seo,
  },

  /* ===== VIDEO ===== */
  'thumbnail-analyzer': {
    fields: [
      topicField('Describe your thumbnail (or paste a URL):', 'e.g., A thumbnail with a shocked face, red arrow pointing left, text says "INSANE"...'),
      { type: 'text', key: 'videoTitle', label: 'Video Title', placeholder: 'e.g., I Tried This Productivity Hack for 30 Days' },
      PLATFORMS_FIELD,
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Thumbnail Analysis',
    outputItemNoun: 'finding',
    analysisTitle: 'Thumbnail Score Breakdown',
    metrics: METRICS.video,
  },
  'thumbnail-creator': {
    fields: [
      topicField('What is your video about?', 'e.g., 5 productivity hacks that changed my life...'),
      { type: 'select', key: 'thumbnailStyle', label: 'Thumbnail Style', options: ['Bold Text + Face', 'Before/After', 'List/Number', 'Shock/Surprise', 'Clean Minimal', 'Clickbait'], defaultValue: 'Bold Text + Face' },
      PLATFORMS_FIELD,
      COUNT_FIELD({ count: 5 }),
    ],
    outputLabel: 'Thumbnail Layout Concepts',
    outputItemNoun: 'concept',
    analysisTitle: 'Why these thumbnails work',
    metrics: METRICS.video,
  },
  'thumbnail-text-generator': {
    fields: [
      topicField('What is your video about?', 'e.g., Testing the cheapest vs most expensive camera...'),
      { type: 'select', key: 'textStyle', label: 'Text Style', options: ['Punchy (2-3 words)', 'Question', 'Number/List', 'Shock', 'Curiosity Gap'], defaultValue: 'Punchy (2-3 words)' },
      PLATFORMS_FIELD,
      COUNT_FIELD({ count: 10 }),
    ],
    outputLabel: 'Thumbnail Text Options',
    outputItemNoun: 'text',
    analysisTitle: 'Why these texts work',
    metrics: METRICS.video,
  },
  'thumbnail-ctr-predictor': {
    fields: [
      topicField('Describe your thumbnail design:', 'e.g., Yellow background, large white text "YOU WON\'T BELIEVE THIS", arrow pointing to product...'),
      { type: 'text', key: 'videoTitle', label: 'Video Title', placeholder: 'e.g., The $1 vs $1000 Product Test' },
      PLATFORMS_FIELD,
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'CTR Prediction',
    outputItemNoun: 'prediction',
    analysisTitle: 'CTR Score Breakdown',
    metrics: METRICS.video,
  },
  'youtube-description-generator': {
    fields: [
      topicField('What is your video about?', 'e.g., A 15-minute tutorial on setting up a home studio for YouTube...'),
      { type: 'text', key: 'videoUrl', label: 'Video URL (Optional)', placeholder: 'e.g., youtube.com/watch?v=...', optional: true },
      LANGUAGE_FIELD,
      COUNT_FIELD({ count: 3 }),
    ],
    outputLabel: 'Your Video Descriptions',
    outputItemNoun: 'description',
    analysisTitle: 'Why these descriptions work',
    metrics: METRICS.video,
  },
  'youtube-chapters-generator': {
    fields: [
      topicField('Paste your video transcript or outline:', 'e.g., [paste transcript or chapter notes here]...', 4000),
      { type: 'text', key: 'videoLength', label: 'Video Length', placeholder: 'e.g., 15:30' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Video Chapters',
    outputItemNoun: 'chapters',
    analysisTitle: 'Chapter Analysis',
    metrics: METRICS.video,
  },
  'youtube-tags-generator': {
    fields: [
      topicField('What is your video about?', 'e.g., How to edit videos in DaVinci Resolve for beginners...'),
      { type: 'select', key: 'tagStrategy', label: 'Tag Strategy', options: ['Broad + Long-tail', 'Competitor Tags', 'Trending Tags', 'Niche Specific'], defaultValue: 'Broad + Long-tail' },
      COUNT_FIELD({ count: 20, options: [10, 15, 20, 30] }),
    ],
    outputLabel: 'Your Video Tags',
    outputItemNoun: 'tag',
    analysisTitle: 'Tag Analysis',
    metrics: METRICS.video,
  },
  'youtube-shorts-generator': {
    fields: [
      topicField('What is your Short about?', 'e.g., A 60-second productivity hack about the 2-minute rule...'),
      TONE_FIELD, LANGUAGE_FIELD,
      COUNT_FIELD({ count: 5 }),
    ],
    outputLabel: 'Your Shorts Scripts',
    outputItemNoun: 'script',
    analysisTitle: 'Why these Shorts work',
    metrics: METRICS.video,
  },
  'viral-video-analyzer': {
    fields: [
      topicField('Describe the viral video (or paste URL):', 'e.g., A 30-second TikTok where someone reveals a hidden iPhone feature, got 10M views...'),
      { type: 'text', key: 'viewCount', label: 'View Count', placeholder: 'e.g., 10M views' },
      PLATFORMS_FIELD,
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Virality Analysis',
    outputItemNoun: 'insight',
    analysisTitle: 'Virality Score Breakdown',
    metrics: METRICS.video,
  },
  'channel-audit': {
    fields: [
      topicField('Describe your YouTube channel:', 'e.g., My channel is about productivity. 15K subs, posting weekly. Recent videos get 2-5K views. CTR is 4%...', 2000),
      { type: 'text', key: 'channelUrl', label: 'Channel URL (Optional)', placeholder: 'e.g., youtube.com/@mychannel', optional: true },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Channel Audit Report',
    outputItemNoun: 'finding',
    analysisTitle: 'Channel Health Score',
    metrics: METRICS.video,
  },
  'video-title-ab-tester': {
    fields: [
      topicField('What is your video about?', 'e.g., I tested 5 productivity apps for 30 days...'),
      { type: 'select', key: 'testAngle', label: 'Testing Angle', options: ['Emotional vs Logical', 'Question vs Statement', 'Number vs No Number', 'Clickbait vs Honest', 'Mixed'], defaultValue: 'Mixed' },
      COUNT_FIELD({ count: 10 }),
    ],
    outputLabel: 'Title A/B Variations',
    outputItemNoun: 'title pair',
    analysisTitle: 'A/B Test Analysis',
    metrics: METRICS.video,
  },
  'shorts-script-writer': {
    fields: [
      topicField('What is your short-form video about?', 'e.g., 3 Excel tricks that will save you hours...'),
      PLATFORMS_FIELD, TONE_FIELD, LANGUAGE_FIELD,
      COUNT_FIELD({ count: 5 }),
    ],
    outputLabel: 'Your Short-Form Scripts',
    outputItemNoun: 'script',
    analysisTitle: 'Why these scripts work',
    metrics: METRICS.video,
  },
  'podcast-script-writer': {
    fields: [
      topicField('What is your podcast episode about?', 'e.g., An interview with a productivity expert about morning routines...'),
      { type: 'select', key: 'episodeType', label: 'Episode Type', options: ['Solo', 'Interview', 'Co-hosted', 'Storytelling', 'Q&A'], defaultValue: 'Interview' },
      { type: 'text', key: 'episodeLength', label: 'Episode Length', placeholder: 'e.g., 30 minutes' },
      TONE_FIELD, LANGUAGE_FIELD,
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Podcast Script',
    outputItemNoun: 'script',
    analysisTitle: 'Why this script works',
    metrics: METRICS.video,
  },
  'webinar-script-writer': {
    fields: [
      topicField('What is your webinar about?', 'e.g., A 45-minute webinar on how to start a faceless YouTube channel...'),
      { type: 'text', key: 'webinarLength', label: 'Webinar Length', placeholder: 'e.g., 45 minutes' },
      { type: 'select', key: 'webinarGoal', label: 'Webinar Goal', options: ['Sell a Product', 'Generate Leads', 'Educate', 'Build Authority'], defaultValue: 'Sell a Product' },
      TONE_FIELD,
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Webinar Script',
    outputItemNoun: 'script',
    analysisTitle: 'Why this script converts',
    metrics: METRICS.video,
  },

  /* ===== SOCIAL MEDIA ===== */
  'caption-generator': {
    fields: [
      topicField('What is your post about?', 'e.g., A behind-the-scenes photo of my workspace setup...'),
      PLATFORMS_FIELD, TONE_FIELD, LANGUAGE_FIELD,
      COUNT_FIELD({ count: 5 }),
    ],
    outputLabel: 'Your Generated Captions',
    outputItemNoun: 'caption',
    analysisTitle: 'Why these captions work',
    metrics: METRICS.social,
  },
  'hashtag-finder': {
    fields: [
      topicField('What is your post/niche about?', 'e.g., Travel photography, vegan recipes, fitness motivation...'),
      PLATFORMS_FIELD,
      COUNT_FIELD({ count: 20, options: [10, 15, 20, 30] }),
    ],
    outputLabel: 'Your Hashtag Sets',
    outputItemNoun: 'hashtag set',
    analysisTitle: 'Hashtag Strategy',
    metrics: METRICS.social,
  },
  'linkedin-post-generator': {
    fields: [
      topicField('What is your LinkedIn post about?', 'e.g., A lesson I learned from failing my first startup...'),
      { type: 'select', key: 'postFormat', label: 'Post Format', options: ['Story', 'Listicle', 'How-to', 'Opinion', 'Achievement', 'Question'], defaultValue: 'Story' },
      TONE_FIELD, LANGUAGE_FIELD,
      COUNT_FIELD({ count: 3 }),
    ],
    outputLabel: 'Your LinkedIn Posts',
    outputItemNoun: 'post',
    analysisTitle: 'Why these posts work',
    metrics: METRICS.social,
  },
  'linkedin-carousel-generator': {
    fields: [
      topicField('What is your carousel about?', 'e.g., 5 productivity tools I use every day...'),
      { type: 'select', key: 'slideCount', label: 'Number of Slides', options: ['5 slides', '7 slides', '10 slides', '15 slides'], defaultValue: '7 slides' },
      TONE_FIELD,
      COUNT_FIELD({ count: 1, options: [1, 2] }),
    ],
    outputLabel: 'Your Carousel Outline',
    outputItemNoun: 'carousel',
    analysisTitle: 'Why this carousel works',
    metrics: METRICS.social,
  },
  'twitter-thread-generator': {
    fields: [
      topicField('What is your thread about?', 'e.g., How I built a $10K/month side hustle in 6 months...'),
      { type: 'select', key: 'threadLength', label: 'Thread Length', options: ['5 tweets', '7 tweets', '10 tweets', '15 tweets'], defaultValue: '7 tweets' },
      TONE_FIELD, LANGUAGE_FIELD,
      COUNT_FIELD({ count: 3 }),
    ],
    outputLabel: 'Your Twitter Threads',
    outputItemNoun: 'thread',
    analysisTitle: 'Why these threads work',
    metrics: METRICS.social,
  },
  'viral-tweet-generator': {
    fields: [
      topicField('What is your tweet about?', 'e.g., A contrarian take on remote work...'),
      { type: 'select', key: 'tweetStyle', label: 'Tweet Style', options: ['Hot Take', 'Story', 'List', 'Question', 'Quote', 'Thread Hook'], defaultValue: 'Hot Take' },
      LANGUAGE_FIELD,
      COUNT_FIELD({ count: 10 }),
    ],
    outputLabel: 'Your Viral Tweets',
    outputItemNoun: 'tweet',
    analysisTitle: 'Why these tweets can go viral',
    metrics: METRICS.social,
  },
  'reply-generator': {
    fields: [
      topicField('Paste the comment/post you want to reply to:', 'e.g., "This is great advice! How do I get started?"...', 1000),
      { type: 'select', key: 'replyGoal', label: 'Reply Goal', options: ['Helpful', 'Witty', 'Agree', 'Disagree Politely', 'Ask Question', 'Promote'], defaultValue: 'Helpful' },
      TONE_FIELD,
      COUNT_FIELD({ count: 5 }),
    ],
    outputLabel: 'Your Generated Replies',
    outputItemNoun: 'reply',
    analysisTitle: 'Why these replies work',
    metrics: METRICS.social,
  },
  'reel-caption-generator': {
    fields: [
      topicField('What is your Reel about?', 'e.g., A 15-second cooking hack for perfect scrambled eggs...'),
      TONE_FIELD, LANGUAGE_FIELD,
      COUNT_FIELD({ count: 5 }),
    ],
    outputLabel: 'Your Reel Captions',
    outputItemNoun: 'caption',
    analysisTitle: 'Why these captions work',
    metrics: METRICS.social,
  },
  'carousel-generator': {
    fields: [
      topicField('What is your carousel about?', 'e.g., 7 mindset shifts that changed my life...'),
      PLATFORMS_FIELD,
      { type: 'select', key: 'slideCount', label: 'Number of Slides', options: ['5 slides', '7 slides', '10 slides'], defaultValue: '7 slides' },
      TONE_FIELD,
      COUNT_FIELD({ count: 1, options: [1, 2] }),
    ],
    outputLabel: 'Your Carousel Outline',
    outputItemNoun: 'carousel',
    analysisTitle: 'Why this carousel works',
    metrics: METRICS.social,
  },
  'instagram-bio-generator': {
    fields: [
      topicField('Describe yourself/your brand:', 'e.g., Fitness coach helping busy moms lose weight. 23K followers. DM for coaching...'),
      { type: 'select', key: 'bioStyle', label: 'Bio Style', options: ['Professional', 'Playful', 'Minimal', 'Keyword-Heavy', 'Emoji-Heavy'], defaultValue: 'Professional' },
      LANGUAGE_FIELD,
      COUNT_FIELD({ count: 5 }),
    ],
    outputLabel: 'Your Instagram Bios',
    outputItemNoun: 'bio',
    analysisTitle: 'Why these bios convert',
    metrics: METRICS.social,
  },
  'story-idea-generator': {
    fields: [
      topicField('What is your account/niche about?', 'e.g., A food blogger sharing recipes and restaurant reviews...'),
      PLATFORMS_FIELD,
      COUNT_FIELD({ count: 10 }),
    ],
    outputLabel: 'Your Story Ideas',
    outputItemNoun: 'idea',
    analysisTitle: 'Why these stories engage',
    metrics: METRICS.social,
  },
  'comment-reply-generator': {
    fields: [
      topicField('Paste the comment you want to reply to:', 'e.g., "This is amazing! Where can I learn more?"...', 500),
      { type: 'select', key: 'replyTone', label: 'Reply Tone', options: ['Friendly', 'Professional', 'Witty', 'Grateful', 'Helpful'], defaultValue: 'Friendly' },
      COUNT_FIELD({ count: 5 }),
    ],
    outputLabel: 'Your Comment Replies',
    outputItemNoun: 'reply',
    analysisTitle: 'Why these replies work',
    metrics: METRICS.social,
  },

  /* ===== REPURPOSING ===== */
  'repurpose-engine': {
    fields: [
      topicField('Paste your original content:', 'e.g., [paste your blog post, video transcript, or podcast transcript here]...', 4000),
      { type: 'select', key: 'sourceFormat', label: 'Source Format', options: ['Blog Post', 'Video Transcript', 'Podcast Transcript', 'Tweet/Thread', 'Email'], defaultValue: 'Blog Post' },
      { type: 'select', key: 'targetFormats', label: 'Target Formats', options: ['All Platforms', 'Twitter + LinkedIn', 'Instagram + TikTok', 'Newsletter + Blog', 'YouTube + Podcast'], defaultValue: 'All Platforms' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Repurposed Content',
    outputItemNoun: 'repurposed asset',
    analysisTitle: 'Repurposing Strategy',
    metrics: METRICS.repurpose,
  },
  'blog-to-twitter': {
    fields: [
      topicField('Paste your blog post:', 'e.g., [paste your blog post here]...', 4000),
      { type: 'select', key: 'threadLength', label: 'Thread Length', options: ['5 tweets', '7 tweets', '10 tweets'], defaultValue: '7 tweets' },
      TONE_FIELD,
      COUNT_FIELD({ count: 1, options: [1, 2] }),
    ],
    outputLabel: 'Your Twitter Threads',
    outputItemNoun: 'thread',
    analysisTitle: 'Why this thread works',
    metrics: METRICS.repurpose,
  },
  'blog-to-linkedin': {
    fields: [
      topicField('Paste your blog post:', 'e.g., [paste your blog post here]...', 4000),
      { type: 'select', key: 'postFormat', label: 'Post Format', options: ['Story', 'Listicle', 'How-to', 'Opinion'], defaultValue: 'Story' },
      TONE_FIELD,
      COUNT_FIELD({ count: 2 }),
    ],
    outputLabel: 'Your LinkedIn Posts',
    outputItemNoun: 'post',
    analysisTitle: 'Why this post works',
    metrics: METRICS.repurpose,
  },
  'blog-to-instagram': {
    fields: [
      topicField('Paste your blog post:', 'e.g., [paste your blog post here]...', 4000),
      { type: 'select', key: 'slideCount', label: 'Carousel Slides', options: ['5 slides', '7 slides', '10 slides'], defaultValue: '7 slides' },
      TONE_FIELD,
      COUNT_FIELD({ count: 1, options: [1, 2] }),
    ],
    outputLabel: 'Your Instagram Carousel',
    outputItemNoun: 'carousel',
    analysisTitle: 'Why this carousel works',
    metrics: METRICS.repurpose,
  },
  'video-to-blog': {
    fields: [
      topicField('Paste your video transcript:', 'e.g., [paste your video transcript here]...', 4000),
      { type: 'select', key: 'blogStyle', label: 'Blog Style', options: ['How-to Guide', 'Listicle', 'Deep Dive', 'Opinion Piece'], defaultValue: 'How-to Guide' },
      LANGUAGE_FIELD,
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Blog Post',
    outputItemNoun: 'blog post',
    analysisTitle: 'Why this blog works',
    metrics: METRICS.repurpose,
  },
  'video-to-newsletter': {
    fields: [
      topicField('Paste your video transcript:', 'e.g., [paste your video transcript here]...', 4000),
      TONE_FIELD, LANGUAGE_FIELD,
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Newsletter',
    outputItemNoun: 'newsletter',
    analysisTitle: 'Why this newsletter works',
    metrics: METRICS.repurpose,
  },
  'podcast-to-blog': {
    fields: [
      topicField('Paste your podcast transcript:', 'e.g., [paste your podcast transcript here]...', 4000),
      { type: 'select', key: 'blogStyle', label: 'Blog Style', options: ['Q&A Format', 'Article', 'Key Takeaways', 'Quote Highlights'], defaultValue: 'Article' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Blog Post',
    outputItemNoun: 'blog post',
    analysisTitle: 'Why this blog works',
    metrics: METRICS.repurpose,
  },
  'pdf-to-carousel': {
    fields: [
      topicField('Paste your PDF content (or describe it):', 'e.g., [paste key points from your PDF here]...', 4000),
      { type: 'select', key: 'slideCount', label: 'Carousel Slides', options: ['5 slides', '7 slides', '10 slides'], defaultValue: '7 slides' },
      PLATFORMS_FIELD,
      COUNT_FIELD({ count: 1, options: [1, 2] }),
    ],
    outputLabel: 'Your Carousel Outline',
    outputItemNoun: 'carousel',
    analysisTitle: 'Why this carousel works',
    metrics: METRICS.repurpose,
  },
  'thread-to-reel-script': {
    fields: [
      topicField('Paste your Twitter thread:', 'e.g., [paste your thread here]...', 2000),
      { type: 'select', key: 'reelStyle', label: 'Reel Style', options: ['Talking Head', 'Text Overlay', 'B-Roll Voiceover', 'Fast-paced'], defaultValue: 'Fast-paced' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Reel Script',
    outputItemNoun: 'script',
    analysisTitle: 'Why this script works',
    metrics: METRICS.repurpose,
  },

  /* ===== ANALYTICS (AI-powered insights, not calculators) ===== */
  'revenue-calculator': {
    fields: [
      topicField('Describe your content revenue streams:', 'e.g., YouTube AdSense ($2K/mo), sponsorships ($5K/mo), course sales ($3K/mo)...', 2000),
      { type: 'text', key: 'monthlyViews', label: 'Monthly Views', placeholder: 'e.g., 500K' },
      { type: 'text', key: 'followerCount', label: 'Follower Count', placeholder: 'e.g., 50K' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Revenue Analysis & Projections',
    outputItemNoun: 'insight',
    analysisTitle: 'Revenue Health Score',
    metrics: METRICS.business,
  },
  'engagement-rate-calculator': {
    fields: [
      topicField('Paste your engagement stats:', 'e.g., Platform: Instagram. Followers: 10K. Avg likes: 350. Avg comments: 25. Avg shares: 15...', 1000),
      { type: 'text', key: 'platform', label: 'Platform', placeholder: 'e.g., Instagram' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Engagement Analysis',
    outputItemNoun: 'metric',
    analysisTitle: 'Engagement Health Score',
    metrics: METRICS.social,
  },
  'cpm-calculator': {
    fields: [
      topicField('Enter your CPM data:', 'e.g., Ad revenue: $1,200. Impressions: 450,000. Platform: YouTube...', 500),
      { type: 'text', key: 'adRevenue', label: 'Ad Revenue ($)', placeholder: 'e.g., 1200' },
      { type: 'text', key: 'impressions', label: 'Impressions', placeholder: 'e.g., 450000' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'CPM Analysis',
    outputItemNoun: 'metric',
    analysisTitle: 'CPM Health Score',
    metrics: METRICS.business,
  },
  'rpm-calculator': {
    fields: [
      topicField('Enter your RPM data:', 'e.g., Total revenue: $3,500. Total views: 1M. Platform: YouTube...', 500),
      { type: 'text', key: 'totalRevenue', label: 'Total Revenue ($)', placeholder: 'e.g., 3500' },
      { type: 'text', key: 'totalViews', label: 'Total Views', placeholder: 'e.g., 1000000' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'RPM Analysis',
    outputItemNoun: 'metric',
    analysisTitle: 'RPM Health Score',
    metrics: METRICS.business,
  },
  'channel-growth-calculator': {
    fields: [
      topicField('Enter your channel growth data:', 'e.g., Current subscribers: 15K. Growth rate: 5% monthly. Posting frequency: 2x/week...', 1000),
      { type: 'text', key: 'currentSubs', label: 'Current Subscribers', placeholder: 'e.g., 15000' },
      { type: 'text', key: 'growthRate', label: 'Monthly Growth Rate (%)', placeholder: 'e.g., 5' },
      { type: 'text', key: 'timeframe', label: 'Projection Timeframe', placeholder: 'e.g., 12 months' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Growth Projection',
    outputItemNoun: 'projection',
    analysisTitle: 'Growth Health Score',
    metrics: METRICS.video,
  },
  'sponsorship-calculator': {
    fields: [
      topicField('Enter your sponsorship data:', 'e.g., Followers: 50K. Avg views: 10K. Engagement rate: 5%. Niche: tech...', 1000),
      { type: 'text', key: 'followers', label: 'Followers', placeholder: 'e.g., 50000' },
      { type: 'text', key: 'avgViews', label: 'Avg Views per Post', placeholder: 'e.g., 10000' },
      { type: 'text', key: 'engagementRate', label: 'Engagement Rate (%)', placeholder: 'e.g., 5' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Sponsorship Rate Analysis',
    outputItemNoun: 'rate',
    analysisTitle: 'Sponsorship Value Score',
    metrics: METRICS.business,
  },

  /* ===== PLANNING ===== */
  'content-calendar': {
    fields: [
      topicField('Describe your content planning needs:', 'e.g., I post on YouTube (2x/week), Instagram (daily), and a newsletter (weekly). Niche: productivity...', 2000),
      { type: 'select', key: 'timeframe', label: 'Calendar Timeframe', options: ['1 Week', '2 Weeks', '1 Month', '3 Months'], defaultValue: '1 Month' },
      PLATFORMS_FIELD,
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Content Calendar',
    outputItemNoun: 'calendar',
    analysisTitle: 'Calendar Strategy Analysis',
    metrics: METRICS.writing,
  },
  'creator-planner': {
    fields: [
      topicField('Describe your workflow and goals:', 'e.g., I\'m a solo creator making 2 YouTube videos + 5 social posts per week. Need a batch workflow...', 2000),
      { type: 'select', key: 'planningStyle', label: 'Planning Style', options: ['Batch Creation', 'Daily Tasks', 'Weekly Sprint', 'Monthly Theme'], defaultValue: 'Weekly Sprint' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Creator Plan',
    outputItemNoun: 'plan',
    analysisTitle: 'Plan Analysis',
    metrics: METRICS.writing,
  },
  'project-manager': {
    fields: [
      topicField('Describe your project:', 'e.g., Launching a new podcast. Need to plan recording, editing, artwork, launch promo, first 5 episodes...', 2000),
      { type: 'select', key: 'projectType', label: 'Project Type', options: ['Content Launch', 'Collaboration', 'Course Creation', 'Event', 'Product Launch'], defaultValue: 'Content Launch' },
      { type: 'text', key: 'timeline', label: 'Timeline', placeholder: 'e.g., 4 weeks' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Project Plan',
    outputItemNoun: 'plan',
    analysisTitle: 'Project Analysis',
    metrics: METRICS.business,
  },
  'content-checklist': {
    fields: [
      topicField('What type of content do you need a checklist for?', 'e.g., YouTube video publish checklist, blog post checklist, podcast episode checklist...'),
      PLATFORMS_FIELD,
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Content Checklist',
    outputItemNoun: 'checklist',
    analysisTitle: 'Checklist Analysis',
    metrics: METRICS.writing,
  },
  'launch-checklist': {
    fields: [
      topicField('What are you launching?', 'e.g., A new online course, a YouTube channel, a podcast, a digital product...'),
      { type: 'select', key: 'launchType', label: 'Launch Type', options: ['Course', 'Product', 'Channel', 'Podcast', 'App', 'Service'], defaultValue: 'Course' },
      { type: 'text', key: 'timeline', label: 'Launch Timeline', placeholder: 'e.g., 4 weeks' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Launch Checklist',
    outputItemNoun: 'checklist',
    analysisTitle: 'Launch Readiness Score',
    metrics: METRICS.business,
  },

  /* ===== BUSINESS ===== */
  'brand-voice-generator': {
    fields: [
      topicField('Describe your brand:', 'e.g., A sustainable fitness apparel brand targeting eco-conscious millennials. Values: authenticity, sustainability, empowerment...', 2000),
      { type: 'select', key: 'voiceStyle', label: 'Voice Style', options: ['Friendly Expert', 'Bold & Rebellious', 'Calm & Minimal', 'Playful & Fun', 'Luxurious'], defaultValue: 'Friendly Expert' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Brand Voice Guide',
    outputItemNoun: 'guide',
    analysisTitle: 'Brand Voice Analysis',
    metrics: METRICS.business,
  },
  'brand-kit-generator': {
    fields: [
      topicField('Describe your brand:', 'e.g., A productivity app for creatives. Name: FlowState. Colors: deep blue + gold. Vibe: focused, premium, calm...', 2000),
      { type: 'select', key: 'brandVibe', label: 'Brand Vibe', options: ['Premium', 'Playful', 'Minimal', 'Bold', 'Organic', 'Tech'], defaultValue: 'Premium' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Brand Kit',
    outputItemNoun: 'guideline',
    analysisTitle: 'Brand Kit Analysis',
    metrics: METRICS.business,
  },
  'mission-statement-generator': {
    fields: [
      topicField('Describe your organization:', 'e.g., A non-profit helping underprivileged kids learn coding. We provide free coding bootcamps and mentorship...', 2000),
      { type: 'select', key: 'statementType', label: 'Statement Type', options: ['Mission', 'Vision', 'Values', 'All Three'], defaultValue: 'All Three' },
      COUNT_FIELD({ count: 5 }),
    ],
    outputLabel: 'Your Mission Statements',
    outputItemNoun: 'statement',
    analysisTitle: 'Why these statements work',
    metrics: METRICS.business,
  },
  'invoice-generator': {
    fields: [
      topicField('Enter your invoice details:', 'e.g., Client: Acme Corp. Service: 2 sponsored YouTube videos. Amount: $5,000. Due: Net 30. Date: 2025-06-01...', 2000),
      { type: 'text', key: 'clientName', label: 'Client Name', placeholder: 'e.g., Acme Corp' },
      { type: 'text', key: 'amount', label: 'Amount ($)', placeholder: 'e.g., 5000' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Invoice',
    outputItemNoun: 'invoice',
    analysisTitle: 'Invoice Analysis',
    metrics: METRICS.business,
  },
  'contract-generator': {
    fields: [
      topicField('Describe the collaboration:', 'e.g., Brand sponsorship deal. Creator will post 1 Instagram reel + 2 stories. Deliverables, usage rights, payment terms...', 2000),
      { type: 'select', key: 'contractType', label: 'Contract Type', options: ['Sponsorship', 'Collaboration', 'Freelance', 'NDA', 'Content License'], defaultValue: 'Sponsorship' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Contract',
    outputItemNoun: 'contract',
    analysisTitle: 'Contract Analysis',
    metrics: METRICS.business,
  },
  'proposal-generator': {
    fields: [
      topicField('Describe the pitch:', 'e.g., Pitching a 3-month content partnership to a SaaS brand. Includes 6 videos, 12 social posts, blog content. Budget: $15K...', 2000),
      { type: 'text', key: 'brandName', label: 'Brand Name', placeholder: 'e.g., Notion' },
      { type: 'text', key: 'budget', label: 'Budget ($)', placeholder: 'e.g., 15000' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Proposal',
    outputItemNoun: 'proposal',
    analysisTitle: 'Proposal Analysis',
    metrics: METRICS.business,
  },
  'client-brief-generator': {
    fields: [
      topicField('Describe the project:', 'e.g., Client wants a 5-video YouTube series about productivity tools. Brand: a task management app. Target: busy professionals...', 2000),
      { type: 'select', key: 'projectType', label: 'Project Type', options: ['Video Series', 'Social Campaign', 'Blog Content', 'Full Campaign', 'Single Asset'], defaultValue: 'Video Series' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Client Brief',
    outputItemNoun: 'brief',
    analysisTitle: 'Brief Analysis',
    metrics: METRICS.business,
  },

  /* ===== AI UTILITY ===== */
  'prompt-generator': {
    fields: [
      topicField('What task should the prompt accomplish?', 'e.g., Write a blog post intro, generate social media captions, summarize a video transcript...'),
      { type: 'select', key: 'aiModel', label: 'Target AI Model', options: ['GPT-4', 'Claude', 'Gemini', 'Midjourney', 'Stable Diffusion', 'Any'], defaultValue: 'Any' },
      COUNT_FIELD({ count: 5 }),
    ],
    outputLabel: 'Your Generated Prompts',
    outputItemNoun: 'prompt',
    analysisTitle: 'Why these prompts work',
    metrics: METRICS.ai,
  },
  'prompt-improver': {
    fields: [
      topicField('Paste your existing prompt:', 'e.g., Write a blog post about productivity...', 2000),
      { type: 'select', key: 'improveGoal', label: 'Improvement Goal', options: ['More Specific', 'Better Structure', 'Add Constraints', 'Add Examples', 'Add Role/Persona'], defaultValue: 'More Specific' },
      COUNT_FIELD({ count: 3 }),
    ],
    outputLabel: 'Your Improved Prompts',
    outputItemNoun: 'prompt',
    analysisTitle: 'Why these improvements work',
    metrics: METRICS.ai,
  },
  'prompt-library': {
    fields: [
      topicField('What use-case do you need prompts for?', 'e.g., Content creation, coding, marketing, writing, analysis...'),
      { type: 'select', key: 'useCase', label: 'Use Case', options: ['Content Creation', 'Marketing', 'Coding', 'Writing', 'Business', 'Education', 'Creative'], defaultValue: 'Content Creation' },
      COUNT_FIELD({ count: 10 }),
    ],
    outputLabel: 'Your Prompt Library',
    outputItemNoun: 'prompt',
    analysisTitle: 'Prompt Library Analysis',
    metrics: METRICS.ai,
  },
  'prompt-persona-generator': {
    fields: [
      topicField('What persona do you need?', 'e.g., A senior marketing strategist, a productivity coach, a stand-up comedian, a fitness expert...'),
      { type: 'select', key: 'personaStyle', label: 'Persona Style', options: ['Expert', 'Coach', 'Creative', 'Analyst', 'Comedian', 'Mentor'], defaultValue: 'Expert' },
      COUNT_FIELD({ count: 3 }),
    ],
    outputLabel: 'Your AI Personas',
    outputItemNoun: 'persona',
    analysisTitle: 'Why these personas work',
    metrics: METRICS.ai,
  },
  'text-to-speech': {
    fields: [
      topicField('Paste the text to convert to speech:', 'e.g., [paste your script here]...', 4000),
      { type: 'select', key: 'voiceStyle', label: 'Voice Style', options: ['Natural Male', 'Natural Female', 'Energetic', 'Calm', 'Professional', 'Friendly'], defaultValue: 'Natural Male' },
      { type: 'select', key: 'speed', label: 'Speed', options: ['Slow', 'Normal', 'Fast'], defaultValue: 'Normal' },
      LANGUAGE_FIELD,
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Voiceover Script Analysis',
    outputItemNoun: 'analysis',
    analysisTitle: 'Voiceover Quality Score',
    metrics: METRICS.ai,
  },
  'speech-to-text': {
    fields: [
      topicField('Describe your audio file (or paste a URL):', 'e.g., A 15-minute podcast interview about productivity. Two speakers...', 1000),
      { type: 'select', key: 'transcriptionStyle', label: 'Transcription Style', options: ['Clean Transcript', 'Timestamped', 'Speaker Labels', 'Summary + Transcript'], defaultValue: 'Clean Transcript' },
      LANGUAGE_FIELD,
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Transcription Analysis',
    outputItemNoun: 'analysis',
    analysisTitle: 'Audio Quality Score',
    metrics: METRICS.ai,
  },
  'subtitle-generator': {
    fields: [
      topicField('Paste your video transcript (or describe the video):', 'e.g., [paste transcript here]...', 4000),
      { type: 'select', key: 'subtitleFormat', label: 'Subtitle Format', options: ['SRT', 'VTT', 'ASS', 'Plain Text'], defaultValue: 'SRT' },
      { type: 'select', key: 'subtitleStyle', label: 'Subtitle Style', options: ['2 Lines Max', '1 Line', 'Karaoke', 'Word-by-Word'], defaultValue: '2 Lines Max' },
      LANGUAGE_FIELD,
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Subtitle File',
    outputItemNoun: 'subtitle',
    analysisTitle: 'Subtitle Quality Score',
    metrics: METRICS.ai,
  },
  'podcast-summarizer': {
    fields: [
      topicField('Paste your podcast transcript:', 'e.g., [paste your podcast transcript here]...', 4000),
      { type: 'select', key: 'summaryStyle', label: 'Summary Style', options: ['Key Takeaways', 'Detailed Summary', 'Bullet Points', 'Tweet Thread'], defaultValue: 'Key Takeaways' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Podcast Summary',
    outputItemNoun: 'summary',
    analysisTitle: 'Summary Quality Score',
    metrics: METRICS.ai,
  },
  'background-remover': {
    fields: [
      topicField('Describe your image (or paste a URL):', 'e.g., A product photo of a white sneaker on a grey background...'),
      { type: 'select', key: 'outputFormat', label: 'Output Format', options: ['PNG (transparent)', 'JPG (white bg)', 'JPG (custom bg)'], defaultValue: 'PNG (transparent)' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Image Analysis & Guide',
    outputItemNoun: 'guide',
    analysisTitle: 'Image Quality Score',
    metrics: METRICS.ai,
  },
  'image-upscaler': {
    fields: [
      topicField('Describe your image (or paste a URL):', 'e.g., A low-resolution logo, 200x200 pixels, needs to be 4x larger...'),
      { type: 'select', key: 'upscaleFactor', label: 'Upscale Factor', options: ['2x', '4x', '8x'], defaultValue: '4x' },
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Upscaling Analysis & Guide',
    outputItemNoun: 'guide',
    analysisTitle: 'Upscale Quality Score',
    metrics: METRICS.ai,
  },
  'ai-logo-generator': {
    fields: [
      topicField('Describe your logo needs:', 'e.g., A minimalist logo for a productivity app called "FlowState". Vibe: calm, focused, premium...'),
      { type: 'select', key: 'logoStyle', label: 'Logo Style', options: ['Minimalist', 'Wordmark', 'Monogram', 'Mascot', 'Abstract', 'Vintage'], defaultValue: 'Minimalist' },
      COUNT_FIELD({ count: 5 }),
    ],
    outputLabel: 'Your Logo Concepts',
    outputItemNoun: 'concept',
    analysisTitle: 'Why these concepts work',
    metrics: METRICS.ai,
  },
  'banner-generator': {
    fields: [
      topicField('Describe your banner needs:', 'e.g., A YouTube channel banner for a tech review channel. Dark theme, bold text, includes social handles...'),
      { type: 'select', key: 'bannerPlatform', label: 'Banner Platform', options: ['YouTube', 'Twitter/X', 'Facebook', 'LinkedIn', 'Website'], defaultValue: 'YouTube' },
      COUNT_FIELD({ count: 3 }),
    ],
    outputLabel: 'Your Banner Concepts',
    outputItemNoun: 'concept',
    analysisTitle: 'Why these concepts work',
    metrics: METRICS.ai,
  },
  'poster-generator': {
    fields: [
      topicField('Describe your poster needs:', 'e.g., A promotional poster for a webinar on "AI for Content Creators". Bold, eye-catching, includes date and CTA...'),
      { type: 'select', key: 'posterStyle', label: 'Poster Style', options: ['Bold & Modern', 'Minimal', 'Vintage', 'Event', 'Product', 'Quote'], defaultValue: 'Bold & Modern' },
      COUNT_FIELD({ count: 3 }),
    ],
    outputLabel: 'Your Poster Concepts',
    outputItemNoun: 'concept',
    analysisTitle: 'Why these concepts work',
    metrics: METRICS.ai,
  },
  'landing-page-copy-generator': {
    fields: [
      topicField('What is your product/service?', 'e.g., A productivity app that uses AI to plan your day automatically. Target: busy professionals...'),
      { type: 'text', key: 'productName', label: 'Product Name', placeholder: 'e.g., FlowState' },
      { type: 'select', key: 'pageGoal', label: 'Page Goal', options: ['Sign Up', 'Buy Now', 'Waitlist', 'Demo', 'Download'], defaultValue: 'Sign Up' },
      TONE_FIELD,
      COUNT_FIELD({ count: 1, options: [1] }),
    ],
    outputLabel: 'Your Landing Page Copy',
    outputItemNoun: 'copy',
    analysisTitle: 'Why this copy converts',
    metrics: METRICS.business,
  },
  'hero-section-generator': {
    fields: [
      topicField('What is your website/product about?', 'e.g., A SaaS tool for project management. Helps teams collaborate better...'),
      { type: 'text', key: 'productName', label: 'Product Name', placeholder: 'e.g., TeamFlow' },
      { type: 'select', key: 'heroStyle', label: 'Hero Style', options: ['Headline + Sub + CTA', 'Headline + Image', 'Video Background', 'Split Screen'], defaultValue: 'Headline + Sub + CTA' },
      COUNT_FIELD({ count: 3 }),
    ],
    outputLabel: 'Your Hero Sections',
    outputItemNoun: 'hero',
    analysisTitle: 'Why these heroes work',
    metrics: METRICS.business,
  },
  'cta-generator': {
    fields: [
      topicField('What action do you want users to take?', 'e.g., Sign up for a newsletter, buy a course, download an ebook, book a call...'),
      { type: 'select', key: 'ctaStyle', label: 'CTA Style', options: ['Action Verb', 'Question', 'Urgency', 'Benefit', 'Curiosity'], defaultValue: 'Action Verb' },
      COUNT_FIELD({ count: 10 }),
    ],
    outputLabel: 'Your CTAs',
    outputItemNoun: 'CTA',
    analysisTitle: 'Why these CTAs work',
    metrics: METRICS.business,
  },
};

/* ---------- Default config generator (fallback) ---------- */

function categoryMetrics(category: string): MetricConfig[] {
  switch (category) {
    case 'Writing': return METRICS.writing;
    case 'SEO': return METRICS.seo;
    case 'Video': return METRICS.video;
    case 'Social Media': return METRICS.social;
    case 'Repurposing': return METRICS.repurpose;
    case 'Business': return METRICS.business;
    case 'AI Utility': return METRICS.ai;
    default: return METRICS.hook;
  }
}

function defaultConfig(tool: SmugglerTool): ToolConfigInput {
  return {
    fields: [
      topicField('What is your content about?', 'e.g., Describe what you want to create...'),
      AUDIENCE_FIELD, TONE_FIELD, LANGUAGE_FIELD,
      COUNT_FIELD({ count: 5 }),
    ],
    outputLabel: `Your Generated ${tool.name}`,
    outputItemNoun: 'result',
    analysisTitle: 'Why these results work?',
    metrics: categoryMetrics(tool.category),
  };
}

/** Get the full ToolConfig for a tool ID (explicit config or category-based default). */
export function getToolConfig(toolId: string, tool: SmugglerTool | undefined): ToolConfig {
  const input = CONFIGS[toolId] ?? (tool ? defaultConfig(tool) : null);
  if (!input) {
    // Ultimate fallback
    return {
      toolId,
      fields: [
        topicField('What is your content about?', 'Describe what you want to create...'),
        AUDIENCE_FIELD, TONE_FIELD,
        COUNT_FIELD({ count: 5 }),
      ],
      outputLabel: 'Your Generated Results',
      outputItemNoun: 'result',
      analysisTitle: 'Why these results work?',
      metrics: METRICS.hook,
      countField: true,
      defaultCount: 5,
      countOptions: [5, 10, 15, 20],
    };
  }

  const countField = input.fields.find((f) => f.type === 'count');
  return {
    toolId,
    fields: input.fields,
    outputLabel: input.outputLabel,
    outputItemNoun: input.outputItemNoun,
    analysisTitle: input.analysisTitle,
    metrics: input.metrics,
    countField: !!countField,
    defaultCount: typeof countField?.defaultValue === 'number' ? countField.defaultValue : 5,
    countOptions: countField?.counts ?? [5, 10, 15, 20],
  };
}

export const AUDIENCE_OPTIONS = AUDIENCES;
export const TONE_OPTIONS = TONES;
export const LANGUAGE_OPTIONS = LANGUAGES;
