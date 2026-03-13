#!/bin/bash
# Limpa o debug.log do plugin Mirror Notes
# Uso: ./scripts/clear-log.sh [--tail N]
#   Sem args: limpa tudo
#   --tail N: mostra ultimas N linhas antes de limpar

PLUGIN_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$PLUGIN_DIR/debug.log"

if [ ! -f "$LOG" ]; then
  echo "debug.log nao encontrado em $PLUGIN_DIR"
  exit 1
fi

if [ "$1" = "--tail" ] && [ -n "$2" ]; then
  echo "=== Ultimas $2 linhas ==="
  tail -n "$2" "$LOG"
  echo "========================="
fi

> "$LOG"
echo "debug.log limpo ($(date '+%H:%M:%S'))"
