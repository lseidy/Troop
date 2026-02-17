import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Criar uma nova rota
 * POST /routes
 * Espera no body: origin, destination, departureAt, seatCapacity, published? (opcional)
 * Somente administradores (ADMIN) podem criar rotas. Opcionalmente informar `driverId` para associar um motorista.
 */
export async function createRoute(req, res, next) {
  try {
    // Admins create routes; they may optionally include `driverId` in the body to assign a driver
    const adminUser = req.user;

    let {
      origin,
      originPlaceId,
      originLat,
      originLng,
      destination,
      destinationPlaceId,
      destinationLat,
      destinationLng,
      stops, // optional array of intermediate stops/waypoints
      departureAt,
      seatCapacity,
      published,
      price
    } = req.body;

    // optional driver assignment by admin
    const assignedDriverId = typeof req.body.driverId !== 'undefined' && req.body.driverId !== null ? Number(req.body.driverId) : null;

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

    // helper: server-side geocoding using Google Geocoding API when key is provided
    async function geocodeAddressServer(address) {
      try {
        const key = process.env.GOOGLE_API_KEY;
        if (!key || !address) return null;
        const enc = encodeURIComponent(address);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${enc}&key=${key}`;
        const r = await fetch(url);
        const j = await r.json();
        if (j && Array.isArray(j.results) && j.results.length) {
          const top = j.results[0];
          return {
            formatted_address: top.formatted_address,
            place_id: top.place_id,
            lat: top.geometry?.location?.lat ?? null,
            lng: top.geometry?.location?.lng ?? null
          };
        }
        return null;
      } catch (e) {
        console.error('Geocoding error:', e?.message || e);
        return null;
      }
    }

    // Validate optional location coordinates when provided
    function validateCoord(name, val) {
      if (typeof val === 'undefined' || val === null || val === '') return true;
      const n = Number(val);
      return !Number.isNaN(n) && isFinite(n);
    }

    if (!validateCoord('originLat', originLat) || !validateCoord('originLng', originLng)) {
      return res.status(400).json({ error: 'originLat and originLng must be valid numbers' });
    }
    if (!validateCoord('destinationLat', destinationLat) || !validateCoord('destinationLng', destinationLng)) {
      return res.status(400).json({ error: 'destinationLat and destinationLng must be valid numbers' });
    }

    // If GOOGLE_API_KEY is set, attempt to geocode origin/destination/stops when missing data
    const shouldGeocode = !!process.env.GOOGLE_API_KEY;

    // Enrich origin
    let enrichedOrigin = null;
    if (shouldGeocode && (!originPlaceId || !originLat || !originLng)) {
      enrichedOrigin = await geocodeAddressServer(origin);
      if (enrichedOrigin) {
        // prefer existing values but fill missing
        originPlaceId = originPlaceId || enrichedOrigin.place_id || null;
        originLat = (originLat || originLat === 0) ? originLat : enrichedOrigin.lat;
        originLng = (originLng || originLng === 0) ? originLng : enrichedOrigin.lng;
        // allow replacing origin with formatted address if origin was free-text
        origin = origin || enrichedOrigin.formatted_address || origin;
      }
    }

    // Enrich destination
    let enrichedDestination = null;
    if (shouldGeocode && (!destinationPlaceId || !destinationLat || !destinationLng)) {
      enrichedDestination = await geocodeAddressServer(destination);
      if (enrichedDestination) {
        destinationPlaceId = destinationPlaceId || enrichedDestination.place_id || null;
        destinationLat = (destinationLat || destinationLat === 0) ? destinationLat : enrichedDestination.lat;
        destinationLng = (destinationLng || destinationLng === 0) ? destinationLng : enrichedDestination.lng;
        destination = destination || enrichedDestination.formatted_address || destination;
      }
    }

    // Validate optional stops array when provided and prepare for relational create
    let validatedStops = [];
    if (typeof stops !== 'undefined' && stops !== null) {
      if (!Array.isArray(stops)) {
        return res.status(400).json({ error: 'stops must be an array if provided' });
      }
      for (let i = 0; i < stops.length; i++) {
        const s = stops[i];
        if (!s || typeof s !== 'object') return res.status(400).json({ error: `each stop must be an object (index ${i})` });
        if (!s.address || typeof s.address !== 'string') return res.status(400).json({ error: `stop.address is required and must be a string (index ${i})` });
        const stopObj = {
          address: s.address,
          placeId: s.placeId || null,
          lat: typeof s.lat !== 'undefined' && s.lat !== null && s.lat !== '' ? Number(s.lat) : null,
          lng: typeof s.lng !== 'undefined' && s.lng !== null && s.lng !== '' ? Number(s.lng) : null,
          order: typeof s.order !== 'undefined' ? Number(s.order) : i + 1
        };
        if ((stopObj.lat !== null && Number.isNaN(stopObj.lat)) || (stopObj.lng !== null && Number.isNaN(stopObj.lng))) {
          return res.status(400).json({ error: `stop lat/lng must be valid numbers (index ${i})` });
        }
        validatedStops.push(stopObj);
      }
      // Sort by order just in case
      validatedStops.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    // If geocoding enabled, attempt to enrich stops missing lat/lng/placeId
    if (shouldGeocode && Array.isArray(validatedStops) && validatedStops.length) {
      for (let i = 0; i < validatedStops.length; i++) {
        const s = validatedStops[i];
        if ((!s.placeId || (!s.lat && !s.lng)) && s.address) {
          const geo = await geocodeAddressServer(s.address);
          if (geo) {
            s.placeId = s.placeId || geo.place_id || null;
            s.lat = (s.lat || s.lat === 0) ? s.lat : geo.lat;
            s.lng = (s.lng || s.lng === 0) ? s.lng : geo.lng;
            s.address = s.address || geo.formatted_address || s.address;
          }
        }
      }
    }

    const createData = {
      origin,
      originPlaceId: originPlaceId || null,
      originLat: typeof originLat !== 'undefined' && originLat !== null && originLat !== '' ? Number(originLat) : null,
      originLng: typeof originLng !== 'undefined' && originLng !== null && originLng !== '' ? Number(originLng) : null,
      destination,
      destinationPlaceId: destinationPlaceId || null,
      destinationLat: typeof destinationLat !== 'undefined' && destinationLat !== null && destinationLat !== '' ? Number(destinationLat) : null,
      destinationLng: typeof destinationLng !== 'undefined' && destinationLng !== null && destinationLng !== '' ? Number(destinationLng) : null,
      departureAt: departure,
      seatCapacity: capacityNum,
      published: typeof published === 'boolean' ? published : false
    };

    if (assignedDriverId) {
      // validate assigned driver exists and has DRIVER role
      const assigned = await prisma.user.findUnique({ where: { id: Number(assignedDriverId) } });
      if (!assigned) return res.status(400).json({ error: 'assigned driverId does not exist' });
      if (assigned.role !== 'DRIVER') return res.status(400).json({ error: 'assigned user is not a DRIVER' });
      createData.driver = { connect: { id: Number(assignedDriverId) } };
    }

    if (validatedStops.length) {
      // create related Stop records
      createData.stops = {
        create: validatedStops.map(s => ({
          address: s.address,
          placeId: s.placeId || null,
          lat: s.lat,
          lng: s.lng,
          order: s.order || 1
        }))
      };
    }

    const route = await prisma.route.create({ data: createData });

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

    const routes = await prisma.route.findMany({
      where,
      take,
      skip,
      orderBy: { departureAt: 'asc' },
      include: {
        driver: { select: { id: true, name: true, email: true } },
        bookings: { select: { id: true, userId: true } },
        stops: { orderBy: { order: 'asc' }, select: { id: true, address: true, placeId: true, lat: true, lng: true, order: true } }
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

    const routes = await prisma.route.findMany({
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


// Atualizar uma rota existente (ADMIN apenas)
export async function updateRoute(req, res, next) {
  try {
    const routeId = Number(req.params.id);
    if (!routeId || Number.isNaN(routeId)) return res.status(400).json({ error: 'Invalid route id' });

    const existing = await prisma.route.findUnique({ where: { id: routeId }, include: { stops: true } });
    if (!existing) return res.status(404).json({ error: 'Route not found' });

    const {
      origin,
      originPlaceId,
      originLat,
      originLng,
      destination,
      destinationPlaceId,
      destinationLat,
      destinationLng,
      stops,
      departureAt,
      seatCapacity,
      published
    } = req.body;

    function validateCoord(name, val) {
      if (typeof val === 'undefined' || val === null || val === '') return true;
      const n = Number(val);
      return !Number.isNaN(n) && isFinite(n);
    }

    if (!validateCoord('originLat', originLat) || !validateCoord('originLng', originLng)) {
      return res.status(400).json({ error: 'originLat and originLng must be valid numbers' });
    }
    if (!validateCoord('destinationLat', destinationLat) || !validateCoord('destinationLng', destinationLng)) {
      return res.status(400).json({ error: 'destinationLat and destinationLng must be valid numbers' });
    }

    const shouldGeocode = !!process.env.GOOGLE_API_KEY;

    async function geocodeAddressServer(address) {
      try {
        const key = process.env.GOOGLE_API_KEY;
        if (!key || !address) return null;
        const enc = encodeURIComponent(address);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${enc}&key=${key}`;
        const r = await fetch(url);
        const j = await r.json();
        if (j && Array.isArray(j.results) && j.results.length) {
          const top = j.results[0];
          return {
            formatted_address: top.formatted_address,
            place_id: top.place_id,
            lat: top.geometry?.location?.lat ?? null,
            lng: top.geometry?.location?.lng ?? null
          };
        }
        return null;
      } catch (e) {
        console.error('Geocoding error:', e?.message || e);
        return null;
      }
    }

    // Prepare final values (fall back to existing when not provided)
    let finalOrigin = typeof origin !== 'undefined' ? origin : existing.origin;
    let finalOriginPlaceId = typeof originPlaceId !== 'undefined' ? originPlaceId : existing.originPlaceId;
    let finalOriginLat = typeof originLat !== 'undefined' ? originLat : existing.originLat;
    let finalOriginLng = typeof originLng !== 'undefined' ? originLng : existing.originLng;

    let finalDestination = typeof destination !== 'undefined' ? destination : existing.destination;
    let finalDestinationPlaceId = typeof destinationPlaceId !== 'undefined' ? destinationPlaceId : existing.destinationPlaceId;
    let finalDestinationLat = typeof destinationLat !== 'undefined' ? destinationLat : existing.destinationLat;
    let finalDestinationLng = typeof destinationLng !== 'undefined' ? destinationLng : existing.destinationLng;

    if (shouldGeocode) {
      if ((!finalOriginPlaceId || !finalOriginLat || !finalOriginLng) && finalOrigin) {
        const geo = await geocodeAddressServer(finalOrigin);
        if (geo) {
          finalOriginPlaceId = finalOriginPlaceId || geo.place_id || null;
          finalOriginLat = (finalOriginLat || finalOriginLat === 0) ? finalOriginLat : geo.lat;
          finalOriginLng = (finalOriginLng || finalOriginLng === 0) ? finalOriginLng : geo.lng;
          finalOrigin = finalOrigin || geo.formatted_address || finalOrigin;
        }
      }
      if ((!finalDestinationPlaceId || !finalDestinationLat || !finalDestinationLng) && finalDestination) {
        const geo = await geocodeAddressServer(finalDestination);
        if (geo) {
          finalDestinationPlaceId = finalDestinationPlaceId || geo.place_id || null;
          finalDestinationLat = (finalDestinationLat || finalDestinationLat === 0) ? finalDestinationLat : geo.lat;
          finalDestinationLng = (finalDestinationLng || finalDestinationLng === 0) ? finalDestinationLng : geo.lng;
          finalDestination = finalDestination || geo.formatted_address || finalDestination;
        }
      }
    }

    // Process stops if provided
    let validatedStops = [];
    if (typeof stops !== 'undefined' && stops !== null) {
      if (!Array.isArray(stops)) return res.status(400).json({ error: 'stops must be an array if provided' });
      for (let i = 0; i < stops.length; i++) {
        const s = stops[i];
        if (!s || typeof s !== 'object') return res.status(400).json({ error: `each stop must be an object (index ${i})` });
        if (!s.address || typeof s.address !== 'string') return res.status(400).json({ error: `stop.address is required and must be a string (index ${i})` });
        const stopObj = {
          address: s.address,
          placeId: s.placeId || null,
          lat: typeof s.lat !== 'undefined' && s.lat !== null && s.lat !== '' ? Number(s.lat) : null,
          lng: typeof s.lng !== 'undefined' && s.lng !== null && s.lng !== '' ? Number(s.lng) : null,
          order: typeof s.order !== 'undefined' ? Number(s.order) : i + 1
        };
        if ((stopObj.lat !== null && Number.isNaN(stopObj.lat)) || (stopObj.lng !== null && Number.isNaN(stopObj.lng))) {
          return res.status(400).json({ error: `stop lat/lng must be valid numbers (index ${i})` });
        }
        validatedStops.push(stopObj);
      }
      validatedStops.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    if (shouldGeocode && Array.isArray(validatedStops) && validatedStops.length) {
      for (let i = 0; i < validatedStops.length; i++) {
        const s = validatedStops[i];
        if ((!s.placeId || (!s.lat && !s.lng)) && s.address) {
          const geo = await geocodeAddressServer(s.address);
          if (geo) {
            s.placeId = s.placeId || geo.place_id || null;
            s.lat = (s.lat || s.lat === 0) ? s.lat : geo.lat;
            s.lng = (s.lng || s.lng === 0) ? s.lng : geo.lng;
            s.address = s.address || geo.formatted_address || s.address;
          }
        }
      }
    }

    const data = {};
    if (typeof origin !== 'undefined') data.origin = finalOrigin;
    if (typeof originPlaceId !== 'undefined' || finalOriginPlaceId) data.originPlaceId = finalOriginPlaceId || null;
    if (typeof originLat !== 'undefined' || finalOriginLat) data.originLat = typeof finalOriginLat === 'string' ? Number(finalOriginLat) : finalOriginLat;
    if (typeof originLng !== 'undefined' || finalOriginLng) data.originLng = typeof finalOriginLng === 'string' ? Number(finalOriginLng) : finalOriginLng;

    if (typeof destination !== 'undefined') data.destination = finalDestination;
    if (typeof destinationPlaceId !== 'undefined' || finalDestinationPlaceId) data.destinationPlaceId = finalDestinationPlaceId || null;
    if (typeof destinationLat !== 'undefined' || finalDestinationLat) data.destinationLat = typeof finalDestinationLat === 'string' ? Number(finalDestinationLat) : finalDestinationLat;
    if (typeof destinationLng !== 'undefined' || finalDestinationLng) data.destinationLng = typeof finalDestinationLng === 'string' ? Number(finalDestinationLng) : finalDestinationLng;

    if (typeof departureAt !== 'undefined') {
      const departure = new Date(departureAt);
      if (Number.isNaN(departure.getTime())) return res.status(400).json({ error: 'Invalid departureAt date' });
      data.departureAt = departure;
    }

    if (typeof seatCapacity !== 'undefined') data.seatCapacity = Number(seatCapacity);
    if (typeof published !== 'undefined') data.published = Boolean(published);

    if (validatedStops.length) {
      await prisma.stop.deleteMany({ where: { routeId: routeId } });
      data.stops = { create: validatedStops.map(s => ({ address: s.address, placeId: s.placeId || null, lat: s.lat, lng: s.lng, order: s.order || 1 })) };
    }

    const updated = await prisma.route.update({ where: { id: routeId }, data, include: { stops: { orderBy: { order: 'asc' } }, driver: { select: { id: true, name: true, email: true } }, bookings: true } });

    return res.status(200).json({ message: 'Route updated', route: updated });

  } catch (error) {
    console.error('Erro ao atualizar rota:', error);
    return next ? next(error) : res.status(500).json({ error: 'Erro ao atualizar rota' });
  }
}
