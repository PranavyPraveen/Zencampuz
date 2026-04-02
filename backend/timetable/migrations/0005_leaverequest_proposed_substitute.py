from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_campus_field_to_fk'),
        ('timetable', '0004_add_campus_programme_batch_to_plan'),
    ]

    operations = [
        migrations.AddField(
            model_name='leaverequest',
            name='proposed_substitute',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='proposed_leave_cover_requests', to='accounts.customuser'),
        ),
    ]
