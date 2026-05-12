import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import FileResponse

from ..deps import limiter
from ..logging_config import hash_identifier, log_event, text_preview
from ..services.artifact_engine import (
    WorksheetRequest,
    generate_worksheet_pdf,
    get_topics_for_year,
    get_all_topics,
)

router = APIRouter(tags=["worksheet"])
logger = logging.getLogger(__name__)


@router.post("/generate-worksheet")
@limiter.limit("5/minute")
async def generate_worksheet(request: Request, body: WorksheetRequest):
    """
    Generate a NESA-styled maths worksheet PDF.
    """
    pdf_path: Optional[str] = None
    student_id = request.headers.get("X-Student-Id") or request.headers.get("x-student-id")
    try:
        pdf_path = await generate_worksheet_pdf(body, student_id=student_id)

        safe_topic = body.topicSummary.replace(" ", "_").replace("/", "-")[:40]
        filename = f"worksheet_{body.worksheetSettings.course.replace(' ', '')}_{safe_topic}.pdf"
        log_event(
            logger,
            "worksheet_endpoint_success",
            student_id_hash=hash_identifier(student_id),
            worksheet_course=body.worksheetSettings.course,
            worksheet_subject=body.worksheetSettings.subject,
            topic_summary=text_preview(body.topicSummary),
            output_filename=filename,
        )

        return FileResponse(
            path=pdf_path,
            media_type="application/pdf",
            filename=filename,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except RuntimeError as e:
        log_event(
            logger,
            "worksheet_endpoint_error",
            level=logging.ERROR,
            error_type=type(e).__name__,
            error_message=str(e),
            student_id_hash=hash_identifier(student_id),
            worksheet_course=body.worksheetSettings.course,
            worksheet_subject=body.worksheetSettings.subject,
            topic_summary=text_preview(body.topicSummary),
        )
        raise HTTPException(
            status_code=502,
            detail={"error": "worksheet_generation_failed", "message": str(e)},
        )
    except Exception as e:
        log_event(
            logger,
            "worksheet_endpoint_error",
            level=logging.ERROR,
            error_type=type(e).__name__,
            error_message=str(e),
            student_id_hash=hash_identifier(student_id),
            worksheet_course=body.worksheetSettings.course,
            worksheet_subject=body.worksheetSettings.subject,
            topic_summary=text_preview(body.topicSummary),
        )
        raise HTTPException(
            status_code=500,
            detail={"error": "internal_error", "message": f"An unexpected error occurred: {str(e)}"},
        )


@router.get("/worksheet-topics")
def list_worksheet_topics(year_level: Optional[int] = Query(default=None, ge=7, le=12)):
    """Return available worksheet topics from the NSW HSC syllabus catalogue."""
    if year_level is not None:
        topics = get_topics_for_year(year_level)
        if not topics:
            raise HTTPException(
                status_code=404,
                detail=f"No topics found for year level {year_level}.",
            )
        return {
            "year_level": year_level,
            "topics": topics,
            "count": len(topics),
        }

    all_topics = get_all_topics()
    return {
        "year_levels": sorted(all_topics.keys()),
        "topics_by_year": {
            str(year): {"topics": topics, "count": len(topics)}
            for year, topics in sorted(all_topics.items())
        },
        "total_topics": sum(len(t) for t in all_topics.values()),
    }
