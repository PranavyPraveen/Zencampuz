from django.core.management.base import BaseCommand
from resources.models import Resource
from campus.models import Room
from django.db import transaction
import random

class Command(BaseCommand):
    help = 'Patches Resource objects by assigning missing locations (room, building, campus).'

    def handle(self, *args, **kwargs):
        resources_fixed = 0
        total_resources = Resource.objects.count()

        rooms = list(Room.objects.select_related('building', 'campus').all())
        if not rooms:
            self.stdout.write(self.style.ERROR('No rooms found in the DB. Please seed rooms first.'))
            return

        self.stdout.write(f'Evaluating {total_resources} resources for missing location mappings...')

        with transaction.atomic():
            for resource in Resource.objects.all():
                needs_save = False

                # If resource has NO room and NO building and NO campus, give it a random room
                if not resource.room and not resource.building and not resource.campus:
                    random_room = random.choice(rooms)
                    resource.room = random_room
                    needs_save = True

                # Apply cascade rules
                if resource.room:
                    if resource.building != resource.room.building:
                        resource.building = resource.room.building
                        needs_save = True
                        
                    if resource.room.building and resource.campus != resource.room.building.campus:
                        resource.campus = resource.room.building.campus
                        needs_save = True

                elif resource.building:
                    # If it has building but no room, set campus from building
                    if resource.campus != resource.building.campus:
                        resource.campus = resource.building.campus
                        needs_save = True

                if needs_save:
                    resource.save(update_fields=['room', 'building', 'campus'])
                    resources_fixed += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully patched {resources_fixed} out of {total_resources} resources.'))
