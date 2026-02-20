import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from './utils/auth.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Limpando dados existentes (dev only)...');

  // Ordem importa por causa das FKs
  await prisma.booking.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.stop.deleteMany();
  await prisma.route.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Tabelas limpas. Criando usuários...');

  const adminPassword = await hashPassword('admin123');
  const mauricioPassword = await hashPassword('mauricio123');
  const eduardoPassword = await hashPassword('eduardo123');
  const lucasPassword = await hashPassword('lucas123');
  const giovaniPassword = await hashPassword('giovani123');

  const admin = await prisma.user.create({
    data: {
      name: 'Admin Troop',
      email: 'admin@troop.com',
      passwordHash: adminPassword,
      role: 'ADMIN'
    }
  });

  const mauricioDriver = await prisma.user.create({
    data: {
      name: 'Mauricio Motorista',
      email: 'mauricio@troop.com',
      passwordHash: mauricioPassword,
      role: 'DRIVER'
    }
  });

  const eduardoDriver = await prisma.user.create({
    data: {
      name: 'Eduardo Motorista',
      email: 'eduardo@troop.com',
      passwordHash: eduardoPassword,
      role: 'DRIVER'
    }
  });

  const lucasPassenger = await prisma.user.create({
    data: {
      name: 'Lucas Passageiro',
      email: 'lucas@troop.com',
      passwordHash: lucasPassword,
      role: 'PASSENGER'
    }
  });

  const giovaniPassenger = await prisma.user.create({
    data: {
      name: 'Giovani Passageiro',
      email: 'giovani@troop.com',
      passwordHash: giovaniPassword,
      role: 'PASSENGER'
    }
  });

  // Usaremos Mauricio como motorista principal e Lucas como passageiro de exemplo
  const mainDriver = mauricioDriver;
  const mainPassenger = lucasPassenger;

  console.log('✅ Usuários criados:', {
    adminId: admin.id,
    mauricioId: mauricioDriver.id,
    eduardoId: eduardoDriver.id,
    lucasId: lucasPassenger.id,
    giovaniId: giovaniPassenger.id
  });

  // Datas base para as rotas e trips (amanhã, horários pela manhã)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(7, 0, 0, 0);

  const baseDate1 = new Date(tomorrow);
  const baseDate2 = new Date(tomorrow);
  baseDate2.setHours(8, 0, 0, 0);

  console.log('🚐 Criando rotas em Pelotas...');

  // Rota 1: Três Vendas -> UniSenac com paradas no Clube Brilhante e Escola Érico Veríssimo
  const route1 = await prisma.route.create({
    data: {
      origin: 'Av. Domingos de Almeida, Três Vendas, Pelotas - RS',
      originLat: -31.7515,
      originLng: -52.3275,
      destination: 'UniSenac Pelotas - Rua Gonçalves Chaves, 604, Pelotas - RS',
      destinationLat: -31.77019,
      destinationLng: -52.34177,
      departureAt: baseDate1,
      seatCapacity: 12,
      published: true,
      driver: { connect: { id: mainDriver.id } },
      stops: {
        create: [
          {
            address: 'Clube Brilhante, Pelotas - RS',
            lat: -31.7695,
            lng: -52.3475,
            order: 1
          },
          {
            address: 'Escola Estadual Érico Veríssimo, Pelotas - RS',
            lat: -31.7715,
            lng: -52.3320,
            order: 2
          }
        ]
      }
    }
  });

  // Rota 2: Fragata -> Arena EPV com paradas no IFSul e na TopWay
  const route2 = await prisma.route.create({
    data: {
      origin: 'Fragata, Pelotas - RS',
      originLat: -31.7700,
      originLng: -52.3400,
      destination: 'Arena EPV, Pelotas - RS',
      destinationLat: -31.7550,
      destinationLng: -52.3600,
      departureAt: baseDate1,
      seatCapacity: 15,
      published: true,
      driver: { connect: { id: mainDriver.id } },
      stops: {
        create: [
          {
            address: 'IFSul - Campus Pelotas, Praça 20 de Setembro, 455, Pelotas - RS',
            lat: -31.7667,
            lng: -52.3331,
            order: 1
          },
          {
            address: 'TopWay Pelotas, Pelotas - RS',
            lat: -31.7655,
            lng: -52.3380,
            order: 2
          }
        ]
      }
    }
  });

  // Rota 3: Três Vendas -> UFPel Campus Capão do Leão (exemplo aproximado)
  const route3 = await prisma.route.create({
    data: {
      origin: 'Av. Domingos de Almeida, Três Vendas, Pelotas - RS',
      originLat: -31.7515,
      originLng: -52.3275,
      destination: 'UFPel - Campus Capão do Leão, Capão do Leão - RS',
      destinationLat: -31.8010,
      destinationLng: -52.4060,
      departureAt: baseDate2,
      seatCapacity: 14,
      published: true,
      driver: { connect: { id: mainDriver.id } },
      stops: {
        create: [
          {
            address: 'IFSul - Campus Pelotas, Praça 20 de Setembro, 455, Pelotas - RS',
            lat: -31.7667,
            lng: -52.3331,
            order: 1
          },
          {
            address: 'Praça Coronel Pedro Osório, Centro, Pelotas - RS',
            lat: -31.7648,
            lng: -52.3371,
            order: 2
          }
        ]
      }
    }
  });

  console.log('✅ Rotas criadas:', { route1Id: route1.id, route2Id: route2.id, route3Id: route3.id });

  console.log('🕒 Criando trips (viagens agendadas)...');

  // Trips para rota 1
  const trip1_r1 = await prisma.trip.create({
    data: {
      routeId: route1.id,
      driverId: mainDriver.id,
      scheduledTime: baseDate1,
      status: 'OPEN'
    }
  });

  const trip2_r1 = await prisma.trip.create({
    data: {
      routeId: route1.id,
      driverId: mainDriver.id,
      scheduledTime: new Date(baseDate1.getTime() + 30 * 60 * 1000), // +30min
      status: 'OPEN'
    }
  });

  // Trips para rota 2
  const trip1_r2 = await prisma.trip.create({
    data: {
      routeId: route2.id,
      driverId: mainDriver.id,
      scheduledTime: baseDate1,
      status: 'OPEN'
    }
  });

  // Trips para rota 3
  const trip1_r3 = await prisma.trip.create({
    data: {
      routeId: route3.id,
      driverId: mainDriver.id,
      scheduledTime: baseDate2,
      status: 'OPEN'
    }
  });

  console.log('✅ Trips criadas:', {
    trip1_r1: trip1_r1.id,
    trip2_r1: trip2_r1.id,
    trip1_r2: trip1_r2.id,
    trip1_r3: trip1_r3.id
  });

  console.log('👥 Criando uma reserva de exemplo para a primeira trip da rota 1...');

  await prisma.booking.create({
    data: {
      userId: mainPassenger.id,
      tripId: trip1_r1.id,
      status: 'CONFIRMED'
    }
  });

  console.log('✅ Seed concluído com sucesso.');
}

main()
  .catch((e) => {
    console.error('Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
