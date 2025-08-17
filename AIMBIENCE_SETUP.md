# AIMbience Setup Guide

## Quick Fix for 404/500 Errors

The 404 and 500 errors you're experiencing are due to missing backend configuration. Here's how to fix them:

### 1. Set Environment Variables

Create a `.env` file in your Open WebUI directory with these variables:

```bash
# Enable AIMbience features
ENABLE_AIMBENCE=true

# AIMby API base URL (where your AIMby API is running)
AIMBENCE_API_BASE_URL=http://localhost:8000

# API key for AIMby API authentication (if required)
AIMBENCE_API_KEY=your_api_key_here

# Request timeout in seconds
AIMBENCE_TIMEOUT=30

# Batch size for document processing
AIMBENCE_BATCH_SIZE=10
```

### 2. Restart the Backend

After setting the environment variables, restart your Open WebUI backend:

```bash
# Stop the current backend (Ctrl+C)
# Then restart it
npm run dev
```

### 3. Test the Endpoints

The following endpoints should now work:

- **Configuration**: `GET /api/v1/auths/admin/config/aimbience`
- **Update Config**: `POST /api/v1/auths/admin/config/aimbience`
- **Proxy**: `GET /api/v1/auths/admin/aimbience/proxy/health`

### 4. Verify Frontend

- Go to Admin → Aimbience → Configuration
- Test the connection to AIMby API
- Save the configuration

## What Was Fixed

1. **Backend Routes**: Added AIMbience configuration and proxy endpoints
2. **Configuration**: Added AIMbience environment variables to Open WebUI config
3. **App State**: Initialized AIMbience config in the main application
4. **Environment**: Created example environment file for easy setup

## Troubleshooting

If you still get errors:

1. **Check environment variables**: Ensure `.env` file exists and variables are set
2. **Restart backend**: Environment variables require a restart
3. **Check logs**: Look for any Python errors in the backend console
4. **Verify AIMby API**: Ensure your AIMby API is running on the configured URL

## Next Steps

1. Set the environment variables
2. Restart the backend
3. Test the AIMbience admin settings
4. Configure the connection to your AIMby API
