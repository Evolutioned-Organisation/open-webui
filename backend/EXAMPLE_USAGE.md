# AIMby Logs Tool - Example Usage

This document shows how to use the AIMby Logs Tool in Open WebUI chat conversations.

## Setup

1. **Install the Tool**: Upload `aimby_logs_tool.py` to Open WebUI
2. **Configure Valves**: Set your AIMby API URL and API key
3. **Enable the Tool**: Add the tool to your chat session

## Example Conversations

### Example 1: List Available Log Files

**User**: "Show me all the available log files from the AIMby API"

**Assistant**: I'll help you list the available log files from the AIMby API.

**Tool Call**: `list_log_files()`

**Response**:

```
Found 5 log file(s):

1. **workflow_2024_01_15_14_30_22.json**
   - Size: 2.3 KB
   - Modified: 2024-01-15 14:30:22
   - Path: llm_logs/workflow_2024_01_15_14_30_22.json

2. **workflow_2024_01_15_13_45_10.json**
   - Size: 1.8 KB
   - Modified: 2024-01-15 13:45:10
   - Path: llm_logs/workflow_2024_01_15_13_45_10.json

3. **workflow_2024_01_15_12_20_05.json**
   - Size: 3.1 KB
   - Modified: 2024-01-15 12:20:05
   - Path: llm_logs/workflow_2024_01_15_12_20_05.json

4. **error_2024_01_15_11_15_30.json**
   - Size: 1.2 KB
   - Modified: 2024-01-15 11:15:30
   - Path: llm_logs/error_2024_01_15_11_15_30.json

5. **workflow_2024_01_15_10_30_45.json**
   - Size: 4.5 KB
   - Modified: 2024-01-15 10:30:45
   - Path: llm_logs/workflow_2024_01_15_10_30_45.json
```

### Example 2: Search for Specific Log Files

**User**: "Find all log files from today"

**Assistant**: I'll search for log files from today.

**Tool Call**: `search_log_files("2024_01_15")`

**Response**:

```
Found 4 log file(s) matching '2024_01_15':

1. **workflow_2024_01_15_14_30_22.json**
   - Size: 2.3 KB
   - Modified: 2024-01-15 14:30:22
   - Path: llm_logs/workflow_2024_01_15_14_30_22.json

2. **workflow_2024_01_15_13_45_10.json**
   - Size: 1.8 KB
   - Modified: 2024-01-15 13:45:10
   - Path: llm_logs/workflow_2024_01_15_13_45_10.json

3. **workflow_2024_01_15_12_20_05.json**
   - Size: 3.1 KB
   - Modified: 2024-01-15 12:20:05
   - Path: llm_logs/workflow_2024_01_15_12_20_05.json

4. **error_2024_01_15_11_15_30.json**
   - Size: 1.2 KB
   - Modified: 2024-01-15 11:15:30
   - Path: llm_logs/error_2024_01_15_11_15_30.json
```

### Example 3: Get Information About a Specific Log File

**User**: "Tell me more about the error log from 11:15"

**Assistant**: I'll get detailed information about that error log file.

**Tool Call**: `get_log_file_info("error_2024_01_15_11_15_30.json")`

**Response**:

```
**Log File Information: error_2024_01_15_11_15_30.json**

**File Details:**
- Size: 1.2 KB
- Created: 2024-01-15 11:15:30
- Modified: 2024-01-15 11:15:30
- Path: llm_logs/error_2024_01_15_11_15_30.json
- Readable: Yes

**Content Preview:**
1. {"timestamp": "2024-01-15T11:15:30Z", "level": "error", "message": "Database connection failed"}
2. {"timestamp": "2024-01-15T11:15:31Z", "level": "error", "message": "Retry attempt 1 failed"}
3. {"timestamp": "2024-01_15T11:15:32Z", "level": "error", "message": "Retry attempt 2 failed"}
4. {"timestamp": "2024-01_15T11:15:33Z", "level": "error", "message": "Workflow aborted due to database issues"}
5. {"timestamp": "2024-01_15T11:15:34Z", "level": "info", "message": "Error log completed"}
```

