#!/usr/bin/env bash
# Test script for Troop backend routes (Ubuntu / Bash)
# Usage: ./test-routes.sh

set -u

BASE_URL=${BASE_URL:-http://localhost:3000}
TIMESTAMP=$(date +%s)
DRIVER_EMAIL="driver_${TIMESTAMP}@example.com"
PASS_EMAIL="passenger_${TIMESTAMP}@example.com"
DRIVER_PASS="minhamae"
PASS_PASS="segredo"

check_cmds() {
  command -v curl >/dev/null 2>&1 || { echo "curl is required. Install with: sudo apt install curl"; exit 1; }
  if command -v jq >/dev/null 2>&1; then
    PARSER="jq"
  elif command -v python3 >/dev/null 2>&1; then
    PARSER="python3"
  else
    echo "Either 'jq' or 'python3' is required to parse JSON. Install with: sudo apt install jq";
    exit 1
  fi
}

parse_token_from_body() {
  body="$1"
  if [ "$PARSER" = "jq" ]; then
    echo "$body" | jq -r '.token // empty'
  else
    echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))"
  fi
}

http_post() {
  url="$1"; shift
  data="$1"; shift
  curl -s -w "\n%{http_code}" -X POST "$url" -H "Content-Type: application/json" -d "$data"
}

http_get() {
  url="$1"; shift
  token="$1"; shift
  curl -s -H "Authorization: Bearer $token" -w "\n%{http_code}" "$url"
}

echo "[1/9] Checking dependencies and server health..."
check_cmds

HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" || echo "000")
if [ "$HEALTH_CODE" != "200" ]; then
  echo "Warning: Health check returned $HEALTH_CODE. Make sure the server is running at $BASE_URL";
fi

echo "[2/9] Registering DRIVER: $DRIVER_EMAIL"
REG_RESPONSE=$(http_post "$BASE_URL/auth/register" "{\"name\":\"Carlos Van\",\"email\":\"$DRIVER_EMAIL\",\"password\":\"$DRIVER_PASS\",\"role\":\"DRIVER\"}")
REG_BODY=$(echo "$REG_RESPONSE" | sed '$d')
REG_CODE=$(echo "$REG_RESPONSE" | tail -n1)
echo "Register status: $REG_CODE"
if [ "$REG_CODE" = "201" ]; then
  echo "Driver registered.";
elif [ "$REG_CODE" = "409" ]; then
  echo "Driver already exists; continuing to login.";
else
  echo "Unexpected register response ($REG_CODE):"; echo "$REG_BODY"; exit 1;
fi

echo "[3/9] Logging in as DRIVER"
LOGIN_RESPONSE=$(http_post "$BASE_URL/auth/login" "{\"email\":\"$DRIVER_EMAIL\",\"password\":\"$DRIVER_PASS\"}")
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')
LOGIN_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
if [ "$LOGIN_CODE" != "200" ]; then
  echo "Driver login failed ($LOGIN_CODE):"; echo "$LOGIN_BODY"; exit 1;
fi
TOKEN_DRIVER=$(parse_token_from_body "$LOGIN_BODY")
if [ -z "$TOKEN_DRIVER" ]; then
  echo "Failed to extract token for driver."; exit 1;
fi
echo "Driver token obtained. (length ${#TOKEN_DRIVER})"

echo "[4/9] Creating a route as DRIVER (should succeed: 201)"
CREATE_RESP=$(curl -s -o - -w "\n%{http_code}" -X POST "$BASE_URL/routes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_DRIVER" \
  -d '{"origin":"Centro","destination":"UFPel","departureAt":"2026-02-20T09:00:00Z","seatCapacity":12}')
CREATE_BODY=$(echo "$CREATE_RESP" | sed '$d')
CREATE_CODE=$(echo "$CREATE_RESP" | tail -n1)
echo "Create route status: $CREATE_CODE"
if [ "$CREATE_CODE" = "201" ]; then
  echo "Route created successfully.";
else
  echo "Failed to create route as driver ($CREATE_CODE):"; echo "$CREATE_BODY"; exit 1;
fi

echo "[5/9] Registering PASSENGER: $PASS_EMAIL"
REGP_RESPONSE=$(http_post "$BASE_URL/auth/register" "{\"name\":\"Paulo Passageiro\",\"email\":\"$PASS_EMAIL\",\"password\":\"$PASS_PASS\",\"role\":\"PASSENGER\"}")
REGP_BODY=$(echo "$REGP_RESPONSE" | sed '$d')
REGP_CODE=$(echo "$REGP_RESPONSE" | tail -n1)
echo "Passenger register status: $REGP_CODE"
if [ "$REGP_CODE" = "201" ]; then
  echo "Passenger registered.";
