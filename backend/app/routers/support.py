import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional, List, Dict, Any
from ..database import get_db, log_activity
from ..dependencies import get_current_user, get_current_admin, get_current_super_admin, get_current_staff
from ..models import SupportTicketCreateRequest, SupportTicketReplyRequest

router = APIRouter(prefix="/api/support", tags=["Academic Support & Helpdesk"])

@router.get("/tickets")
def get_tickets(current_user: dict = Depends(get_current_user)):
    """Fetch support tickets (students get their own, admin gets all)."""
    user_id = current_user["id"]
    is_admin = current_user["role"] == "admin"

    with get_db() as conn:
        cursor = conn.cursor()
        if is_admin:
            cursor.execute("SELECT * FROM support_tickets ORDER BY created_at DESC")
        else:
            cursor.execute("SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC", (user_id,))

        rows = [dict(r) for r in cursor.fetchall()]
        for r in rows:
            r["date"] = r["created_at"]
            r["studentName"] = r.get("student_name") or "طالب"
        return {"success": True, "tickets": rows}

@router.post("/tickets")
def create_ticket(req: SupportTicketCreateRequest, current_user: dict = Depends(get_current_user)):
    """Student creates an academic inquiry ticket."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    now_ts = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
    t_id = f"tick_{now_ts}"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO support_tickets (id, user_id, student_name, student_phone, subject, message, status, reply, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'open', '', ?, ?)
        """, (t_id, current_user["id"], current_user["name"], current_user.get("phone", ""), req.subject, req.message, now, now))

        return {"success": True, "ticket_id": t_id, "message": "تم إرسال استفسارك بنجاح وسيقوم المعلم بالرد عليك في أقرب وقت"}

@router.post("/tickets/{ticket_id}/reply")
def reply_ticket(ticket_id: str, req: SupportTicketReplyRequest, staff: dict = Depends(get_current_staff)):
    """Admin / Teacher replies to student inquiry."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM support_tickets WHERE id = ?", (ticket_id,))
        ticket = cursor.fetchone()
        if not ticket:
            raise HTTPException(status_code=404, detail="التذكرة غير موجودة")

        cursor.execute("UPDATE support_tickets SET reply = ?, status = 'answered', updated_at = ? WHERE id = ?", (req.reply, now, ticket_id))

        # Notify student
        now_ts = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
        n_id = f"notif_{now_ts}"
        cursor.execute("""
        INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
        VALUES (?, ?, '💬 تم الرد على استفسارك الأكاديمي', ?, 'info', 0, '#support', ?)
        """, (n_id, ticket["user_id"], f"رد المعلم على تذكرة: {ticket['subject']}", now))

        return {"success": True, "message": "تم إرسال الرد للطالب بنجاح"}

@router.put("/tickets/{ticket_id}/status")
def change_ticket_status(ticket_id: str, data: Dict[str, Any], staff: dict = Depends(get_current_staff)):
    """Admin: Change ticket status."""
    new_status = data.get("status", "closed")
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE support_tickets SET status = ?, updated_at = ? WHERE id = ?", (new_status, now, ticket_id))
        return {"success": True, "message": "تم تغيير حالة التذكرة بنجاح"}
