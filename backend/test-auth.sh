#!/bin/bash

# Troop Auth System - Testes
# Este script demonstra como usar os endpoints de autenticação

BASE_URL="http://localhost:3000"
echo "=== Testando Sistema de Autenticação Troop ==="
echo ""

# Test 1: Health check
echo "1️⃣  Verificando saúde do servidor..."
curl -s "$BASE_URL/health" | python3 -m json.tool
echo -e "\n"

# Test 2: Registrar um motorista
echo "2️⃣  Registrando um motorista..."
DRIVER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Motorista",
    "email": "joao@troop.com",
    "password": "senha123",
    "role": "DRIVER"
  }')

echo "$DRIVER_RESPONSE" | python3 -m json.tool
DRIVER_TOKEN=$(echo "$DRIVER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))")
echo -e "\n"

# Test 3: Registrar um passageiro
echo "3️⃣  Registrando um passageiro..."
PASSENGER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maria Silva",
    "email": "maria@troop.com",
    "password": "senha456",
    "role": "PASSENGER"
  }')

echo "$PASSENGER_RESPONSE" | python3 -m json.tool
PASSENGER_TOKEN=$(echo "$PASSENGER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))")
echo -e "\n"

# Test 4: Tentar registrar com email duplicado
echo "4️⃣  Tentando registrar email duplicado (deve falhar)..."
curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Outro João",
    "email": "joao@troop.com",
    "password": "outrasenha"
  }' | python3 -m json.tool
echo -e "\n"

# Test 5: Login com credenciais corretas
echo "5️⃣  Login com credenciais corretas..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@troop.com",
    "password": "senha123"
  }')

echo "$LOGIN_RESPONSE" | python3 -m json.tool
LOGIN_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))")
echo -e "\n"

# Test 6: Login com senha incorreta
echo "6️⃣  Login com senha incorreta (deve falhar)..."
curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@troop.com",
    "password": "senhaerrada"
  }' | python3 -m json.tool
echo -e "\n"

# Test 7: Acessar rota protegida sem token
echo "7️⃣  Tentando acessar rota protegida sem token (deve falhar)..."
curl -s -X GET "$BASE_URL/auth/me" | python3 -m json.tool
echo -e "\n"

# Test 8: Acessar rota protegida com token válido
echo "8️⃣  Acessando rota protegida com token válido..."
curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $DRIVER_TOKEN" | python3 -m json.tool
echo -e "\n"

# Test 9: Acessar rota protegida com token inválido
echo "9️⃣  Tentando acessar com token inválido (deve falhar)..."
curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer token-invalido-xyz" | python3 -m json.tool
echo -e "\n"

echo "=== Testes Concluídos ==="
echo ""
echo "Tokens gerados:"
echo "  Motorista: $DRIVER_TOKEN"
echo "  Passageiro: $PASSENGER_TOKEN"
echo ""
echo "Use esses tokens para testar rotas protegidas!"
