import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import get_settings
from app.api.v1 import health, problems, auth, search_filters, source_list, chat, geometry, pdf

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title="MonGene API",
    description="AI数学問題生成システム",
    version="1.0.0",
)

origins = [o.strip() for o in settings.cors_allow_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(problems.router, prefix="/api/v1", tags=["problems"])
app.include_router(search_filters.router, prefix="/api/v1", tags=["search-filters"])
app.include_router(source_list.router, prefix="/api/v1", tags=["source-list"])
app.include_router(chat.router, prefix="/api/v1", tags=["chat"])
app.include_router(geometry.router, prefix="/api/v1", tags=["geometry"])
app.include_router(pdf.router, prefix="/api/v1", tags=["pdf"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
