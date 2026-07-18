import {
  Wand2, PenLine, Target, BarChart3, MonitorPlay, Type, Hash, Calendar,
  DollarSign, Mail, Video, Sparkles, MessageSquareText, FileText, Layout,
  Megaphone, Lightbulb, Camera, Scissors, Mic, Presentation, TrendingUp,
  ListChecks, UserCircle, Briefcase, Wrench, Share2, Users, Bot, ImageIcon,
  FileAudio, Youtube, Instagram, Twitter, Linkedin, Captions, Languages,
  BookOpen, Clock, ShieldCheck, AlertTriangle, type LucideIcon,
} from "lucide-react";

export type ToolCategory =
  | "All"
  | "Writing"
  | "SEO"
  | "Video"
  | "Social Media"
  | "Repurposing"
  | "Analytics"
  | "Planning"
  | "Business"
  | "AI Utility";

export interface SmugglerTool {
  id: string;
  name: string;
  desc: string;
  category: Exclude<ToolCategory, "All">;
  icon: LucideIcon;
  isPopular?: boolean;
  isNew?: boolean;
  agentTip: string;
  uses: string;
  bgColor: string;
  color: string;
}

export const CATEGORIES: ToolCategory[] = [
  "All",
  "Writing",
  "SEO",
  "Video",
  "Social Media",
  "Repurposing",
  "Analytics",
  "Planning",
  "Business",
  "AI Utility",
];

// Stable deterministic uses generator (so SSR matches CSR)
const seedUses = (i: number): string => {
  const k = 100 + ((i * 137) % 900);
  return k % 10 === 0 ? `${(k / 100).toFixed(1)}M` : `${k}K`;
};

const COLORS = [
  { bgColor: "#2A3F2C", color: "#6FC276" }, // Green
  { bgColor: "#5C3A21", color: "#D4A373" }, // Brown
  { bgColor: "#1A3644", color: "#5DADE2" }, // Blue
  { bgColor: "#4A235A", color: "#AF7AC5" }, // Purple
  { bgColor: "#641E16", color: "#EC7063" }, // Red
  { bgColor: "#935116", color: "#F5B041" }, // Orange
  { bgColor: "#1B2631", color: "#85929E" }, // Gray
];

const getColor = (i: number) => COLORS[i % COLORS.length];

