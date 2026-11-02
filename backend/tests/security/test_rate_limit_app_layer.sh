#!/usr/bin/env bash
# Prueba la capa 3 (FastAPI, app/core/rate_limit.py) atacando DIRECTAMENTE el backend,
# sin pasar por Nginx. Uso: ./test_rate_limit_app_layer.sh [BASE_URL]
# Por defecto BASE_URL=http://localhost:8443 (si el puerto 8443 deja de publicarse en
# el host, esta prueba ya no es aplicable y hay que ejecutarla dentro de la red Docker).
# ANTES: espera 60 s sin hacer logins. DESPUES: tu IP queda limitada ~1 minuto.
# Solo contra entornos locales o con autorizacion explicita. No crea usuarios.
BASE="${1:-http://localhost:8443}"
fail=0

# 1) Limite por IP en acceso directo. Cada peticion usa una cuenta distinta (para que no
#    intervenga el bloqueo por cuenta) y una cabecera X-Real-IP falsificada distinta: si la
#    capa se fiara de esa cabecera, cada peticion tendria su propio contador y nunca
#    se llegaria al 429.
codes=""
for i in $(seq 1 12); do
  codes+="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/v1/auth/login" \
    -H "X-Real-IP: 203.0.113.$i" \
    -d "username=layer3.$RANDOM$RANDOM@upc.edu&password=incorrecta") "
done
first="${codes%% *}"
if [[ "$first" != "429" && "$codes" == *429* ]]; then
  echo "PASS  login directo, X-Real-IP falsificada ignorada: $codes"
else
  echo "FAIL  login directo: $codes (si ya estabas limitado, espera 60 s y repite)"
  fail=1
fi

# 2) Formato de la respuesta 429 de FastAPI: JSON y cabecera Retry-After.
resp=$(curl -s -i -X POST "$BASE/api/v1/auth/login" -d "username=layer3.$RANDOM$RANDOM@upc.edu&password=incorrecta")
if echo "$resp" | head -n 1 | grep -q " 429" \
   && echo "$resp" | grep -qi '^retry-after: *[0-9]' \
   && echo "$resp" | grep -q '"detail"'; then
  echo "PASS  la respuesta 429 es JSON e incluye Retry-After"
else
  echo "FAIL  formato de la respuesta 429 inesperado"
  fail=1
fi

# 3) Otras rutas no se ven afectadas.
health=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/health")
if [[ "$health" == "200" ]]; then echo "PASS  /health sin afectar ($health)"; else echo "FAIL  /health devuelve $health"; fail=1; fi

exit $fail
