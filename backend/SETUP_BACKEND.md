# Open WebUI Backend Setup Guide

This guide follows the official [Open WebUI Local Development documentation](https://docs.openwebui.com/getting-started/advanced-topics/development/).

## Prerequisites

- **Python**: Version 3.11 or higher (3.12.0 is installed and should work)
- **Virtual Environment**: Recommended (conda or venv)

## Setup Steps

### 1. Navigate to Backend Directory

```bash
cd services/open-webui/backend
```

### 2. Activate Your Virtual Environment

If using conda (as you appear to be):
```bash
conda activate open-webui
```

Or if using venv:
```bash
source venv/bin/activate  # On macOS/Linux
# or
.\venv\Scripts\activate  # On Windows
```

### 3. Install Dependencies

**IMPORTANT**: The requirements.txt specifies langchain 0.3.27, but you currently have 1.2.0 installed. The retrievers (`ContextualCompressionRetriever` and `EnsembleRetriever`) were removed in langchain 1.x.

Install the correct versions:

```bash
pip install -r requirements.txt -U
```

This will install:
- `langchain==0.3.27`
- `langchain-community==0.3.29`
- `langchain-text-splitters==0.3.11`

If you have version conflicts, you may need to uninstall the incorrect version first:

```bash
pip uninstall langchain langchain-community langchain-text-splitters -y
pip install -r requirements.txt
```

### 4. Verify Installation

Check that the correct langchain version is installed:

```bash
python -c "import langchain; print(f'LangChain version: {langchain.__version__}')"
```

Should output: `LangChain version: 0.3.27`

### 5. Start the Backend

**For Development** (with auto-reload):
```bash
sh dev.sh
```

**For Production**:
```bash
sh start.sh
```

Or directly with uvicorn:
```bash
uvicorn open_webui.main:app --host 0.0.0.0 --port 8080 --forwarded-allow-ips '*'
```

The backend will be accessible at `http://localhost:8080`

## Troubleshooting

### Alembic Migration Error

If you see an error about revision `c440947495f3`, this is a database migration issue. The backend should still start, but you may need to:

1. Reset the database (if in development):
   ```bash
   rm -f data/webui.db
   ```

2. Or manually fix the alembic version table in the database.

### Import Errors

If you see import errors for `langchain.retrievers`, ensure you have the correct version:

```bash
pip install langchain==0.3.27 langchain-community==0.3.29 langchain-text-splitters==0.3.11
```

### Shell Script Errors (zsh)

The `start.sh` script has been updated to be compatible with zsh. If you still see `${VAR,,}` errors, ensure you're using the updated script.

## Additional Notes

- The backend uses SQLite by default (stored in `data/webui.db`)
- Environment variables can be set in `.env` file or as shell variables
- For development, use `dev.sh` which enables auto-reload on code changes
- The frontend should be running separately on port 5173 (or configured port)

## References

- [Open WebUI Documentation](https://docs.openwebui.com/)
- [Local Development Guide](https://docs.openwebui.com/getting-started/advanced-topics/development/)
