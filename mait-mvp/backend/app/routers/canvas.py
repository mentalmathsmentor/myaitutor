from typing import Optional
import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from ..services.artifact_engine import WorksheetRequest, generate_worksheet_latex, compile_latex_to_pdf
from ..services.document_service import create_document, get_document, get_documents_by_student, delete_document
from ..services.element_service import create_element, get_elements, update_element, delete_element
from ..services.latex_decomposer import parse_monolithic_latex
from ..services.revision_service import (
    create_revision, apply_revision, reject_revision, list_revisions,
)
from ..deps import verify_student_auth, limiter
from ..logging_config import hash_identifier, log_event, text_preview

router = APIRouter(prefix="/canvas", tags=["canvas"])
logger = logging.getLogger(__name__)


def _actor_student_id(request: Request) -> Optional[str]:
    return request.headers.get("X-Student-Id") or request.headers.get("x-student-id")


class CanvasGenerateRequest(BaseModel):
    student_id: str
    worksheet_request: WorksheetRequest


class ElementUpdateRequest(BaseModel):
    contentLatex: Optional[str] = None
    sortKey: Optional[str] = None
    isLocked: Optional[bool] = None
    isCollapsed: Optional[bool] = None
    label: Optional[str] = None


class ElementCreateRequest(BaseModel):
    sortKey: str
    kind: str
    label: str = "Element"
    contentLatex: str = ""
    isLocked: bool = False
    isCollapsed: bool = False


class CompileRequest(BaseModel):
    latex_source: str


class ReviseRequest(BaseModel):
    instruction: str


class VisionParseRequest(BaseModel):
    image_base64: str
    image_mime_type: str = "image/jpeg"
    insert_after_element_id: Optional[str] = None


