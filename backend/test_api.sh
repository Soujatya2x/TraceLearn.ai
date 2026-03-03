#!/usr/bin/env bash
# ============================================================
# TraceLearn API Test Script
# Tests all endpoints in correct dependency order
# Run: bash test_api.sh
# ============================================================

BASE="http://localhost:8080"
TOKEN=""          # filled after login
SESSION_ID=""     # filled after session create

# Colours
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

pass() { echo -e "${GREEN}✅ PASS${NC} — $1"; }
fail() { echo -e "${RED}❌ FAIL${NC} — $1"; }
info() { echo -e "${CYAN}ℹ️  $1${NC}"; }
section() { echo -e "\n${BOLD}${YELLOW}━━━ $1 ━━━${NC}"; }

# Helper: POST with JSON body, print status + body
post() {
  local label="$1" url="$2" body="$3" auth="$4"
  local headers=(-H "Content-Type: application/json")
  [[ -n "$auth" ]] && headers+=(-H "Authorization: Bearer $auth")

  local resp
  resp=$(curl -s -w "\n__STATUS__%{http_code}" -X POST "$url" \
    "${headers[@]}" -d "$body" 2>/dev/null)

  local status body_part
  status=$(echo "$resp" | grep "__STATUS__" | sed 's/__STATUS__//')
  body_part=$(echo "$resp" | sed '/^__STATUS__/d')

  echo -e "  ${BOLD}Status:${NC} $status"
  echo -e "  ${BOLD}Body:${NC}   $(echo "$body_part" | head -c 600)"

  echo "$body_part"   # return body for parsing
  echo "__HTTP_STATUS__$status"
}

# Helper: GET
get() {
  local label="$1" url="$2" auth="$3"
  local headers=()
  [[ -n "$auth" ]] && headers+=(-H "Authorization: Bearer $auth")

  local resp
  resp=$(curl -s -w "\n__STATUS__%{http_code}" -X GET "$url" \
    "${headers[@]}" 2>/dev/null)

  local status body_part
  status=$(echo "$resp" | grep "__STATUS__" | sed 's/__STATUS__//')
  body_part=$(echo "$resp" | sed '/^__STATUS__/d')

  echo -e "  ${BOLD}Status:${NC} $status"
  echo -e "  ${BOLD}Body:${NC}   $(echo "$body_part" | head -c 600)"

  echo "$body_part"
  echo "__HTTP_STATUS__$status"
}

extract_field() {
  # Quick JSON field extractor using grep+sed (no jq dependency)
  local json="$1" field="$2"
  echo "$json" | grep -o "\"$field\":\"[^\"]*\"" | head -1 | sed "s/\"$field\":\"//;s/\"//"
}

extract_uuid() {
  local json="$1" field="$2"
  echo "$json" | grep -o "\"$field\":\"[0-9a-f-]*\"" | head -1 | sed "s/\"$field\":\"//;s/\"//"
}

section "1. HEALTH CHECK"

info "Waiting for server to become UP..."

for i in {1..10}; do
  resp=$(curl -s http://localhost:8080/actuator/health)
  if echo "$resp" | grep -q '"UP"'; then
    echo "  Body: $resp"
    pass "Health check — server is UP"
    break
  fi
  sleep 2
done

if ! echo "$resp" | grep -q '"UP"'; then
  fail "Health check failed — server did not become UP"
  exit 1
fi

# ============================================================
section "2. AUTH — REGISTER"
# ============================================================
info "POST /api/v1/auth/register"
REGISTER_BODY=$(cat <<EOF
{
  "email": "testuser@tracelearn.dev",
  "password": "TestPass123!",
  "firstName": "Test",
  "lastName": "User"
}
EOF
)
REGISTER_RESP=$(post "Register" "$BASE/api/v1/auth/register" "$REGISTER_BODY")

HTTP_STATUS=$(echo "$REGISTER_RESP" | grep "__HTTP_STATUS__" | sed 's/__HTTP_STATUS__//')
if [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "201" ]]; then
  pass "Register (status $HTTP_STATUS)"
elif [[ "$HTTP_STATUS" == "409" || "$HTTP_STATUS" == "400" ]]; then
  info "User may already exist (status $HTTP_STATUS) — continuing to login"
