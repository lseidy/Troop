export const isAdmin = (req, res, next) => {
  const role = req.user && req.user.role;
  if (!role) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  if (role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem realizar esta ação.' });
  }

  next();
};
