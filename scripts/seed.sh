#!/bin/bash
set -e

# Elite Adventures Belize - Seed Script
# Creates sample conference and test leads

echo "🌱 Seeding sample data..."

# Load environment
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
else
  echo "❌ .env file not found. Run deploy.sh first."
  exit 1
fi

if [ -z "$API_GATEWAY_URL" ]; then
  echo "❌ API_GATEWAY_URL not set. Run deploy.sh first."
  exit 1
fi

API_URL=$API_GATEWAY_URL

echo "📋 Using API: $API_URL"
echo ""

# Create sample conference
echo "📅 Creating sample conference..."
CONFERENCE_ID="test-conf-$(date +%s)"

# Note: This endpoint requires admin authentication
# For seeding, we'll just create leads directly
echo "   Conference ID: $CONFERENCE_ID"
echo ""

# Create sample leads
echo "👥 Creating sample leads..."

LEADS=(
  '{
    "conferenceId": "'$CONFERENCE_ID'",
    "firstName": "John",
    "lastName": "Smith",
    "email": "john.smith@travelagency.com",
    "phone": "+15551234567",
    "company": "Adventure Travel Co",
    "role": "CEO",
    "businessType": "travel-agency",
    "interests": ["diving", "luxury", "groups"],
    "tripWindow": "3-6-months",
    "groupSize": 25,
    "notes": "Interested in corporate retreat packages",
    "consentContact": true,
    "consentMarketing": true
  }'
  '{
    "conferenceId": "'$CONFERENCE_ID'",
    "firstName": "Sarah",
    "lastName": "Johnson",
    "email": "sarah.j@tourops.com",
    "phone": "+15559876543",
    "company": "Global Tour Operators",
    "role": "VP Sales",
    "businessType": "tour-operator",
    "interests": ["eco-tours", "cultural", "adventure"],
    "tripWindow": "6-12-months",
    "groupSize": 15,
    "notes": "Looking for sustainable tourism options",
    "consentContact": true,
    "consentMarketing": true
  }'
  '{
    "conferenceId": "'$CONFERENCE_ID'",
    "firstName": "Michael",
    "lastName": "Chen",
    "email": "m.chen@luxury-resorts.com",
    "company": "Luxury Resorts International",
    "role": "Director of Partnerships",
    "businessType": "hotel-resort",
    "interests": ["luxury", "weddings", "diving"],
    "tripWindow": "next-3-months",
    "groupSize": 50,
    "notes": "Partnership opportunities for resort guests",
    "consentContact": true,
    "consentMarketing": false
  }'
  '{
    "conferenceId": "'$CONFERENCE_ID'",
    "firstName": "Emily",
    "lastName": "Rodriguez",
    "email": "emily.r@eventplanners.com",
    "phone": "+15555551234",
    "company": "Premier Event Planners",
    "role": "Event Coordinator",
    "businessType": "event-planner",
    "interests": ["groups", "adventure", "cultural"],
    "tripWindow": "flexible",
    "groupSize": 100,
    "notes": "Planning annual corporate event",
    "consentContact": true,
    "consentMarketing": true
  }'
  '{
    "conferenceId": "'$CONFERENCE_ID'",
    "firstName": "David",
    "lastName": "Thompson",
    "email": "david.t@corporation.com",
    "company": "Tech Corp Inc",
    "role": "HR Manager",
    "businessType": "corporate",
    "interests": ["adventure", "groups"],
    "tripWindow": "6-12-months",
    "groupSize": 30,
    "notes": "Team building activities for engineering team",
    "consentContact": true,
    "consentMarketing": false
  }'
)

for i in "${!LEADS[@]}"; do
  echo "  → Creating lead $((i+1))/${#LEADS[@]}..."

  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/leads" \
    -H "Content-Type: application/json" \
    -d "${LEADS[$i]}")

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n-1)

  if [ "$HTTP_CODE" -eq 201 ]; then
    LEAD_ID=$(echo "$BODY" | grep -o '"leadId":"[^"]*"' | cut -d'"' -f4)
    echo "    ✓ Created lead: $LEAD_ID"
  else
    echo "    ❌ Failed (HTTP $HTTP_CODE)"
    echo "    Response: $BODY"
  fi

  sleep 0.5
done

echo ""
echo "✅ Seeding complete!"
echo ""
echo "=========================================="
echo "📊 Sample Data Summary"
echo "=========================================="
echo ""
echo "Conference ID: $CONFERENCE_ID"
echo "Total Leads:   ${#LEADS[@]}"
echo ""
echo "To view leads in admin interface:"
echo "  1. Go to: http://$SITE_BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com/#admin"
echo "  2. Login with your Cognito credentials"
echo "  3. View all leads for conference: $CONFERENCE_ID"
echo ""
echo "To test the public form:"
echo "  Visit: http://$SITE_BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com/?conference=$CONFERENCE_ID"
echo ""
