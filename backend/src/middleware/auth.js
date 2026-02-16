import { verifyToken } from '../utils/auth.js';

/**
 * Middleware to protect routes - verifies JWT token
 * Adiciona o usuário decodificado em req.user
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Token de autenticação não fornecido' 
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // Adiciona dados do usuário à requisição
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado' 
      });
    }
    
    return res.status(403).json({ 
      error: 'Token inválido' 
    });
  }
}

/**
 * Middleware para verificar se o usuário é um motorista (DRIVER)
 */
export function requireDriver(req, res, next) {
  if (req.user.role !== 'DRIVER') {
    return res.status(403).json({ 
      error: 'Acesso negado. Apenas motoristas podem acessar esta rota.' 
    });
  }
  next();
}

/**
 * Middleware para verificar se o usuário é um passageiro (PASSENGER)
 */
export function requirePassenger(req, res, next) {
  if (req.user.role !== 'PASSENGER') {
    return res.status(403).json({ 
      error: 'Acesso negado. Apenas passageiros podem acessar esta rota.' 
    });
  }
  next();
}