else
  fail "Register failed with status $HTTP_STATUS"
fi

# ============================================================
section "3. AUTH — LOGIN"
# ============================================================
info "POST /api/v1/auth/login"
LOGIN_BODY=$(cat <<EOF
{
  "email": "testuser@tracelearn.dev",
  "password": "TestPass123!"
}
EOF
)
LOGIN_RESP=$(post "Login" "$BASE/api/v1/auth/login" "$LOGIN_BODY")

TOKEN=$(extract_field "$LOGIN_RESP" "accessToken")
if [[ -z "$TOKEN" ]]; then
  TOKEN=$(extract_field "$LOGIN_RESP" "token")
fi

if [[ -n "$TOKEN" ]]; then
  pass "Login — JWT token received (${TOKEN:0:20}...)"
else
  fail "Login failed — no token in response. Check the response body above."
  echo -e "  ${RED}Cannot continue without a token. Exiting.${NC}"
  exit 1
fi

# ============================================================
section "4. AUTH — GET CURRENT USER"
# ============================================================
info "GET /api/v1/auth/me"
ME_RESP=$(get "Me" "$BASE/api/v1/auth/me" "$TOKEN")
HTTP_STATUS=$(echo "$ME_RESP" | grep "__HTTP_STATUS__" | sed 's/__HTTP_STATUS__//')
if [[ "$HTTP_STATUS" == "200" ]]; then
  pass "/auth/me — user profile returned"
else
  fail "/auth/me returned status $HTTP_STATUS"
fi

# ============================================================
section "5. SESSION — CREATE SESSION"
# ============================================================
info "POST /api/v1/sessions"
SESSION_BODY=$(cat <<EOF
{
  "language": "python",
  "code": "# Test session\nx = 10\ny = 0\nprint(x / y)"
}
EOF
)
SESSION_RESP=$(post "CreateSession" "$BASE/api/v1/sessions" "$SESSION_BODY" "$TOKEN")
HTTP_STATUS=$(echo "$SESSION_RESP" | grep "__HTTP_STATUS__" | sed 's/__HTTP_STATUS__//')

SESSION_ID=$(extract_uuid "$SESSION_RESP" "id")
if [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "201" ]] && [[ -n "$SESSION_ID" ]]; then
  pass "Session created — ID: $SESSION_ID"
else
  fail "Session creation failed (status $HTTP_STATUS)"
  info "Trying alternate field names..."
  SESSION_ID=$(extract_uuid "$SESSION_RESP" "sessionId")
  [[ -n "$SESSION_ID" ]] && info "Found sessionId: $SESSION_ID"
fi

# ============================================================
section "6. SESSION — GET SESSION"
# ============================================================
if [[ -n "$SESSION_ID" ]]; then
  info "GET /api/v1/sessions/$SESSION_ID"
  GET_SESS_RESP=$(get "GetSession" "$BASE/api/v1/sessions/$SESSION_ID" "$TOKEN")
  HTTP_STATUS=$(echo "$GET_SESS_RESP" | grep "__HTTP_STATUS__" | sed 's/__HTTP_STATUS__//')
  if [[ "$HTTP_STATUS" == "200" ]]; then
    pass "GET session — session data returned"
  else
    fail "GET session returned status $HTTP_STATUS"
  fi
else
  info "Skipping GET session — no session ID available"
fi

# ============================================================
section "7. SESSION — LIST SESSIONS"
# ============================================================
info "GET /api/v1/sessions"
LIST_RESP=$(get "ListSessions" "$BASE/api/v1/sessions" "$TOKEN")
HTTP_STATUS=$(echo "$LIST_RESP" | grep "__HTTP_STATUS__" | sed 's/__HTTP_STATUS__//')
if [[ "$HTTP_STATUS" == "200" ]]; then
  pass "List sessions — returned OK"
else
  fail "List sessions returned status $HTTP_STATUS"
fi

