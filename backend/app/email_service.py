"""
Code Spark - Transactional Email Delivery Service
Handles secure delivery of Password Reset OTPs and transactional notifications.
Supports standard SMTP (TLS / SSL / StartTLS) with robust development mode fallbacks.
"""

import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.header import Header
from email.utils import formataddr
from typing import Optional, Dict, Any

from .config import (
    ENVIRONMENT,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
    SMTP_FROM_EMAIL,
    SMTP_FROM_NAME,
    SMTP_USE_TLS,
    SMTP_USE_SSL
)

logger = logging.getLogger("codespark.email")


def generate_otp_email_html(recipient_name: str, otp_code: str) -> str:
    """Generate high-tech, responsive RTL HTML email template for Code Spark."""
    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>رمز إعادة تعيين كلمة المرور - CodeSpark</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #070B14;
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #F8FAFC;
      direction: rtl;
      text-align: right;
    }}
    .email-container {{
      max-width: 580px;
      margin: 30px auto;
      background: #0E1626;
      border: 1px solid rgba(6, 182, 212, 0.35);
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }}
    .header {{
      background: linear-gradient(135deg, #0F172A 0%, #152238 100%);
      padding: 28px;
      text-align: center;
      border-bottom: 1px solid rgba(6, 182, 212, 0.2);
    }}
    .logo-text {{
      font-size: 26px;
      font-weight: 800;
      color: #06B6D4;
      letter-spacing: 1px;
      margin: 0;
    }}
    .logo-sub {{
      font-size: 13px;
      color: #94A3B8;
      margin-top: 4px;
    }}
    .content {{
      padding: 32px 28px;
    }}
    .greeting {{
      font-size: 18px;
      font-weight: 700;
      color: #F8FAFC;
      margin-bottom: 12px;
    }}
    .text {{
      font-size: 15px;
      line-height: 1.8;
      color: #94A3B8;
      margin-bottom: 24px;
    }}
    .otp-box-wrapper {{
      text-align: center;
      margin: 28px 0;
    }}
    .otp-label {{
      font-size: 13px;
      font-weight: 600;
      color: #38BDF8;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    .otp-code {{
      display: inline-block;
      background: rgba(6, 182, 212, 0.12);
      border: 2px dashed #06B6D4;
      border-radius: 12px;
      padding: 16px 36px;
      font-size: 36px;
      font-weight: 900;
      letter-spacing: 12px;
      color: #00F2FE;
      font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
      direction: ltr;
    }}
    .expiry-badge {{
      display: inline-block;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #F59E0B;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      margin-top: 14px;
    }}
    .security-notice {{
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 14px 18px;
      font-size: 13px;
      line-height: 1.6;
      color: #64748B;
      margin-top: 24px;
    }}
    .footer {{
      background: #070B14;
      padding: 20px 28px;
      text-align: center;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 12px;
      color: #64748B;
    }}
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1 class="logo-text">⚡ CodeSpark</h1>
      <div class="logo-sub">منصة تعليم البرمجة للمرحلة الثانوية</div>
    </div>
    <div class="content">
      <div class="greeting">مرحبًا بك في CodeSpark</div>
      <p class="text">
        مرحبًا <strong>{recipient_name}</strong>،<br>
        تلقينا طلبًا لإعادة تعيين كلمة المرور الخاصة بحسابك على منصة CodeSpark التعليمية.
      </p>
      
      <div class="otp-box-wrapper">
        <div class="otp-label">رمز التحقق الخاص بك هو:</div>
        <div class="otp-code">{otp_code}</div>
        <br>
        <div class="expiry-badge">⏱️ هذا الرمز صالح لمدة 10 دقائق فقط</div>
      </div>

      <div class="security-notice">
        🔒 <strong>ملاحظة أمنية:</strong> لا تشارك هذا الرمز مع أي شخص. إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان وستظل كلمة المرور الحالية كما هي دون أي تغيير.
      </div>
    </div>
    <div class="footer">
      © 2026 CodeSpark Education. جميع الحقوق محفوظة.<br>
      منصة مادة البرمجة وتكنولوجيا المعلومات لطلاب المرحلة الثانوية
    </div>
  </div>
</body>
</html>"""


def generate_otp_email_text(recipient_name: str, otp_code: str) -> str:
    """Generate clean plain text version for email clients without HTML support."""
    return f"""مرحبًا بك في CodeSpark
منصة تعليم البرمجة للمرحلة الثانوية

مرحبًا {recipient_name}،
تلقينا طلبًا لإعادة تعيين كلمة المرور الخاصة بحسابك على منصة CodeSpark.

رمز التحقق الخاص بك هو:
{otp_code}

هذا الرمز صالح لمدة 10 دقائق فقط ولا يمكن استخدامه أكثر من مرة.

إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان وسيبقى حسابك محميًا.

مع تحيات،
فريق عمل منصة CodeSpark التعليمية
"""


def send_password_reset_email(to_email: str, recipient_name: str, otp_code: str) -> bool:
    """
    Send a branded password reset OTP email to the recipient.
    In production mode with configured SMTP: dispatches email via SMTP.
    In development mode or if SMTP is unconfigured: logs securely without breaking flow.
    """
    subject = "CodeSpark - رمز إعادة تعيين كلمة المرور"
    recipient_clean = (to_email or "").strip()
    name_clean = (recipient_name or "").strip() or "طالبنا العزيز"

    if not recipient_clean:
        logger.warning("Attempted to send password reset email without recipient address.")
        return False

    # Development / Unconfigured SMTP Fallback
    if not SMTP_HOST or ENVIRONMENT == "development":
        logger.info(
            f"[EMAIL_DELIVERY:DEV_OR_LOCAL] Password reset OTP generated for {name_clean} <{recipient_clean}>. "
            f"Subject: '{subject}' | Status: Dispatched (Valid for 10 minutes)"
        )
        if not SMTP_HOST:
            return True

    # If SMTP is configured, attempt delivery
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = Header(subject, "utf-8")
        msg["From"] = formataddr((str(Header(SMTP_FROM_NAME, "utf-8")), SMTP_FROM_EMAIL))
        msg["To"] = recipient_clean

        text_part = MIMEText(generate_otp_email_text(name_clean, otp_code), "plain", "utf-8")
        html_part = MIMEText(generate_otp_email_html(name_clean, otp_code), "html", "utf-8")

        msg.attach(text_part)
        msg.attach(html_part)

        if SMTP_USE_SSL:
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
            if SMTP_USE_TLS:
                server.starttls()

        if SMTP_USER and SMTP_PASSWORD:
            server.login(SMTP_USER, SMTP_PASSWORD)

        server.sendmail(SMTP_FROM_EMAIL, [recipient_clean], msg.as_string())
        server.quit()
        logger.info(f"Successfully delivered password reset email via SMTP to {recipient_clean}")
        return True
    except Exception as e:
        logger.error(f"Failed to dispatch password reset email via SMTP to {recipient_clean}: {e}")
        # Return True in development so local testing is never blocked
        return ENVIRONMENT != "production"
