# Open WebUI v0.6.36 - Deployment Notes

## Version Information

- **Version**: 0.6.36
- **Repository**: `Evolutioned-Organisation/open-webui`
- **Status**: ✅ Production Ready

## Build Fixes Applied

### Issue 1: npm ci --force Invalid Flag

**Problem**: `npm ci --force` is not a valid command. The `--force` flag is only available for `npm install`, not `npm ci`.

**Fix**: Changed `RUN npm ci --force` to `RUN npm ci --legacy-peer-deps` in Dockerfile (line 41).

**Commit**: `662ac2e5e` - "fix: Add --legacy-peer-deps to npm ci for peer dependency conflicts"

**Rationale**: `npm ci` fails on peer dependency conflicts. Using `--legacy-peer-deps` allows the build to proceed despite:
- `@melt-ui/svelte@0.76.2` requires `svelte@">=3 <5"` but project has `svelte@5.43.5`
- `@tiptap/extension-bubble-menu@2.27.1` requires `@tiptap/core@"^2.7.0"` but project has `@tiptap/core@3.10.4`

## Azure Container App Deployment

### Required Environment Variable

**Variable**: `FRONTEND_BUILD_DIR`  
**Value**: `/app/build`  
**Purpose**: Explicitly sets the path where the backend expects to find frontend build files.

### Setting the Environment Variable

```bash
az containerapp update --name open-webui --resource-group aimbient-rg-dta2 \
  --set-env-vars "FRONTEND_BUILD_DIR=/app/build"
```

### Verification

After setting the environment variable:
1. Wait 1-2 minutes for container restart
2. Check logs: `az containerapp logs show --name open-webui --resource-group aimbient-rg-dta2 --tail 100`
3. Test application at: `https://dta2.aimbience.ai`
4. Verify no 404 errors for JavaScript files in browser console

## Build Process

### Local Build

```bash
cd services
docker-compose build open-webui
```

### GitHub Actions

The build workflow automatically:
1. Checks out the `open-webui` repository
2. Builds the Docker image with `npm ci --legacy-peer-deps`
3. Pushes to Azure Container Registry
4. Tags with CalVer version: `v2025.11.27-beta-branch.main`

### Dockerfile Key Changes

```dockerfile
# Line 41 - Build stage
RUN npm ci --legacy-peer-deps

# Line 167 - Copy frontend build
COPY --chown=$UID:$GID --from=build /app/build /app/build
```

## Troubleshooting

### Build Fails with npm Errors

- **Symptom**: `npm ci` fails with peer dependency conflicts
- **Solution**: Ensure Dockerfile uses `npm ci --legacy-peer-deps`

### Frontend Files Return 404

- **Symptom**: JavaScript files like `/_app/immutable/entry/*.js` return 404
- **Solution**: Set `FRONTEND_BUILD_DIR=/app/build` environment variable in Azure Container App
- **Check**: Verify build files exist at `/app/build/_app/immutable/` in container

### Container Won't Start

- Check logs: `az containerapp logs show --name open-webui --resource-group aimbient-rg-dta2`
- Verify environment variables are set correctly
- Ensure database connection is configured

## Related Files

- `Dockerfile` - Main build configuration
- `backend/open_webui/env.py` - Environment configuration (line 258: `FRONTEND_BUILD_DIR`)
- `backend/open_webui/main.py` - Static file serving (line 2217-2227)
- `.github/workflows/build-open-webui.yml` - CI/CD workflow

## Links

- **Repository**: https://github.com/Evolutioned-Organisation/open-webui
- **Latest Commit**: https://github.com/Evolutioned-Organisation/open-webui/commit/662ac2e5e
- **Azure Container App**: `open-webui` in resource group `aimbient-rg-dta2`

