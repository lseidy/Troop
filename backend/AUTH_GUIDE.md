# Sistema de Autenticação Troop - Guia de Uso

## Estrutura Implementada

```
backend/
├── src/
│   ├── controllers/
│   │   └── authController.js      # Lógica de registro e login
│   ├── middleware/
│   │   └── auth.js                # Middleware de proteção JWT
│   ├── routes/
│   │   └── auth.js                # Rotas de autenticação
│   ├── utils/
│   │   └── auth.js                # Funções de hash e JWT
│   └── index.js                   # Servidor Express
└── test-auth.sh                   # Script de testes
```

## Endpoints Disponíveis

### 1. Registrar Novo Usuário
**POST** `/auth/register`

**Body:**
```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "senha123",
  "role": "PASSENGER"  // ou "DRIVER" (opcional, padrão: PASSENGER)
}
```

**Resposta de Sucesso (201):**
```json
{
  "message": "Usuário criado com sucesso",
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@email.com",
    "role": "PASSENGER",
    "createdAt": "2025-12-31T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Login
**POST** `/auth/login`

**Body:**
```json
{
  "email": "joao@email.com",
  "password": "senha123"
}
```

**Resposta de Sucesso (200):**
```json
{
  "message": "Login realizado com sucesso",
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@email.com",
    "role": "PASSENGER"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. Obter Dados do Usuário Autenticado
**GET** `/auth/me`

**Headers:**
```
Authorization: Bearer <seu-token-jwt>
```

**Resposta de Sucesso (200):**
```json
{
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@email.com",
    "role": "PASSENGER",
    "createdAt": "2025-12-31T..."
  }
}
```

## Como Usar o Middleware de Proteção

### 1. Middleware `authenticateToken`
Protege rotas exigindo um token JWT válido:

```javascript
import { authenticateToken } from './middleware/auth.js';

router.get('/rota-protegida', authenticateToken, (req, res) => {
  // req.user contém: { id, email, role }
  res.json({ message: 'Acesso autorizado', user: req.user });
});
```

### 2. Middleware `requireDriver`
Apenas motoristas podem acessar:

```javascript
import { authenticateToken, requireDriver } from './middleware/auth.js';

router.post('/routes', authenticateToken, requireDriver, (req, res) => {
  // Apenas usuários com role: "DRIVER" chegam aqui
  res.json({ message: 'Criando rota de van...' });
});
```

### 3. Middleware `requirePassenger`
Apenas passageiros podem acessar:

```javascript
import { authenticateToken, requirePassenger } from './middleware/auth.js';

router.post('/bookings', authenticateToken, requirePassenger, (req, res) => {
  // Apenas usuários com role: "PASSENGER" chegam aqui
  res.json({ message: 'Agendando vaga...' });
});
```

## Executar o Servidor

### No WSL:
```bash
cd /mnt/c/Users/lucas/Documents/Troop/Troop/backend

# Garantir que o Postgres está rodando
sudo service postgresql start

# Instalar dependências (se necessário)
npm install

# Rodar servidor
npm run dev
```

O servidor estará disponível em: `http://localhost:3000`

## Testar os Endpoints

### Opção 1: Script de Teste Automatizado
```bash
cd /mnt/c/Users/lucas/Documents/Troop/Troop/backend
chmod +x test-auth.sh
./test-auth.sh
```

### Opção 2: cURL Manual

**Registrar um motorista:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Carlos Motorista",
    "email": "carlos@troop.com",
    "password": "senha123",
    "role": "DRIVER"
  }'
```

**Fazer login:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "carlos@troop.com",
    "password": "senha123"
  }'
```

**Acessar rota protegida (copie o token do login):**
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Opção 3: Usar Cliente REST (Postman, Insomnia, Thunder Client)

1. Importe a coleção ou configure manualmente os endpoints
2. Use `Authorization: Bearer <token>` para rotas protegidas
3. Teste os fluxos de registro → login → acessar rotas protegidas

