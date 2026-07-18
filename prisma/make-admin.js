const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.update({
    where: { email: 'admin@contentsmuggler.app' },
    data: { role: 'admin' },
  });
  console.log('Updated user role to:', user.role, '- User:', user.name);
}

main().catch(console.error).finally(() => prisma.$disconnect());
