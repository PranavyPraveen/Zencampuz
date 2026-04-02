from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academics', '0004_program_syllabus_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='program',
            name='syllabus_extracted_subjects',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='program',
            name='syllabus_file',
            field=models.FileField(blank=True, null=True, upload_to='syllabus/programmes/'),
        ),
        migrations.AddField(
            model_name='program',
            name='syllabus_last_error',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='program',
            name='syllabus_parse_status',
            field=models.CharField(choices=[('not_uploaded', 'Not Uploaded'), ('uploaded', 'Uploaded'), ('parsed', 'Parsed'), ('failed', 'Failed')], default='not_uploaded', max_length=20),
        ),
        migrations.AddField(
            model_name='program',
            name='syllabus_raw_text',
            field=models.TextField(blank=True),
        ),
    ]
