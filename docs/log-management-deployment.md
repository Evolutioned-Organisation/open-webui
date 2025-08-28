# Log Management Admin Interface - Deployment and Maintenance Guide

## Overview

This document provides comprehensive instructions for deploying and maintaining the Log Management Admin Interface feature in Open-WebUI. The feature allows administrators to view and manage system log files from the AIMBY-API service through a user-friendly web interface.

## Architecture Overview

The Log Management feature consists of:

1. **Frontend Components**: Svelte components for the user interface
2. **API Integration**: TypeScript functions for communicating with AIMBY-API
3. **Routing**: SvelteKit routes for navigation
4. **Backend Proxy**: Existing Open-WebUI proxy for CORS handling

## Branch Management Strategy

### Feature Branch Structure

The Log Management feature is implemented in a dedicated feature branch to facilitate easy maintenance during upstream Open-WebUI updates.

```bash
# Feature branch naming convention
feature/log-management-admin-interface

# Based on main development branch
git checkout main
git pull origin main
git checkout -b feature/log-management-admin-interface
```

### Upstream Update Handling

When upstream Open-WebUI updates are available:

1. **Backup Current Changes**:
   ```bash
   git checkout feature/log-management-admin-interface
   git branch backup/log-management-$(date +%Y%m%d)
   ```

2. **Update Main Branch**:
   ```bash
   git checkout main
   git pull upstream main
   git push origin main
   ```

3. **Rebase Feature Branch**:
   ```bash
   git checkout feature/log-management-admin-interface
   git rebase main
   ```

4. **Resolve Conflicts** (if any):
   - Review conflicting files
   - Maintain log management functionality
   - Test thoroughly after resolution

5. **Force Push Updated Branch**:
   ```bash
   git push origin feature/log-management-admin-interface --force-with-lease
   ```

### Merge Strategy

Use merge commits to preserve feature history:

```bash
git checkout main
git merge --no-ff feature/log-management-admin-interface
git push origin main
```

## File Structure and Components

### Frontend Components

```
services/open-webui/src/lib/components/admin/Aimbience/Components/
├── LogManagement.svelte                 # Main log management interface
└── (existing components...)

services/open-webui/src/routes/(app)/admin/aimbience/
├── log-viewer/
│   └── +page.svelte                     # Log viewer page
└── (existing routes...)
```

### API Integration

```
services/open-webui/src/lib/apis/aimby/
├── index.ts                             # API functions (extended)
└── index.test.ts                        # API tests
```

### Utilities

```
services/open-webui/src/lib/utils/
├── validation.ts                        # Input validation utilities
├── errorHandling.ts                     # Error handling utilities
└── (tests for above...)
```

### Modified Files

```
services/open-webui/src/lib/components/admin/Aimbience/
└── Aimbience.svelte                     # Added log management tab
```

## Configuration Requirements

### AIMBY-API Configuration

The Log Management feature requires AIMBY-API to be properly configured with log endpoints:

1. **Environment Variables**:
   ```env
   AIMBENCE_API_BASE_URL=https://your-aimby-api-url
   ENABLE_AIMBENCE=true
   ```

2. **API Endpoints Required**:
   - `GET /api/v1/logs/` - List log files
   - `GET /api/v1/logs/{filename}` - Get log file content

### Open-WebUI Configuration

1. **Backend Proxy**: Uses existing `/api/v1/auths/admin/aimbience/proxy/{path:path}` endpoint
2. **Authentication**: Leverages existing admin authentication
3. **CORS**: Handled by existing proxy implementation

## Deployment Process

### Development Environment

1. **Install Dependencies**:
   ```bash
   cd services/open-webui
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```

3. **Access Feature**:
   - Navigate to `/admin/aimbience/log-management`
   - Ensure AIMBY-API is running and configured

### Production Deployment

1. **Build Application**:
   ```bash
   cd services/open-webui
   npm run build
   ```

2. **Deploy with Docker**:
   ```bash
   # Use existing Open-WebUI Docker deployment process
   docker build -t open-webui:log-management .
   docker run -d --name open-webui open-webui:log-management
   ```

3. **Verify Deployment**:
   - Check log management tab appears in admin interface
   - Test log file listing and viewing functionality
   - Verify error handling and user feedback

## Testing Strategy

### Unit Tests

Run component and utility tests:

```bash
cd services/open-webui
npm run test:unit
```

### Integration Tests

Run integration tests for log management workflow:

```bash
cd services/open-webui
npm run test:integration
```

### Manual Testing Checklist

- [ ] Log management tab appears in aimbience admin interface
- [ ] Log file list loads correctly
- [ ] Search functionality works
- [ ] Sorting by filename, size, and date works
- [ ] Pagination works with large log lists
- [ ] Log viewer opens and displays content correctly
- [ ] JSON syntax highlighting works
- [ ] Copy to clipboard functionality works
- [ ] Error handling displays appropriate messages
- [ ] Responsive design works on mobile devices
- [ ] Accessibility features work with screen readers

## Maintenance Procedures

### Regular Maintenance

1. **Monitor Error Logs**:
   - Check browser console for JavaScript errors
   - Monitor server logs for API proxy errors
   - Review AIMBY-API logs for endpoint issues

