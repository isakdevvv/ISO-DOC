#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
ENV_FILE="$BACKEND_DIR/.env"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"

log() {
    printf "\n[setup] %s\n" "$*"
}

require_cmd() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo "Missing required command: $1" >&2
        exit 1
    fi
}

require_cmd docker
require_cmd npm

if ! docker info >/dev/null 2>&1; then
    echo "Docker daemon is not running. Please start Docker Desktop/daemon and rerun."
    exit 1
fi

if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD=("docker" "compose")
elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD=("docker-compose")
else
    echo "Docker Compose is required (docker compose or docker-compose not found)." >&2
    exit 1
fi

log "Ensuring backend/.env exists"
if [ ! -f "$ENV_FILE" ]; then
    cat > "$ENV_FILE" <<'EOF'
DATABASE_URL="postgresql://user:password@localhost:5432/iso_doc_platform"
DIRECT_URL="postgresql://user:password@localhost:5432/iso_doc_platform"

REDIS_HOST=""
REDIS_PORT=6379
REDIS_PASSWORD=""

OPENROUTER_API_KEY=""
EOF
    log "Created backend/.env with local defaults (matches docker-compose.yml)"
else
    log "backend/.env already present; leaving it unchanged"
fi

log "Starting PostgreSQL container"
"${DOCKER_COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" up -d postgres

log "Waiting for database to accept connections"
DB_READY=0
for _ in $(seq 1 30); do
    if "${DOCKER_COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" exec -T postgres pg_isready -U user >/dev/null 2>&1; then
        DB_READY=1
        break
    fi
    sleep 1
done

if [ "$DB_READY" -ne 1 ]; then
    echo "Postgres did not become ready in time." >&2
    exit 1
fi

if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    log "Installing backend dependencies"
    (cd "$BACKEND_DIR" && npm install)
fi

log "Generating Prisma client"
(cd "$BACKEND_DIR" && npx prisma generate)

log "Applying database migrations"
(cd "$BACKEND_DIR" && npx prisma migrate deploy)

log "Done. Backend database is ready."
