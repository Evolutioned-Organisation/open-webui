# Log Management Troubleshooting Guide

## Common Issues and Solutions

### 1. Log Management Tab Not Visible

**Symptoms:**
- Log Management tab doesn't appear in aimbience admin interface
- Navigation to `/admin/aimbience/log-management` shows 404 error

**Possible Causes:**
- Feature branch not properly merged
- Component import missing
- Route file not created

**Solutions:**

1. **Check Component Import:**
   ```typescript
   // In services/open-webui/src/lib/components/admin/Aimbience/Aimbience.svelte
   import LogManagement from './Components/LogManagement.svelte';
   ```

2. **Verify Route File Exists:**
   ```bash
   ls -la services/open-webui/src/routes/\(app\)/admin/aimbience/log-management/
   ```

3. **Check Tab Configuration:**
   ```typescript
   // Ensure log-management is in the tab list
   selectedTab = [
     'aimbience-config',
     'workflow-sync', 
     'aimbience-tools',
     'package-manager',
     'log-management'  // <- Should be present
   ].includes(tabFromPath) ? tabFromPath : 'workflow-sync';
   ```

### 2. "Aimbience integration is not enabled" Message

**Symptoms:**
- Log management page shows integration disabled message
- Cannot access log files despite AIMBY-API being available

**Possible Causes:**
- ENABLE_AIMBENCE environment variable not set
- Aimbience configuration not saved
- Backend configuration not loaded

**Solutions:**

1. **Check Environment Variables:**
   ```bash
   # In Open-WebUI environment
   echo $ENABLE_AIMBENCE  # Should be 'true'
   echo $AIMBENCE_API_BASE_URL  # Should be AIMBY-API URL
   ```

2. **Verify Aimbience Config:**
   - Navigate to Admin → Aimbience → Aimbience Config
   - Ensure "Enable Aimbience Integration" is checked
   - Verify API Base URL is correct
   - Click "Save" to persist settings

3. **Check Backend Configuration:**
   ```bash
   # Check Open-WebUI logs for configuration loading
   docker logs open-webui | grep -i aimbience
   ```

### 3. Log Files Not Loading

**Symptoms:**
- Empty log list or "No log files found" message
- Loading spinner appears but never completes
- Error message about failed API request

**Possible Causes:**
- AIMBY-API not running or unreachable
- Authentication token issues
- Proxy configuration problems
- AIMBY-API log endpoints not available

**Solutions:**

1. **Check AIMBY-API Status:**
   ```bash
   # Test direct API access
   curl -H "Authorization: Bearer $TOKEN" \
        "$AIMBENCE_API_BASE_URL/api/v1/logs/"
   ```

2. **Verify Proxy Configuration:**
   ```bash
   # Check Open-WebUI proxy logs
   docker logs open-webui | grep -i proxy
   ```

3. **Test Authentication:**
   ```bash
   # Check if token is valid
   curl -H "Authorization: Bearer $TOKEN" \
        "$AIMBENCE_API_BASE_URL/api/v1/health"
   ```

4. **Check Network Connectivity:**
   ```bash
   # From Open-WebUI container
   docker exec open-webui ping aimby-api-host
   ```

### 4. Log Content Not Displaying

**Symptoms:**
- Log viewer page loads but shows "No content available"
- Error loading log content message
- Blank content area

**Possible Causes:**
- Log file doesn't exist or is empty
- File permission issues
- Content parsing errors
- Large file size issues

**Solutions:**

1. **Check File Existence:**
   ```bash
   # On AIMBY-API server
   ls -la /path/to/logs/filename.log
   ```

2. **Verify File Permissions:**
   ```bash
   # Ensure AIMBY-API can read the file
   chmod 644 /path/to/logs/filename.log
   ```

