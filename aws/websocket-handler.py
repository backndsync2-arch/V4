"""
WebSocket handler for API Gateway WebSocket API.
Handles real-time connections for device status and playback updates.
"""

import json
import boto3
import os
import time
from decimal import Decimal

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
connections_table = dynamodb.Table(os.environ.get('CONNECTIONS_TABLE_NAME', 'production-sync2gear-connections'))

# Initialize API Gateway Management API
apigw = boto3.client('apigatewaymanagementapi', 
                     endpoint_url=os.environ.get('API_GATEWAY_ENDPOINT'))

def handler(event, context):
    """
    Handle WebSocket events from API Gateway.
    
    Routes:
    - $connect: Store connection in DynamoDB
    - $disconnect: Remove connection from DynamoDB
    - $default: Handle custom messages
    """
    route_key = event.get('requestContext', {}).get('routeKey')
    connection_id = event.get('requestContext', {}).get('connectionId')
    
    print(f"WebSocket event: {route_key}, Connection: {connection_id}")
    
    if route_key == '$connect':
        return handle_connect(event, context)
    elif route_key == '$disconnect':
        return handle_disconnect(event, context)
    elif route_key == '$default':
        return handle_message(event, context)
    else:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Unknown route'})
        }


def handle_connect(event, context):
    """Handle new WebSocket connection."""
    connection_id = event.get('requestContext', {}).get('connectionId')
    query_params = event.get('queryStringParameters') or {}
    
    user_id = query_params.get('userId', '')
    zone_id = query_params.get('zoneId', '')
    
    # Store connection in DynamoDB
    try:
        connections_table.put_item(
            Item={
                'connectionId': connection_id,
                'userId': user_id,
                'zoneId': zone_id,
                'connectedAt': Decimal(str(time.time())),
                'ttl': int(time.time()) + 86400  # 24 hours
            }
        )
        print(f"Connection stored: {connection_id}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Connected'})
        }
    except Exception as e:
        print(f"Error storing connection: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Connection failed'})
        }


def handle_disconnect(event, context):
    """Handle WebSocket disconnection."""
    connection_id = event.get('requestContext', {}).get('connectionId')
    
    try:
        # Remove connection from DynamoDB
        connections_table.delete_item(
            Key={'connectionId': connection_id}
        )
        print(f"Connection removed: {connection_id}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Disconnected'})
        }
    except Exception as e:
        print(f"Error removing connection: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Disconnect failed'})
        }


def handle_message(event, context):
    """Handle incoming WebSocket messages."""
    connection_id = event.get('requestContext', {}).get('connectionId')
    body = event.get('body', '{}')
    
    try:
        message = json.loads(body)
        action = message.get('action')
        
        if action == 'ping':
            # Respond to ping
            send_message(connection_id, {'action': 'pong'})
        elif action == 'subscribe':
            # Subscribe to zone updates
            zone_id = message.get('zoneId')
            update_connection_zone(connection_id, zone_id)
            send_message(connection_id, {'action': 'subscribed', 'zoneId': zone_id})
        elif action == 'unsubscribe':
            # Unsubscribe from zone updates
            update_connection_zone(connection_id, None)
            send_message(connection_id, {'action': 'unsubscribed'})
        else:
            send_message(connection_id, {'error': 'Unknown action'})
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Message processed'})
        }
    except Exception as e:
        print(f"Error handling message: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Message processing failed'})
        }


def send_message(connection_id, message):
    """Send message to WebSocket connection."""
    try:
        apigw.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(message).encode('utf-8')
        )
    except Exception as e:
        print(f"Error sending message to {connection_id}: {e}")


def update_connection_zone(connection_id, zone_id):
    """Update the zone subscription for a connection."""
    try:
        connections_table.update_item(
            Key={'connectionId': connection_id},
            UpdateExpression='SET zoneId = :zoneId',
            ExpressionAttributeValues={
                ':zoneId': zone_id or ''
            }
        )
    except Exception as e:
        print(f"Error updating connection zone: {e}")


def broadcast_to_zone(zone_id, message):
    """Broadcast message to all connections subscribed to a zone."""
    try:
        # Scan connections for the zone
        response = connections_table.scan(
            FilterExpression='zoneId = :zoneId',
            ExpressionAttributeValues={
                ':zoneId': zone_id
            }
        )
        
        # Send message to each connection
        for item in response.get('Items', []):
            connection_id = item['connectionId']
            send_message(connection_id, message)
    except Exception as e:
        print(f"Error broadcasting to zone {zone_id}: {e}")

