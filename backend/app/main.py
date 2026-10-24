from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.connection import Base, engine
from app.core.error_handler import global_exception_handler
from app.api.endpoints import auth, offers, documents, posts

# Creación de tablas en caso de no usar init.sql
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="UPC AlumNet API",
    description="Professional talent network connecting UPC students with alumni",
    version="1.0.0",
    docs_url="/docs",       # Swagger UI habilitado para escaneo activo con OWASP ZAP
    openapi_url="/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://localhost:3000", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.add_exception_handler(Exception, global_exception_handler)

app.include_router(auth.router)
app.include_router(offers.router)
app.include_router(documents.router)
app.include_router(posts.router)


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "project": "UPC AlumNet"}