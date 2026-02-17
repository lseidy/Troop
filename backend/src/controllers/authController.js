import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword, generateToken } from '../utils/auth.js';

const prisma = new PrismaClient();

/**
 * Registrar um novo usuário
 * POST /auth/register
 */
export async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;

    // Validação básica
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email e senha são obrigatórios' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'A senha deve ter no mínimo 6 caracteres' 
      });
    }

    // Validar role se fornecida
    const validRoles = ['PASSENGER', 'DRIVER', 'ADMIN'];
    const userRole = role && validRoles.includes(role) ? role : 'PASSENGER';

    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ 
        error: 'Este email já está cadastrado' 
      });
    }

    // Criar hash da senha
    const passwordHash = await hashPassword(password);

    // Criar usuário no banco
    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        passwordHash,
        role: userRole
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    // Gerar token JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    return res.status(201).json({
      message: 'Usuário criado com sucesso',
      user,
      token
    });

  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    return res.status(500).json({ 
      error: 'Erro ao criar usuário' 
    });
  }
}

/**
 * Login de usuário
 * POST /auth/login
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validação básica
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email e senha são obrigatórios' 
      });
    }

    // Buscar usuário por email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Email ou senha inválidos' 
      });
    }

    // Verificar senha
    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Email ou senha inválidos' 
      });
    }

    // Gerar token JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    return res.status(200).json({
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });

  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return res.status(500).json({ 
      error: 'Erro ao realizar login' 
    });
  }
}

/**
 * Obter dados do usuário autenticado
 * GET /auth/me
 */
export async function getCurrentUser(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'Usuário não encontrado' 
      });
    }

    return res.status(200).json({ user });

  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    return res.status(500).json({ 
      error: 'Erro ao obter dados do usuário' 
    });
  }
}
