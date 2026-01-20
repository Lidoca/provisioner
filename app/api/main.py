from fastapi import APIRouter

from app.api.routes import api, dashboard

api_router = APIRouter()
api_router.include_router(api.router)
api_router.include_router(dashboard.router)