# ============================================================
section "8. ANALYZE — TRIGGER ANALYSIS"
# ============================================================
if [[ -n "$SESSION_ID" ]]; then
  info "POST /api/v1/sessions/$SESSION_ID/analyze"
  ANALYZE_BODY=$(cat <<EOF
{
  "code": "x = 10\ny = 0\nprint(x / y)",
  "language": "python",
  "logs": ""
}
EOF
)
  ANALYZE_RESP=$(post "Analyze" "$BASE/api/v1/sessions/$SESSION_ID/analyze" "$ANALYZE_BODY" "$TOKEN")
  HTTP_STATUS=$(echo "$ANALYZE_RESP" | grep "__HTTP_STATUS__" | sed 's/__HTTP_STATUS__//')
  if [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "202" ]]; then
    pass "Analyze triggered (status $HTTP_STATUS) — pipeline running async"
    info "Analysis is async — wait 10-30s then check /status"
  else
    fail "Analyze returned status $HTTP_STATUS"
  fi
else
  info "Skipping analyze — no session ID"
fi

# ============================================================
section "9. SESSION — CHECK STATUS (after analysis)"
# ============================================================
if [[ -n "$SESSION_ID" ]]; then
  info "GET /api/v1/sessions/$SESSION_ID/status  (polling once — AI agent may not be running)"
  STATUS_RESP=$(get "SessionStatus" "$BASE/api/v1/sessions/$SESSION_ID/status" "$TOKEN")
  HTTP_STATUS=$(echo "$STATUS_RESP" | grep "__HTTP_STATUS__" | sed 's/__HTTP_STATUS__//')
  if [[ "$HTTP_STATUS" == "200" ]]; then
    pass "Session status endpoint reachable"
    info "Note: status will be ANALYZING/EXECUTING until AI agent responds"
  else
    fail "Session status returned status $HTTP_STATUS"
  fi
fi

# ============================================================
section "10. CHAT — SEND A MESSAGE"
# ============================================================
if [[ -n "$SESSION_ID" ]]; then
  info "POST /api/v1/sessions/$SESSION_ID/chat"
  CHAT_BODY=$(cat <<EOF
{
  "message": "Why did my code crash?"
}
EOF
)
  CHAT_RESP=$(post "Chat" "$BASE/api/v1/sessions/$SESSION_ID/chat" "$CHAT_BODY" "$TOKEN")
  HTTP_STATUS=$(echo "$CHAT_RESP" | grep "__HTTP_STATUS__" | sed 's/__HTTP_STATUS__//')
  if [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "202" ]]; then
    pass "Chat message sent (status $HTTP_STATUS)"
  else
    fail "Chat returned status $HTTP_STATUS"
  fi
fi

# ============================================================
section "11. ROADMAP"
# ============================================================
info "GET /api/v1/roadmap"
ROADMAP_RESP=$(get "Roadmap" "$BASE/api/v1/roadmap" "$TOKEN")
HTTP_STATUS=$(echo "$ROADMAP_RESP" | grep "__HTTP_STATUS__" | sed 's/__HTTP_STATUS__//')
if [[ "$HTTP_STATUS" == "200" ]]; then
  pass "Roadmap endpoint OK"
else
  fail "Roadmap returned status $HTTP_STATUS"
fi

# ============================================================
section "12. ARTIFACTS — CHECK STATUS"
# ============================================================
if [[ -n "$SESSION_ID" ]]; then
  info "GET /api/v1/sessions/$SESSION_ID/artifacts"
  ART_RESP=$(get "Artifacts" "$BASE/api/v1/sessions/$SESSION_ID/artifacts" "$TOKEN")
  HTTP_STATUS=$(echo "$ART_RESP" | grep "__HTTP_STATUS__" | sed 's/__HTTP_STATUS__//')
  if [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "404" ]]; then
    pass "Artifacts endpoint reachable (status $HTTP_STATUS — 404 is OK before analysis completes)"
  else
    fail "Artifacts returned status $HTTP_STATUS"
  fi
fi

# ============================================================
section "SUMMARY"
# ============================================================
echo ""
echo -e "${BOLD}Token obtained:${NC}     ${TOKEN:0:30}..."
echo -e "${BOLD}Session ID:${NC}         $SESSION_ID"
echo ""
echo -e "${YELLOW}Note: Endpoints 8-12 require the AI Agent to be running.${NC}"
echo -e "${YELLOW}If AI Agent is not started yet, steps 8-12 will return 503/500 — that is expected.${NC}"
echo -e "${YELLOW}The backend DB layer (steps 1-7) should all be green independently.${NC}"