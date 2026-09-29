# SNAP-BE-01/02/03: Complete Fix Summary

## PR Status
**Pull Request**: [#9](https://github.com/zrogers010/snapcharts/pull/9)  
**Status**: ✅ All CI checks passing  
**Branch**: `cursor/fix-share-persistence-317b`  
**Commits**: 5 total

## Problems Addressed

### Initial Issue (Pre-Hotfix)
- `POST /api/charts/share` returned 500 error: `{"error":"Failed to save snapshot"}`
- Root cause: No writable volume mounted; mkdir/write failed silently

### Post-Hotfix Gaps (Now Fixed in PR)
After the temporary hotfix enabled share creation, three additional issues remained:

1. **Wrong URLs in create response**
   - Used `request.nextUrl.origin` → produced `https://0.0.0.0:3000/chart/{id}`
   - Should use configured `NEXT_PUBLIC_SITE_URL` → `https://snapcharts.com/chart/{id}`

2. **Missing robots noindex meta tag**
   - Share pages showed default `index, follow`
   - Should be `noindex, nofollow` for ephemeral snapshots

3. **Missing response fields**
   - Create response lacked `image_url` and `noindex` fields
   - Needed for client handling and future integrations

## Complete Solution

### 1. Configurable Share Directory
**File**: `lib/chartShareStore.ts`

```typescript
const getStoreDir = () => {
  const envDir = process.env.SNAP_SHARE_DIR?.trim();
  if (envDir) {
    return path.isAbsolute(envDir) 
      ? envDir 
      : path.join(process.cwd(), envDir);
  }
  return path.join(process.cwd(), ".snapcharts-shares");
};
```

- New environment variable: `SNAP_SHARE_DIR`
- Defaults: `/app/data/shares` (Docker) or `.snapcharts-shares` (local)
- Supports both absolute and relative paths

### 2. Hardened Error Handling
**File**: `lib/chartShareStore.ts`

```typescript
const ensureStoreDir = () => {
  try {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create share directory ${STORE_DIR}: ${message}`);
  }
};
```

- No longer silently swallows errors
- Clear error messages with directory path
- Easier debugging in production

### 3. Fixed URL Generation
**File**: `app/api/charts/share/route.ts`

```typescript
import { getSiteUrl } from "@/lib/site";

// In POST handler:
const id = saveShare({ symbol, range, imageData });
const siteUrl = getSiteUrl();

return NextResponse.json({
  id,
  url: `${siteUrl}/chart/${id}`,
  image_url: `${siteUrl}/api/charts/share/${id}/image`,
  noindex: true,
});
```

- Uses `getSiteUrl()` instead of `request.nextUrl.origin`
- Reads from `NEXT_PUBLIC_SITE_URL` environment variable
- Produces correct absolute URLs in all environments

### 4. SEO: Noindex Meta Tags
**File**: `app/chart/[symbol]/page.tsx`

```typescript
return {
  title: `${share.symbol} - ${share.range.toUpperCase()} Snapshot | SnapCharts`,
  description: `Shareable chart snapshot for ${share.symbol} (${share.range.toUpperCase()}).`,
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    // ... og:image preserved for unfurling
  },
};
```

- Prevents search engine indexing of ephemeral snapshots
- Preserves og:image for social media unfurling
- Proper SEO hygiene for temporary content

### 5. Docker Volume Support
**File**: `Dockerfile`

```dockerfile
# Copy public assets if needed for standalone mode
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Create share directory with proper ownership
RUN mkdir -p /app/data/shares && chown -R nextjs:nodejs /app/data

USER nextjs
```

- Creates `/app/data/shares` before USER switch
- Sets proper ownership (nextjs:nodejs / 1001:1001)
- Ensures writable directory exists in container

### 6. Deploy Script Automation
**File**: `scripts/deploy.sh`

```bash
# Create and prepare share directory
local share_dir="${APP_DIR}/data/shares"
log "Ensuring share directory ${share_dir} exists with proper permissions..."
mkdir -p "$share_dir"
sudo chown -R 1001:1001 "$share_dir" || chown -R 1001:1001 "$share_dir" || true

# Preserve GA measurement ID if present
local env_file="${APP_DIR}/.env.production"
local ga_id=""
if [ -f "$env_file" ]; then
  ga_id="$(grep -E '^NEXT_PUBLIC_GA_MEASUREMENT_ID=' "$env_file" | cut -d= -f2- || echo '')"