const RAW_TOOLS: Omit<SmugglerTool, "uses" | "bgColor" | "color">[] = [
  // WRITING
  { id: "ai-writer", name: "AI Writer", desc: "Write blogs, scripts, captions and more in seconds.", category: "Writing", icon: PenLine, isPopular: true, agentTip: "Give context before asking AI to write." },
  { id: "script-writer", name: "Script Writer", desc: "Generate engaging scripts for videos & podcasts.", category: "Writing", icon: FileText, isPopular: true, agentTip: "The first sentence decides whether viewers stay." },
  { id: "email-writer", name: "Email Writer", desc: "Write professional emails that get responses.", category: "Writing", icon: Mail, agentTip: "Short emails usually convert better." },
  { id: "blog-ideas", name: "Blog Ideas", desc: "Get unlimited blog ideas in your niche.", category: "Writing", icon: Lightbulb, agentTip: "Solve one problem per article." },
  { id: "blog-outline-generator", name: "Blog Outline Generator", desc: "Create structured outlines for any blog post topic.", category: "Writing", icon: ListChecks, agentTip: "Use H2s to break up long text walls." },
  { id: "blog-intro-generator", name: "Blog Intro Generator", desc: "Write catchy introductions that hook readers instantly.", category: "Writing", icon: Type, agentTip: "Start with a shocking statistic." },
  { id: "blog-conclusion-generator", name: "Blog Conclusion Generator", desc: "Wrap up your posts with strong calls to action.", category: "Writing", icon: Layout, agentTip: "Always ask a question at the end." },
  { id: "faq-generator", name: "FAQ Generator", desc: "Generate frequently asked questions for your pages.", category: "Writing", icon: MessageSquareText, agentTip: "Answer what they search for." },
  { id: "content-improver", name: "Content Improver", desc: "Enhance your content for maximum impact.", category: "Writing", icon: Sparkles, agentTip: "Trim the fluff, keep the value." },
  { id: "grammar-checker", name: "Grammar Checker", desc: "Check your content for grammar and spelling errors.", category: "Writing", icon: Captions, agentTip: "Clear writing is good writing." },
  { id: "rewrite-tool", name: "Rewrite Tool", desc: "Rewrite existing text into different tones or styles.", category: "Writing", icon: Wand2, agentTip: "Adapt the tone to your audience." },
  { id: "humanizer", name: "Humanizer", desc: "Make AI-generated text sound more natural and human.", category: "Writing", icon: UserCircle, isPopular: true, agentTip: "Add personal anecdotes." },
  { id: "summarizer", name: "Summarizer", desc: "Condense long articles into short, readable summaries.", category: "Writing", icon: FileText, agentTip: "Bullet points are easier to scan." },
  { id: "paraphraser", name: "Paraphraser", desc: "Rephrase paragraphs quickly while keeping the meaning.", category: "Writing", icon: Languages, agentTip: "Keep the core message intact." },
  { id: "story-writer", name: "Story Writer", desc: "Craft compelling short stories and narrative arcs.", category: "Writing", icon: BookOpen, isNew: true, agentTip: "Conflict drives every great story." },

  // GROWTH / SEO
  { id: "hook-generator", name: "Hook Generator", desc: "Create scroll-stopping hooks that grab attention instantly.", category: "SEO", icon: Wand2, isPopular: true, agentTip: "Curiosity beats clarity in the first 3 seconds." },
  { id: "title-optimizer", name: "Title Optimizer", desc: "Get viral-worthy titles optimized for clicks.", category: "SEO", icon: Target, isPopular: true, agentTip: "Numbers and specificity usually outperform vague titles." },
  { id: "seo-analyzer", name: "SEO Analyzer", desc: "Optimize your content for better search rankings.", category: "SEO", icon: Target, agentTip: "Search intent matters more than keywords." },
  { id: "keyword-research", name: "Keyword Research", desc: "Discover high-volume, low-competition keywords.", category: "SEO", icon: TrendingUp, isPopular: true, agentTip: "Long-tail keywords convert better." },
  { id: "keyword-clustering", name: "Keyword Clustering", desc: "Group related keywords for topical authority.", category: "SEO", icon: Layout, agentTip: "Build content hubs around clusters." },
  { id: "meta-title-generator", name: "Meta Title Generator", desc: "Create perfectly optimized meta titles.", category: "SEO", icon: Type, agentTip: "Keep it under 60 characters." },
  { id: "meta-description-generator", name: "Meta Description Generator", desc: "Write compelling meta descriptions that drive clicks.", category: "SEO", icon: FileText, agentTip: "Include a strong CTA." },
  { id: "schema-generator", name: "Schema Generator", desc: "Generate JSON-LD schema markup for your pages.", category: "SEO", icon: Wrench, agentTip: "Rich snippets increase CTR." },
  { id: "faq-schema-generator", name: "FAQ Schema Generator", desc: "Create FAQ schema to dominate search results.", category: "SEO", icon: MessageSquareText, agentTip: "Claim more real estate on Google." },
  { id: "content-gap-analyzer", name: "Content Gap Analyzer", desc: "Find keywords your competitors rank for but you don't.", category: "SEO", icon: BarChart3, agentTip: "Steal their traffic." },
  { id: "trend-finder", name: "Trend Finder", desc: "Discover breakout trends before they peak.", category: "SEO", icon: TrendingUp, agentTip: "Ride the wave early." },
  { id: "viral-topic-finder", name: "Viral Topic Finder", desc: "Find proven viral topics in your niche.", category: "SEO", icon: Sparkles, agentTip: "Success leaves clues." },

  // VIDEO / YOUTUBE
  { id: "thumbnail-analyzer", name: "Thumbnail Analyzer", desc: "Analyze thumbnails and get AI suggestions to improve CTR.", category: "Video", icon: BarChart3, agentTip: "Faces and contrast increase CTR." },
  { id: "thumbnail-creator", name: "Thumbnail Creator", desc: "Generate thumbnail layouts that get clicked.", category: "Video", icon: ImageIcon, agentTip: "Keep it simple and bold." },
  { id: "thumbnail-text-generator", name: "Thumbnail Text Generator", desc: "Write short, punchy text for your thumbnails.", category: "Video", icon: Type, agentTip: "Under 4 words is ideal." },
  { id: "thumbnail-ctr-predictor", name: "Thumbnail CTR Predictor", desc: "Predict the click-through rate of your thumbnail designs.", category: "Video", icon: TrendingUp, agentTip: "Test before you publish." },
  { id: "youtube-description-generator", name: "YouTube Description Generator", desc: "Create optimized descriptions with timestamps and links.", category: "Video", icon: Youtube, agentTip: "Put the most important info in the first two lines." },
  { id: "youtube-chapters-generator", name: "YouTube Chapters Generator", desc: "Automatically generate video chapters and timestamps.", category: "Video", icon: ListChecks, agentTip: "Chapters increase viewer retention." },
  { id: "youtube-tags-generator", name: "YouTube Tags Generator", desc: "Generate optimized tags for your YouTube videos.", category: "Video", icon: Hash, agentTip: "Tags help with search context." },
  { id: "youtube-shorts-generator", name: "YouTube Shorts Generator", desc: "Script and plan high-retention YouTube Shorts.", category: "Video", icon: Youtube, isPopular: true, agentTip: "Cut the fluff, start immediately." },
  { id: "viral-video-analyzer", name: "Viral Video Analyzer", desc: "Break down why a video went viral.", category: "Video", icon: BarChart3, agentTip: "Analyze pacing and structure." },
  { id: "channel-audit", name: "Channel Audit", desc: "Get a comprehensive audit of your YouTube channel.", category: "Video", icon: Presentation, agentTip: "Fix the leaks in your funnel." },
  { id: "video-title-ab-tester", name: "Video Title A/B Tester", desc: "Compare title variations for maximum impact.", category: "Video", icon: Target, agentTip: "Test emotional vs logical angles." },
  { id: "shorts-script-writer", name: "Shorts Script Writer", desc: "Write fast-paced scripts for short-form content.", category: "Video", icon: FileText, agentTip: "Change the visual every 3 seconds." },
  { id: "podcast-script-writer", name: "Podcast Script Writer", desc: "Structure engaging podcast episodes and interviews.", category: "Video", icon: Mic, agentTip: "Prepare questions, but follow the conversation." },
  { id: "webinar-script-writer", name: "Webinar Script Writer", desc: "Write high-converting webinar presentations.", category: "Video", icon: Presentation, agentTip: "Sell the transformation, not the features." },

  // SOCIAL MEDIA
  { id: "caption-generator", name: "Caption Generator", desc: "Write engaging captions for any platform.", category: "Social Media", icon: Instagram, agentTip: "Ask a question in the first line." },
  { id: "hashtag-finder", name: "Hashtag Finder", desc: "Find the best hashtags to increase reach & visibility.", category: "Social Media", icon: Hash, agentTip: "Niche tags perform better than broad ones." },
  { id: "linkedin-post-generator", name: "LinkedIn Post Generator", desc: "Write professional, engaging posts for LinkedIn.", category: "Social Media", icon: Linkedin, isPopular: true, agentTip: "Tell a story of struggle and triumph." },
  { id: "linkedin-carousel-generator", name: "LinkedIn Carousel Generator", desc: "Create informative carousel outlines for LinkedIn.", category: "Social Media", icon: Layout, agentTip: "One actionable tip per slide." },
  { id: "twitter-thread-generator", name: "Twitter Thread Generator", desc: "Turn ideas into engaging Twitter threads.", category: "Social Media", icon: Twitter, agentTip: "The first tweet is the hook." },
  { id: "viral-tweet-generator", name: "Viral Tweet Generator", desc: "Generate tweets formatted for high engagement.", category: "Social Media", icon: Twitter, agentTip: "Contrarian opinions drive engagement." },
  { id: "reply-generator", name: "Reply Generator", desc: "Write thoughtful replies to engage your audience.", category: "Social Media", icon: MessageSquareText, agentTip: "Add value, don't just say 'great post'." },
  { id: "reel-caption-generator", name: "Reel Caption Generator", desc: "Create captions optimized for Instagram Reels.", category: "Social Media", icon: Instagram, agentTip: "Keep it short, direct them to the comments." },
  { id: "carousel-generator", name: "Carousel Generator", desc: "Plan engaging carousel posts for any platform.", category: "Social Media", icon: Layout, agentTip: "Use the final slide for a strong CTA." },
  { id: "instagram-bio-generator", name: "Instagram Bio Generator", desc: "Write a bio that converts visitors into followers.", category: "Social Media", icon: Instagram, agentTip: "Tell them exactly what they will get by following." },
  { id: "story-idea-generator", name: "Story Idea Generator", desc: "Get daily prompts for engaging Instagram Stories.", category: "Social Media", icon: Lightbulb, agentTip: "Show behind-the-scenes authenticity." },
  { id: "comment-reply-generator", name: "Comment Reply Generator", desc: "Generate engaging responses to user comments.", category: "Social Media", icon: MessageSquareText, agentTip: "Always reply to the first 10 comments." },

  // REPURPOSING
  { id: "repurpose-engine", name: "Repurpose Engine", desc: "Turn one content into multiple formats effortlessly.", category: "Repurposing", icon: Share2, isPopular: true, agentTip: "One great video should become ten assets." },
  { id: "blog-to-twitter", name: "Blog to Twitter", desc: "Turn a blog post into an engaging Twitter thread.", category: "Repurposing", icon: Twitter, agentTip: "Extract the key takeaways." },
  { id: "blog-to-linkedin", name: "Blog to LinkedIn", desc: "Convert articles into punchy LinkedIn posts.", category: "Repurposing", icon: Linkedin, agentTip: "Focus on the professional insights." },
  { id: "blog-to-instagram", name: "Blog to Instagram", desc: "Summarize blog posts into Instagram carousels.", category: "Repurposing", icon: Instagram, agentTip: "Make it highly visual." },
  { id: "video-to-blog", name: "Video to Blog", desc: "Transform video transcripts into formatted articles.", category: "Repurposing", icon: FileText, agentTip: "Reformat for readability, don't just paste." },
  { id: "video-to-newsletter", name: "Video to Newsletter", desc: "Turn video content into engaging email newsletters.", category: "Repurposing", icon: Mail, agentTip: "Add exclusive email-only thoughts." },
  { id: "podcast-to-blog", name: "Podcast to Blog", desc: "Convert podcast episodes into comprehensive blog posts.", category: "Repurposing", icon: FileAudio, agentTip: "Highlight the best quotes." },
  { id: "pdf-to-carousel", name: "PDF to Carousel", desc: "Extract key points from PDFs for social carousels.", category: "Repurposing", icon: Layout, agentTip: "Simplify complex data." },
  { id: "thread-to-reel-script", name: "Thread to Reel Script", desc: "Turn Twitter threads into fast-paced video scripts.", category: "Repurposing", icon: Video, agentTip: "Each tweet is a new scene." },

  // ANALYTICS / MONETIZATION
  { id: "revenue-calculator", name: "Revenue Calculator", desc: "Calculate potential earnings from your content.", category: "Analytics", icon: DollarSign, agentTip: "Track profit, not just views." },
  { id: "engagement-rate-calculator", name: "Engagement Rate Calculator", desc: "Calculate true engagement metrics across platforms.", category: "Analytics", icon: BarChart3, agentTip: "Quality over quantity of followers." },
  { id: "cpm-calculator", name: "CPM Calculator", desc: "Calculate your effective Cost Per Mille (CPM).", category: "Analytics", icon: Presentation, agentTip: "Compare across different ad networks." },
  { id: "rpm-calculator", name: "RPM Calculator", desc: "Calculate Revenue Per Mille (RPM) accurately.", category: "Analytics", icon: DollarSign, agentTip: "RPM is the metric that actually matters." },
  { id: "channel-growth-calculator", name: "Channel Growth Calculator", desc: "Project future audience growth based on current trends.", category: "Analytics", icon: TrendingUp, agentTip: "Compounding growth takes time." },
  { id: "sponsorship-calculator", name: "Sponsorship Calculator", desc: "Calculate fair rates for brand sponsorships.", category: "Analytics", icon: Briefcase, agentTip: "Never underprice your dedicated audience." },

  // PLANNING / PRODUCTIVITY
  { id: "content-calendar", name: "Content Calendar", desc: "Plan, organize & schedule your content like a pro.", category: "Planning", icon: Calendar, agentTip: "Consistency builds trust with the algorithm." },
  { id: "creator-planner", name: "Creator Planner", desc: "Organize your entire content creation workflow.", category: "Planning", icon: ListChecks, agentTip: "Batch your work to avoid burnout." },
  { id: "project-manager", name: "Project Manager", desc: "Manage complex content projects and collaborations.", category: "Planning", icon: Users, agentTip: "Clear deadlines prevent scope creep." },
  { id: "content-checklist", name: "Content Checklist", desc: "Pre-publish checklists for flawless execution.", category: "Planning", icon: ListChecks, agentTip: "Check audio levels twice." },
  { id: "launch-checklist", name: "Launch Checklist", desc: "Step-by-step checklists for product and content launches.", category: "Planning", icon: Target, agentTip: "Build anticipation weeks in advance." },

  // BRAND / BUSINESS
  { id: "brand-voice-generator", name: "Brand Voice Generator", desc: "Define a consistent, unique voice for your brand.", category: "Business", icon: Megaphone, agentTip: "Consistency builds brand recognition." },
  { id: "brand-kit-generator", name: "Brand Kit Generator", desc: "Generate comprehensive guidelines for visual branding.", category: "Business", icon: Layout, agentTip: "Stick to 2-3 primary colors." },
  { id: "mission-statement-generator", name: "Mission Statement Generator", desc: "Write powerful mission and vision statements.", category: "Business", icon: Target, agentTip: "Make it about them, not you." },
  { id: "invoice-generator", name: "Invoice Generator", desc: "Create professional invoices for brand deals.", category: "Business", icon: FileText, agentTip: "Always specify payment terms clearly." },
  { id: "contract-generator", name: "Contract Generator", desc: "Generate standard agreements for collaborations.", category: "Business", icon: Briefcase, agentTip: "Get everything in writing." },
  { id: "proposal-generator", name: "Proposal Generator", desc: "Create winning pitch proposals for sponsors.", category: "Business", icon: Presentation, agentTip: "Focus on the ROI for the brand." },
  { id: "client-brief-generator", name: "Client Brief Generator", desc: "Generate comprehensive briefs for creative projects.", category: "Business", icon: FileText, agentTip: "Clear expectations prevent revisions." },

  // AI / UTILITY
  { id: "prompt-generator", name: "Prompt Generator", desc: "Generate highly effective prompts for AI models.", category: "AI Utility", icon: Bot, isPopular: true, agentTip: "Specificity is the key to good AI outputs." },
  { id: "prompt-improver", name: "Prompt Improver", desc: "Optimize your existing prompts for better results.", category: "AI Utility", icon: Sparkles, agentTip: "Add constraints to force better answers." },
  { id: "prompt-library", name: "Prompt Library", desc: "Store and organize your most effective AI prompts.", category: "AI Utility", icon: FileText, agentTip: "Categorize by use-case, not tool." },
  { id: "prompt-persona-generator", name: "Prompt Persona Generator", desc: "Create detailed AI personas for specific tasks.", category: "AI Utility", icon: UserCircle, agentTip: "Tell the AI exactly who it is acting as." },
  { id: "text-to-speech", name: "Text to Speech", desc: "Convert text into natural sounding voiceovers.", category: "AI Utility", icon: Mic, agentTip: "Pacing is as important as tone." },
  { id: "speech-to-text", name: "Speech to Text", desc: "Accurately transcribe audio files into text.", category: "AI Utility", icon: FileAudio, agentTip: "Always review for contextual errors." },
  { id: "subtitle-generator", name: "Subtitle Generator", desc: "Generate accurate subtitle files for your videos.", category: "AI Utility", icon: Captions, agentTip: "Keep subtitles to 2 lines maximum." },
  { id: "podcast-summarizer", name: "Podcast Summarizer", desc: "Extract key points and summaries from long podcasts.", category: "AI Utility", icon: Mic, agentTip: "Highlight actionable takeaways." },
  { id: "background-remover", name: "Background Remover", desc: "Instantly remove backgrounds from images.", category: "AI Utility", icon: Scissors, agentTip: "Use solid contrasting backgrounds for best results." },
  { id: "image-upscaler", name: "Image Upscaler", desc: "Upscale low-resolution images without losing quality.", category: "AI Utility", icon: ImageIcon, agentTip: "Don't upscale more than 4x." },
  { id: "ai-logo-generator", name: "AI Logo Generator", desc: "Generate unique logo concepts using AI.", category: "AI Utility", icon: ImageIcon, isNew: true, agentTip: "Simple logos are more memorable." },
  { id: "banner-generator", name: "Banner Generator", desc: "Create optimized banners for YouTube and Twitter.", category: "AI Utility", icon: Layout, agentTip: "Keep important info in the safe zones." },
  { id: "poster-generator", name: "Poster Generator", desc: "Design eye-catching promotional posters.", category: "AI Utility", icon: ImageIcon, agentTip: "Use high contrast typography." },
  { id: "landing-page-copy-generator", name: "Landing Page Copy Generator", desc: "Write high-converting copy for landing pages.", category: "AI Utility", icon: Layout, agentTip: "The headline is 80% of the work." },
  { id: "hero-section-generator", name: "Hero Section Generator", desc: "Create compelling hero sections for your website.", category: "AI Utility", icon: Target, agentTip: "Clear value proposition above the fold." },
  { id: "cta-generator", name: "CTA Generator", desc: "Generate irresistible calls to action.", category: "AI Utility", icon: Megaphone, agentTip: "Use action verbs." },
];

