import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const scenes = [
    { name: "セミナー", sortOrder: 1 },
    { name: "懇親会", sortOrder: 2 },
    { name: "フリータイム", sortOrder: 3 },
  ];

  for (const scene of scenes) {
    await prisma.scene.upsert({
      where: { id: scene.sortOrder },
      update: {},
      create: scene,
    });
  }

  console.log("Seed completed: 3 default scenes created");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
