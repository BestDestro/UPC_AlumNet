#!/usr/bin/env bash
# Comprueba las cabeceras de seguridad. Uso: ./test_security_headers.sh [BASE_URL]
# Solo contra entornos locales o con autorizacion explicita.
BASE="${1:-https://localhost}"
fail=0
home=$(curl -sk -D - -o /dev/null "$BASE/")
docs=$(curl -sk -D - -o /dev/null "$BASE/docs")

for h in content-security-policy strict-transport-security x-frame-options x-content-type-options; do
  if echo "$home" | grep -qi "^$h:"; then echo "PASS  /      incluye $h"; else echo "FAIL  /      no incluye $h"; fail=1; fi
done
for h in strict-transport-security x-frame-options x-content-type-options; do
  if echo "$docs" | grep -qi "^$h:"; then echo "PASS  /docs  incluye $h"; else echo "FAIL  /docs  no incluye $h"; fail=1; fi
done
if echo "$docs" | grep -qi "^content-security-policy:"; then
  echo "FAIL  /docs  no deberia llevar CSP (rompe Swagger)"; fail=1
else
  echo "PASS  /docs  sin CSP"
fi
exit $fail
