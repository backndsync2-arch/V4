from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('zones', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='zone',
            name='image',
            field=models.ImageField(blank=True, null=True, upload_to='zone_images/'),
        ),
    ]
