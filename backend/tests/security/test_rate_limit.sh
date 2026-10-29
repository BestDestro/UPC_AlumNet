#!/usr/bin/env bash
# Prueba el rate limiting de Nginx. Uso: ./test_rate_limit.sh [BASE_URL]
# ATENCION: tras ejecutarlo, tu IP queda limitada ~1 minuto en login y registro.
# Solo contra entornos locales o con autorizacion explicita. No crea usuarios.
BASE="${1:-https://localhost}"
fail=0

login_burst() { for _ in $(seq 1 12); do curl -sk -o /dev/null -w "%{http_code} " -X POST "$BASE/api/v1/auth/login" -d "username=ratelimit.nobody@upc.edu&password=incorrecta"; done; }
register_burst() { for _ in $(seq 1 8); do curl -sk -o /dev/null -w "%{http_code} " -X POST "$BASE/api/v1/auth/register" -H "Content-Type: application/json" -d '{"email":"x@gmail.com","full_name":"Rate Test","password":"Password#2026"}'; done; }

evaluate() { # nombre, salida
  first="${2%% *}"
  if [[ "$first" != "429" && "$2" == *429* ]]; then echo "PASS  $1: $2"; else echo "FAIL  $1: $2 (espera 60 s y repite si ya estabas limitado)"; fail=1; fi
}

evaluate "login    " "$(login_burst)"
evaluate "registro " "$(register_burst)"

health=$(curl -sk -o /dev/null -w "%{http_code}" "$BASE/health")
offers=$(curl -sk -o /dev/null -w "%{http_code}" "$BASE/api/v1/offers/")
[[ "$health" == "200" ]] && echo "PASS  /health sin afectar ($health)" || { echo "FAIL  /health devuelve $health"; fail=1; }
[[ "$offers" == "401" ]] && echo "PASS  /offers sin token sigue en 401" || { echo "FAIL  /offers devuelve $offers"; fail=1; }
exit $fail
