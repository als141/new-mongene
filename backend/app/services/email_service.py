import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config.settings import get_settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        s = get_settings()
        self.host = s.smtp_host
        self.port = s.smtp_port
        self.from_addr = s.smtp_from
        self.password = s.smtp_password

    async def send_email(self, to: str, subject: str, body: str) -> bool:
        if not self.from_addr or not self.password:
            logger.warning("SMTP not configured")
            return False
        try:
            msg = MIMEMultipart()
            msg["From"] = self.from_addr
            msg["To"] = to
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain", "utf-8"))

            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls()
                server.login(self.from_addr, self.password)
                server.sendmail(self.from_addr, to, msg.as_string())
            return True
        except Exception as e:
            logger.exception(f"Email send failed: {e}")
            return False

    async def send_password_reset(self, to: str, new_password: str) -> bool:
        body = (
            f"パスワードがリセットされました。\n\n"
            f"新しいパスワード: {new_password}\n\n"
            f"ログイン後、パスワードを変更してください。"
        )
        return await self.send_email(to, "【モンジェネ】パスワードリセット", body)
