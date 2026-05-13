from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.session import get_db
from ..services.artifact_engine import WorksheetRequest, generate_worksheet_latex, compile_latex_to_pdf
from ..services.document_service import create_document, get_document_for_student, get_documents_by_student, delete_document_for_student
from ..services.element_service import create_element_for_student, get_elements_for_student, update_element_for_student, delete_element_for_student
from ..services.latex_decomposer import parse_monolithic_latex
from ..services.revision_service import (
    create_revision_for_student, apply_revision_for_student, reject_revision_for_student, list_revisions_for_student,
)
from ..deps import get_current_student_id, verify_student_auth, limiter

router = APIRouter(prefix="/canvas", tags=["canvas"])


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
async def canvas_generate(
    request: Request,
    body: CanvasGenerateRequest,
    student_id: str = Depends(get_current_student_id),
    db: AsyncSession = Depends(get_db),
):
    await verify_student_auth(request, body.student_id)
    if body.student_id != student_id:
        raise HTTPException(status_code=404, detail="Student not found")

    try:
        latex_source = await generate_worksheet_latex(body.worksheet_request)
        title = f"{body.worksheet_request.worksheetSettings.subject} Worksheet"
        if body.worksheet_request.topicSummary:
            title = body.worksheet_request.topicSummary[:40]

        def escape_latex(s: str) -> str:
            return s.replace('\\', '\\textbackslash ').replace('_', '\\_').replace('%', '\\%').replace('$', '\\$').replace('&', '\\&').replace('#', '\\#').replace('{', '\\{').replace('}', '\\}')

        safe_title = escape_latex(title)
        element_data = parse_monolithic_latex(latex_source, safe_title)

        doc = await create_document(db, body.student_id, title)
        doc_id = doc["id"]

        saved_elements = []
        for elem in element_data:
            saved_elem = await create_element_for_student(
                db,
                document_id=doc_id,
                student_id=student_id,
                sort_key=elem["sort_key"],
                kind=elem["kind"],
                label=elem.get("label", "Element"),
                content_latex=elem["content_latex"],
                is_locked=elem["is_locked"],
                is_collapsed=elem["is_collapsed"]
            )
            saved_elements.append(saved_elem)

        return {"document": doc, "elements": saved_elements}
    except Exception as e:
        print(f"[Canvas Generate] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents")
async def list_canvas_documents(
    request: Request,
    student_id: str,
    current_student_id: str = Depends(get_current_student_id),
    db: AsyncSession = Depends(get_db),
):
    await verify_student_auth(request, student_id)
    if student_id != current_student_id:
        raise HTTPException(status_code=404, detail="Student not found")
    docs = await get_documents_by_student(db, student_id)
    return {"documents": docs}


