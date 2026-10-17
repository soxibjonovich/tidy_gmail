from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import init_db
from src.router import register_routers


@asynccontextmanager
async def lifespan(_):
    await init_db.init_db()
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_methods=["*"],
    allow_credentials=True,
    allow_headers=["*"],
    allow_origins=["*"],
    expose_headers=["Authorization"],
)

register_routers(app)