fi

# Run container with volume and environment
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p "${publish_target}" \
  -v "${share_dir}:/app/data/shares" \
  -e NODE_ENV=production \
  -e PORT="${CONTAINER_PORT}" \
  -e SNAP_SHARE_DIR=/app/data/shares \
  ${ga_id:+-e NEXT_PUBLIC_GA_MEASUREMENT_ID="${ga_id}"} \
  "$image_tag"
```

- Automatically creates host directory with correct ownership
- Mounts persistent volume
- Sets `SNAP_SHARE_DIR` environment variable
- Preserves Google Analytics ID from `.env.production`

### 7. Enhanced Testing
**File**: `scripts/smoke-routes.mjs`

```javascript
// Verify create response fields
assert(typeof share.id === "string", "share POST did not return an id");
assert(typeof share.url === "string", "share POST did not return a url");
assert(typeof share.image_url === "string", "share POST did not return an image_url");
assert(share.noindex === true, "share POST did not return noindex: true");
assert(share.image_url.includes(`/api/charts/share/${share.id}/image`), 
  "share image_url does not match expected pattern");

// Verify robots meta tag
const robotsMatch = sharePageHtml.match(/<meta\s+name="robots"\s+content="([^"]+)"/i);
assert(robotsMatch, "share page missing robots meta tag");
assert(
  robotsMatch[1].includes('noindex') && robotsMatch[1].includes('nofollow'),
  `share page robots meta should be noindex,nofollow but got: ${robotsMatch[1]}`
);
```

- Verifies all response fields
- Validates URL format
- Checks robots meta tag content
- Verifies og:image presence

### 8. Verification Script
**File**: `scripts/verify-shares.sh`

Standalone script for manual verification:
```bash
./scripts/verify-shares.sh https://snapcharts.com
```

Checks:
- Share creation returns 200 with all fields
- Image endpoint returns 200 with image/png
- Page has robots noindex meta tag
- Page has og:image meta tag

## Deployment

### Prerequisites
- Docker installed and running
- Git repository cloned at `$APP_DIR` (e.g., `/opt/snapcharts`)
- Optional: `.env.production` with `NEXT_PUBLIC_GA_MEASUREMENT_ID`

### Steps

```bash
# 1. Pull latest code
cd /opt/snapcharts  # or wherever your repo is
git checkout main
git pull origin main

# 2. Run deploy script (handles everything automatically)
cd scripts
./deploy.sh
```

The deploy script automatically:
- Creates `$APP_DIR/data/shares` with proper ownership
- Mounts volume: `$APP_DIR/data/shares` → `/app/data/shares`
- Sets `SNAP_SHARE_DIR=/app/data/shares`
- Preserves `NEXT_PUBLIC_GA_MEASUREMENT_ID` from `.env.production`
- Builds and starts the container

### Environment Variables

Required:
- `NEXT_PUBLIC_SITE_URL=https://snapcharts.com` (set in `.env.production` or deploy config)

Optional:
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` (for Google Analytics)
- `SNAP_SHARE_DIR` (auto-set by deploy script to `/app/data/shares`)

### Hotfix Compatibility

The temporary hotfix used:
- Host path: `/opt/snapcharts/data/shares`
- Container path: `/app/.snapcharts-shares`
- No `SNAP_SHARE_DIR` set (used default)

This PR changes to:
- Host path: `/opt/snapcharts/data/shares` (same)
- Container path: `/app/data/shares` (explicit)
- `SNAP_SHARE_DIR=/app/data/shares` (explicit)

**Existing shares are preserved** because the host path remains the same. The container just mounts it at a cleaner location and uses an explicit env var.

## Verification

### Quick Test

```bash
# Create a share
curl -X POST https://snapcharts.com/api/charts/share \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "range": "1y",
    "imageData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+yXJkAAAAASUVORK5CYII="
  }'
```

**Expected response**:
```json
{
  "id": "...",
  "url": "https://snapcharts.com/chart/...",
  "image_url": "https://snapcharts.com/api/charts/share/.../image",
  "noindex": true
}
```

**Verify URLs**:
- ✅ Must start with `https://snapcharts.com/` (not `0.0.0.0:3000`)
- ✅ Must include `image_url` field
- ✅ Must include `noindex: true`

### Full Verification

