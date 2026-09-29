#!/usr/bin/env bash
#
# Verify share creation and image retrieval
# Usage: ./verify-shares.sh [BASE_URL]
#
# Example:
#   ./verify-shares.sh https://snapcharts.com
#   ./verify-shares.sh http://localhost:3000

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
BASE_URL="${BASE_URL%/}"

echo "=== Share Creation & Retrieval Verification ==="
echo "Base URL: $BASE_URL"
echo

# Test image (1x1 transparent PNG)
ONE_PIXEL_PNG="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+yXJkAAAAASUVORK5CYII="

echo "1. Creating share..."
RESPONSE=$(curl -s -X POST "${BASE_URL}/api/charts/share" \
  -H "Content-Type: application/json" \
  -d "{
    \"symbol\": \"TEST\",
    \"range\": \"1y\",
    \"imageData\": \"data:image/png;base64,${ONE_PIXEL_PNG}\"
  }")

echo "Response: $RESPONSE"
echo

# Extract ID using grep/sed (more portable than jq)
SHARE_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$SHARE_ID" ]; then
  echo "❌ Failed: No share ID in response"
  exit 1
fi

echo "✓ Share created with ID: $SHARE_ID"

# Verify response fields
if echo "$RESPONSE" | grep -q '"image_url"'; then
  echo "✓ Response contains image_url"
else
  echo "❌ Response missing image_url"
  exit 1
fi

if echo "$RESPONSE" | grep -q '"noindex":true'; then
  echo "✓ Response contains noindex: true"
else
  echo "❌ Response missing noindex: true"
  exit 1
fi

echo
echo "2. Fetching image..."
IMAGE_URL="${BASE_URL}/api/charts/share/${SHARE_ID}/image"
IMAGE_RESPONSE=$(curl -s -w "\n%{http_code}" "$IMAGE_URL")
HTTP_CODE=$(echo "$IMAGE_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ Image endpoint returned 200"
else
  echo "❌ Image endpoint returned $HTTP_CODE"
  exit 1
fi

echo
echo "3. Checking page metadata..."
PAGE_URL="${BASE_URL}/chart/${SHARE_ID}"
PAGE_HTML=$(curl -s "$PAGE_URL")

if echo "$PAGE_HTML" | grep -qi 'name="robots".*noindex'; then
  echo "✓ Page has robots noindex meta tag"
else
  echo "❌ Page missing robots noindex meta tag"
  exit 1
fi

if echo "$PAGE_HTML" | grep -qi 'property="og:image"'; then
  echo "✓ Page has og:image meta tag"
else
  echo "❌ Page missing og:image meta tag"
  exit 1
fi

echo
echo "=== All verification checks passed ✓ ==="
echo
echo "Share details:"
echo "  ID:        $SHARE_ID"
echo "  Page URL:  $PAGE_URL"
echo "  Image URL: $IMAGE_URL"
