const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Fetching GuideContent rawContent for completed guides...");
  try {
    const contents = await prisma.guideContent.findMany({
      include: { guide: true },
      orderBy: { createdAt: 'desc' }
    });
    
    for (const c of contents) {
      console.log(`\n=================================`);
      console.log(`Guide ID: ${c.guideId}`);
      console.log(`Title: ${c.guide.title}`);
      console.log(`Source Type: ${c.guide.sourceType}`);
      console.log(`Raw Content Length: ${c.rawContent?.length || 0}`);
      console.log(`Raw Content Sample:`, c.rawContent ? c.rawContent.substring(0, 300) + '...' : 'null');
      console.log(`Cleaned Content Length: ${c.cleanedContent?.length || 0}`);
    }
  } catch (error) {
    console.error("Database query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
