
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const standards = await prisma.isoStandard.findMany();
    console.log('Existing ISO Standards:');
    standards.forEach(s => {
        console.log(`- ID: ${s.id}, Title: ${s.title}, StandardID: ${s.standardId}`);
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
