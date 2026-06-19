const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Fetching uploaded files and their related guides...");
  try {
    const files = await prisma.uploadedFile.findMany({
      include: { guide: true },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`Found ${files.length} uploaded files:`);
    for (const f of files) {
      console.log(`- File: ${f.originalName} (${(Number(f.sizeBytes)/1024).toFixed(1)} KB)`);
      console.log(`  Stored Name: ${f.storedName}`);
      console.log(`  Storage Path: ${f.storagePath}`);
      if (f.guide) {
        console.log(`  Guide ID: ${f.guide.id}`);
        console.log(`  Guide Title: ${f.guide.title}`);
        console.log(`  Guide Status: ${f.guide.status}`);
      } else {
        console.log(`  No guide attached.`);
      }
    }
  } catch (error) {
    console.error("Database query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
