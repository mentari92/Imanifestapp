import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export { PrismaClient, prisma };
export { PrismaService } from "./prisma.service";
export { DatabaseModule } from "./database.module";