import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Criar uma reserva (booking)
 * POST /bookings
 * Body: { routeId }
 * Usa req.user.id como userId
 */
export async function createBooking(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { routeId } = req.body;
    if (!routeId) {
      return res.status(400).json({ error: 'routeId é obrigatório' });
    }

    // Buscar rota incluindo contagem de bookings
    const route = await prisma.route.findUnique({
      where: { id: Number(routeId) },
      include: { _count: { select: { bookings: true } } }
    });

    if (!route) {
      return res.status(404).json({ error: 'Rota não encontrada' });
    }

    // Determinar capacidade máxima por veículo
    const seatCapacity = Number(route.seatCapacity || 0);
    const maxAllowed = 16; // default maximum
    const effectiveCapacity = Math.min(seatCapacity > 0 ? seatCapacity : maxAllowed, maxAllowed);

    if (route._count && route._count.bookings >= effectiveCapacity) {
      return res.status(400).json({ error: 'Rota lotada' });
    }

    // Evitar duplicidade (checar se já existe reserva do mesmo usuário para a rota)
    const existing = await prisma.booking.findFirst({
      where: { userId: Number(userId), routeId: Number(routeId) }
    });
    if (existing) {
      return res.status(409).json({ error: 'Reserva já existe para este usuário e rota' });
    }

    const booking = await prisma.booking.create({
      data: {
        user: { connect: { id: Number(userId) } },
        route: { connect: { id: Number(routeId) } },
        status: 'CONFIRMED'
      }
    });

    return res.status(201).json({ message: 'Reserva criada com sucesso', booking });

  } catch (error) {
    console.error('Erro ao criar reserva:', error);
    return next ? next(error) : res.status(500).json({ error: 'Erro ao criar reserva' });
  }
}

export async function listBookings(req, res) {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        route: true
      }
    });
    return res.status(200).json({ bookings });
  } catch (error) {
    console.error('Erro ao listar reservas:', error);
    return res.status(500).json({ error: 'Erro ao listar reservas' });
  }
}

export async function getUserBookings(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

    const bookings = await prisma.booking.findMany({
      where: { userId: Number(userId) },
      include: {
        route: { include: { driver: { select: { id: true, name: true, email: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({ bookings });
  } catch (error) {
    console.error('Erro ao obter reservas do usuário:', error);
    return next ? next(error) : res.status(500).json({ error: 'Erro ao obter reservas' });
  }
}

export async function deleteBooking(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json({ error: 'Reserva não encontrada' });

    if (booking.userId !== Number(userId)) {
      return res.status(403).json({ error: 'Ação não autorizada' });
    }

    await prisma.booking.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar reserva:', error);
    return next ? next(error) : res.status(500).json({ error: 'Erro ao deletar reserva' });
  }
}
