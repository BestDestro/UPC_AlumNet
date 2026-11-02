#!/usr/bin/env bash
# Prueba en vivo del cifrado de documentos contra la pila en marcha (docker compose).
# Uso: ./test_blob_encryption_live.sh            (BASE_URL, DB_USER y DB_NAME se pueden cambiar)
#
# EFECTOS EN LA BASE DE DATOS LOCAL: crea 2 usuarios de prueba (blobtest.*@upc.edu) y unos
# pocos documentos de prueba. Durante la prueba altera y RESTAURA bytes de dos blobs de
# prueba para comprobar la deteccion de manipulaciones. No usar contra datos reales.
BASE="${BASE_URL:-https://localhost}"
DB_USER="${DB_USER:-alumnet_app_user}"
DB_NAME="${DB_NAME:-alumnet_db}"
PASSWORD='TestPass#2026'
OVERHEAD=33   # cabecera (5) + nonce (12) + etiqueta GCM (16)

cd "$(dirname "$0")/../.." || exit 1      # backend/ (donde esta docker-compose.yml)
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
fail=0

ok()  { echo "PASS  $1"; }
bad() { echo "FAIL  $1"; fail=1; }
expect() { # descripcion, esperado, obtenido
  if [[ "$2" == "$3" ]]; then ok "$1 ($3)"; else bad "$1: esperado $2, obtenido $3"; fi
}
json_get() { python3 -c "import sys,json; print(json.load(sys.stdin).get('$1',''))" 2>/dev/null; }
sql() { docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -At -c "$1" 2>/dev/null; }
code_of() { curl -sk -o /dev/null -w "%{http_code}" "$@"; }

register() { code_of -X POST "$BASE/api/v1/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$1\",\"full_name\":\"Blob Test\",\"password\":\"$PASSWORD\",\"role_name\":\"Student\"}"; }
login() { curl -sk -X POST "$BASE/api/v1/auth/login" -d "username=$1&password=$PASSWORD" | json_get access_token; }
upload() { # token, fichero, tipo -> imprime "CODIGO|cuerpo"
  local body="$WORK/upload.json" code
  code=$(curl -sk -o "$body" -w "%{http_code}" -X POST "$BASE/api/v1/documents/upload" \
    -H "Authorization: Bearer $1" -F "file=@$2;type=$3")
  echo "$code|$(cat "$body")"
}
download() { # token, id, destino -> codigo
  curl -sk -o "$3" -D "$WORK/headers.txt" -w "%{http_code}" -H "Authorization: Bearer $1" "$BASE/api/v1/documents/$2"
}

# --- ficheros de prueba -------------------------------------------------------
python3 - "$WORK" <<'PYEOF'
import base64, sys
png = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
open(sys.argv[1] + "/a1.png", "wb").write(png)
open(sys.argv[1] + "/a2.png", "wb").write(png + b"segundo-documento")
open(sys.argv[1] + "/falso.png", "wb").write(b"esto no es una imagen")
open(sys.argv[1] + "/texto.txt", "wb").write(b"texto plano")
open(sys.argv[1] + "/medio.pdf", "wb").write(b"%PDF-1.4\n" + b"\0" * 1_500_000)
open(sys.argv[1] + "/enorme.pdf", "wb").write(b"%PDF-1.4\n" + b"\0" * 7_000_000)
PYEOF

# --- usuarios -----------------------------------------------------------------
A="blobtest.a$RANDOM$RANDOM@upc.edu"; B="blobtest.b$RANDOM$RANDOM@upc.edu"
expect "registro usuario A" 201 "$(register "$A")"
expect "registro usuario B" 201 "$(register "$B")"
TA=$(login "$A"); TB=$(login "$B")
[[ -n "$TA" && -n "$TB" ]] && ok "login de ambos usuarios" || { bad "no se pudo iniciar sesion"; exit 1; }

# --- subida y cifrado en la base de datos --------------------------------------
R1=$(upload "$TA" "$WORK/a1.png" image/png); expect "subida PNG valido" 201 "${R1%%|*}"
ID1=$(echo "${R1#*|}" | json_get document_id)
R2=$(upload "$TA" "$WORK/a2.png" image/png); expect "subida segundo PNG" 201 "${R2%%|*}"
ID2=$(echo "${R2#*|}" | json_get document_id)
[[ -n "$ID1" && -n "$ID2" ]] || { bad "no se obtuvo el id del documento"; exit 1; }