3. **Test Direct File Access:**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
        "$AIMBENCE_API_BASE_URL/api/v1/logs/filename.log"
   ```

4. **Check File Size:**
   ```bash
   # Large files may cause issues
   du -h /path/to/logs/filename.log
   ```

### 5. JSON Syntax Highlighting Not Working

**Symptoms:**
- Log content displays as plain text
- No syntax highlighting for JSON content
- "JSON Format" badge not appearing

**Possible Causes:**
- highlight.js not loading properly
- Invalid JSON content
- CSS styles not applied

**Solutions:**

1. **Check Browser Console:**
   ```javascript
   // Look for highlight.js errors
   console.log(window.hljs);
   ```

2. **Verify JSON Validity:**
   ```javascript
   // Test JSON parsing
   try {
     JSON.parse(logContent);
     console.log('Valid JSON');
   } catch (e) {
     console.log('Invalid JSON:', e);
   }
   ```

3. **Check CSS Loading:**
   ```bash
   # Verify highlight.js CSS is included
   grep -r "highlight.js" services/open-webui/src/
   ```

### 6. Copy to Clipboard Not Working

**Symptoms:**
- Copy button doesn't respond
- Error message about clipboard access
- Content not copied to clipboard

**Possible Causes:**
- Browser security restrictions
- HTTPS requirement not met
- Large content size
- Browser compatibility issues

**Solutions:**

1. **Check HTTPS:**
   ```javascript
   // Clipboard API requires secure context
   console.log(window.isSecureContext);
   ```

2. **Test Clipboard API:**
   ```javascript
   // Check if clipboard API is available
   console.log(navigator.clipboard);
   ```

3. **Check Content Size:**
   ```javascript
   // Large content may fail to copy
   console.log('Content length:', content.length);
   ```

### 7. Search Functionality Not Working

**Symptoms:**
- Search input doesn't filter results
- Search error messages appear
- No results when searching

**Possible Causes:**
- Input validation errors
- Search query contains invalid characters
- Case sensitivity issues

**Solutions:**

1. **Check Search Validation:**
   ```typescript
   // Verify search query validation
   import { validateSearchQuery } from '$lib/utils/validation';
   console.log(validateSearchQuery(searchQuery));
   ```

2. **Test Search Logic:**
   ```javascript
   // Debug search filtering
   const filtered = logs.filter(log => 
     log.filename.toLowerCase().includes(query.toLowerCase())
   );
   console.log('Filtered results:', filtered);
   ```

### 8. Pagination Issues

**Symptoms:**
- Pagination controls not appearing
- Page navigation not working
- Incorrect page counts

**Possible Causes:**
- Pagination component not imported
- Incorrect item count calculations
- State management issues

**Solutions:**

1. **Check Pagination Component:**
   ```typescript
   // Verify Pagination component import
   import Pagination from '$lib/components/common/Pagination.svelte';
   ```

2. **Debug Pagination Logic:**
   ```javascript
   // Check pagination calculations
   console.log('Total items:', filteredLogs.length);
   console.log('Items per page:', count);
   console.log('Total pages:', Math.ceil(filteredLogs.length / count));
   ```

### 9. Responsive Design Issues

**Symptoms:**
- Layout breaks on mobile devices
- Text overflow or truncation issues
- Buttons not accessible on small screens

**Possible Causes:**
- Missing responsive CSS classes
- Fixed width elements
- Inadequate mobile testing

**Solutions:**

1. **Check Responsive Classes:**
   ```html
   <!-- Ensure responsive classes are used -->
   <div class="flex flex-col sm:flex-row">
   <div class="px-4 sm:px-6">
   ```

2. **Test Mobile Layout:**
   ```bash
   # Use browser dev tools to test mobile views
   # Check for horizontal scrolling
   # Verify touch targets are adequate size
   ```

### 10. Performance Issues

**Symptoms:**
- Slow loading times
- Browser freezing with large log files
- High memory usage

**Possible Causes:**
- Large log files
- Inefficient rendering
- Memory leaks

**Solutions:**

1. **Implement Content Limits:**
   ```typescript
   // Limit content size for display
   const MAX_CONTENT_SIZE = 100000; // 100KB
   if (content.length > MAX_CONTENT_SIZE) {
     content = content.substring(0, MAX_CONTENT_SIZE) + '...';
   }
   ```

2. **Add Virtual Scrolling:**
   ```typescript
   // For large log lists, implement virtual scrolling
   // Consider using libraries like svelte-virtual-list
   ```

3. **Monitor Memory Usage:**
   ```javascript
   // Check memory usage in browser dev tools
   console.log(performance.memory);
   ```

## Debugging Tools and Commands

### Browser Developer Tools

1. **Console Debugging:**
   ```javascript
   // Enable verbose logging
   localStorage.setItem('debug', 'log-management');
   
   // Check component state
   console.log('Logs:', logs);
   console.log('Loading:', loading);
   console.log('Error:', error);
   ```

2. **Network Tab:**
   - Monitor API requests to `/api/v1/auths/admin/aimbience/proxy/`
   - Check request/response headers and status codes
   - Verify authentication tokens are being sent

3. **Application Tab:**
   - Check localStorage for authentication tokens
   - Verify session storage for component state

### Server-Side Debugging

1. **Open-WebUI Logs:**
   ```bash
   # Monitor proxy requests
   docker logs -f open-webui | grep -i aimbience
   
   # Check authentication
   docker logs -f open-webui | grep -i auth
   ```

2. **AIMBY-API Logs:**
   ```bash
   # Monitor log endpoint requests
   docker logs -f aimby-api | grep -i "/api/v1/logs"
   
   # Check for errors
   docker logs -f aimby-api | grep -i error
   ```

### Testing Commands

1. **API Endpoint Testing:**
   ```bash
   # Test log list endpoint
   curl -X GET \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     "$AIMBENCE_API_BASE_URL/api/v1/logs?limit=5"
   
   # Test log content endpoint
   curl -X GET \
     -H "Authorization: Bearer $TOKEN" \
     "$AIMBENCE_API_BASE_URL/api/v1/logs/app.log/info"
   ```

2. **Component Testing:**
   ```bash
   # Run unit tests
   cd services/open-webui
   npm run test -- --grep "LogManagement"
   
   # Run integration tests
   npm run test:integration -- --grep "log-management"
   ```

## Getting Help

### Log Collection

When reporting issues, collect the following information:

1. **Browser Information:**
   - Browser type and version
   - Operating system
   - Screen resolution

2. **Error Messages:**
   - Browser console errors
   - Network request failures
   - Server log errors

3. **Configuration:**
   - Environment variables
   - Aimbience configuration settings
   - AIMBY-API version

4. **Steps to Reproduce:**
   - Detailed steps to reproduce the issue
   - Expected vs actual behavior
   - Screenshots or screen recordings

### Support Channels

- **Development Team**: [Contact information]
- **Documentation**: [Link to documentation]
- **Issue Tracker**: [Link to issue tracker]

---

**Note**: This troubleshooting guide should be updated as new issues are discovered and resolved.