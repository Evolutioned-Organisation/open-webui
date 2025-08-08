# AIMby Logs Tool for Open WebUI

## Overview

The AIMby Logs Tool is a custom tool for Open WebUI that provides access to log files from the AIMby API. This tool allows you to list, search, and retrieve log files directly within your Open WebUI chat interface.

## Features

- **List Log Files**: Get a formatted list of all available log files with metadata
- **Search Log Files**: Filter log files by pattern matching
- **Get File Information**: Retrieve detailed information about specific log files
- **Get File Content**: Download and view the complete content of log files
- **Configurable API Connection**: Set custom API URL and authentication

## Installation

### 1. Copy the Tool File

The tool file `aimby_logs_tool.py` should be placed in the Open WebUI backend directory:

```bash
# The file should be in:
services/open-webui/backend/open_webui/aimby_logs_tool.py
```

### 2. Install Dependencies

The tool requires the `requests` library. Make sure it's installed in your Open WebUI environment:

```bash
pip install requests
```

### 3. Restart Open WebUI

After adding the tool, restart your Open WebUI instance to load the new tool.

## Configuration

### Valve Settings

The tool uses Open WebUI's valve system for configuration. You can configure:

- **aimby_api_url**: Base URL for the AIMby API (default: `http://localhost:8000`)
- **api_key**: API key for authentication with AIMby API (optional)

### Setting Up the Tool in Open WebUI

1. **Access the Tool**: Go to your Open WebUI instance
2. **Navigate to Tools**: Go to Workspace → Tools
3. **Create New Tool**: Click "Create New Tool"
4. **Upload the Tool**: Upload the `aimby_logs_tool.py` file
5. **Configure Valves**: Set the API URL and API key in the tool's valve settings

## Usage

### Available Functions

#### 1. List Log Files

```python
list_log_files()
```

Returns a formatted list of all available log files with their metadata.

**Example Output:**

```
Found 3 log file(s):

1. **workflow_2024_01_15_14_30_22.json**
   - Size: 2.3 KB
   - Modified: 2024-01-15 14:30:22
   - Path: llm_logs/workflow_2024_01_15_14_30_22.json

2. **workflow_2024_01_15_13_45_10.json**
   - Size: 1.8 KB
   - Modified: 2024-01-15 13:45:10
   - Path: llm_logs/workflow_2024_01_15_13_45_10.json
```

#### 2. Search Log Files

```python
search_log_files(pattern: str)
```

Search for log files matching a specific pattern.

**Example:**

```python
search_log_files("2024")
search_log_files("error")
search_log_files("workflow")
```

#### 3. Get Log File Information

```python
get_log_file_info(filename: str)
```

Get detailed information about a specific log file.

**Example:**

```python
get_log_file_info("workflow_2024_01_15_14_30_22.json")
```

**Example Output:**

```
**Log File Information: workflow_2024_01_15_14_30_22.json**

**File Details:**
- Size: 2.3 KB
- Created: 2024-01-15 14:30:22
- Modified: 2024-01-15 14:30:22
- Path: llm_logs/workflow_2024_01_15_14_30_22.json
- Readable: Yes

**Content Preview:**
1. {"timestamp": "2024-01-15T14:30:22Z", "level": "info", "message": "Workflow started"}
2. {"timestamp": "2024-01-15T14:30:23Z", "level": "info", "message": "Processing document"}
```

#### 4. Get Log File Content

```python
get_log_file_content(filename: str)
```

Retrieve the complete content of a log file.

**Example:**

```python
get_log_file_content("workflow_2024_01_15_14_30_22.json")
```

**Example Output:**

```
**Log File Content: workflow_2024_01_15_14_30_22.json**

```json
{
  "session_id": "abc123",
  "workflow_id": "workflow_001",
  "entries": [
    {
      "timestamp": "2024-01-15T14:30:22Z",
      "level": "info",
      "message": "Workflow started"
    },
    {
      "timestamp": "2024-01-15T14:30:23Z",
      "level": "info", 
      "message": "Processing document"
    }
  ]
}
```

```

## AIMby API Requirements

### Endpoints Used

The tool interacts with the following AIMby API endpoints:

- `GET /api/v1/logs/` - List all log files
- `GET /api/v1/logs/{filename}/info` - Get log file information
- `GET /api/v1/logs/{filename}` - Download log file content

### Authentication

The tool supports API key authentication. If an API key is configured in the valve settings, it will be included in the Authorization header.

### File Format

The tool expects JSON log files. Only files with `.json` extension are supported.

## Error Handling

The tool provides comprehensive error handling for common scenarios:

- **Connection Errors**: When the AIMby API is not reachable
- **Authentication Errors**: When API key is invalid or missing
- **File Not Found**: When the requested log file doesn't exist
- **Invalid Filename**: When the filename contains invalid characters
- **Timeout Errors**: When requests take too long

## Security Considerations

- **Path Traversal Protection**: The tool validates filenames to prevent directory traversal attacks
- **File Type Validation**: Only JSON files are allowed
- **Input Sanitization**: All user inputs are validated before making API requests

## Testing

You can test the tool using the provided test script:

```bash
cd services/open-webui/backend
python test_aimby_logs_tool.py
```

This will verify that:

- The tool structure is correct for Open WebUI
- All methods are callable
- Valve configuration works properly
- Error handling functions correctly

## Troubleshooting

### Common Issues

1. **"Could not connect to AIMby API"**
   - Check if the AIMby API is running
   - Verify the API URL in the valve settings
   - Ensure network connectivity

2. **"Authentication failed"**
   - Check if the API key is correct
   - Verify the API key format
   - Ensure the API key has proper permissions

3. **"Log file not found"**
   - Verify the filename is correct
   - Ensure the file exists in the AIMby API logs directory
   - Check that the filename ends with `.json`

4. **"Invalid filename"**
   - Ensure the filename doesn't contain path separators
   - Check that the filename ends with `.json`
   - Avoid special characters in the filename

### Debug Mode

To enable debug logging, you can modify the tool to include more detailed error messages by adding logging statements.

## Integration with AIMby Workflow

This tool integrates seamlessly with the AIMby workflow system:

1. **Workflow Logs**: Access logs generated by AIMby workflows
2. **Real-time Monitoring**: Check workflow execution status
3. **Debugging**: Analyze workflow performance and errors
4. **Audit Trail**: Review workflow execution history

## Support

For issues or questions about this tool:

1. Check the troubleshooting section above
2. Verify your AIMby API configuration
3. Test the API endpoints directly
4. Review the Open WebUI tool documentation

## License

This tool is licensed under the MIT License.
