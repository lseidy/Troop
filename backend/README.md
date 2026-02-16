# Troop Backend (Node.js + Prisma + PostgreSQL)

## Requisitos
- Node.js 18+
- WSL habilitado (Windows) para fluxo de trabalho Linux
- Opção A: Docker Desktop (com integração WSL)
- Opção B: Conta em Supabase ou Neon (Postgres gerenciado)

## Fundação e Infraestrutura
Nesta etapa, preparamos o terreno do backend:

### Configuração do Repositório
- Repositório Git inicializado na raiz do workspace.
- Backend criado em `backend/` com scripts: `dev`, `prisma:generate`, `prisma:migrate`, `prisma:studio`.

### Setup do Banco de Dados
- Opção A (local): `docker-compose.yml` na raiz sobe um Postgres 16.
- Opção B (nuvem): usar Supabase ou Neon e apontar o `DATABASE_URL` em `backend/.env`.

### Modelagem com Prisma
Arquivo: [backend/prisma/schema.prisma](backend/prisma/schema.prisma)
- `enum UserRole { PASSENGER, DRIVER }`
- `User`: `email` único, `passwordHash`, `role` (default PASSENGER), `createdAt`.
- `VanRoute`: `origin`, `destination`, `departureAt`, `seatCapacity`, `published` (bool), `driverId` relação com `User` (quem é o motorista), índices para busca.
- `Booking`: ligação `userId` ↔ `routeId`, `@@unique([userId, routeId])` impede o mesmo usuário de reservar a mesma rota duas vezes.

### Conexão Inicial (Migration)
Faça a primeira migration para criar as tabelas:

#### Opção A: Postgres local (Docker Desktop)
1. Na raiz do workspace, suba o banco:
```bash
docker compose up -d
```
2. No diretório `backend`, instale deps e gere o client Prisma:
```bash
cd backend
npm install
npx prisma generate
```
3. Rode a migration inicial:
```bash
npx prisma migrate dev --name init
```
4. (Opcional) Abra o Prisma Studio:
```bash
npx prisma studio
```

#### Opção B: Postgres gerenciado (Supabase/Neon)
1. Crie o projeto e copie a connection string.
2. Atualize `backend/.env`:
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DBNAME?schema=public"
JWT_SECRET="sua-chave-forte"
```
3. No diretório `backend`:
```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma studio
```

## Regras de Negócio Críticas
- Capacidade: antes de confirmar um `Booking`, contar reservas da `VanRoute` e comparar com `seatCapacity`.
- Duplicidade: bloquear que o mesmo usuário (`userId`) reserve a mesma `routeId` duas vezes (já garantido por `@@unique`).
- Perfis de usuário:
  - Passageiro (`PASSENGER`): login, busca de rotas e contratação.
  - Motorista (`DRIVER`): criar e publicar rotas.
  - Observação: a validação de perfil será aplicada na camada de serviço/rotas HTTP.

## Próximos Passos
- Autenticação JWT: endpoints de cadastro e login.
- Rotas de Van: CRUD limitado a `DRIVER` e listagem pública (apenas `published`).
- Agendamentos: endpoint para criar `Booking` com validações de capacidade e duplicidade.
- Middleware de auth para proteger rotas sensíveis.

## Recursos
- Prisma Docs: https://www.prisma.io/docs
- Postgres (Docker): https://hub.docker.com/_/postgres
- Supabase: https://supabase.com/
- Neon: https://neon.tech/