```bash
./scripts/verify-shares.sh https://snapcharts.com
```

Expected output:
```
✓ Share created with ID: ...
✓ Response contains image_url
✓ Response contains noindex: true
✓ Image endpoint returned 200
✓ Page has robots noindex meta tag
✓ Page has og:image meta tag
=== All verification checks passed ✓ ===
```

### Manual Page Check

```bash
# Get share ID from create response above
curl https://snapcharts.com/chart/YOUR_SHARE_ID | grep -E '(robots|og:image)'
```

Expected:
```html
<meta name="robots" content="noindex, nofollow"/>
<meta property="og:image" content="https://snapcharts.com/api/charts/share/.../image"/>
```

## Architecture

### Storage Model
- **Location**: Host filesystem at `$APP_DIR/data/shares`
- **Format**: JSON files named `{id}.json`
- **TTL**: 14 days (auto-cleanup on next write)
- **Limit**: 500 entries max (LRU eviction)
- **Size**: Max 2.5MB per image (base64)

### Directory Structure
```
Host:                           Container:
/opt/snapcharts/                /app/
├── data/                       ├── data/
│   └── shares/                 │   └── shares/  ← mounted volume
│       ├── id1_abc123.json     │       ├── id1_abc123.json
│       └── id2_xyz789.json     │       └── id2_xyz789.json
├── .env.production             ├── .next/
└── scripts/                    ├── public/
    └── deploy.sh               └── server.js
```

### API Flow
```
Client
  ↓
POST /api/charts/share { symbol, range, imageData }
  ↓
saveShare() → writes to SNAP_SHARE_DIR/{id}.json
  ↓
← 200 { id, url, image_url, noindex }
  ↓
GET /api/charts/share/{id}/image
  ↓
getShareImageBuffer() → reads from SNAP_SHARE_DIR/{id}.json
  ↓
← 200 image/png
  ↓
GET /chart/{id}
  ↓
getShare() + generateMetadata() with robots noindex + og:image
  ↓
← 200 HTML with proper meta tags
```

## Testing Summary

### Local Tests (All Passing)
```bash
npm run build           # ✅ Build succeeds
npm run smoke:routes    # ✅ All smoke tests pass
```

### CI Tests (All Passing)
- ✅ GitHub Actions build
- ✅ TypeScript type checking
- ✅ Next.js build & optimization
- ✅ Route smoke tests

### Manual Verification
- ✅ URLs use configured site URL (not 0.0.0.0:3000)
- ✅ Create response includes all fields (id, url, image_url, noindex)
- ✅ Image endpoint returns PNG
- ✅ Share page has robots noindex meta tag
- ✅ Share page has og:image meta tag

## Troubleshooting

See `DEPLOY_NOTES.md` for comprehensive troubleshooting guide including:
- Volume mount verification
- Permission checks
- Environment variable validation
- Container log inspection
- Rollback procedure

## Out of Scope (P0)

Per requirements, these remain future work:
- ❌ Parallel `/s/{id}` API stack (using existing `/chart/{id}` route)
- ❌ S3 or cloud storage (local volume sufficient for P0)
- ❌ TV capture drawings integration
- ❌ Indexed gallery/discovery
- ❌ User accounts/authentication

## Checklist

- [x] Fixed 500 error on share creation
- [x] Made share directory configurable via `SNAP_SHARE_DIR`
- [x] Hardened error handling (no silent failures)
- [x] Fixed URL generation to use `getSiteUrl()`
- [x] Added `image_url` to create response
- [x] Added `noindex: true` to create response
- [x] Added robots noindex meta tag to share pages
- [x] Updated Dockerfile to create share directory
- [x] Updated deploy.sh to mount volume and set env vars
- [x] Preserved GA measurement ID in deploy script
- [x] Extended smoke tests for all new features
- [x] Created verification script
- [x] Documented deployment procedure
- [x] Documented troubleshooting steps
- [x] All CI checks passing
- [x] Hotfix compatibility verified

## Related Issues
- SNAP-BE-01: Share create 500 error → ✅ Fixed
- SNAP-BE-02: Persistent storage for shares → ✅ Fixed
- SNAP-BE-03: OG image URL in response → ✅ Fixed

## Ready to Merge
✅ All requirements met  
✅ All tests passing  
✅ CI green  
✅ Documentation complete  
✅ Backward compatible with hotfix
