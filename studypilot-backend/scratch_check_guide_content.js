const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Checking GuideContent and other details for completed PDF guides...");
  try {
    const guides = await prisma.guide.findMany({
      where: { sourceType: 'pdf', status: 'completed' },
      include: {
        content: true,
        flashcards: true,
        quizQuestions: true,
        revisionSheet: { include: { sections: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });
    
    for (const g of guides) {
      console.log(`\n=================================`);
      console.log(`ID: ${g.id}`);
      console.log(`Title: ${g.title}`);
      console.log(`Cleaned Content length: ${g.content?.cleanedContent?.length || 0}`);
      console.log(`Short Summary: ${g.content?.shortSummary}`);
      console.log(`Detailed Summary length: ${g.content?.detailedSummary?.length || 0}`);
      console.log(`Detailed Summary Sample:`, g.content?.detailedSummary ? g.content.detailedSummary.substring(0, 300) + '...' : 'null');
      console.log(`Flashcards count: ${g.flashcards.length}`);
      console.log(`Quiz Questions count: ${g.quizQuestions.length}`);
      console.log(`Revision Sheet Title: ${g.revisionSheet?.title}`);
      console.log(`Revision Sheet Sections count: ${g.revisionSheet?.sections.length || 0}`);
    }
  } catch (error) {
    console.error("Database query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
