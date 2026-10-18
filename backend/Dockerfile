# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app ./app

EXPOSE 8443

# Para habilitar HTTPS/TLS en producción, añadir:
# "--ssl-keyfile", "/app/certs/key.pem", "--ssl-certfile", "/app/certs/cert.pem"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8443"]