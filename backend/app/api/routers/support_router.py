"""
Code Spark - Support Tickets Router
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, Dict, Any
from app.api.deps import get_current_user
from app.repositories.all_repositories import SupportRepository
from app.schemas.all_schemas import SupportTicketCreate, SupportMessageCreate

router = APIRouter(prefix="/support", tags=["Support"])

@router.get("/tickets")
def list_tickets(user: Dict[str, Any] = Depends(get_current_user)):
    user_id = None if user.get("role") in ("admin", "assistant") else user["id"]
    tickets, total = SupportRepository.list_tickets(user_id=user_id)
    return {"tickets": tickets, "total": total}

@router.post("/tickets")
def create_ticket(req: SupportTicketCreate, user: Dict[str, Any] = Depends(get_current_user)):
    ticket = SupportRepository.create_ticket({
        "user_id": user["id"],
        "subject": req.subject,
        "status": "OPEN",
        "priority": req.priority
    })
    SupportRepository.add_message({
        "ticket_id": ticket["id"],
        "sender_id": user["id"],
        "message": req.message
    })
    return {"success": True, "ticket": ticket}

@router.get("/tickets/{ticket_id}/messages")
def get_ticket_messages(ticket_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    ticket = SupportRepository.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="التذكرة غير موجودة")
    if user.get("role") == "student" and ticket["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    messages = SupportRepository.get_messages(ticket_id)
    return {"messages": messages}

@router.post("/tickets/{ticket_id}/messages")
def add_ticket_message(ticket_id: str, req: SupportMessageCreate, user: Dict[str, Any] = Depends(get_current_user)):
    ticket = SupportRepository.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="التذكرة غير موجودة")
    if user.get("role") == "student" and ticket["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    msg = SupportRepository.add_message({
        "ticket_id": ticket_id,
        "sender_id": user["id"],
        "message": req.message
    })
    return {"success": True, "message": msg}
