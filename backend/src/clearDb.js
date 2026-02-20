import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⚠️  Apagando TODOS os dados do banco (schema public)...');

  // Ordem respeita as FKs
  await prisma.booking.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.stop.deleteMany();
  await prisma.route.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Todos os registros foram apagados.');
}

main()
  .catch((e) => {
    console.error('Erro ao limpar banco:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