@router.get("/documents/{doc_id}")
async def get_canvas_document(
    request: Request,
    doc_id: str,
    student_id: str = Depends(get_current_student_id),
    db: AsyncSession = Depends(get_db),
):
    doc = await get_document_for_student(db, doc_id, student_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    elements = await get_elements_for_student(db, doc_id, student_id)
    return {"document": doc, "elements": elements}


@router.post("/documents/{doc_id}/elements")
async def create_canvas_element(
    request: Request,
    doc_id: str,
    body: ElementCreateRequest,
    student_id: str = Depends(get_current_student_id),
    db: AsyncSession = Depends(get_db),
):
    doc = await get_document_for_student(db, doc_id, student_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    element = await create_element_for_student(
        db,
        document_id=doc_id,
        student_id=student_id,
        sort_key=body.sortKey,
        kind=body.kind,
        label=body.label,
        content_latex=body.contentLatex,
        is_locked=body.isLocked,
        is_collapsed=body.isCollapsed,
    )
    return {"element": element}


@router.put("/elements/{elem_id}")
async def update_canvas_element(
    request: Request,
    elem_id: str,
    body: ElementUpdateRequest,
    student_id: str = Depends(get_current_student_id),
    db: AsyncSession = Depends(get_db),
):
    updates = {k: v for k, v in body.dict(exclude_unset=True).items() if v is not None}
    updated = await update_element_for_student(db, elem_id, student_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Element not found")
    return {"element": updated}


@router.delete("/elements/{elem_id}")
async def delete_canvas_element(
    request: Request,
    elem_id: str,
    student_id: str = Depends(get_current_student_id),
    db: AsyncSession = Depends(get_db),
):
    deleted = await delete_element_for_student(db, elem_id, student_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Element not found")
    return {"status": "deleted"}


@router.delete("/documents/{doc_id}")
async def delete_canvas_document(
    request: Request,
    doc_id: str,
    student_id: str = Depends(get_current_student_id),
    db: AsyncSession = Depends(get_db),
):
    deleted = await delete_document_for_student(db, doc_id, student_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "deleted"}


@router.post("/compile")
async def compile_canvas_pdf(request: Request, body: CompileRequest):
    import tempfile
    import base64

    output_dir = tempfile.mkdtemp(prefix="mait_canvas_compile_")
    try:
        pdf_path = compile_latex_to_pdf(body.latex_source, output_dir)
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
        b64_pdf = base64.b64encode(pdf_bytes).decode('utf-8')
        return {"success": True, "pdfUrl": f"data:application/pdf;base64,{b64_pdf}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── Revision endpoints ──────────────────────────────────────────────


@router.post("/elements/{elem_id}/revise")
async def revise_canvas_element(
    request: Request,
    elem_id: str,
    body: ReviseRequest,
    student_id: str = Depends(get_current_student_id),
    db: AsyncSession = Depends(get_db),
):
    try:
        revision = await create_revision_for_student(db, elem_id, student_id, body.instruction)
        return {"revision": revision}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/revisions/{rev_id}/apply")
async def apply_canvas_revision(
    request: Request,
    rev_id: str,
    student_id: str = Depends(get_current_student_id),
    db: AsyncSession = Depends(get_db),
):
    try:
        revision = await apply_revision_for_student(db, rev_id, student_id)
        return {"revision": revision}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/revisions/{rev_id}/reject")
async def reject_canvas_revision(
    request: Request,
    rev_id: str,
    student_id: str = Depends(get_current_student_id),
    db: AsyncSession = Depends(get_db),
):
    try:
        revision = await reject_revision_for_student(db, rev_id, student_id)
        return {"revision": revision}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/documents/{doc_id}/revisions")
async def list_canvas_revisions(
    request: Request,
    doc_id: str,
    element_id: Optional[str] = None,
    student_id: str = Depends(get_current_student_id),
    db: AsyncSession = Depends(get_db),
):
    revisions = await list_revisions_for_student(db, doc_id, student_id, element_id)
    return {"revisions": revisions}


# ── Vision parse endpoint ───────────────────────────────────────────


@router.post("/documents/{doc_id}/vision-parse")
async def vision_parse_document(
    request: Request,
    doc_id: str,
    body: VisionParseRequest,
    student_id: str = Depends(get_current_student_id),
    db: AsyncSession = Depends(get_db),
):
    from ..services.image_to_fragment_service import vision_parse

    doc = await get_document_for_student(db, doc_id, student_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Resolve insertion sort_key from element id if provided
    insert_after_sort_key = None
    if body.insert_after_element_id:
        elements = await get_elements_for_student(db, doc_id, student_id)
        for e in elements:
            if e["id"] == body.insert_after_element_id:
                insert_after_sort_key = e["sortKey"]
                break

    try:
        elements, placeholders_used = await vision_parse(
            db, body.image_base64, body.image_mime_type, doc_id, student_id, insert_after_sort_key
        )
        return {
            "elements": elements,
            "placeholders_used": placeholders_used,
            "total_elements": len(elements),
        }
    except Exception as e:
        print(f"[Vision Parse] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
