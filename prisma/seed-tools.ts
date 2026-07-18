/**
 * Seed all 95 tool definitions into the database.
 * 
 * This script calls seedTools() which:
 *   1. Upserts all 9 categories
 *   2. Upserts all 95 tool definitions with prompt templates
 * 
 * Usage:  npx tsx prisma/seed-tools.ts
 */
import { seedTools } from '../src/lib/tools/seed';

async function main() {
  console.log('🔧 Seeding all 95 tool definitions...\n');
  
  const result = await seedTools();
  
  console.log('\n✅ Tool seed complete!');
  console.log(`   Categories: ${result.categoriesUpdated} upserted`);
  console.log(`   Tools created: ${result.toolsCreated}`);
  console.log(`   Tools updated: ${result.toolsUpdated}`);
  console.log(`   Total tools: ${result.total}`);
}

main()
  .catch((e) => {
    console.error('❌ Tool seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Give Prisma time to disconnect gracefully
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$disconnect();
  });