elif [ "$REGP_CODE" = "409" ]; then
  echo "Passenger already exists; continuing to login.";
else
  echo "Unexpected passenger register response ($REGP_CODE):"; echo "$REGP_BODY"; exit 1;
fi

echo "[6/9] Logging in as PASSENGER"
LOGINP_RESPONSE=$(http_post "$BASE_URL/auth/login" "{\"email\":\"$PASS_EMAIL\",\"password\":\"$PASS_PASS\"}")
LOGINP_BODY=$(echo "$LOGINP_RESPONSE" | sed '$d')
LOGINP_CODE=$(echo "$LOGINP_RESPONSE" | tail -n1)
if [ "$LOGINP_CODE" != "200" ]; then
  echo "Passenger login failed ($LOGINP_CODE):"; echo "$LOGINP_BODY"; exit 1;
fi
TOKEN_PASS=$(parse_token_from_body "$LOGINP_BODY")
if [ -z "$TOKEN_PASS" ]; then
  echo "Failed to extract token for passenger."; exit 1;
fi
echo "Passenger token obtained. (length ${#TOKEN_PASS})"

echo "[7/9] Attempt to create a route as PASSENGER (should be blocked: 403)"
CREP_RESP=$(curl -s -o - -w "\n%{http_code}" -X POST "$BASE_URL/routes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_PASS" \
  -d '{"origin":"Bairro","destination":"Praia","departureAt":"2026-03-01T10:00:00Z","seatCapacity":8}')
CREP_BODY=$(echo "$CREP_RESP" | sed '$d')
CREP_CODE=$(echo "$CREP_RESP" | tail -n1)
echo "Passenger create status: $CREP_CODE"
if [ "$CREP_CODE" = "403" ]; then
  echo "Passenger correctly blocked from creating route.";
else
  echo "Passenger route creation did NOT return 403 (got $CREP_CODE). Response:"; echo "$CREP_BODY"; exit 1;
fi

echo "[8/9] Searching for routes by destination 'UFPel' (should find at least 1)"
SEARCH1_RESP=$(http_get "$BASE_URL/routes?destination=UFPel" "$TOKEN_DRIVER")
SEARCH1_BODY=$(echo "$SEARCH1_RESP" | sed '$d')
SEARCH1_CODE=$(echo "$SEARCH1_RESP" | tail -n1)
echo "Search status: $SEARCH1_CODE"
if [ "$SEARCH1_CODE" != "200" ]; then
  echo "Search request failed ($SEARCH1_CODE):"; echo "$SEARCH1_BODY"; exit 1;
fi
if [ "$PARSER" = "jq" ]; then
  COUNT=$(echo "$SEARCH1_BODY" | jq '.routes | length')
else
  COUNT=$(echo "$SEARCH1_BODY" | python3 -c "import sys,json;print(len(json.load(sys.stdin).get('routes',[])))")
fi
echo "Found routes count: $COUNT"
if [ "$COUNT" -lt 1 ]; then
  echo "Expected at least 1 route for UFPel, found $COUNT"; exit 1;
fi

echo "[9/9] Searching for non-existent destination (should return 0)"
SEARCH2_RESP=$(http_get "$BASE_URL/routes?destination=DestinoInexistente123" "$TOKEN_DRIVER")
SEARCH2_BODY=$(echo "$SEARCH2_RESP" | sed '$d')
SEARCH2_CODE=$(echo "$SEARCH2_RESP" | tail -n1)
if [ "$SEARCH2_CODE" != "200" ]; then
  echo "Search (non-existent) failed ($SEARCH2_CODE):"; echo "$SEARCH2_BODY"; exit 1;
fi
if [ "$PARSER" = "jq" ]; then
  COUNT2=$(echo "$SEARCH2_BODY" | jq '.routes | length')
else
  COUNT2=$(echo "$SEARCH2_BODY" | python3 -c "import sys,json;print(len(json.load(sys.stdin).get('routes',[])))")
fi
echo "Found routes for non-existent destination: $COUNT2"
if [ "$COUNT2" -ne 0 ]; then
  echo "Expected 0 results for non-existent destination, got $COUNT2"; exit 1;
fi

echo "All tests passed successfully."
exit 0
