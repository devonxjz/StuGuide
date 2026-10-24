import "dotenv/config";
import { createPrismaClient } from "../src/data/prisma";
import { seedDemoData } from "../src/data/seed/demo-data";

const db = createPrismaClient();
seedDemoData(db)
  .then((ids) => console.log("Seed xong. Lớp demo:", ids.classId, "| bé Gia Huy:", ids.huyId))
  .finally(() => db.$disconnect());
