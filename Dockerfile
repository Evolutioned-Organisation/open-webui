# syntax=docker/dockerfile:1.4

# ==============================================================================
# Stage 1: Frontend Build (Heavy JavaScript/Node.js work)
# ==============================================================================
FROM --platform=$BUILDPLATFORM node:22-alpine3.20 AS frontend_builder
ARG BUILD_HASH
ARG OPENAI_API_KEY=""
ARG NODE_OPTIONS="--max-old-space-size=8192"

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --force
COPY . .
ENV APP_BUILD_HASH=${BUILD_HASH}
# Use the NODE_OPTIONS env var here to increase the memory limit
ENV NODE_OPTIONS="${NODE_OPTIONS}"
RUN npm run build

# ==============================================================================
# Stage 2: Backend Build (Heavy Python dependencies and model downloading)
# ==============================================================================
FROM python:3.11-slim-bookworm AS backend_builder
ARG USE_CUDA=false
ARG USE_CUDA_VER=cu128
ARG USE_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
ARG USE_RERANKING_MODEL=""
ARG TIKTOKEN_ENCODING_NAME="cl100k_base"
ARG UID=0
ARG GID=0

WORKDIR /app/backend

# Install necessary system packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git build-essential pandoc gcc netcat-openbsd curl jq ffmpeg libsm6 libxext6 \
    python3-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies from a requirements file
COPY ./backend/requirements.txt ./requirements.txt
RUN pip3 install uv --no-cache-dir && \
    if [ "$USE_CUDA" = "true" ]; then \
        uv pip install --system torch torchvision torchaudio \
        --index-url https://download.pytorch.org/whl/$USE_CUDA_VER --no-cache-dir; \
    else \
        uv pip install --system torch torchvision torchaudio \
        --index-url https://download.pytorch.org/whl/cpu --no-cache-dir; \
    fi && \
    uv pip install --system -r requirements.txt --no-cache-dir

# Pre-load/cache the models in this builder stage to prevent runtime downloading
ENV RAG_EMBEDDING_MODEL="$USE_EMBEDDING_MODEL" \
    SENTENCE_TRANSFORMERS_HOME="/app/backend/data/cache/embedding/models" \
    WHISPER_MODEL="base" \
    WHISPER_MODEL_DIR="/app/backend/data/cache/whisper/models" \
    TIKTOKEN_ENCODING_NAME="$TIKTOKEN_ENCODING_NAME" \
    TIKTOKEN_CACHE_DIR="/app/backend/data/cache/tiktoken" \
    HF_HOME="/app/backend/data/cache/embedding/models"

RUN python -c "import os; from sentence_transformers import SentenceTransformer; SentenceTransformer(os.environ['RAG_EMBEDDING_MODEL'], device='cpu')" && \
    python -c "import os; from faster_whisper import WhisperModel; WhisperModel(os.environ['WHISPER_MODEL'], device='cpu', compute_type='int8', download_root=os.environ['WHISPER_MODEL_DIR'])" && \
    python -c "import os; import tiktoken; tiktoken.get_encoding(os.environ['TIKTOKEN_ENCODING_NAME'])"

# ==============================================================================
# Stage 3: Final Production Image (The final, minimal image)
# ==============================================================================
FROM python:3.11-slim-bookworm
ARG UID=0
ARG GID=0
ARG BUILD_HASH

WORKDIR /app

# Copy built frontend assets from the frontend_builder stage
COPY --chown=$UID:$GID --from=frontend_builder /app/build /app/build
COPY --chown=$UID:$GID --from=frontend_builder /app/CHANGELOG.md /app/CHANGELOG.md
COPY --chown=$UID:$GID --from=frontend_builder /app/package.json /app/package.json

# Copy Python dependencies and cached models from the backend_builder stage
COPY --from=backend_builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Set up user and permissions
RUN if [ $UID -ne 0 ]; then \
    if [ $GID -ne 0 ]; then \
    addgroup --gid $GID app; \
    fi; \
    adduser --uid $UID --gid $GID --home /root --disabled-password --no-create-home app; \
    fi

# Copy backend files from backend_builder stage (not from host)
COPY --chown=$UID:$GID --from=backend_builder /app/backend /app/backend

# Set up necessary directories and permissions
RUN mkdir -p /root/.cache/chroma && \
    echo -n 00000000-0000-0000-0000-000000000000 > /root/.cache/chroma/telemetry_user_id && \
    chown -R $UID:$GID /app /root

# Set final environment variables
ENV ENV=prod \
    PORT=8080 \
    WEBUI_BUILD_VERSION=${BUILD_HASH} \
    DOCKER=true

EXPOSE 8080
HEALTHCHECK CMD curl --silent --fail http://localhost:${PORT:-8080}/health | jq -ne 'input.status == true' || exit 1

USER $UID:$GID
CMD [ "bash", "start.sh"]
