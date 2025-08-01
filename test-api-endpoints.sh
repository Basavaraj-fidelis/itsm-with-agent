
#!/bin/bash

echo "🧪 Testing ITSM API Endpoints"
echo "================================"

BASE_URL="http://0.0.0.0:5000"

# Test 1: Login
echo "1. Testing POST /api/auth/login"
LOGIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"Admin123!"}' \
  ${BASE_URL}/api/auth/login)

echo "Login Response: $LOGIN_RESPONSE"

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed - no token received"
  exit 1
else
  echo "✅ Login successful - Token: ${TOKEN:0:20}..."
fi

echo ""

# Test 2: Verify token
echo "2. Testing GET /api/auth/verify"
VERIFY_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" ${BASE_URL}/api/auth/verify)
echo "Verify Response: $VERIFY_RESPONSE"

if echo $VERIFY_RESPONSE | grep -q "error\|Invalid"; then
  echo "❌ Token verification failed"
else
  echo "✅ Token verification successful"
fi

echo ""

# Test 3: Get devices
echo "3. Testing GET /api/devices"
DEVICES_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" ${BASE_URL}/api/devices)
echo "Devices Response: ${DEVICES_RESPONSE:0:200}..."

if echo $DEVICES_RESPONSE | grep -q "error\|Invalid"; then
  echo "❌ Devices API failed"
else
  echo "✅ Devices API successful"
fi

echo ""

# Test 4: Dashboard summary
echo "4. Testing GET /api/dashboard/summary"
DASHBOARD_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" ${BASE_URL}/api/dashboard/summary)
echo "Dashboard Response: ${DASHBOARD_RESPONSE:0:200}..."

if echo $DASHBOARD_RESPONSE | grep -q "error\|Invalid"; then
  echo "❌ Dashboard API failed"
else
  echo "✅ Dashboard API successful"
fi

echo ""

# Test 5: Alerts
echo "5. Testing GET /api/alerts"
ALERTS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" ${BASE_URL}/api/alerts)
echo "Alerts Response: ${ALERTS_RESPONSE:0:200}..."

if echo $ALERTS_RESPONSE | grep -q "error\|Invalid"; then
  echo "❌ Alerts API failed"
else
  echo "✅ Alerts API successful"
fi

echo ""
echo "🏁 API Testing Complete"
