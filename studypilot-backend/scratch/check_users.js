const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Checking users in database...");
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
    console.log(`Found ${users.length} users:`);
    for (const u of users) {
      console.log(`- ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Created At: ${u.createdAt}`);
    }
  } catch (error) {
    console.error("Query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
