from fastapi import FastAPI

from . import auth, gmail


def register_routers(app: FastAPI):
    for router in [auth.router, gmail.router]:
        app.include_router(router)
