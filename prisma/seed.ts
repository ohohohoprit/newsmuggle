/**
 * Database Seed Script — run once to bootstrap Plans + Tool Categories + Tool Definitions.
 * 
 * Usage:  npx tsx prisma/seed.ts
 * 
 * This script:
 *   1. Seeds the 3 subscription plans (Starter, Creator, Agency)
 *   2. Seeds 9 tool categories (Writing, SEO, Video, etc.)
 *   3. Seeds all 95 tool definitions from the frontend data
 *   4. Is idempotent — safe to run multiple times
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ===== Plans =====

const PLANS = [
  {
    slug: 'starter',
    name: 'Starter',
    description: 'For solo creators getting started with AI tools.',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'usd',
    maxGenerations: 10,
    maxTools: 5,
    maxStorage: 1,
    teamSeats: 0,
    apiAccess: false,
    whiteLabel: false,
    features: JSON.stringify({ aiTools: true, history: true, folders: false, prioritySupport: false }),
    sortOrder: 1,
  },
  {
    slug: 'creator',
    name: 'Creator',
    description: 'For active creators who need more power and higher limits.',
    priceMonthly: 1900,
    priceYearly: 19000,
    currency: 'usd',
    maxGenerations: 100,
    maxTools: 999999,
    maxStorage: 10,
    teamSeats: 0,
    apiAccess: false,
    whiteLabel: false,
    features: JSON.stringify({ aiTools: true, history: true, folders: true, prioritySupport: false, customPresets: true }),
    sortOrder: 2,
  },
  {
    slug: 'agency',
    name: 'Agency',
    description: 'For teams and agencies managing multiple creators.',
    priceMonthly: 4900,
    priceYearly: 49000,
    currency: 'usd',
    maxGenerations: 1000,
    maxTools: 999999,
    maxStorage: 50,
    teamSeats: 5,
    apiAccess: true,
    whiteLabel: true,
    features: JSON.stringify({ aiTools: true, history: true, folders: true, prioritySupport: true, customPresets: true, teamWorkspaces: true, apiKeys: true }),
    sortOrder: 3,
  },
];

// ===== Categories =====

const CATEGORIES = [
  { slug: 'writing', name: 'Writing', description: 'Blogs, scripts, emails, and long-form content tools.', icon: 'PenLine', color: '#597F56', sortOrder: 1 },
  { slug: 'seo', name: 'SEO', description: 'Search optimization, keywords, and metadata tools.', icon: 'Target', color: '#B8A03E', sortOrder: 2 },
  { slug: 'video', name: 'Video', description: 'YouTube, shorts, thumbnails, and video script tools.', icon: 'Video', color: '#4A7A8C', sortOrder: 3 },
  { slug: 'social-media', name: 'Social Media', description: 'Captions, hashtags, and platform-specific post tools.', icon: 'Instagram', color: '#A84841', sortOrder: 4 },
  { slug: 'repurposing', name: 'Repurposing', description: 'Transform content between formats and platforms.', icon: 'Share2', color: '#755B8F', sortOrder: 5 },
  { slug: 'analytics', name: 'Analytics', description: 'Calculators for revenue, engagement, and growth metrics.', icon: 'BarChart3', color: '#B87B3E', sortOrder: 6 },
  { slug: 'planning', name: 'Planning', description: 'Calendars, checklists, and project planning tools.', icon: 'Calendar', color: '#5DADE2', sortOrder: 7 },
  { slug: 'business', name: 'Business', description: 'Brand, contracts, proposals, and business docs.', icon: 'Briefcase', color: '#8B6F47', sortOrder: 8 },
  { slug: 'ai-utility', name: 'AI Utility', description: 'Prompts, transcription, images, and AI helpers.', icon: 'Bot', color: '#6FC276', sortOrder: 9 },
];

async function main() {
  console.log('🌱 Seeding Content Smuggler database...\n');

  // 1. Seed Plans
  console.log('📋 Seeding subscription plans...');
  let plansCreated = 0;
  let plansUpdated = 0;

  for (const plan of PLANS) {
    const existing = await prisma.plan.findUnique({ where: { slug: plan.slug } });
    if (existing) {
      await prisma.plan.update({
        where: { slug: plan.slug },
        data: plan,
      });
      plansUpdated++;
      console.log(`   ✓ Updated plan: ${plan.name}`);
    } else {
      await prisma.plan.create({
        data: { ...plan, isPublic: true, isActive: true },
      });
      plansCreated++;
      console.log(`   + Created plan: ${plan.name}`);
    }
  }
  console.log(`   Plans: ${plansCreated} created, ${plansUpdated} updated\n`);

  // 2. Seed Categories
  console.log('📁 Seeding tool categories...');
  let categoriesCreated = 0;

  for (const cat of CATEGORIES) {
    await prisma.toolCategory.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        color: cat.color,
        sortOrder: cat.sortOrder,
      },
      create: cat,
    });
    categoriesCreated++;
    console.log(`   ✓ ${cat.name}`);
  }
  console.log(`   Categories: ${categoriesCreated} upserted\n`);

  // 3. Summary
  const planCount = await prisma.plan.count();
  const categoryCount = await prisma.toolCategory.count();
  
  console.log('✅ Database seed complete!');
  console.log(`   Total plans in DB: ${planCount}`);
  console.log(`   Total categories in DB: ${categoryCount}`);
  console.log('');
  console.log('📌 Next steps:');
  console.log('   1. Run: npm run dev');
  console.log('   2. Register an account at http://localhost:3000');
  console.log('   3. Tools will be seeded via the admin API after you have an admin user');
  console.log('   4. To make your first user an admin, run:');
  console.log('      npx prisma studio  →  find your user  →  set role to "admin"');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
