from .models import Notification


def create_notification(*, tenant, recipient, title, message, notification_type='general', related_model='', related_object_id=''):
    if not tenant or not recipient:
        return None

    return Notification.objects.create(
        tenant=tenant,
        recipient=recipient,
        title=title,
        message=message,
        notification_type=notification_type,
        related_model=related_model,
        related_object_id=str(related_object_id or ''),
    )
