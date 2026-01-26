"""
Management command to seed announcement templates using AI.

Usage:
    python manage.py seed_templates
    python manage.py seed_templates --category retail
    python manage.py seed_templates --force (regenerate all templates)
"""

import os
import json
import logging
from django.core.management.base import BaseCommand
from apps.announcements.models import AnnouncementTemplateFolder, AnnouncementTemplate
import openai

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Seed announcement templates using AI generation'

    def add_arguments(self, parser):
        parser.add_argument(
            '--category',
            type=str,
            choices=['retail', 'restaurant', 'office', 'healthcare', 'gym', 'general'],
            help='Only seed templates for this category',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Delete existing templates and regenerate',
        )

    def handle(self, *args, **options):
        category = options.get('category')
        force = options.get('force', False)
        
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            self.stdout.write(
                self.style.ERROR('OPENAI_API_KEY environment variable not set. Cannot generate templates.')
            )
            return
        
        # Template folder definitions
        folder_definitions = [
            {
                'name': 'Retail Essentials',
                'description': 'Essential announcements for retail stores',
                'category': 'retail',
                'image_url': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
                'templates_per_folder': 5,
                'tone': 'friendly',
            },
            {
                'name': 'Restaurant Daily',
                'description': 'Daily announcements for restaurants and cafes',
                'category': 'restaurant',
                'image_url': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
                'templates_per_folder': 5,
                'tone': 'friendly',
            },
            {
                'name': 'Office Communications',
                'description': 'Professional announcements for office environments',
                'category': 'office',
                'image_url': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop',
                'templates_per_folder': 5,
                'tone': 'professional',
            },
            {
                'name': 'Healthcare Updates',
                'description': 'Announcements for healthcare facilities',
                'category': 'healthcare',
                'image_url': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
                'templates_per_folder': 5,
                'tone': 'calm',
            },
            {
                'name': 'Gym & Fitness',
                'description': 'Energetic announcements for gyms and fitness centers',
                'category': 'gym',
                'image_url': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop',
                'templates_per_folder': 5,
                'tone': 'energetic',
            },
            {
                'name': 'General Purpose',
                'description': 'Versatile announcements for any business',
                'category': 'general',
                'image_url': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=300&fit=crop',
                'templates_per_folder': 5,
                'tone': 'friendly',
            },
        ]
        
        # Filter by category if specified
        if category:
            folder_definitions = [f for f in folder_definitions if f['category'] == category]
        
        if force:
            self.stdout.write(self.style.WARNING('Deleting existing templates...'))
            AnnouncementTemplate.objects.all().delete()
            AnnouncementTemplateFolder.objects.all().delete()
        
        client = openai.OpenAI(api_key=api_key)
        
        total_folders = 0
        total_templates = 0
        
        for folder_def in folder_definitions:
            # Check if folder already exists
            folder, created = AnnouncementTemplateFolder.objects.get_or_create(
                name=folder_def['name'],
                category=folder_def['category'],
                defaults={
                    'description': folder_def['description'],
                    'image_url': folder_def['image_url'],
                    'active': True,
                }
            )
            
            if not created:
                # Always update image_url and description even if folder exists
                if folder.image_url != folder_def['image_url'] or folder.description != folder_def['description']:
                    folder.image_url = folder_def['image_url']
                folder.description = folder_def['description']
                folder.active = True
                folder.save()
                    self.stdout.write(
                        self.style.SUCCESS(f'Updated image and description for {folder.name}')
                    )
                
                if not force:
                    self.stdout.write(
                        self.style.WARNING(f'Skipping template generation for {folder.name} - already exists (use --force to regenerate templates)')
                    )
                    continue
                else:
                    # Delete old templates when using --force
                folder.templates.all().delete()
            
            self.stdout.write(f'Generating templates for {folder.name}...')
            
            # Generate templates using AI
            category_contexts = {
                'retail': 'retail store announcements for customers',
                'restaurant': 'restaurant announcements for diners',
                'office': 'office building announcements for employees and visitors',
                'healthcare': 'healthcare facility announcements for patients and staff',
                'gym': 'gym and fitness center announcements for members',
                'general': 'general purpose announcements for any business'
            }
            
            tone_descriptions = {
                'professional': 'professional and formal',
                'friendly': 'friendly and warm',
                'urgent': 'urgent and attention-grabbing',
                'casual': 'casual and conversational',
                'energetic': 'energetic and enthusiastic',
                'calm': 'calm and soothing'
            }
            
            context = category_contexts.get(folder_def['category'], 'general purpose announcements')
            tone_desc = tone_descriptions.get(folder_def['tone'], 'friendly')
            quantity = folder_def['templates_per_folder']
            
            prompt = f"""Generate {quantity} professional announcement templates for a {context}.

Tone: {tone_desc}

Each template should include:
- A clear, descriptive title (3-8 words)
- A brief description (10-20 words explaining when to use it)
- The full announcement script (20-50 words, suitable for public address systems)

Return as a JSON array with objects containing:
{{
  "title": "Template title",
  "description": "Brief description of when to use this announcement",
  "script": "Full announcement text (20-50 words)",
  "voiceType": "{folder_def['tone']}"
}}

Make each template unique and practical for real-world use in a {context}.
"""
            
            try:
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a professional announcement script writer. Return only valid JSON array. Each template should be practical and ready to use."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.8,
                    max_tokens=2000
                )
                
                content = response.choices[0].message.content.strip()
                # Remove markdown code blocks if present
                if content.startswith('```'):
                    content = content.split('```')[1]
                    if content.startswith('json'):
                        content = content[4:]
                    content = content.strip()
                
                templates = json.loads(content)
                
                # Ensure it's an array
                if not isinstance(templates, list):
                    templates = [templates]
                
                # Limit to requested quantity
                templates = templates[:quantity]
                
                # Create template records
                for template_data in templates:
                    # Estimate duration (average speaking rate ~150 words/min)
                    word_count = len(template_data.get('script', '').split())
                    duration = max(5, int((word_count / 150) * 60))
                    
                    AnnouncementTemplate.objects.create(
                        title=template_data['title'],
                        description=template_data.get('description', ''),
                        script=template_data['script'],
                        category=folder_def['category'],
                        duration=duration,
                        voice_type=template_data.get('voiceType', folder_def['tone']),
                        folder=folder,
                        active=True,
                    )
                    total_templates += 1
                
                total_folders += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created {len(templates)} templates for {folder.name}')
                )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'✗ Failed to generate templates for {folder.name}: {str(e)}')
                )
                logger.error(f"Template generation error for {folder.name}: {e}")
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'✓ Created {total_folders} folder(s)'))
        self.stdout.write(self.style.SUCCESS(f'✓ Created {total_templates} template(s)'))
        self.stdout.write(self.style.SUCCESS('Template seeding complete!'))

