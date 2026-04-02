import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zencampuz.settings')
django.setup()

from superadmin.models import PricingModule

modules_data = [
    {
        "module_code": "mod_core",
        "title": "Core Platform",
        "price_annual": 15999.00,
        "price_monthly": 1499.00,
        "is_annual_only": False,
        "is_popular": False,
        "order": 1,
        "features": [
            "Complete Tenant Isolation",
            "Basic Reporting",
            "User Role Management",
            "Admin Dashboard"
        ]
    },
    {
        "module_code": "mod_facility",
        "title": "Facility Booking",
        "price_annual": 11999.00,
        "price_monthly": 1099.00,
        "is_annual_only": False,
        "is_popular": True,
        "order": 2,
        "features": [
            "Complex Approval Workflows",
            "Room Booking Engine",
            "Conflict Resolution",
            "Policy Engine"
        ]
    },
    {
        "module_code": "mod_resource",
        "title": "Resource Management",
        "price_annual": 7999.00,
        "price_monthly": 799.00,
        "is_annual_only": False,
        "is_popular": False,
        "order": 3,
        "features": [
            "Asset Tracking",
            "Lab Instruments",
            "Inventory Management",
            "Maintenance Logs"
        ]
    },
    {
        "module_code": "mod_exam",
        "title": "Exam Operations",
        "price_annual": 10399.00,
        "price_monthly": 999.00,
        "is_annual_only": False,
        "is_popular": False,
        "order": 4,
        "features": [
            "Seating Plan Generator",
            "Invigilator Assignments",
            "Exam Timetabling",
            "Academic Tracking"
        ]
    },
    {
        "module_code": "mod_timetable",
        "title": "Timetabling Engine",
        "price_annual": 19999.00,
        "price_monthly": None,
        "is_annual_only": True,
        "is_popular": False,
        "order": 5,
        "features": [
            "AI Auto-Scheduling",
            "Faculty Constraint Engine",
            "Conflict Resolution",
            "Drag-and-Drop UI"
        ]
    },
    {
        "module_code": "mod_analytics",
        "title": "Advanced Analytics",
        "price_annual": 15999.00,
        "price_monthly": None,
        "is_annual_only": True,
        "is_popular": False,
        "order": 6,
        "features": [
            "Custom BI Dashboards",
            "Utilization Heatmaps",
            "Predictive Trend Models",
            "Export Reports"
        ]
    },
    {
        "module_code": "mod_research",
        "title": "Research Suite",
        "price_annual": 24999.00,
        "price_monthly": None,
        "is_annual_only": True,
        "is_popular": False,
        "order": 7,
        "features": [
            "Grant Management",
            "Project Tracking",
            "Publication Indexing",
            "Collaboration Tools"
        ]
    },
    {
        "module_code": "mod_bundle",
        "title": "Complete Campus Kit",
        "price_annual": 99999.00,
        "price_monthly": None,
        "is_annual_only": True,
        "is_popular": False,
        "order": 8,
        "features": [
            "All enterprise modules included",
            "24/7 Priority Support",
            "Dedicated Account Manager",
            "Unlimited Users"
        ]
    }
]

print("Seeding Pricing Modules...")
for data in modules_data:
    obj, created = PricingModule.objects.update_or_create(
        module_code=data["module_code"],
        defaults=data
    )
    if created:
        print(f"Created {obj.title}")
    else:
        print(f"Updated {obj.title}")

print("Done seeding pricing logic!")
