from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('tenants', '0002_tenant_contract_end_date_tenant_contract_start_date_and_more'),
        ('accounts', '0004_campus_field_to_fk'),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=255)),
                ('message', models.TextField()),
                ('notification_type', models.CharField(choices=[('leave_submitted', 'Leave Submitted'), ('leave_approved', 'Leave Approved'), ('leave_rejected', 'Leave Rejected'), ('substitution_requested', 'Substitution Requested'), ('substitution_approved', 'Substitution Approved'), ('substitution_rejected', 'Substitution Rejected'), ('general', 'General')], default='general', max_length=50)),
                ('related_model', models.CharField(blank=True, max_length=100)),
                ('related_object_id', models.CharField(blank=True, max_length=100)),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='accounts.customuser')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='tenants.tenant')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
