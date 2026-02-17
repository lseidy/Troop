#!/usr/bin/env bash
# Full end-to-end test: Create Route -> Reserve -> Fill -> Cancel -> Reserve again
# Usage: ./test-general.sh

set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:3000}
TIMESTAMP=$(date +%s)

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

parse_token() {
  body="$1"
  if [ "$PARSER" = "jq" ]; then
    echo "$body" | jq -r '.token // empty'
  else
    echo "$body" | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))"
  fi
}

http_post() { url="$1"; data="$2"; curl -s -w "\n%{http_code}" -X POST "$url" -H "Content-Type: application/json" -d "$data"; }
http_delete() { url="$1"; token="$2"; curl -s -o /dev/null -w "%{http_code}" -X DELETE "$url" -H "Authorization: Bearer $token"; }

echo "Starting full E2E test against $BASE_URL"
check_cmds

DRIVER_EMAIL="driver_${TIMESTAMP}@example.com"
DRIVER_PASS="driverpass123"

P1_EMAIL="p1_${TIMESTAMP}@example.com"
P1_PASS="p1pass123"

P2_EMAIL="p2_${TIMESTAMP}@example.com"
P2_PASS="p2pass123"

P3_EMAIL="p3_${TIMESTAMP}@example.com"
P3_PASS="p3pass123"

P4_EMAIL="p4_${TIMESTAMP}@example.com"
P4_PASS="p4pass123"

echo "Register driver"
REG=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" -d "{\"name\":\"Driver\",\"email\":\"$DRIVER_EMAIL\",\"password\":\"$DRIVER_PASS\",\"role\":\"DRIVER\"}")
REG_BODY=$(echo "$REG" | sed '$d')
REG_CODE=$(echo "$REG" | tail -n1)
echo "Driver register HTTP: $REG_CODE"

echo "Login driver"
LOGIN=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$DRIVER_EMAIL\",\"password\":\"$DRIVER_PASS\"}")
LOGIN_BODY=$(echo "$LOGIN" | sed '$d')
LOGIN_CODE=$(echo "$LOGIN" | tail -n1)
if [ "$LOGIN_CODE" != "200" ]; then echo "Driver login failed ($LOGIN_CODE): $LOGIN_BODY"; exit 1; fi
TOKEN_DRIVER=$(parse_token "$LOGIN_BODY")
echo "Driver token length: ${#TOKEN_DRIVER}"

echo "Create route with seatCapacity=3"
DEPARTURE=$(date -u -d "+1 day" --iso-8601=seconds)
CR=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/routes" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_DRIVER" -d "{\"origin\":\"A\",\"destination\":\"B\",\"departureAt\":\"$DEPARTURE\",\"seatCapacity\":3}")
CR_BODY=$(echo "$CR" | sed '$d')
CR_CODE=$(echo "$CR" | tail -n1)
echo "Create route HTTP: $CR_CODE"
if [ "$CR_CODE" != "201" ]; then echo "Create route failed: $CR_BODY"; exit 1; fi
if [ "$PARSER" = "jq" ]; then ROUTE_ID=$(echo "$CR_BODY" | jq -r '.route.id // .id'); else ROUTE_ID=$(echo "$CR_BODY" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('route',{}).get('id',d.get('id','')))" ); fi
echo "Route id: $ROUTE_ID"

echo "Register and login passenger 1"
curl -s -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" -d "{\"name\":\"P1\",\"email\":\"$P1_EMAIL\",\"password\":\"$P1_PASS\",\"role\":\"PASSENGER\"}" >/dev/null || true
L1=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$P1_EMAIL\",\"password\":\"$P1_PASS\"}")
L1_BODY=$(echo "$L1" | sed '$d')
L1_CODE=$(echo "$L1" | tail -n1)
if [ "$L1_CODE" != "200" ]; then echo "P1 login failed ($L1_CODE): $L1_BODY"; exit 1; fi
TOKEN_P1=$(parse_token "$L1_BODY")