@router.post("/generate")
@limiter.limit("5/minute")
async def canvas_generate(request: Request, body: CanvasGenerateRequest):
    await verify_student_auth(request, body.student_id)

    try:
        latex_source = await generate_worksheet_latex(
            body.worksheet_request,
            student_id=body.student_id,
        )
        title = f"{body.worksheet_request.worksheetSettings.subject} Worksheet"
        if body.worksheet_request.topicSummary:
            title = body.worksheet_request.topicSummary[:40]

        def escape_latex(s: str) -> str:
            return s.replace('\\', '\\textbackslash ').replace('_', '\\_').replace('%', '\\%').replace('$', '\\$').replace('&', '\\&').replace('#', '\\#').replace('{', '\\{').replace('}', '\\}')

        safe_title = escape_latex(title)
        element_data = parse_monolithic_latex(latex_source, safe_title)

        doc = await create_document(body.student_id, title)
        doc_id = doc["id"]

        saved_elements = []
        for elem in element_data:
            saved_elem = await create_element(
                document_id=doc_id,
                sort_key=elem["sort_key"],
                kind=elem["kind"],
                label=elem.get("label", "Element"),
                content_latex=elem["content_latex"],
                is_locked=elem["is_locked"],
                is_collapsed=elem["is_collapsed"]
            )
            saved_elements.append(saved_elem)

        log_event(
            logger,
            "canvas_operation",
            action="document_generated",
            document_id_hash=hash_identifier(doc_id),
            student_id_hash=hash_identifier(body.student_id),
            changed_fields=["document", "document_elements"],
            inserted_count=len(saved_elements),
            worksheet_subject=body.worksheet_request.worksheetSettings.subject,
            worksheet_course=body.worksheet_request.worksheetSettings.course,
        )
        return {"document": doc, "elements": saved_elements}
    except Exception as e:
        log_event(
            logger,
            "canvas_operation_error",
            level=logging.ERROR,
            action="document_generated",
            error_type=type(e).__name__,
            error_message=str(e),
            student_id_hash=hash_identifier(body.student_id),
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents")
async def list_canvas_documents(request: Request, student_id: str):
    await verify_student_auth(request, student_id)
    docs = await get_documents_by_student(student_id)
    log_event(
        logger,
        "canvas_operation",
        action="documents_listed",
        student_id_hash=hash_identifier(student_id),
        returned_count=len(docs),
    )
    return {"documents": docs}


@router.get("/documents/{doc_id}")
async def get_canvas_document(request: Request, doc_id: str):
    doc = await get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    elements = await get_elements(doc_id)
    log_event(
        logger,
        "canvas_operation",
        action="document_loaded",
        document_id_hash=hash_identifier(doc_id),
        student_id_hash=hash_identifier(_actor_student_id(request)),
        returned_count=len(elements),
    )
    return {"document": doc, "elements": elements}


@router.post("/documents/{doc_id}/elements")
async def create_canvas_element(request: Request, doc_id: str, body: ElementCreateRequest):
    doc = await get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    element = await create_element(
        document_id=doc_id,
        sort_key=body.sortKey,
        kind=body.kind,
        label=body.label,
        content_latex=body.contentLatex,
        is_locked=body.isLocked,
        is_collapsed=body.isCollapsed,
    )
    log_event(
        logger,
        "canvas_operation",
        action="element_created",
        document_id_hash=hash_identifier(doc_id),
        element_id_hash=hash_identifier(element["id"]),
        student_id_hash=hash_identifier(_actor_student_id(request)),
        changed_fields=["document_elements"],
        element_kind=body.kind,
    )
    return {"element": element}


@router.put("/elements/{elem_id}")
async def update_canvas_element(request: Request, elem_id: str, body: ElementUpdateRequest):
    updates = {k: v for k, v in body.dict(exclude_unset=True).items() if v is not None}
    updated = await update_element(elem_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Element not found")
    log_event(
        logger,
        "canvas_operation",
        action="element_updated",
        document_id_hash=hash_identifier(updated.get("documentId")),
        element_id_hash=hash_identifier(elem_id),
        student_id_hash=hash_identifier(_actor_student_id(request)),
        changed_fields=sorted(updates.keys()),
    )
    return {"element": updated}


@router.delete("/elements/{elem_id}")
async def delete_canvas_element(request: Request, elem_id: str):
    deleted = await delete_element(elem_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Element not found")
    log_event(
        logger,
        "canvas_operation",
        action="element_deleted",
        element_id_hash=hash_identifier(elem_id),
        student_id_hash=hash_identifier(_actor_student_id(request)),
        changed_fields=["document_elements"],
    )
    return {"status": "deleted"}


@router.delete("/documents/{doc_id}")
async def delete_canvas_document(request: Request, doc_id: str):
    deleted = await delete_document(doc_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    log_event(
        logger,
        "canvas_operation",
        action="document_deleted",
        document_id_hash=hash_identifier(doc_id),
        student_id_hash=hash_identifier(_actor_student_id(request)),
        changed_fields=["document", "document_elements", "document_revisions"],
    )
    return {"status": "deleted"}


@router.post("/compile")
async def compile_canvas_pdf(request: Request, body: CompileRequest):
    import tempfile
    import base64

    output_dir = tempfile.mkdtemp(prefix="mait_canvas_compile_")
    try:
        log_event(
            logger,
            "canvas_operation",
            action="document_compile_requested",
            student_id_hash=hash_identifier(_actor_student_id(request)),
            changed_fields=["artifact_build"],
            latex_source=text_preview(body.latex_source),
        )
        pdf_path = compile_latex_to_pdf(body.latex_source, output_dir)
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
        b64_pdf = base64.b64encode(pdf_bytes).decode('utf-8')
        log_event(
            logger,
            "canvas_operation",
            action="document_compile_succeeded",
            student_id_hash=hash_identifier(_actor_student_id(request)),
            changed_fields=["artifact_build"],
            pdf_bytes_length=len(pdf_bytes),
        )
        return {"success": True, "pdfUrl": f"data:application/pdf;base64,{b64_pdf}"}
    except Exception as e:
        log_event(
            logger,
            "canvas_operation_error",
            level=logging.ERROR,
            action="document_compile_failed",
            error_type=type(e).__name__,
            error_message=str(e),
            student_id_hash=hash_identifier(_actor_student_id(request)),
        )
        return {"success": False, "error": str(e)}


# ── Revision endpoints ──────────────────────────────────────────────


@router.post("/elements/{elem_id}/revise")
async def revise_canvas_element(request: Request, elem_id: str, body: ReviseRequest):
    try:
        revision = await create_revision(
            elem_id,
            body.instruction,
            actor_student_id=_actor_student_id(request),
        )
        return {"revision": revision}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/revisions/{rev_id}/apply")
async def apply_canvas_revision(request: Request, rev_id: str):
    try:
        revision = await apply_revision(
            rev_id,
            actor_student_id=_actor_student_id(request),
        )
        return {"revision": revision}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/revisions/{rev_id}/reject")
async def reject_canvas_revision(request: Request, rev_id: str):
    try:
        revision = await reject_revision(
            rev_id,
            actor_student_id=_actor_student_id(request),
        )
        return {"revision": revision}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/documents/{doc_id}/revisions")
async def list_canvas_revisions(request: Request, doc_id: str, element_id: Optional[str] = None):
    revisions = await list_revisions(doc_id, element_id)
    log_event(
        logger,
        "canvas_operation",
        action="revisions_listed",
        document_id_hash=hash_identifier(doc_id),
        element_id_hash=hash_identifier(element_id),
        student_id_hash=hash_identifier(_actor_student_id(request)),
        returned_count=len(revisions),
    )
    return {"revisions": revisions}


# ── Vision parse endpoint ───────────────────────────────────────────


@router.post("/documents/{doc_id}/vision-parse")
async def vision_parse_document(request: Request, doc_id: str, body: VisionParseRequest):
    from ..services.image_to_fragment_service import vision_parse

    doc = await get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Resolve insertion sort_key from element id if provided
    insert_after_sort_key = None
    if body.insert_after_element_id:
        elements = await get_elements(doc_id)
        for e in elements:
            if e["id"] == body.insert_after_element_id:
                insert_after_sort_key = e["sortKey"]
                break

    try:
        elements, placeholders_used = await vision_parse(
            body.image_base64,
            body.image_mime_type,
            doc_id,
            insert_after_sort_key,
            actor_student_id=_actor_student_id(request),
        )
        return {
            "elements": elements,
            "placeholders_used": placeholders_used,
            "total_elements": len(elements),
        }
    except Exception as e:
        log_event(
            logger,
            "canvas_operation_error",
            level=logging.ERROR,
            action="vision_parse_failed",
            error_type=type(e).__name__,
            error_message=str(e),
            document_id_hash=hash_identifier(doc_id),
            student_id_hash=hash_identifier(_actor_student_id(request)),
        )
        raise HTTPException(status_code=500, detail=str(e))
