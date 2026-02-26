from __future__ import annotations

import json
import logging
from enum import Enum

from .config import FCM_ENABLED, FIREBASE_CREDENTIALS_JSON
from .metrics import FCM_SEND_TOTAL

logger = logging.getLogger(__name__)

_initialized = False


class SendResult(Enum):
    SUCCESS = "success"
    FAILED = "failed"
    TOKEN_INVALID = "token_invalid"


def _is_token_invalid(exc: Exception) -> bool:
    """Check if an FCM error indicates the device token is stale/unregistered."""
    try:
        from firebase_admin.exceptions import NotFoundError
        from firebase_admin.messaging import UnregisteredError

        if isinstance(exc, (UnregisteredError, NotFoundError)):
            return True
    except ImportError:
        pass
    error_str = str(exc).lower()
    return "not found" in error_str or "unregistered" in error_str


def init_fcm() -> None:
    """Initialize Firebase Admin SDK from JSON env var."""
    global _initialized
    if not FCM_ENABLED:
        logger.info("FCM disabled (FCM_ENABLED is not set)")
        return
    if not FIREBASE_CREDENTIALS_JSON:
        logger.warning("FCM_ENABLED but FIREBASE_CREDENTIALS_JSON is missing")
        return
    try:
        import firebase_admin
        from firebase_admin import credentials

        cred_dict = json.loads(FIREBASE_CREDENTIALS_JSON)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        _initialized = True
        logger.info("Firebase Admin SDK initialized")
    except Exception as exc:
        logger.error("Failed to initialize Firebase: %s", exc)


def send_notification(
    token: str,
    title: str,
    body: str,
    data: dict[str, str] | None = None,
) -> SendResult:
    """Send a standard push notification (OS-displayed)."""
    if not _initialized:
        logger.debug("FCM not initialized, skipping notification")
        return SendResult.FAILED
    try:
        from firebase_admin import messaging

        message = messaging.Message(
            token=token,
            notification=messaging.Notification(title=title, body=body),
            data=data or {},
        )
        messaging.send(message)
        FCM_SEND_TOTAL.labels(send_type="notification", result="success").inc()
        return SendResult.SUCCESS
    except Exception as exc:
        if _is_token_invalid(exc):
            logger.warning("FCM send_notification: token invalid, should be removed: %s", exc)
            FCM_SEND_TOTAL.labels(send_type="notification", result="token_invalid").inc()
            return SendResult.TOKEN_INVALID
        logger.error("FCM send_notification failed: %s", exc)
        FCM_SEND_TOTAL.labels(send_type="notification", result="failed").inc()
        return SendResult.FAILED


def send_page(
    token: str,
    data: dict[str, str],
) -> SendResult:
    """Send a data-only high-priority FCM message for alarm-style display."""
    if not _initialized:
        logger.debug("FCM not initialized, skipping page")
        return SendResult.FAILED
    try:
        from firebase_admin import messaging

        message = messaging.Message(
            token=token,
            data=data,
            android=messaging.AndroidConfig(
                priority="high",
                ttl=0,
            ),
        )
        messaging.send(message)
        FCM_SEND_TOTAL.labels(send_type="page", result="success").inc()
        return SendResult.SUCCESS
    except Exception as exc:
        if _is_token_invalid(exc):
            logger.warning("FCM send_page: token invalid, should be removed: %s", exc)
            FCM_SEND_TOTAL.labels(send_type="page", result="token_invalid").inc()
            return SendResult.TOKEN_INVALID
        logger.error("FCM send_page failed: %s", exc)
        FCM_SEND_TOTAL.labels(send_type="page", result="failed").inc()
        return SendResult.FAILED
