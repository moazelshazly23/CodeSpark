from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional
import uuid
from app.schemas.all_schemas import TicketCreateRequest, TicketMessageRequest, TicketStatusRequest
from app.repositories.all_repositories import SupportRepository
from app.api.deps import get_current_user
from app.db.engine import db_engine, now_iso

router = APIRouter(prefix="/support", tags=["Support"])

@router.get("/tickets")
def list_tickets(status_filter: Optional[str] = None, user: Dict[str, Any] = Depends(get_current_user)):
    user_id = user["id"] if user["role"] == "student" else None
    tickets, total = SupportRepository.list_tickets(user_id=user_id, status=status_filter)
    return tickets

@router.post("/tickets")
def create_ticket(req: TicketCreateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    with db_engine.transaction():
        ticket_id = uuid.uuid4().hex
        rec = {
            "id": ticket_id,
            "user_id": user["id"],
            "subject": req.subject,
            "category": req.category,
            "priority": req.priority,
            "status": "OPEN",
            "created_at": now_iso(),
            "updated_at": now_iso()
        }
        db_engine.insert("support_tickets", rec)
        # Add initial message
        msg_rec = {
            "id": uuid.uuid4().hex,
            "ticket_id": ticket_id,
            "sender_id": user["id"],
            "message": req.message,
            "is_staff_reply": 0,
            "created_at": now_iso()
        }
        db_engine.insert("support_messages", msg_rec)
        return rec

@router.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    ticket = SupportRepository.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="التذكرة غير موجودة")
    if ticket["user_id"] != user["id"] and user.get("role") not in ("admin", "assistant"):
        raise HTTPException(status_code=403, detail="غير مصرح بعرض هذه التذكرة")
    messages = SupportRepository.get_messages(ticket_id)
    ticket["messages"] = messages
    return ticket

@router.post("/tickets/{ticket_id}/messages")
def add_message(ticket_id: str, req: TicketMessageRequest, user: Dict[str, Any] = Depends(get_current_user)):
    ticket = SupportRepository.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="التذكرة غير موجودة")
    if ticket["user_id"] != user["id"] and user.get("role") not in ("admin", "assistant"):
        raise HTTPException(status_code=403, detail="غير مصرح بإرسال رد لهذه التذكرة")

    is_staff = user.get("role") in ("admin", "assistant")
    msg = SupportRepository.add_message({
        "id": uuid.uuid4().hex,
        "ticket_id": ticket_id,
        "sender_id": user["id"],
        "message": req.message,
        "is_staff_reply": 1 if is_staff else 0,
        "created_at": now_iso()
    })
    # If staff reply, update status to WAITING (waiting on student)
    if is_staff:
        db_engine.execute("UPDATE support_tickets SET status = 'WAITING' WHERE id = ?", (ticket_id,))
    else:
        db_engine.execute("UPDATE support_tickets SET status = 'IN_PROGRESS' WHERE id = ?", (ticket_id,))
    return msg

@router.put("/tickets/{ticket_id}/status")
def update_ticket_status(ticket_id: str, req: TicketStatusRequest, user: Dict[str, Any] = Depends(get_current_user)):
    if user.get("role") not in ("admin", "assistant"):
        raise HTTPException(status_code=403, detail="مخصص للإدارة والمساعدين فقط")
    res = db_engine.update("support_tickets", ticket_id, {"status": req.status})
    return res