SIZE1=$(stat -c %s "$WORK/a1.png")
ROW=$(sql "SELECT length(encrypted_blob) || '|' || position(decode('89504e47','hex') in encrypted_blob) || '|' || encode(substring(encrypted_blob from 1 for 4),'hex') FROM encrypted_documents WHERE id='$ID1'")
expect "BLOB en la BD: tamano|firma PNG en claro|cabecera (v1)" "$((SIZE1 + OVERHEAD))|0|41424c01" "$ROW"

# --- descarga y permisos -------------------------------------------------------
expect "descarga del propietario" 200 "$(download "$TA" "$ID1" "$WORK/dl1.png")"
cmp -s "$WORK/a1.png" "$WORK/dl1.png" && ok "el fichero descargado es identico al original" || bad "el fichero descargado difiere del original"
grep -qi '^content-disposition: attachment' "$WORK/headers.txt" && ok "Content-Disposition: attachment" || bad "falta Content-Disposition: attachment"
grep -qi '^x-content-type-options: nosniff' "$WORK/headers.txt" && ok "X-Content-Type-Options: nosniff" || bad "falta X-Content-Type-Options: nosniff"
expect "otro usuario no puede descargar" 403 "$(download "$TB" "$ID1" "$WORK/dlB.bin")"
expect "sin token no se puede descargar" 401 "$(code_of "$BASE/api/v1/documents/$ID1")"

# --- validacion de contenido y tamano -----------------------------------------
R=$(upload "$TA" "$WORK/falso.png" image/png);  expect "texto declarado como PNG se rechaza" 400 "${R%%|*}"
R=$(upload "$TA" "$WORK/texto.txt" text/plain); expect "tipo no permitido se rechaza" 400 "${R%%|*}"
R=$(upload "$TA" "$WORK/medio.pdf" application/pdf); expect "PDF de 1,5 MB se acepta (antes: 413 por el limite de 1 MB de Nginx)" 201 "${R%%|*}"
expect "fichero de 7 MB se rechaza en Nginx" 413 "$(code_of -X POST "$BASE/api/v1/documents/upload" -H "Authorization: Bearer $TA" -F "file=@$WORK/enorme.pdf;type=application/pdf")"

# --- manipulacion del blob (se restaura despues) -------------------------------
FLIP="UPDATE encrypted_documents SET encrypted_blob = set_byte(encrypted_blob, 40, get_byte(encrypted_blob, 40) # 255) WHERE id='%s'"
sql "$(printf "$FLIP" "$ID1")" >/dev/null
expect "blob manipulado: el descifrado falla de forma controlada" 500 "$(download "$TA" "$ID1" "$WORK/tampered.bin")"
grep -q 'could not be decrypted' "$WORK/tampered.bin" && ok "mensaje de error controlado, sin datos internos" || bad "mensaje de error inesperado"
sql "$(printf "$FLIP" "$ID1")" >/dev/null
expect "blob restaurado: vuelve a descargarse" 200 "$(download "$TA" "$ID1" "$WORK/dl1b.png")"
cmp -s "$WORK/a1.png" "$WORK/dl1b.png" && ok "contenido recuperado intacto tras restaurar" || bad "el contenido restaurado difiere"

# --- blob copiado a otra fila (AAD) --------------------------------------------
B2HEX=$(sql "SELECT encode(encrypted_blob,'hex') FROM encrypted_documents WHERE id='$ID2'")
sql "UPDATE encrypted_documents SET encrypted_blob = (SELECT encrypted_blob FROM encrypted_documents WHERE id='$ID1') WHERE id='$ID2'" >/dev/null
expect "blob de otro documento copiado a esta fila: no descifra" 500 "$(download "$TA" "$ID2" "$WORK/swap.bin")"
sql "UPDATE encrypted_documents SET encrypted_blob = decode('$B2HEX','hex') WHERE id='$ID2'" >/dev/null
expect "fila restaurada: vuelve a descargarse" 200 "$(download "$TA" "$ID2" "$WORK/dl2.png")"
cmp -s "$WORK/a2.png" "$WORK/dl2.png" && ok "segundo documento recuperado intacto" || bad "el segundo documento difiere"

exit $fail
