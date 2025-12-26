#!/bin/bash

# ==============================================
# FCM Direct Test Script
# اختبار إرسال إشعار مباشر عبر FCM
# ==============================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      🔔 FCM Direct Notification Test 🔔          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Check if FCM_TOKEN is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: ./test_fcm.sh <FCM_TOKEN> [SERVER_KEY]${NC}"
    echo ""
    echo "To get FCM_TOKEN:"
    echo "  1. Open the app"
    echo "  2. Go to Settings → Test Notifications → Full Test"
    echo "  3. Copy the FCM Token from the console"
    echo ""
    echo "To get SERVER_KEY:"
    echo "  1. Go to Firebase Console"
    echo "  2. Project Settings → Cloud Messaging"
    echo "  3. Copy the Server key (Legacy)"
    echo ""
    exit 1
fi

FCM_TOKEN="$1"
SERVER_KEY="${2:-YOUR_SERVER_KEY_HERE}"

if [ "$SERVER_KEY" == "YOUR_SERVER_KEY_HERE" ]; then
    echo -e "${RED}⚠️  Please provide your FCM Server Key as the second parameter${NC}"
    echo -e "${YELLOW}./test_fcm.sh <FCM_TOKEN> <SERVER_KEY>${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN}📱 FCM Token:${NC} ${FCM_TOKEN:0:50}..."
echo -e "${GREEN}🔑 Server Key:${NC} ${SERVER_KEY:0:20}..."
echo ""

# Test 1: Data-only message (should work when app is closed)
echo -e "${YELLOW}📤 Sending DATA-ONLY message (for background delivery)...${NC}"
echo ""

RESPONSE=$(curl -s -X POST "https://fcm.googleapis.com/fcm/send" \
  -H "Authorization: key=$SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$FCM_TOKEN\",
    \"data\": {
      \"title\": \"🔔 اختبار - التطبيق مغلق\",
      \"body\": \"إذا ظهر هذا الإشعار والتطبيق مغلق، فالنظام يعمل بشكل صحيح!\",
      \"type\": \"test\",
      \"timestamp\": \"$(date +%s)\"
    },
    \"priority\": \"high\",
    \"android\": {
      \"priority\": \"high\"
    }
  }")

echo -e "${BLUE}Response:${NC}"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if successful
if echo "$RESPONSE" | grep -q '"success":1'; then
    echo -e "${GREEN}✅ Message sent successfully!${NC}"
    echo ""
    echo -e "${YELLOW}📋 Instructions:${NC}"
    echo "  1. Close the app completely (swipe from recent apps)"
    echo "  2. Wait 5-10 seconds"
    echo "  3. The notification should appear!"
    echo ""
else
    echo -e "${RED}❌ Failed to send message${NC}"
    echo ""
    echo "Common issues:"
    echo "  - Invalid FCM Token (re-open app to get new token)"
    echo "  - Invalid Server Key (check Firebase Console)"
    echo "  - Network issues"
    echo ""
fi

echo -e "${BLUE}══════════════════════════════════════════════════${NC}"
