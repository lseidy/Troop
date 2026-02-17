import { Prisma } from '@prisma/client';

export default function errorMiddleware(err, req, res, next) {
  console.error('Unhandled error:', err);

  // Prisma known errors
  if (err && err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint failed
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Registro duplicado no banco de dados' });
    }
    return res.status(400).json({ error: 'Erro no banco de dados', code: err.code });
  }

  // Validation-like errors
  if (err && err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  const status = err && err.status ? err.status : 500;
  const message = status === 500 ? 'Erro interno do servidor' : (err.message || 'Erro desconhecido');
  return res.status(status).json({ error: message });
}
