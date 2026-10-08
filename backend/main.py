from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.router import register_routers

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_methods=["*"],
    allow_credentials=True,
    allow_headers=["*"],
    allow_origins=["*"]
)

register_routers(app)