### Example 4: Get Full Content of a Log File

**User**: "Show me the complete content of the most recent workflow log"

**Assistant**: I'll retrieve the complete content of the most recent workflow log file.

**Tool Call**: `get_log_file_content("workflow_2024_01_15_14_30_22.json")`

**Response**:

```
**Log File Content: workflow_2024_01_15_14_30_22.json**

```json
{
  "session_id": "session_abc123",
  "workflow_id": "workflow_2024_01_15_001",
  "trace_id": "trace_xyz789",
  "start_time": "2024-01-15T14:30:22Z",
  "end_time": "2024-01-15T14:32:15Z",
  "status": "completed",
  "entries": [
    {
      "timestamp": "2024-01-15T14:30:22Z",
      "level": "info",
      "message": "Workflow started",
      "component": "workflow_engine"
    },
    {
      "timestamp": "2024-01-15T14:30:23Z",
      "level": "info",
      "message": "Processing document: document_001.pdf",
      "component": "document_processor"
    },
    {
      "timestamp": "2024-01-15T14:30:45Z",
      "level": "info",
      "message": "Document processed successfully",
      "component": "document_processor"
    },
    {
      "timestamp": "2024-01-15T14:31:10Z",
      "level": "info",
      "message": "AI analysis started",
      "component": "ai_analyzer"
    },
    {
      "timestamp": "2024-01-15T14:32:10Z",
      "level": "info",
      "message": "AI analysis completed",
      "component": "ai_analyzer"
    },
    {
      "timestamp": "2024-01-15T14:32:15Z",
      "level": "info",
      "message": "Workflow completed successfully",
      "component": "workflow_engine"
    }
  ],
  "summary": {
    "total_entries": 6,
    "error_count": 0,
    "warning_count": 0,
    "info_count": 6,
    "duration_seconds": 113
  }
}
```

```

### Example 5: Error Handling

**User**: "Get the log file that doesn't exist"

**Assistant**: I'll try to get information about a non-existent log file.

**Tool Call**: `get_log_file_info("nonexistent_file.json")`

**Response**:
```

Error: Log file 'nonexistent_file.json' not found.

```

### Example 6: Search for Error Logs

**User**: "Find all error logs"

**Assistant**: I'll search for log files containing "error" in their names.

**Tool Call**: `search_log_files("error")`

**Response**:
```

Found 1 log file(s) matching 'error':

1. **error_2024_01_15_11_15_30.json**
   - Size: 1.2 KB
   - Modified: 2024-01-15 11:15:30
   - Path: llm_logs/error_2024_01_15_11_15_30.json

```

## Advanced Usage Patterns

### Pattern 1: Workflow Analysis
1. List all workflow logs: `list_log_files()`
2. Filter by date: `search_log_files("2024_01_15")`
3. Get details of specific workflow: `get_log_file_info("workflow_2024_01_15_14_30_22.json")`
4. Analyze complete workflow: `get_log_file_content("workflow_2024_01_15_14_30_22.json")`

### Pattern 2: Error Investigation
1. Search for error logs: `search_log_files("error")`
2. Get error details: `get_log_file_info("error_2024_01_15_11_15_30.json")`
3. Analyze error content: `get_log_file_content("error_2024_01_15_11_15_30.json")`

### Pattern 3: Performance Monitoring
1. List recent logs: `list_log_files()`
2. Find large log files (by checking sizes in the list)
3. Get detailed information about large files
4. Analyze workflow performance from log content

## Tips for Effective Usage

1. **Start with listing**: Always use `list_log_files()` first to see what's available
2. **Use search patterns**: Use `search_log_files()` to filter by date, type, or other patterns
3. **Get info before content**: Use `get_log_file_info()` to preview before downloading full content
4. **Check file sizes**: Large files might take longer to download
5. **Use descriptive patterns**: Search for specific dates, error types, or workflow IDs

## Common Use Cases

- **Debugging workflows**: Find and analyze error logs
- **Performance monitoring**: Check workflow execution times
- **Audit trails**: Review workflow execution history
- **System health**: Monitor overall system status through logs
- **Development**: Analyze workflow behavior during development
