"""Prometheus metric definitions — single source of truth.

Other modules import the collectors they need from here.
"""

from __future__ import annotations

from prometheus_client import Counter, Gauge, Histogram

# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------
HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "route", "status_code"],
)

HTTP_REQUEST_DURATION = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "route", "status_code"],
)

# ---------------------------------------------------------------------------
# Scheduler jobs
# ---------------------------------------------------------------------------
JOB_DURATION_SECONDS = Histogram(
    "scheduler_job_duration_seconds",
    "Duration of scheduler job executions",
    ["job_name"],
)

JOB_RUNS_TOTAL = Counter(
    "scheduler_job_runs_total",
    "Total scheduler job runs",
    ["job_name", "status"],
)

JOB_ITEMS_PROCESSED = Counter(
    "scheduler_job_items_processed_total",
    "Items processed by scheduler jobs",
    ["job_name"],
)

# ---------------------------------------------------------------------------
# FCM
# ---------------------------------------------------------------------------
FCM_SEND_TOTAL = Counter(
    "fcm_send_total",
    "Total FCM sends",
    ["send_type", "result"],
)

# ---------------------------------------------------------------------------
# DB pool
# ---------------------------------------------------------------------------
DB_POOL_SIZE = Gauge("db_pool_size", "Current size of the DB connection pool")
DB_POOL_CHECKED_OUT = Gauge("db_pool_checked_out", "DB connections currently checked out")
DB_POOL_OVERFLOW = Gauge("db_pool_overflow", "DB connection pool overflow count")
