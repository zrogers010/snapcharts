# SNAP-BE-01/02/03: Share Persistence Fix - Deploy Notes

## Overview
Fixed the `POST /api/charts/share` 500 error by making share storage configurable and mounting a persistent volume in Docker production deployment.

## Root Cause
- Share storage used `process.cwd()/.snapcharts-shares`
- Docker container ran as user `nextjs` (UID 1001) with no writable volume
- `ensureStoreDir()` silently swallowed mkdir/write errors
- Result: 500 error on share creation

## Changes Implemented

### Code Changes
1. **Configurable storage directory** (`lib/chartShareStore.ts`)
   - New env var: `SNAP_SHARE_DIR`
   - Defaults: `/app/data/shares` (Docker) or `.snapcharts-shares` (local)
   - Hardened error handling: throws clear errors instead of silent failures

2. **Enhanced API response** (`app/api/charts/share/route.ts`)
   - Added `image_url`: absolute URL to image endpoint
   - Added `noindex: true` flag
   - Response format:
     ```json
     {
       "id": "string",
       "url": "https://domain.com/chart/{id}",
       "image_url": "https://domain.com/api/charts/share/{id}/image",
       "noindex": true
     }
     ```

3. **SEO: Noindex meta tags** (`app/chart/[symbol]/page.tsx`)
   - Added `robots: { index: false, follow: false }` to share pages
   - Prevents indexing of ephemeral snapshots
   - Preserves og:image for social unfurling

4. **Docker volume support** (`Dockerfile`)
   - Creates `/app/data/shares` with proper ownership (1001:1001)
   - Copies public assets for standalone mode

5. **Deploy automation** (`scripts/deploy.sh`)
   - Creates host directory: `$APP_DIR/data/shares`
   - Sets ownership: `chown 1001:1001`
   - Mounts volume: `-v ${share_dir}:/app/data/shares`
   - Passes env: `-e SNAP_SHARE_DIR=/app/data/shares`
   - Preserves GA measurement ID from `.env.production`

6. **Extended smoke tests** (`scripts/smoke-routes.mjs`)
   - Verifies `image_url` and `noindex` in create response
   - Verifies robots noindex meta tag on share pages
   - Verifies og:image meta tag on share pages

### Test Results
All smoke tests pass:
```bash
npm run smoke:routes
# ✓ Share creation returns id, url, image_url, noindex
# ✓ Image endpoint returns 200 image/png
# ✓ Share page has robots noindex meta tag
# ✓ Share page has og:image meta tag
```

## Deployment Instructions

### 1. Pull Latest Code
```bash
cd /path/to/snapcharts
git checkout main
git pull origin main
```

### 2. Run Deploy Script
```bash
cd scripts
./deploy.sh
```

The script automatically:
- Creates `$APP_DIR/data/shares` directory
- Sets ownership to UID 1001 (nextjs user)
- Mounts persistent volume into container
- Passes `SNAP_SHARE_DIR=/app/data/shares`
- Preserves `NEXT_PUBLIC_GA_MEASUREMENT_ID` from `.env.production`

### 3. Verify Deployment

#### Create a share:
```bash
curl -X POST https://snapcharts.com/api/charts/share \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "range": "1y",
    "imageData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+yXJkAAAAASUVORK5CYII="
  }'
```

**Expected response (200/201):**
```json
{
  "id": "lm5z8k9x_abc123",
  "url": "https://snapcharts.com/chart/lm5z8k9x_abc123",
  "image_url": "https://snapcharts.com/api/charts/share/lm5z8k9x_abc123/image",
  "noindex": true
}
```

#### Verify image retrieval:
```bash
# Use the ID from the create response
curl -I https://snapcharts.com/api/charts/share/YOUR_SHARE_ID/image
```

**Expected:**
```
HTTP/1.1 200 OK
Content-Type: image/png
Content-Length: ...
```

#### Verify page metadata:
```bash
curl https://snapcharts.com/chart/YOUR_SHARE_ID | grep -E '(robots|og:image)'
```

**Expected output:**
```html
<meta name="robots" content="noindex,nofollow"/>
<meta property="og:image" content="https://snapcharts.com/api/charts/share/.../image"/>
```

## Architecture Notes

### Storage Model
- **Location**: Host filesystem at `$APP_DIR/data/shares`
- **Format**: JSON files named `{id}.json`
- **TTL**: 14 days (auto-cleanup on next write)
- **Limit**: 500 entries max (LRU eviction)
- **Size**: Max 2.5MB per image (base64)

### Directory Structure
```
Host:                     Container:
$APP_DIR/                 /app/
├── data/                 ├── data/
│   └── shares/           │   └── shares/  (mounted volume)
│       ├── id1.json      │       ├── id1.json
│       └── id2.json      │       └── id2.json
└── .env.production       ├── .next/
                          └── server.js
```

### Volume Ownership
- **UID/GID**: 1001:1001 (nextjs:nodejs)
- **Permissions**: Standard file/dir permissions
- **Mount**: `-v ${share_dir}:/app/data/shares`

## Troubleshooting

### Share creation still returns 500
1. Check volume mount:
   ```bash
   docker inspect snapcharts | grep -A5 Mounts
   ```
   Should show: `$APP_DIR/data/shares -> /app/data/shares`

2. Check directory ownership on host:
   ```bash
   ls -ld $APP_DIR/data/shares
   # Should show: drwxr-xr-x ... 1001 1001 ... /path/to/data/shares
   ```

3. Check environment variable inside container:
   ```bash
   docker exec snapcharts env | grep SNAP_SHARE_DIR
   # Should show: SNAP_SHARE_DIR=/app/data/shares
   ```

4. Check container logs:
   ```bash
   docker logs snapcharts --tail 50
   ```

### Permissions error
If you see "EACCES: permission denied" in logs:
```bash
sudo chown -R 1001:1001 $APP_DIR/data/shares
```

### Volume not persisting
Ensure the host directory exists before `docker run`:
```bash
mkdir -p $APP_DIR/data/shares
chown -R 1001:1001 $APP_DIR/data/shares
```

## Rollback Procedure
If issues arise:
```bash
# Stop container
docker rm -f snapcharts

# Redeploy previous working image
docker run -d \
  --name snapcharts \
  --restart unless-stopped \
  -p 80:3000 \
  -e NODE_ENV=production \
  snapcharts:PREVIOUS_COMMIT_SHA
```

## Out of Scope (P0)
Per requirements, these remain future work:
- Parallel `/s/{id}` API stack (using existing `/chart/{id}` for P0)
- S3 or cloud storage (local volume sufficient)
- TV capture drawings integration
- Indexed gallery/discovery
- User accounts/authentication

## Related Issues
- Fixes SNAP-BE-01: Share create 500 error
- Fixes SNAP-BE-02: Persistent storage for shares
- Fixes SNAP-BE-03: OG image URL in response

## Pull Request
https://github.com/zrogers010/snapcharts/pull/9

**Status**: ✅ CI passing