2. **Performance Monitoring**:
   - Monitor log file loading times
   - Check memory usage with large log files
   - Verify pagination performance

3. **Security Updates**:
   - Keep dependencies updated
   - Review input validation regularly
   - Monitor for XSS vulnerabilities in log content display

### Troubleshooting Common Issues

#### Log Files Not Loading

1. **Check AIMBY-API Connection**:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
        "$AIMBENCE_API_BASE_URL/api/v1/logs/"
   ```

2. **Verify Proxy Configuration**:
   - Check Open-WebUI backend proxy settings
   - Verify authentication token passing

3. **Check Browser Network Tab**:
   - Look for failed API requests
   - Check response status codes and error messages

#### Log Content Not Displaying

1. **Check File Permissions**:
   - Verify AIMBY-API can read log files
   - Check file system permissions

2. **Verify Content Type Handling**:
   - Check if log content is valid JSON
   - Verify content sanitization is working

3. **Check Browser Console**:
   - Look for JavaScript errors
   - Verify syntax highlighting is loading

#### Performance Issues

1. **Large Log Files**:
   - Implement content streaming if needed
   - Add file size warnings
   - Consider pagination for log content

2. **Memory Usage**:
   - Monitor browser memory usage
   - Implement content cleanup on navigation

### Updating Dependencies

1. **Frontend Dependencies**:
   ```bash
   cd services/open-webui
   npm audit
   npm update
   ```

2. **Test After Updates**:
   - Run full test suite
   - Perform manual testing
   - Check for breaking changes

## Code Comments and Documentation

### Component Documentation

Each component includes comprehensive JSDoc comments:

```typescript
/**
 * LogManagement Component
 * 
 * Provides interface for viewing and managing system log files
 * from AIMBY-API service.
 * 
 * Features:
 * - Log file listing with search and sort
 * - Pagination for large log lists
 * - Navigation to log viewer
 * - Error handling and retry mechanisms
 * 
 * @component
 */
```

### API Function Documentation

```typescript
/**
 * Retrieves log files list from AIMBY-API via proxy
 * 
 * @param token - Authentication token
 * @param count - Number of log files to retrieve (default: 10)
 * @returns Promise<LogFileInfo[]> - Array of log file information
 * @throws Error when API request fails
 */
export async function getLogsViaProxy(token: string, count: number = 10): Promise<LogFileInfo[]>
```

### Utility Function Documentation

```typescript
/**
 * Validates filename to prevent path traversal attacks
 * 
 * @param filename - Filename to validate
 * @returns boolean - True if filename is safe
 */
export function validateFilename(filename: string): boolean
```

## Security Considerations

### Input Validation

1. **Filename Validation**:
   - Prevents path traversal attacks
   - Validates against allowed characters
   - Limits filename length

2. **Search Query Validation**:
   - Sanitizes search input
   - Prevents XSS attacks
   - Limits query length

3. **Content Sanitization**:
   - Sanitizes log content for display
   - Prevents script injection
   - Handles special characters safely

### Authentication and Authorization

1. **Admin Access Control**:
   - Leverages existing admin authentication
   - Requires admin role for access
   - Session management handled by Open-WebUI

2. **API Security**:
   - Uses existing proxy authentication
   - Token validation on each request
   - CORS protection via proxy

## Monitoring and Logging

### Application Metrics

Monitor the following metrics:

1. **Usage Metrics**:
   - Number of log management page visits
   - Log file view frequency
   - Search query patterns

2. **Performance Metrics**:
   - Log file loading times
   - API response times
   - Error rates

3. **Error Tracking**:
   - JavaScript errors in browser
   - API proxy errors
   - AIMBY-API connection failures

### Log Monitoring

1. **Application Logs**:
   ```bash
   # Monitor Open-WebUI logs
   docker logs -f open-webui
   
   # Monitor AIMBY-API logs
   docker logs -f aimby-api
   ```

2. **Browser Console Monitoring**:
   - Set up error tracking (e.g., Sentry)
   - Monitor console errors and warnings
   - Track user interaction errors

## Backup and Recovery

### Configuration Backup

1. **Environment Variables**:
   ```bash
   # Backup environment configuration
   cp .env .env.backup.$(date +%Y%m%d)
   ```

2. **Code Backup**:
   ```bash
   # Create feature branch backup
   git branch backup/log-management-$(date +%Y%m%d)
   git push origin backup/log-management-$(date +%Y%m%d)
   ```

### Recovery Procedures

1. **Rollback Feature**:
   ```bash
   # Disable log management tab
   git checkout main
   git revert <log-management-merge-commit>
   ```

2. **Restore from Backup**:
   ```bash
   # Restore from backup branch
   git checkout backup/log-management-YYYYMMDD
   git checkout -b feature/log-management-restored
   ```

## Support and Contact Information

### Development Team Contacts

- **Feature Owner**: [Team/Individual responsible]
- **Technical Lead**: [Technical contact]
- **DevOps Support**: [Infrastructure contact]

### Documentation Updates

This documentation should be updated when:

- New features are added to log management
- Deployment procedures change
- Security requirements are updated
- Performance optimizations are implemented

### Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2024-XX-XX | Initial implementation | [Author] |

---

**Note**: This documentation should be kept up-to-date with any changes to the log management feature implementation or deployment procedures.