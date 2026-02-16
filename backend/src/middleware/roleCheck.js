export const isDriver = (req, res, next) => {
  if (req.user.role !== 'DRIVER') {
    return res.status(403).json({ error: "Acesso negado. Apenas motoristas podem realizar esta ação." });
  }
  next();
};