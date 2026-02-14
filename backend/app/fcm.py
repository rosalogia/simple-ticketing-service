from __future__ import annotations

import json
import logging

from .config import FCM_ENABLED, FIREBASE_CREDENTIALS_JSON

logger = logging.getLogger(__name__)

_initialized = False


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
) -> bool:
    """Send a standard push notification (OS-displayed)."""
    if not _initialized:
        logger.debug("FCM not initialized, skipping notification")
        return False
    try:
        from firebase_admin import messaging

        message = messaging.Message(
            token=token,
            notification=messaging.Notification(title=title, body=body),
            data=data or {},
        )
        messaging.send(message)
        return True
    except Exception as exc:
        logger.error("FCM send_notification failed: %s", exc)
        return False


def send_page(
    token: str,
    data: dict[str, str],
) -> bool:
    """Send a data-only high-priority FCM message for alarm-style display."""
    if not _initialized:
        logger.debug("FCM not initialized, skipping page")
        return False
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
        return True
    except Exception as exc:
        logger.error("FCM send_page failed: %s", exc)
        return False
