# AIMbience Components Inventory

This document provides a comprehensive inventory of all AIMbience custom components, routes, APIs, and integration points in the Open-WebUI codebase. Use this document as a reference for future upgrades and maintenance.

**Last Updated**: 2025-01-XX (Open-WebUI v0.6.34)
**Target Version**: v0.6.36

---

## Table of Contents

1. [Overview](#overview)
2. [Frontend Components](#frontend-components)
3. [Frontend Routes/Pages](#frontend-routespages)
4. [Frontend APIs](#frontend-apis)
5. [Backend Routes](#backend-routes)
6. [Backend Configuration](#backend-configuration)
7. [Integration Points](#integration-points)
8. [Environment Variables](#environment-variables)
9. [Upgrade Procedures](#upgrade-procedures)
10. [Troubleshooting](#troubleshooting)

---

## Overview

AIMbience is a custom admin extension for Open-WebUI that provides:

- Configuration management for AIMby API integration
- Document ingestion and batch management
- Workflow synchronization
- Log management and viewing
- Package management
- Cypher query interface

All customizations are designed to integrate seamlessly with Open-WebUI's admin panel.

---

## Frontend Components

### Main Admin Component

**Location**: `src/lib/components/admin/Aimbience/Aimbience.svelte`

**Purpose**: Main container component for AIMbience admin section. Provides navigation and layout for all AIMbience features.

**Dependencies**: None

---

### Component Library

**Location**: `src/lib/components/admin/Aimbience/Components/`

#### Core Components

1. **AimbienceConfig.svelte**
   - Purpose: Configuration management UI for AIMbience settings
   - Features: API base URL, API key, timeout, batch size configuration
   - API Endpoints Used: `GET/POST /api/v1/auths/admin/config/aimbience`

2. **AimbienceTools.svelte**
   - Purpose: Batch management and file audit tools
   - Features: List batches, view batch details, file audit
   - API Endpoints Used: Proxy endpoints for batch and audit operations

3. **BatchDetailsModal.svelte**
   - Purpose: Modal dialog for displaying batch details
   - Features: Batch metadata, processing status, file counts
   - Dependencies: AimbienceTools

4. **DocumentIngestion.svelte**
   - Purpose: Document ingestion management interface
   - Features: Upload documents, view ingestion status
   - API Endpoints Used: Proxy endpoints for document operations

5. **WorkflowSync.svelte**
   - Purpose: Workflow synchronization settings and management
   - Features: Sync workflows, view sync status
   - API Endpoints Used: Proxy endpoints for workflow operations

#### Log Management Components

6. **LogManagement.svelte**
   - Purpose: Main log management interface
   - Features: List logs, view log structure, navigate log directories
   - API Endpoints Used: `getLogsViaProxy`, `getLogDirectoryStructureViaProxy`

7. **LogViewerHeader.svelte**
   - Purpose: Header component for log viewer
   - Features: File info, navigation controls
   - Dependencies: LogManagement

8. **LogViewerTabs.svelte**
   - Purpose: Tab navigation for different log views
   - Features: Raw, Timeline, Analysis, Tree views
   - Dependencies: LogManagement

9. **LogViewerError.svelte**
   - Purpose: Error display component for log viewer
   - Features: Error messages, retry functionality
   - Dependencies: LogManagement

10. **LogTree.svelte**
    - Purpose: Tree view of log structure
    - Features: Hierarchical navigation, expand/collapse
    - Dependencies: LogManagement

11. **LogTimeline.svelte**
    - Purpose: Timeline visualization of log entries
    - Features: Chronological display, filtering
    - Dependencies: LogManagement

12. **LogAnalysis.svelte**
    - Purpose: Log analysis and insights
    - Features: Error detection, pattern analysis
    - Dependencies: LogManagement

13. **LogRaw.svelte**
    - Purpose: Raw log content display
    - Features: Plain text view, search, copy
    - Dependencies: LogManagement

14. **LogFolderView.svelte**
    - Purpose: Folder/directory view of logs
    - Features: Directory navigation, file listing
    - Dependencies: LogManagement

15. **LogEntryDetails.svelte**
    - Purpose: Detailed view of individual log entries
    - Features: Entry metadata, content display
    - Dependencies: LogManagement

16. **GenericLogEntry.svelte**
    - Purpose: Generic log entry display component
    - Features: Reusable entry rendering
    - Dependencies: LogManagement

17. **KeyValueTable.svelte**
    - Purpose: Key-value pair display component
    - Features: Structured data display
    - Dependencies: Multiple components

#### Other Components

18. **PackageManager.svelte**
    - Purpose: Package management interface
    - Features: Install, upgrade, list packages
    - API Endpoints Used: Proxy endpoints for package operations

19. **CypherQuery.svelte**
    - Purpose: Cypher query interface for Neo4j
    - Features: Query editor, results display
    - API Endpoints Used: Proxy endpoints for Cypher operations

20. **CypherQuerySection.svelte**
    - Purpose: Section wrapper for Cypher queries
    - Features: Query management, history
    - Dependencies: CypherQuery

#### Test Files

**Location**: `src/lib/components/admin/Aimbience/Components/__tests__/`

- `CypherQuery.test.ts`
- `CypherQuerySection.test.ts`
- `LogTree.test.ts`
- `LogViewerError.test.ts`
- `LogViewerHeader.test.ts`
- `LogViewerTabs.test.ts`
- `LogManagement.test.ts`

---

## Frontend Routes/Pages

### Main Routes

**Location**: `src/routes/(app)/admin/aimbience/`

1. **+page.svelte** (Main AIMbience Page)
   - Route: `/admin/aimbience`
   - Purpose: Entry point, redirects to workflow-sync
   - Component: Uses `Aimbience.svelte`

2. **aimbience-config/+page.svelte**
   - Route: `/admin/aimbience/aimbience-config`
   - Purpose: Configuration page
   - Component: Uses `AimbienceConfig.svelte`

3. **aimbience-tools/+page.svelte**
   - Route: `/admin/aimbience/aimbience-tools`
   - Purpose: Tools and batch management page
   - Component: Uses `AimbienceTools.svelte`

4. **batch-details/+page.svelte**
   - Route: `/admin/aimbience/batch-details`
   - Purpose: Batch details display page
   - Component: Uses `BatchDetailsModal.svelte`

5. **workflow-sync/+page.svelte**
   - Route: `/admin/aimbience/workflow-sync`
   - Purpose: Workflow synchronization page
   - Component: Uses `WorkflowSync.svelte`

6. **log-management/+page.svelte**
   - Route: `/admin/aimbience/log-management`
   - Purpose: Log management page
   - Component: Uses `LogManagement.svelte`

7. **log-viewer/+page.svelte**
   - Route: `/admin/aimbience/log-viewer`
   - Purpose: Log viewer page
   - Component: Uses log viewer components

8. **package-manager/+page.svelte**
   - Route: `/admin/aimbience/package-manager`
   - Purpose: Package manager page
   - Component: Uses `PackageManager.svelte`

### Settings Integration

**Location**: `src/routes/(app)/admin/settings/workflow-sync/`

- **+page.svelte**
  - Route: `/admin/settings/workflow-sync`
  - Purpose: Workflow sync in settings section
  - Component: Uses `WorkflowSync.svelte`

### Admin Layout Integration

**Location**: `src/routes/(app)/admin/+layout.svelte`

**Integration Point**: Lines 97-102

```svelte
<a
    class="min-w-fit p-1.5 {$page.url.pathname.includes('/admin/aimbience')
        ? ''
        : 'text-gray-300 dark:text-gray-600 hover:text-gray-700 dark:hover:text-white'} transition"
    href="/admin/aimbience">{$i18n.t('Aimbience')}</a
>
```

**Purpose**: Adds "Aimbience" navigation link to admin panel header.

---

## Frontend APIs

### API Client

**Location**: `src/lib/apis/aimby/index.ts`

**Purpose**: TypeScript client for all AIMby API interactions through Open-WebUI proxy.

#### Exported Functions

1. **getBatchesViaProxy(token, count)**
   - Purpose: Fetch batch list from AIMby API
   - Endpoint: `GET /api/v1/auths/admin/aimbience/proxy/api/v1/audit/batches`
   - Returns: `BatchListResponse | null`

2. **getFileAuditViaProxy(token, filename)**
   - Purpose: Get file audit information
   - Endpoint: `GET /api/v1/auths/admin/aimbience/proxy/api/v1/audit/file/{filename}`
   - Returns: `FileAuditResponse | null`

3. **getBatchDetailsViaProxy(token, batchId)**
   - Purpose: Get detailed batch information
   - Endpoint: `GET /api/v1/auths/admin/aimbience/proxy/api/v1/audit/batch/{batchId}`
   - Returns: `BatchDetailsResponse | null`

4. **getLogsViaProxy(token, limit)**
   - Purpose: Get list of log files
   - Endpoint: `GET /api/v1/auths/admin/aimbience/proxy/api/v1/logs/`
   - Returns: `LogListResponse | null`

5. **getLogDirectoryStructureViaProxy(token)**
   - Purpose: Get log directory structure
   - Endpoint: `GET /api/v1/auths/admin/aimbience/proxy/api/v1/logs/structure`
   - Returns: `LogDirectoryStructure | null`

6. **getLogContentViaProxy(token, filename)**
   - Purpose: Get log file content
   - Endpoint: `GET /api/v1/auths/admin/aimbience/proxy/api/v1/logs/content?filename={filename}`
   - Returns: `LogContentResponse | null`

#### Type Definitions

- `BatchListItem`
- `BatchDetailsResponse`
- `FileAuditResponse`
- `LogFileInfo`
- `LogListResponse`
- `LogContentResponse`
- `LogDirectoryInfo`
- `LogDirectoryStructure`

#### Base URL

```typescript
const AIMBY_PROXY_BASE = '/api/v1/auths/admin/aimbience/proxy';
```

---

## Backend Routes

### Router File

**Location**: `backend/open_webui/routers/auths.py`

### AIMbience Configuration Endpoints

#### 1. Get AIMbience Configuration

**Endpoint**: `GET /api/v1/auths/admin/config/aimbience`

**Handler**: `get_aimbience_config(request, user)`

**Authentication**: Requires admin user (`get_admin_user`)

**Response Model**: `AimbienceConfig`

**Returns**:

```python
{
    "ENABLE_AIMBENCE": bool,
    "AIMBENCE_API_BASE_URL": str,
    "AIMBENCE_API_KEY": str,
    "AIMBENCE_TIMEOUT": int,
    "AIMBENCE_BATCH_SIZE": int
}
```

**Location**: Lines 1087-1095

---

#### 2. Update AIMbience Configuration

**Endpoint**: `POST /api/v1/auths/admin/config/aimbience`

**Handler**: `update_aimbience_config(request, form_data, user)`

**Authentication**: Requires admin user (`get_admin_user`)

**Request Model**: `AimbienceConfig`

**Updates**: App state configuration values

**Returns**: Updated configuration object

**Location**: Lines 1098-1114

---

#### 3. AIMbience Proxy Endpoint

**Endpoint**: `GET|POST|PUT|DELETE|PATCH /api/v1/auths/admin/aimbience/proxy/{path:path}`

**Handler**: `aimbience_proxy(request, path, user)`

**Authentication**: Requires admin user (`get_admin_user`)

**Purpose**: Proxies requests to AIMby API to avoid CORS issues

**Features**:

- Forwards all HTTP methods
- Preserves query parameters
- Adds authentication headers
- Handles request/response bodies
- Supports streaming responses

**Location**: Lines 1117-1262 (approximately)

**Key Implementation Details**:

- Uses `httpx.AsyncClient` for async HTTP requests
- Adds `Authorization: Bearer {api_key}` header when API key is present
- Excludes authentication for public endpoints: `health`, `docs`, `openapi.json`
- Handles both JSON and streaming responses
- Preserves response status codes and headers

---

### Data Models

**Location**: Lines 1079-1084

```python
class AimbienceConfig(BaseModel):
    ENABLE_AIMBENCE: bool = False
    AIMBENCE_API_BASE_URL: str = "http://localhost:8000"
    AIMBENCE_API_KEY: str = ""
    AIMBENCE_TIMEOUT: int = 30
    AIMBENCE_BATCH_SIZE: int = 10
```

---

## Backend Configuration

### Configuration File

**Location**: `backend/open_webui/config.py`

### AIMbience Configuration Variables

**Location**: Lines 3509-3537

```python
ENABLE_AIMBENCE = PersistentConfig(
    "ENABLE_AIMBENCE",
    "aimbience.enable",
    os.environ.get("ENABLE_AIMBENCE", "false").lower() == "true",
)

AIMBENCE_API_BASE_URL = PersistentConfig(
    "AIMBENCE_API_BASE_URL",
    "aimbience.api.base_url",
    os.environ.get("AIMBENCE_API_BASE_URL", "http://localhost:8000"),
)

AIMBENCE_API_KEY = PersistentConfig(
    "AIMBENCE_API_KEY",
    "aimbience.api.key",
    os.environ.get("AIMBENCE_API_KEY", ""),
)

AIMBENCE_TIMEOUT = PersistentConfig(
    "AIMBENCE_TIMEOUT",
    "aimbience.api.timeout",
    int(os.environ.get("AIMBENCE_TIMEOUT", "30")),
)

AIMBENCE_BATCH_SIZE = PersistentConfig(
    "AIMBENCE_BATCH_SIZE",
    "aimbience.api.batch_size",
    int(os.environ.get("AIMBENCE_BATCH_SIZE", "10")),
)
```

**Type**: All use `PersistentConfig` for database-backed configuration

**Storage**: Stored in Open-WebUI's persistent configuration database

---

### App State Initialization

**Location**: `backend/open_webui/main.py`

**Import Section**: Lines 382-386

```python
ENABLE_AIMBENCE,
AIMBENCE_API_BASE_URL,
AIMBENCE_API_KEY,
AIMBENCE_TIMEOUT,
AIMBENCE_BATCH_SIZE,
```

**App State Assignment**: Lines 787-791

```python
app.state.config.ENABLE_AIMBENCE = ENABLE_AIMBENCE
app.state.config.AIMBENCE_API_BASE_URL = AIMBENCE_API_BASE_URL
app.state.config.AIMBENCE_API_KEY = AIMBENCE_API_KEY
app.state.config.AIMBENCE_TIMEOUT = AIMBENCE_TIMEOUT
app.state.config.AIMBENCE_BATCH_SIZE = AIMBENCE_BATCH_SIZE
```

**Purpose**: Initializes AIMbience configuration in FastAPI app state for use by routes

---

## Integration Points

### 1. Admin Layout Navigation

**File**: `src/routes/(app)/admin/+layout.svelte`

**Integration**: Adds "Aimbience" link to admin navigation tabs

**Line Numbers**: 97-102

**Critical**: This integration point must be preserved during upgrades

---

### 2. Router Registration

**File**: `backend/open_webui/main.py`

**Integration**: AIMbience routes are part of the `auths` router which is included in the main app

**Note**: No explicit registration needed - routes are auto-discovered through router inclusion

---

### 3. Configuration System

**Integration**: Uses Open-WebUI's `PersistentConfig` system for database-backed configuration

**Benefits**:

- Configuration persists across restarts
- Can be updated via API without code changes
- Environment variable fallback support

---

## Environment Variables

### Required Variables

These can be set via environment variables or configured through the admin UI:

1. **ENABLE_AIMBENCE**
   - Type: Boolean (string: "true"/"false")
   - Default: `false`
   - Purpose: Enable/disable AIMbience features

2. **AIMBENCE_API_BASE_URL**
   - Type: String (URL)
   - Default: `http://localhost:8000`
   - Purpose: Base URL for AIMby API

3. **AIMBENCE_API_KEY**
   - Type: String
   - Default: `""` (empty)
   - Purpose: API key for AIMby API authentication

4. **AIMBENCE_TIMEOUT**
   - Type: Integer (seconds)
   - Default: `30`
   - Purpose: Request timeout for AIMby API calls

5. **AIMBENCE_BATCH_SIZE**
   - Type: Integer
   - Default: `10`
   - Purpose: Batch size for document processing

### Docker Compose Configuration

**Location**: `services/docker-compose.yaml`

**Example**:

```yaml
environment:
  ENABLE_AIMBENCE: "true"
  AIMBENCE_API_BASE_URL: "http://aimby-api:8000"
  AIMBENCE_API_KEY: "your-api-key-here"
  AIMBENCE_TIMEOUT: "30"
  AIMBENCE_BATCH_SIZE: "10"
```

---

## Upgrade Procedures

### Pre-Upgrade Checklist

1. [ ] Review this inventory document
2. [ ] Create backup branch: `backup/aimbience-features-v{current-version}`
3. [ ] Verify all AIMbience features working in current version
4. [ ] Review upstream changelog for breaking changes
5. [ ] Check for dependency updates that might affect components

### Upgrade Steps

1. **Fetch Upstream**

   ```bash
   cd services/open-webui
   git fetch upstream
   ```

2. **Merge Upstream Version**

   ```bash
   git merge v0.6.36  # or target version tag
   ```

3. **Resolve Merge Conflicts**
   - Priority: Preserve all AIMbience customizations
   - Check these files first:
     - `src/routes/(app)/admin/+layout.svelte` (navigation link)
     - `backend/open_webui/routers/auths.py` (API endpoints)
     - `backend/open_webui/config.py` (configuration)
     - `backend/open_webui/main.py` (app state init)

4. **Verify Files Present**

   ```bash
   # Check frontend components
   ls -la src/lib/components/admin/Aimbience/
   ls -la src/routes/\(app\)/admin/aimbience/
   
   # Check backend routes
   grep -n "aimbience" backend/open_webui/routers/auths.py
   grep -n "AIMBENCE" backend/open_webui/config.py
   grep -n "AIMBENCE" backend/open_webui/main.py
   ```

5. **Reapply Features if Needed**
   - If files are missing, use backup branch:

   ```bash
   git show backup/aimbience-features-v0.6.34:path/to/file > path/to/file
   ```

6. **Test Build**

   ```bash
   npm run build
   ```

7. **Test Backend**

   ```bash
   # Start backend and check for errors
   python -m open_webui.main
   ```

8. **Test Endpoints**

   ```bash
   # Test configuration endpoint
   curl http://localhost:8080/api/v1/auths/admin/config/aimbience
   
   # Test proxy endpoint
   curl http://localhost:8080/api/v1/auths/admin/aimbience/proxy/health
   ```

### Post-Upgrade Verification

1. **Frontend Tests**
   - [ ] Admin panel loads
   - [ ] AIMbience link appears in navigation
   - [ ] All AIMbience pages load
   - [ ] Components render correctly
   - [ ] No console errors

2. **Backend Tests**
   - [ ] Backend starts without errors
   - [ ] Configuration endpoints respond
   - [ ] Proxy endpoints work
   - [ ] No import errors

3. **Integration Tests**
   - [ ] Configuration can be saved/loaded
   - [ ] Proxy requests succeed
   - [ ] All features functional

---

## Troubleshooting

### Common Issues

#### 1. AIMbience Link Missing from Admin Navigation

**Symptom**: No "Aimbience" link in admin panel

**Solution**: Check `src/routes/(app)/admin/+layout.svelte` lines 97-102

**Fix**:

```svelte
<a
    class="min-w-fit p-1.5 {$page.url.pathname.includes('/admin/aimbience')
        ? ''
        : 'text-gray-300 dark:text-gray-600 hover:text-gray-700 dark:hover:text-white'} transition"
    href="/admin/aimbience">{$i18n.t('Aimbience')}</a
>
```

---

#### 2. 404 Errors on AIMbience Endpoints

**Symptom**: API endpoints return 404

**Possible Causes**:

- Backend routes not present in `auths.py`
- Router not properly included
- Backend not restarted after changes

**Solution**:

1. Verify routes exist in `backend/open_webui/routers/auths.py`
2. Restart backend
3. Check backend logs for import errors

---

#### 3. Configuration Not Saving

**Symptom**: Configuration changes don't persist

**Possible Causes**:

- App state not initialized
- PersistentConfig not working
- Database connection issues

**Solution**:

1. Check `main.py` app state initialization
2. Verify database connection
3. Check backend logs for errors

---

#### 4. Proxy Endpoint Returns 500

**Symptom**: Proxy requests fail with 500 error

**Possible Causes**:

- AIMby API not accessible
- Invalid API key
- Network connectivity issues

**Solution**:

1. Check AIMbience configuration (API base URL, key)
2. Test AIMby API directly
3. Check backend logs for detailed error messages
4. Verify network connectivity

---

#### 5. Frontend Build Fails

**Symptom**: `npm run build` fails

**Possible Causes**:

- Missing component files
- Import errors
- TypeScript errors
- Dependency issues

**Solution**:

1. Check for missing files in `src/lib/components/admin/Aimbience/`
2. Verify all imports are correct
3. Run `npm install` to update dependencies
4. Check TypeScript errors: `npm run check`

---

#### 6. Components Not Rendering

**Symptom**: Pages load but components are blank

**Possible Causes**:

- API client not working
- Missing API endpoints
- CORS issues
- Authentication failures

**Solution**:

1. Check browser console for errors
2. Verify API endpoints are accessible
3. Check network tab for failed requests
4. Verify authentication token is valid

---

### Debugging Tips

1. **Enable Backend Logging**
   - Check backend console output
   - Look for proxy request logs (they include target URLs)

2. **Check Browser Console**
   - Look for JavaScript errors
   - Check network requests
   - Verify API responses

3. **Test Endpoints Directly**

   ```bash
   # Get configuration
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost:8080/api/v1/auths/admin/config/aimbience
   
   # Test proxy
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        http://localhost:8080/api/v1/auths/admin/aimbience/proxy/health
   ```

4. **Verify File Presence**

   ```bash
   # List all AIMbience files
   find services/open-webui -type f -iname "*aimbience*" -o -iname "*aimbence*"
   ```

---

## File Checklist for Upgrades

Use this checklist to verify all files are present after an upgrade:

### Frontend Files

- [ ] `src/lib/components/admin/Aimbience/Aimbience.svelte`
- [ ] `src/lib/components/admin/Aimbience/Components/AimbienceConfig.svelte`
- [ ] `src/lib/components/admin/Aimbience/Components/AimbienceTools.svelte`
- [ ] `src/lib/components/admin/Aimbience/Components/BatchDetailsModal.svelte`
- [ ] `src/lib/components/admin/Aimbience/Components/DocumentIngestion.svelte`
- [ ] `src/lib/components/admin/Aimbience/Components/WorkflowSync.svelte`
- [ ] `src/lib/components/admin/Aimbience/Components/LogManagement.svelte`
- [ ] `src/lib/components/admin/Aimbience/Components/PackageManager.svelte`
- [ ] `src/lib/components/admin/Aimbience/Components/CypherQuery.svelte`
- [ ] `src/lib/components/admin/Aimbience/Components/CypherQuerySection.svelte`
- [ ] `src/lib/components/admin/Aimbience/Components/*.svelte` (all log viewer components)
- [ ] `src/routes/(app)/admin/aimbience/+page.svelte`
- [ ] `src/routes/(app)/admin/aimbience/aimbience-config/+page.svelte`
- [ ] `src/routes/(app)/admin/aimbience/aimbience-tools/+page.svelte`
- [ ] `src/routes/(app)/admin/aimbience/batch-details/+page.svelte`
- [ ] `src/routes/(app)/admin/aimbience/workflow-sync/+page.svelte`
- [ ] `src/routes/(app)/admin/aimbience/log-management/+page.svelte`
- [ ] `src/routes/(app)/admin/aimbience/log-viewer/+page.svelte`
- [ ] `src/routes/(app)/admin/aimbience/package-manager/+page.svelte`
- [ ] `src/routes/(app)/admin/settings/workflow-sync/+page.svelte`
- [ ] `src/lib/apis/aimby/index.ts`
- [ ] `src/routes/(app)/admin/+layout.svelte` (with AIMbience link)

### Backend Files

- [ ] `backend/open_webui/routers/auths.py` (with AIMbience endpoints)
- [ ] `backend/open_webui/config.py` (with AIMBENCE config variables)
- [ ] `backend/open_webui/main.py` (with AIMBENCE app state initialization)

---

## Version History

- **v0.6.34**: Initial comprehensive inventory
- **v0.6.36**: Updated for upgrade (target)

---

## Notes

- All AIMbience features require admin authentication
- Proxy endpoint handles CORS automatically
- Configuration is stored in database via PersistentConfig
- Environment variables provide defaults but can be overridden via UI
- All components use TypeScript for type safety
- Test files are included for key components

---

## Support

For issues or questions:

1. Check this inventory document first
2. Review troubleshooting section
3. Check backend and frontend logs
4. Verify all files are present using checklist
5. Test endpoints directly using curl/Postman

---

**Document Maintained By**: Development Team  
**Last Review Date**: 2025-01-XX  
**Next Review**: After v0.6.36 upgrade completion
