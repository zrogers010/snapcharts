#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"
IMAGE_NAME="${IMAGE_NAME:-snapcharts}"
CONTAINER_NAME="${CONTAINER_NAME:-snapcharts}"
HOST_PORT="${HOST_PORT:-80}"
CONTAINER_PORT="${CONTAINER_PORT:-3000}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || return 1
  return 0
}

install_prereq() {
  if need_cmd git && need_cmd docker; then
    return
  fi

  log "Installing prerequisites..."
  if need_cmd dnf; then
    sudo dnf update -y
    if ! need_cmd git; then
      sudo dnf install -y git
    fi
    if ! need_cmd docker; then
      sudo dnf install -y docker
    fi
  elif need_cmd yum; then
    sudo yum update -y
    if ! need_cmd git; then
      sudo yum install -y git
    fi
    if ! need_cmd docker; then
      sudo amazon-linux-extras enable docker
      sudo yum install -y docker
    fi
  else
    log "Unsupported package manager. Install git and Docker manually."
    exit 1
  fi

  if ! need_cmd docker; then
    log "Docker still not installed. Please install Docker manually and re-run."
    exit 1
  fi

  if ! need_cmd git; then
    log "Git still not installed. Please install git manually and re-run."
    exit 1
  fi
}

start_docker() {
  if ! systemctl is-active --quiet docker; then
    log "Starting Docker..."
    sudo systemctl enable docker
    sudo systemctl start docker
  fi

  if ! groups "$USER" | tr ' ' '\n' | grep -q '^docker$'; then
    log "Adding $USER to docker group (re-login may be required)."
    sudo usermod -aG docker "$USER"
  fi
}

ensure_repo() {
  if [ -d "$APP_DIR/.git" ]; then
    log "Pulling latest code from $BRANCH..."
    git -C "$APP_DIR" fetch --all --prune
    git -C "$APP_DIR" checkout "$BRANCH"
    git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
    return
  fi

  if [ -z "$REPO_URL" ]; then
    log "No .git directory found and REPO_URL is empty."
    log "Either run this script from the repo root or set REPO_URL to clone on first run."
    log "Example: REPO_URL=https://github.com/your-org/snapcharts-go.git $0"
    exit 1
  fi

  log "Cloning repository..."
  sudo mkdir -p "$(dirname "$APP_DIR")"
  sudo git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
  sudo chown -R "$USER":"$USER" "$APP_DIR"
}

build_and_deploy() {
  local commit
  commit="$(git -C "$APP_DIR" rev-parse --short HEAD)"
  local image_tag="${IMAGE_NAME}:${commit}"

  log "Building Docker image ${image_tag}..."
  docker build -t "$image_tag" "$APP_DIR"
  docker tag "$image_tag" "${IMAGE_NAME}:latest"

  if docker ps -a --filter "name=${CONTAINER_NAME}" --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log "Stopping existing container ${CONTAINER_NAME}..."
    docker rm -f "$CONTAINER_NAME"
  fi

  log "Starting container ${CONTAINER_NAME} on port ${HOST_PORT}->${CONTAINER_PORT}..."
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -p "${HOST_PORT}:${CONTAINER_PORT}" \
    -e NODE_ENV=production \
    -e PORT="${CONTAINER_PORT}" \
    "$image_tag"

  docker image prune -f >/dev/null 2>&1 || true
  log "Deployment complete. Container: $CONTAINER_NAME, image: $image_tag"
}

install_prereq
start_docker
ensure_repo
build_and_deploy

log "Done. Verify: curl http://localhost:${HOST_PORT}"
log "Public test: curl http://<ec2-public-ip>:${HOST_PORT}"
