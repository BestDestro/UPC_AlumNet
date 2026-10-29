#!/usr/bin/env bash
# Prueba el rate limiting de Nginx (capa 1). Uso: ./test_rate_limit.sh [BASE_URL]
# ATENCION: tras ejecutarlo, tu IP queda limitada ~1 minuto en login y registro.
# Solo contra entornos locales o con autorizacion explicita. No crea usuarios.
# Cada ejecucion usa una cuenta inexistente distinta, para que el bloqueo por cuenta
# de la capa 3 (FastAPI) no interfiera entre ejecuciones consecutivas.
BASE="${1:-https://localhost}"
fail=0
NOUSER="ratelimit.$RANDOM$RANDOM@upc.edu"

login_burst() {
  for _ in $(seq 1 12); do
    curl -sk -o /dev/null -w "%{http_code} " -X POST "$BASE/api/v1/auth/login" \
      -d "username=$NOUSER&password=incorrecta"
  done
}

register_burst() {
  for _ in $(seq 1 8); do
    curl -sk -o /dev/null -w "%{http_code} " -X POST "$BASE/api/v1/auth/register" \
      -H "Content-Type: application/json" \
      -d '{"email":"x@gmail.com","full_name":"Rate Test","password":"Password#2026"}'
  done
}

evaluate() { # $1 = nombre, $2 = codigos HTTP obtenidos
  first="${2%% *}"
  if [[ "$first" != "429" && "$2" == *429* ]]; then
    echo "PASS  $1: $2"
  else
    echo "FAIL  $1: $2 (si ya estabas limitado, espera 60 s y repite)"
    fail=1
  fi
}

evaluate "login    " "$(login_burst)"
evaluate "registro " "$(register_burst)"

health=$(curl -sk -o /dev/null -w "%{http_code}" "$BASE/health")
offers=$(curl -sk -o /dev/null -w "%{http_code}" "$BASE/api/v1/offers/")

if [[ "$health" == "200" ]]; then echo "PASS  /health sin afectar ($health)"; else echo "FAIL  /health devuelve $health"; fail=1; fi
if [[ "$offers" == "401" ]]; then echo "PASS  /offers sin token sigue en 401"; else echo "FAIL  /offers devuelve $offers"; fail=1; fi

exit $fail
