import random
from django.core.management.base import BaseCommand
from django.db import transaction
from resources.models import Resource, ResourceCategory
from campus.models import Campus, Room

class Command(BaseCommand):
    help = 'Repairs asset mappings and ensures every campus has resources for every category.'

    def handle(self, *args, **kwargs):
        self.stdout.write('Starting asset mapping repair and seeding...')

        campuses = list(Campus.objects.all())
        categories = list(ResourceCategory.objects.all())
        
        if not campuses:
            self.stdout.write(self.style.ERROR('No campuses found.'))
            return
            
        with transaction.atomic():
            # Step 1: Repair existing resources (assign random room/building/campus if none)
            resources_fixed = 0
            for resource in Resource.objects.all():
                needs_save = False
                
                if not resource.campus or not resource.building or not resource.room:
                    # Prefer a room that matches existing campus/building if any
                    q = Room.objects.all()
                    if resource.campus:
                        q = q.filter(campus=resource.campus)
                    if resource.building:
                        q = q.filter(building=resource.building)
                        
                    rooms = list(q)
                    if not rooms:
                        rooms = list(Room.objects.all()) # fallback to any room
                    
                    if rooms:
                        r_room = random.choice(rooms)
                        if not resource.room:
                            resource.room = r_room
                        if not resource.building:
                            resource.building = r_room.building
                        if not resource.campus:
                            resource.campus = r_room.campus
                        needs_save = True
                        
                if needs_save:
                    resource.save(update_fields=['room', 'building', 'campus'])
                    resources_fixed += 1
            
            self.stdout.write(self.style.SUCCESS(f'Repaired {resources_fixed} existing resources with missing locations.'))
            
            # Step 2: Ensure resources exist under EVERY campus for EVERY category
            resources_created = 0
            
            # Mapping of category_type to demo resource names
            demo_names = {
                'equipment': ['General Equipment 1', 'Lab Tool Alpha'],
                'lab_instrument': ['Digital Microscope', 'Oscilloscope 500MHz'],
                'sports': ['Football Pro', 'Volleyball Set', 'Cricket Kit Set'],
                'research': ['Spectrometer Series X', 'Research Tool Set'],
                'it_asset': ['Dell Latitude Laptop', 'HP ProDesk Monitor'],
                'furniture': ['Ergonomic Chair', 'Adjustable Desk'],
                'av_equipment': ['Sony Projector 4K', 'Smart Board Display'],
                'other': ['Miscellaneous Demo Item']
            }
            
            for campus in campuses:
                campus_rooms = list(Room.objects.filter(campus=campus))
                    
                for category in categories:
                    # Check if campus has at least one resource in this category
                    exists = Resource.objects.filter(campus=campus, category=category).exists()
                    
                    if not exists:
                        # Create seed resources for this category
                        names = demo_names.get(category.category_type, [f'Demo {category.name} Item'])
                        for name in names:
                            room = random.choice(campus_rooms) if campus_rooms else None
                            building = room.building if room else None

                            Resource.objects.create(
                                tenant=category.tenant,
                                name=f"{campus.name[:5]} - {name}",
                                resource_code=f"DEMO-{campus.id}-{category.id}-{random.randint(1000, 9999)}",
                                category=category,
                                campus=campus,
                                building=building,
                                room=room,
                                quantity_total=random.randint(2, 10),
                                quantity_available=random.randint(1, 10),
                                status='available',
                                unit_type='unit'
                            )
                            resources_created += 1
                            
            self.stdout.write(self.style.SUCCESS(f'Seeded {resources_created} missing resources to complete coverage across campuses.'))
