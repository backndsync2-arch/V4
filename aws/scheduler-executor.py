"""
EventBridge Lambda function to execute scheduled announcements.
Runs every minute to check for schedules that need to be executed.
"""

import json
import boto3
import os
import requests
from datetime import datetime, timedelta

# Initialize clients
dynamodb = boto3.resource('dynamodb')
sqs = boto3.client('sqs')

# Environment variables
SCHEDULES_TABLE = os.environ.get('SCHEDULES_TABLE_NAME', 'production-sync2gear-schedules')
TASK_QUEUE_URL = os.environ.get('TASK_QUEUE_URL', '')


def handler(event, context):
    """
    Check for schedules that need to be executed and trigger them.
    """
    print(f"Checking schedules at {datetime.now()}")
    
    try:
        # Get active schedules from database
        # In a real implementation, this would query Aurora
        # For now, we'll use a simplified approach
        
        # Get schedules that should execute now
        schedules_to_execute = get_schedules_to_execute()
        
        executed_count = 0
        for schedule in schedules_to_execute:
            try:
                execute_schedule(schedule)
                executed_count += 1
            except Exception as e:
                print(f"Error executing schedule {schedule.get('id')}: {e}")
        
        print(f"Executed {executed_count} schedules")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'executed': executed_count,
                'timestamp': datetime.now().isoformat()
            })
        }
    except Exception as e:
        print(f"Error in scheduler executor: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def get_schedules_to_execute():
    """
    Get schedules that should be executed now.
    This would typically query Aurora database.
    """
    # TODO: Implement database query
    # For now, return empty list
    return []


def execute_schedule(schedule):
    """
    Execute a schedule by sending announcement play request.
    """
    schedule_id = schedule.get('id')
    announcement_ids = schedule.get('announcementIds', [])
    zone_ids = schedule.get('zoneIds', [])
    
    print(f"Executing schedule {schedule_id}")
    
    # Send task to SQS for async processing
    for announcement_id in announcement_ids:
        for zone_id in zone_ids:
            message = {
                'action': 'play_announcement',
                'announcementId': announcement_id,
                'zoneId': zone_id,
                'scheduleId': schedule_id,
                'timestamp': datetime.now().isoformat()
            }
            
            sqs.send_message(
                QueueUrl=TASK_QUEUE_URL,
                MessageBody=json.dumps(message)
            )
    
    # Update last executed time in database
    update_schedule_last_executed(schedule_id)


def update_schedule_last_executed(schedule_id):
    """Update the last executed timestamp for a schedule."""
    # TODO: Implement database update
    pass

