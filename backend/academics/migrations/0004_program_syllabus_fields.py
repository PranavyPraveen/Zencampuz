from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academics', '0003_add_faculty_professional_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='program',
            name='syllabus_document_url',
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name='program',
            name='syllabus_overview',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='program',
            name='syllabus_updated_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