## Validações Implementadas

### Registro:
- ✅ Email e senha obrigatórios
- ✅ Senha mínima de 6 caracteres
- ✅ Email único (não permite duplicatas)
- ✅ Senha criptografada com bcrypt (10 rounds)
- ✅ Role validado (PASSENGER, DRIVER, ADMIN)
- ✅ Token JWT gerado automaticamente

### Login:
- ✅ Email e senha obrigatórios
- ✅ Verificação de senha com bcrypt
- ✅ Mensagem genérica para credenciais inválidas (segurança)
- ✅ Token JWT gerado no login bem-sucedido

### Rotas Protegidas:
- ✅ Token JWT obrigatório no header Authorization
- ✅ Validação de token expirado
- ✅ Validação de token inválido
- ✅ Dados do usuário disponíveis em `req.user`

## Regras de Negócio Críticas

### 1. Autenticação JWT
- Tokens expiram em **7 dias**
- Token contém: `{ id, email, role }`
- Secret definido em `.env` (variável `JWT_SECRET`)

### 2. Perfis de Usuário
- **PASSENGER** (padrão): busca rotas e faz agendamentos
- **DRIVER**: motorista — pode ser vinculado a rotas como responsável, mas não cria rotas diretamente
- **ADMIN**: administrador do sistema — pode criar, editar e publicar rotas (manual ou automático)

### 3. Segurança
- Senhas **nunca** são retornadas em respostas da API
- Senhas armazenadas com hash bcrypt (salt rounds = 10)
- Tokens devem ser enviados no header `Authorization: Bearer <token>`
- Mensagens de erro genéricas para login (não revela se email existe)

## Próximos Passos

Agora que o sistema de autenticação está pronto, você pode implementar:

1. **Gestão de Rotas** (Route):
  - POST `/routes` - Criar rota (somente ADMIN)
  - GET `/routes` - Listar rotas publicadas
  - PUT `/routes/:id` - Atualizar rota (somente ADMIN ou dono, conforme política)
  - DELETE `/routes/:id` - Deletar rota (somente ADMIN ou dono)

2. **Sistema de Agendamento** (Booking):
   - POST `/bookings` - Criar agendamento (somente PASSENGER)
   - GET `/bookings` - Listar meus agendamentos
   - DELETE `/bookings/:id` - Cancelar agendamento
   - Validações:
     - Verificar vagas disponíveis
     - Impedir reserva duplicada (já garantido por `@@unique`)

## Exemplo de Fluxo Completo

```bash
# 1. Registrar administrador
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@troop.com","password":"senha123","role":"ADMIN"}' \
  | jq -r '.token')

# 2. Criar rota (somente ADMIN)
curl -X POST http://localhost:3000/routes \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "São Paulo",
    "destination": "Campinas",
    "departureAt": "2025-01-15T08:00:00Z",
    "seatCapacity": 15
  }'

# 3. Registrar passageiro
PASSENGER_TOKEN=$(curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Maria","email":"maria@troop.com","password":"senha456","role":"PASSENGER"}' \
  | jq -r '.token')

# 4. Buscar rotas disponíveis
curl -X GET "http://localhost:3000/routes?origin=São Paulo&destination=Campinas" \
  -H "Authorization: Bearer $PASSENGER_TOKEN"

# 5. Fazer agendamento (próximo passo a implementar)
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $PASSENGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"routeId": 1}'
```

## Troubleshooting

**Erro: "Can't reach database server"**
```bash
sudo service postgresql start
```

**Erro: "JWT_SECRET is not defined"**
- Verifique se o arquivo `.env` existe em `backend/`
- Confirme que `JWT_SECRET` está definido no `.env`

**Erro: "Token inválido"**
- Verifique se o header está correto: `Authorization: Bearer <token>`
- Confirme que o token não expirou (válido por 7 dias)
- Certifique-se de copiar o token completo sem espaços extras
