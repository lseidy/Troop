export const isDriver = (req, res, next) => {
  const role = req.user && req.user.role;
  if (!role) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  if (role === 'PASSENGER') {
    return res.status(403).json({ error: 'Acesso negado. Apenas motoristas podem realizar esta ação.' });
  }

  // Allow DRIVER or other elevated roles (e.g., ADMIN)
  return next();
};
