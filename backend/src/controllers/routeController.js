import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Criar uma nova rota/viagem (van)
 * POST /routes
 * Espera no body: origin, destination, departureAt, seatCapacity, published? (opcional)
 * Usa `req.user.id` como driverId
 */
export async function createRoute(req, res, next) {
  try {
    const driverId = req.user && req.user.id;
    if (!driverId) {
      return res.status(401).json({ error: 'Driver not authenticated' });
    }

    const { origin, destination, departureAt, seatCapacity, published, price } = req.body;

    if (!origin || !destination || !departureAt || typeof seatCapacity === 'undefined') {
      return res.status(400).json({ error: 'origin, destination, departureAt and seatCapacity are required' });
    }

    const departure = new Date(departureAt);
    if (Number.isNaN(departure.getTime())) {
      return res.status(400).json({ error: 'Invalid departureAt date' });
    }
    const now = new Date();
    if (departure.getTime() <= now.getTime()) {
      return res.status(400).json({ error: 'departureAt must be a future date' });
    }

    const capacityNum = Number(seatCapacity);
    if (Number.isNaN(capacityNum) || capacityNum <= 0) {
      return res.status(400).json({ error: 'seatCapacity must be a positive number' });
    }

    if (typeof price !== 'undefined') {
      const priceNum = Number(price);
      if (Number.isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({ error: 'price must be a non-negative number' });
      }
      // Note: model doesn't store price; we only validate if provided
    }

    const route = await prisma.vanRoute.create({
      data: {
        origin,
        destination,
        departureAt: departure,
        seatCapacity: capacityNum,
        published: typeof published === 'boolean' ? published : false,
        driver: { connect: { id: driverId } }
      }
    });

    return res.status(201).json({ message: 'Route created', route });

  } catch (error) {
    console.error('Erro ao criar rota:', error);
    return next ? next(error) : res.status(500).json({ error: 'Erro ao criar rota' });
  }
}


/**
 * Listar rotas com filtros de pesquisa
 * GET /routes?origin=&destination=&date=&from=&to=&driverId=&published=&limit=&offset=
 */
export async function listRoutes(req, res) {
  try {
    const { origin, destination, date, from, to, driverId, published, limit, offset } = req.query;

    const where = {};

    if (origin) {
      where.origin = { contains: origin, mode: 'insensitive' };
    }

    if (destination) {
      where.destination = { contains: destination, mode: 'insensitive' };
    }

    if (driverId) {
      const id = Number(driverId);
      if (!Number.isNaN(id)) where.driverId = id;
    }

    if (typeof published !== 'undefined') {
      if (published === 'true' || published === 'false') {
        where.published = published === 'true';
      }
    }

    // date (single day) overrides from/to if provided
    if (date) {
      const d = new Date(date);
      if (!Number.isNaN(d.getTime())) {
        const start = new Date(d);
        start.setHours(0, 0, 0, 0);
        const end = new Date(d);
        end.setHours(23, 59, 59, 999);
        where.departureAt = { gte: start, lte: end };
      }
    } else {
      const range = {};
      if (from) {
        const f = new Date(from);
        if (!Number.isNaN(f.getTime())) range.gte = f;
      }
      if (to) {
        const t = new Date(to);
        if (!Number.isNaN(t.getTime())) range.lte = t;
      }
      if (Object.keys(range).length) where.departureAt = range;
    }

    const take = limit ? Math.min(100, Number(limit)) : 50;
    const skip = offset ? Math.max(0, Number(offset)) : 0;

    const routes = await prisma.vanRoute.findMany({
      where,
      take,
      skip,
      orderBy: { departureAt: 'asc' },
      include: {
        driver: { select: { id: true, name: true, email: true } },
        bookings: { select: { id: true, userId: true } }
      }
    });

    return res.status(200).json({ routes });

  } catch (error) {
    console.error('Erro ao listar rotas:', error);
    return res.status(500).json({ error: 'Erro ao listar rotas' });
  }
}

export async function getDriverRoutes(req, res, next) {
  try {
    const driverId = req.user && req.user.id;
    if (!driverId) return res.status(401).json({ error: 'Usuário não autenticado' });

    const routes = await prisma.vanRoute.findMany({
      where: { driverId: Number(driverId) },
      include: { _count: { select: { bookings: true } } },
      orderBy: { departureAt: 'desc' }
    });

    return res.status(200).json({ routes });
  } catch (error) {
    console.error('Erro ao obter rotas do motorista:', error);
    return next ? next(error) : res.status(500).json({ error: 'Erro ao obter rotas do motorista' });
  }
}
