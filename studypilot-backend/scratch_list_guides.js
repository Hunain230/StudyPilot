const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Fetching last 5 guides from the database...");
  try {
    const guides = await prisma.guide.findMany({
      orderBy: { createdAt: 'desc' },
    });
    
    for (const g of guides) {
      console.log(`\n---------------------------------`);
      console.log(`ID: ${g.id}`);
      console.log(`Title: ${g.title}`);
      console.log(`Subject: ${g.subject}`);
      console.log(`Status: ${g.status}`);
      console.log(`Source Type: ${g.sourceType}`);
      console.log(`Source Identifier: ${g.sourceIdentifier}`);
      console.log(`Selected Components: ${g.selectedComponents}`);
      console.log(`Created At: ${g.createdAt}`);
    }
  } catch (error) {
    console.error("Database query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
