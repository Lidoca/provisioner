import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.main import api_router

# logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)-15s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

app = FastAPI(title="VM Provisioning API", version="1.0.0")

app.mount("/static", StaticFiles(directory="static"), name="static")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/provision")


@app.get("/")
async def root():
    return {"message": "VM Provisioning Service v1.0", "status": "ready"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
