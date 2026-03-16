from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import accounts, ai, crm, customer_portal, customers, ops, playbooks, projects, simulations, tasks
from app.core.config import settings
from app.db.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "Agile — Onboarding operations co-pilot for post-sale teams. "
            "Automates project setup from deals, adapts workflows by customer type, "
            "surfaces risk early, and gives internal teams and customers visibility from kickoff to go-live."
        ),
        lifespan=lifespan,
    )

    # Explicit origins so browser allows credentials; "*" + credentials is rejected by CORS.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    app.include_router(accounts.router)
    app.include_router(ai.router)
    app.include_router(crm.router)
    app.include_router(customer_portal.router)
    app.include_router(customers.router)
    app.include_router(ops.router)
    app.include_router(playbooks.router)
    app.include_router(projects.router)
    app.include_router(simulations.router)
    app.include_router(tasks.router)

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
