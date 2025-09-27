# AIMBY Workflow Pipeline for Open WebUI

This pipeline provides direct integration between Open WebUI and AIMBY workflows, eliminating the need for the complex pipeline generation and file management system.

## Features

- **Direct API Integration**: Calls AIMBY API directly without intermediate containers
- **Streaming Support**: Real-time streaming of workflow responses
- **Configurable**: Environment variables for easy configuration
- **Multiple Workflow Support**: Can use different workflows based on model selection
- **Debug Logging**: Comprehensive logging for troubleshooting

## Installation

### Option 1: Direct Installation in Open WebUI

1. Copy the `aimby_workflow_pipeline.py` file to your Open WebUI pipelines directory
2. Restart Open WebUI
3. The pipeline will be available in the model dropdown

### Option 2: Via Open WebUI Admin Interface

1. Go to Open WebUI Admin Settings
2. Navigate to Pipelines section
3. Add the pipeline URL or upload the file directly

## Configuration

The pipeline can be configured using environment variables:

```bash
# AIMBY API URL (default: http://aimby-api:8000)
AIMBY_API_URL=http://your-aimby-api:8000

# Default workflow ID (default: StreamRagWorkflow)
WORKFLOW_ID=StreamRagWorkflow

# Request timeout in seconds (default: 120)
TIMEOUT=120

# Enable debug logging (default: true)
ENABLE_DEBUG=true
```

## Usage

### Basic Usage

1. Select "AIMBY Workflow" from the model dropdown in Open WebUI
2. Type your question
3. The pipeline will call the default workflow (StreamRagWorkflow) and stream the response

### Using Different Workflows

You can use different workflows by:

1. **Model Selection**: If you have multiple workflow models configured, select the specific workflow from the dropdown
2. **Custom Field**: Add `workflow_id` to your request body
3. **Environment Variable**: Change the `WORKFLOW_ID` environment variable

### Available Workflows

Based on your AIMBY setup, the following workflows should be available:

- `StreamRagWorkflow` - Streaming RAG workflow
- `PrimaryRagSearchWorkflow` - Primary RAG search
- `VectorBasedRAGWorkflow` - Vector-based RAG
- `OntologyGraphRAG` - Ontology graph RAG
- `EntityResolutionRAG` - Entity resolution RAG
- `MasterAliasRAGWorkflow` - Master alias RAG
- `Stakeholder_Analysis` - Stakeholder analysis
- And more...

## Architecture Comparison

### Old Architecture (Complex)

```
open-webui → pipeline file (generated) → pipelines container → aimby-api → workflow
```

### New Architecture (Simple)

```
open-webui → aimby_workflow_pipeline → aimby-api → workflow
```

## Benefits

1. **Simplified Deployment**: No separate pipelines container needed
2. **Better Performance**: Direct communication, no file I/O
3. **Easier Debugging**: All code in one place, comprehensive logging
4. **More Maintainable**: Single code path, fewer moving parts
5. **Real-time Updates**: No need to regenerate pipeline files

## Troubleshooting

### Common Issues

1. **Connection Error**: Check that `AIMBY_API_URL` is correct and accessible
2. **Timeout**: Increase `TIMEOUT` value for long-running workflows
3. **Workflow Not Found**: Verify the workflow ID exists in your AIMBY setup

### Debug Mode

Enable debug logging by setting `ENABLE_DEBUG=true` to see detailed request/response information.

### Logs

Check Open WebUI logs for pipeline execution details. The pipeline logs:

- Request details (URL, method, payload)
- Response status and headers
- Streaming data processing
- Error messages and stack traces

## Migration from Old System

To migrate from the old pipeline generation system:

1. Install this new pipeline
2. Test with a few workflows
3. Gradually replace old pipeline usage
4. Remove the old pipeline generation system once migration is complete

## Example Usage

```python
# The pipeline automatically handles:
# - Message extraction from various formats
# - Workflow selection
# - Streaming response processing
# - Error handling and retries
# - Status message filtering

# Just select "AIMBY Workflow" in Open WebUI and start chatting!
```

## Support

For issues or questions:

1. Check the debug logs first
2. Verify AIMBY API connectivity
3. Ensure workflow IDs are correct
4. Check environment variable configuration