echo "P1 books route"
B1=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/bookings" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_P1" -d "{\"routeId\":$ROUTE_ID}")
B1_BODY=$(echo "$B1" | sed '$d')
B1_CODE=$(echo "$B1" | tail -n1)
if [ "$B1_CODE" != "201" ]; then echo "P1 booking failed ($B1_CODE): $B1_BODY"; exit 1; fi
if [ "$PARSER" = "jq" ]; then BOOKING1_ID=$(echo "$B1_BODY" | jq -r '.booking.id // .id'); else BOOKING1_ID=$(echo "$B1_BODY" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('booking',{}).get('id',d.get('id','')))" ); fi
echo "P1 booking id: $BOOKING1_ID"

echo "P1 tries duplicate booking (expect 409)"
DB=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/bookings" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_P1" -d "{\"routeId\":$ROUTE_ID}")
DB_CODE=$(echo "$DB" | tail -n1)
if [ "$DB_CODE" != "409" ]; then echo "Duplicate booking did not return 409 (got $DB_CODE)"; exit 1; fi

echo "Register/login P2 and book"
curl -s -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" -d "{\"name\":\"P2\",\"email\":\"$P2_EMAIL\",\"password\":\"$P2_PASS\",\"role\":\"PASSENGER\"}" >/dev/null || true
L2=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$P2_EMAIL\",\"password\":\"$P2_PASS\"}")
L2_BODY=$(echo "$L2" | sed '$d')
L2_CODE=$(echo "$L2" | tail -n1)
TOKEN_P2=$(parse_token "$L2_BODY")
curl -s -w "\n%{http_code}" -X POST "$BASE_URL/bookings" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_P2" -d "{\"routeId\":$ROUTE_ID}" | tee /tmp/p2_book >/dev/null

echo "Register/login P3 and book"
curl -s -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" -d "{\"name\":\"P3\",\"email\":\"$P3_EMAIL\",\"password\":\"$P3_PASS\",\"role\":\"PASSENGER\"}" >/dev/null || true
L3=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$P3_EMAIL\",\"password\":\"$P3_PASS\"}")
L3_BODY=$(echo "$L3" | sed '$d')
TOKEN_P3=$(parse_token "$L3_BODY")
curl -s -w "\n%{http_code}" -X POST "$BASE_URL/bookings" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_P3" -d "{\"routeId\":$ROUTE_ID}" | tee /tmp/p3_book >/dev/null

echo "Now route should be full (capacity 3). P4 tries to book -> expect 400"
curl -s -X POST "$BASE_URL/auth/register" -H "Content-Type: application/json" -d "{\"name\":\"P4\",\"email\":\"$P4_EMAIL\",\"password\":\"$P4_PASS\",\"role\":\"PASSENGER\"}" >/dev/null || true
L4=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$P4_EMAIL\",\"password\":\"$P4_PASS\"}")
L4_BODY=$(echo "$L4" | sed '$d')
TOKEN_P4=$(parse_token "$L4_BODY")
EX=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/bookings" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_P4" -d "{\"routeId\":$ROUTE_ID}")
EX_CODE=$(echo "$EX" | tail -n1)
if [ "$EX_CODE" != "400" ]; then echo "Expected 400 when full, got $EX_CODE"; exit 1; fi

echo "Cancel P1 booking"
DEL_CODE=$(http_delete "$BASE_URL/bookings/$BOOKING1_ID" "$TOKEN_P1")
if [ "$DEL_CODE" != "204" ]; then echo "Failed to delete booking ($DEL_CODE)"; exit 1; fi
echo "Deleted booking $BOOKING1_ID"

echo "Now P4 tries booking again (should succeed)"
RETRY=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/bookings" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_P4" -d "{\"routeId\":$ROUTE_ID}")
RETRY_CODE=$(echo "$RETRY" | tail -n1)
if [ "$RETRY_CODE" != "201" ]; then echo "Retry booking failed ($RETRY_CODE)"; exit 1; fi

echo "E2E flow succeeded: create -> book -> fill -> cancel -> book again"
exit 0
