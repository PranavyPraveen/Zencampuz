from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
        ('academics', '0006_subjectdomain_course_primary_domain_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='facultypreference',
            name='hod_review_note',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='facultypreference',
            name='hod_reviewed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='facultypreference',
            name='hod_reviewed_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_faculty_preferences', to='accounts.customuser'),
        ),
        migrations.AddField(
            model_name='facultypreference',
            name='status',
            field=models.CharField(choices=[('draft', 'Draft'), ('submitted', 'Submitted to HOD'), ('hod_approved', 'Approved by HOD'), ('hod_rejected', 'Rejected by HOD')], default='draft', max_length=20),
        ),
    ]
