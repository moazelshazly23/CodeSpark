import sys
import os
from pathlib import Path

# Add backend and root directory to sys.path
root_dir = Path(__file__).resolve().parent
backend_dir = root_dir / "backend"
for p in [str(root_dir), str(backend_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app.config import ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD
from backend.app.database import get_db, init_db
from backend.app.security import hash_password

# Allow passing custom credentials via CLI arguments: python reset_admin.py [password] [email] [phone] [name]
new_password = sys.argv[1] if len(sys.argv) > 1 else (ADMIN_PASSWORD or "admin12345")
new_email = sys.argv[2] if len(sys.argv) > 2 else (ADMIN_EMAIL or "admin@codespark.edu.eg")
new_phone = sys.argv[3] if len(sys.argv) > 3 else (ADMIN_PHONE or "01000000000")
new_name = sys.argv[4] if len(sys.argv) > 4 else (ADMIN_NAME or "مشرف المنصة العام")

init_db()
with get_db() as conn:
    cursor = conn.cursor()
    h = hash_password(new_password)
    cursor.execute("""
    UPDATE users 
    SET email = ?, 
        phone = ?, 
        password_hash = ?, 
        name = ?,
        status = 'ACTIVE', 
        is_active = 1, 
        is_deleted = 0 
    WHERE role LIKE '%ADMIN%' OR id = 'admin_1'
    """, (new_email, new_phone, h, new_name))
    
    if cursor.rowcount == 0:
        cursor.execute("""
        INSERT INTO users (id, name, email, phone, password_hash, role, avatar, is_active, status, is_deleted, created_at, updated_at)
        VALUES ('admin_1', ?, ?, ?, ?, 'SUPER_ADMIN', 'مع', 1, 'ACTIVE', 0, '2026-09-03T18:00:00Z', '2026-09-03T18:00:00Z')
        """, (new_name, new_email, new_phone, h))
    
    print("\n" + "=" * 65)
    print("✅ تم ضبط بيانات حساب المشرف العام بنجاح (جاهز للتشغيل):")
    print(f"👤 الاسم: {new_name}")
    print(f"📧 البريد الإلكتروني: {new_email}")
    print(f"📱 رقم الهاتف: {new_phone}")
    print(f"🔑 كلمة المرور: {new_password}")
    print("=" * 65)
    print("💡 يمكنك تغيير أي من هذه البيانات في أي وقت بتمريرها للأمر:")
    print("   python reset_admin.py [password] [email] [phone]\n")
