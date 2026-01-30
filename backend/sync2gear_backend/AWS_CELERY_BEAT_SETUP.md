# AWS Celery Beat Setup Guide

This guide explains how to set up Celery Beat for automatic schedule execution on AWS.

## Overview

Celery Beat is a scheduler that runs periodic tasks. In this application, it automatically executes schedules every minute, checking which schedules should run and executing them.

## Current Configuration

The scheduler is already configured in `config/celery.py`:

```python
app.conf.beat_schedule = {
    'check-schedules-every-minute': {
        'task': 'apps.scheduler.tasks.check_schedules',
        'schedule': 60.0,  # Every minute
    },
}
```

This means `check_schedules` runs every 60 seconds, checking all active schedules and executing those that are due.

## AWS Deployment Options

### Option 1: ECS with Celery Beat Service (Recommended)

1. **Add Celery Beat to docker-compose.yml** (already included):
   ```yaml
   celery-beat:
     build: .
     command: celery -A config beat -l info
     volumes:
       - .:/app
     env_file:
       - .env
     depends_on:
       - db
       - redis
     environment:
       - DATABASE_URL=postgresql://...
       - CELERY_BROKER_URL=redis://...
       - CELERY_RESULT_BACKEND=redis://...
   ```

2. **Deploy to ECS**:
   - Create an ECS task definition that includes the Celery Beat service
   - Ensure Redis is accessible (ElastiCache or container)
   - Ensure PostgreSQL is accessible (RDS or container)
   - Run Celery Beat as a separate ECS service

3. **Environment Variables**:
   ```bash
   CELERY_BROKER_URL=redis://your-redis-endpoint:6379/0
   CELERY_RESULT_BACKEND=redis://your-redis-endpoint:6379/0
   DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/dbname
   ```

### Option 2: EC2 Instance with Supervisor

1. **Install Supervisor**:
   ```bash
   sudo apt-get install supervisor
   ```

2. **Create Supervisor config** (`/etc/supervisor/conf.d/celery-beat.conf`):
   ```ini
   [program:celery-beat]
   command=/path/to/venv/bin/celery -A config beat -l info
   directory=/path/to/backend/sync2gear_backend
   user=your-user
   autostart=true
   autorestart=true
   redirect_stderr=true
   stdout_logfile=/var/log/celery-beat.log
   environment=CELERY_BROKER_URL="redis://localhost:6379/0",CELERY_RESULT_BACKEND="redis://localhost:6379/0"
   ```

3. **Start Supervisor**:
   ```bash
   sudo supervisorctl reread
   sudo supervisorctl update
   sudo supervisorctl start celery-beat
   ```

### Option 3: AWS Lambda with EventBridge (Alternative)

For serverless deployment, you can use AWS EventBridge to trigger a Lambda function every minute:

1. **Create Lambda function** that calls the schedule check endpoint
2. **Set up EventBridge rule** to trigger every minute:
   ```json
   {
     "ScheduleExpression": "rate(1 minute)"
   }
   ```
3. **Lambda function code**:
   ```python
   import requests
   
   def lambda_handler(event, context):
       # Call your API endpoint
       response = requests.post('https://your-api.com/api/v1/schedules/simple/execute/')
       return {'statusCode': 200, 'body': 'Schedule check executed'}
   ```

## Verification

After deployment, verify Celery Beat is running:

1. **Check logs**:
   ```bash
   # ECS
   aws logs tail /ecs/celery-beat --follow
   
   # EC2
   tail -f /var/log/celery-beat.log
   ```

2. **Look for these log messages**:
   ```
   celery.beat: INFO: Scheduler: Sending due task check-schedules-every-minute
   ```

3. **Test schedule execution**:
   - Create a schedule in the UI
   - Wait for the interval to pass
   - Check that announcements are played automatically

## Troubleshooting

### Celery Beat not running
- Check if Redis is accessible
- Verify environment variables are set correctly
- Check container/service logs

### Schedules not executing
- Verify schedules are enabled (`enabled=True`)
- Check `last_executed_at` is updating
- Verify Celery workers are running (separate from Beat)
- Check PlaybackEngine logs

### Timezone issues
- Celery Beat uses UTC by default
- Ensure schedules account for timezone differences
- Consider setting `CELERY_TIMEZONE` in settings

## Production Checklist

- [ ] Redis (ElastiCache) is configured and accessible
- [ ] PostgreSQL (RDS) is configured and accessible
- [ ] Celery Beat service is running
- [ ] Celery Worker service is running (for task execution)
- [ ] Environment variables are set correctly
- [ ] Logs are being collected (CloudWatch, etc.)
- [ ] Monitoring/alerts are set up
- [ ] Backup strategy for schedule data

## Notes

- Celery Beat only schedules tasks; Celery Workers execute them
- Both Beat and Workers need access to Redis (broker)
- The `check_schedules` task runs every minute and checks all schedules
- Schedules execute automatically when their interval/time is reached
- No manual intervention needed once deployed

