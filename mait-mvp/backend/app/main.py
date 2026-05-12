import os
import logging
import time
import uuid
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Load environment variables from .env file immediately
load_dotenv()

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

from .deps import limiter
from .logging_config import (
    configure_logging,
    get_recent_events,
    hash_identifier,
    log_event,
    request_context,
    sanitized_validation_errors,
    text_preview,
)
from .services import storage
from .routers import auth, chat, canvas, worksheet, analytics, misc, questions

configure_logging()
logger = logging.getLogger(__name__)

# Initialize Sentry for error tracking
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[FastApiIntegration()],
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

app = FastAPI(title="My AI Tutor")

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.middleware("http")
async def structured_request_logging(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
    request.state.request_id = request_id
    started = time.perf_counter()

    try:
        response = await call_next(request)
    except Exception:
        latency_ms = round((time.perf_counter() - started) * 1000, 2)
        log_event(
            logger,
            "api_request_error",
            level=logging.ERROR,
            message="Unhandled API request error",
            request_id=request_id,
            latency_ms=latency_ms,
            **request_context(request),
        )
        raise

    latency_ms = round((time.perf_counter() - started) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    log_event(
        logger,
        "api_request",
        request_id=request_id,
        status_code=response.status_code,
        latency_ms=latency_ms,
        **request_context(request),
    )
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    log_event(
        logger,
        "api_validation_error",
        level=logging.WARNING,
        message="Request validation failed",
        request_id=getattr(request.state, "request_id", None),
        validation_errors=sanitized_validation_errors(exc.errors()),
        **request_context(request),
    )
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    log_event(
        logger,
        "api_http_exception",
        level=logging.WARNING if exc.status_code < 500 else logging.ERROR,
        message="HTTP exception",
        request_id=getattr(request.state, "request_id", None),
        status_code=exc.status_code,
        detail=text_preview(exc.detail, limit=300),
        **request_context(request),
    )
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "Unhandled exception",
        extra={
            "event_type": "api_unhandled_exception",
            "request_id": getattr(request.state, "request_id", None),
            "error_type": type(exc).__name__,
            "error_message": str(exc),
            **request_context(request),
        },
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.on_event("startup")
async def startup_event():
    """Startup event - initialize SQLite database."""
    log_event(logger, "app_startup", message="MAIT Backend starting")
    await storage.init_db()
    log_event(logger, "database_initialized", message="SQLite database initialized")
    log_event(logger, "rag_enabled", message="RAG system enabled", vector_backend="FAISS")
    log_event(logger, "app_startup_complete", message="Application startup complete")


@app.get("/admin/recent-events")
async def recent_events(
    request: Request,
    student_id: Optional[str] = None,
    limit: int = Query(default=100, ge=1, le=100),
):
    """Return recent structured events for admin-only debugging."""
    admin_token = os.getenv("ADMIN_DEBUG_TOKEN")
    supplied_token = request.headers.get("X-Admin-Token")
    if not admin_token or supplied_token != admin_token:
        log_event(
            logger,
            "admin_recent_events_denied",
            level=logging.WARNING,
            message="Recent events admin access denied",
            request_id=getattr(request.state, "request_id", None),
            **request_context(request),
        )
        raise HTTPException(status_code=403, detail="Admin access required")

    student_id_hash = hash_identifier(student_id) if student_id else None
    events = get_recent_events(student_id_hash=student_id_hash, limit=limit)
    log_event(
        logger,
        "admin_recent_events_accessed",
        message="Recent events admin access granted",
        request_id=getattr(request.state, "request_id", None),
        student_filter_hash=student_id_hash,
        returned_count=len(events),
        **request_context(request),
    )
    return {"events": events, "count": len(events)}


# CORS - environment-based origins
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(misc.router)
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(canvas.router)
app.include_router(worksheet.router)
app.include_router(analytics.router)
app.include_router(questions.router)
