#!/bin/bash
# Script to create and run migrations

echo "Creating migrations..."
python manage.py makemigrations

echo "Running migrations..."
python manage.py migrate

echo "Creating superuser (optional)..."
echo "Run: python manage.py createsuperuser"