export const ALL_TOOLS: SmugglerTool[] = RAW_TOOLS.map((tool, index) => ({
  ...tool,
  uses: seedUses(index),
  ...getColor(index),
}));

export const POPULAR_TOOLS = ALL_TOOLS.filter((t) => t.isPopular).slice(0, 8);
export const TOOL_COUNT = ALL_TOOLS.length;

export const CATEGORY_STATS: { name: string; count: number; color: string; icon: LucideIcon }[] = [
  { name: "Writing", count: ALL_TOOLS.filter((t) => t.category === "Writing").length, color: "#597F56", icon: PenLine },
  { name: "SEO", count: ALL_TOOLS.filter((t) => t.category === "SEO").length, color: "#B8A03E", icon: Target },
  { name: "Video", count: ALL_TOOLS.filter((t) => t.category === "Video").length, color: "#4A7A8C", icon: Video },
  { name: "Analytics", count: ALL_TOOLS.filter((t) => t.category === "Analytics").length, color: "#B87B3E", icon: BarChart3 },
  { name: "Repurposing", count: ALL_TOOLS.filter((t) => t.category === "Repurposing").length, color: "#755B8F", icon: Share2 },
  { name: "Marketing", count: ALL_TOOLS.filter((t) => t.category === "Social Media").length + ALL_TOOLS.filter((t) => t.category === "Business").length, color: "#A84841", icon: Megaphone },
];


