from celery import Celery
import os

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "sentinel",
    broker=redis_url,
    backend=redis_url,
    include=["tasks"]
)

celery_app.conf.beat_schedule = {
    'run-scheduled-checks': {
        'task': 'tasks.schedule_checks',
        'schedule': 10.0, # every 10 seconds check which monitor is due
    },
}
