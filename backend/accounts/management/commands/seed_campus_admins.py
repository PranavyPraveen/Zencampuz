"""
Management command: seed_campus_admins
======================================
Creates or repairs one campus-scoped IT admin account per campus in every tenant.
Safe to run multiple times (idempotent).

Usage:
    python manage.py seed_campus_admins
    # Optionally target a single tenant:
    python manage.py seed_campus_admins --tenant <subdomain>
"""

import re
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from campus.models import Campus
from accounts.models import Role
from tenants.models import Tenant

User = get_user_model()

DEFAULT_PASSWORD = 'Campus@123'


def _slugify_campus(name):
    """Creates a URL/email-safe slug from a campus name."""
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9]+', '_', slug)
    slug = slug.strip('_')
    return slug or 'campus'


class Command(BaseCommand):
    help = 'Create or repair one campus-scoped IT admin per campus for every tenant.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant',
            type=str,
            default=None,
            help='Subdomain of a specific tenant to process (default: all tenants).'
        )

    def handle(self, *args, **options):
        target_subdomain = options.get('tenant')

        if target_subdomain:
            tenants = Tenant.objects.filter(subdomain=target_subdomain, is_active=True)
            if not tenants.exists():
                self.stderr.write(self.style.ERROR(f'No active tenant found with subdomain "{target_subdomain}".'))
                return
        else:
            tenants = Tenant.objects.filter(is_active=True)

        it_admin_role, _ = Role.objects.get_or_create(name='it_admin')

        # We'll collect all credentials to print a nice summary at the end
        credentials = []

        for tenant in tenants:
            self.stdout.write(self.style.HTTP_INFO(f'\n── Tenant: {tenant.tenant_name} ({tenant.subdomain}) ──'))
            campuses = Campus.objects.filter(tenant=tenant)

            if not campuses.exists():
                self.stdout.write(self.style.WARNING(f'   No campuses found. Skipping.'))
                continue

            for campus in campuses:
                slug = _slugify_campus(campus.name)
                email = f'campusadmin.{slug}@{tenant.subdomain}.local'
                full_name = f'Campus Admin – {campus.name}'

                # Check if a proper campus IT admin already exists for this campus
                existing = User.objects.filter(
                    tenant=tenant,
                    role=it_admin_role,
                    campus=campus
                ).first()

                if existing:
                    # Repair: ensure all fields are correct
                    changed = False
                    if not existing.is_active:
                        existing.is_active = True
                        changed = True
                    if changed:
                        existing.save()
                        self.stdout.write(self.style.WARNING(
                            f'   ↻ Repaired existing admin for [{campus.name}]: {existing.email}'
                        ))
                    else:
                        self.stdout.write(self.style.SUCCESS(
                            f'   ✓ Already OK: [{campus.name}] → {existing.email}'
                        ))
                    credentials.append({
                        'tenant': tenant.tenant_name,
                        'campus': campus.name,
                        'email': existing.email,
                        'password': '(unchanged — use your current password or reset)',
                        'status': 'exists',
                    })
                    continue

                # Check if there's an it_admin without a campus for this tenant (repair case)
                orphan = User.objects.filter(
                    tenant=tenant,
                    role=it_admin_role,
                    campus__isnull=True
                ).first()

                if orphan:
                    # Re-use this user and assign campus to it
                    orphan.campus = campus
                    orphan.full_name = full_name
                    orphan.is_active = True
                    orphan.save()
                    self.stdout.write(self.style.WARNING(
                        f'   ↻ Repaired orphan IT admin for [{campus.name}]: {orphan.email}'
                    ))
                    credentials.append({
                        'tenant': tenant.tenant_name,
                        'campus': campus.name,
                        'email': orphan.email,
                        'password': '(unchanged — repaired existing account)',
                        'status': 'repaired',
                    })
                    continue

                # Create a brand new campus IT admin
                # Generate unique email if existing
                final_email = email
                counter = 1
                while User.objects.filter(email=final_email).exists():
                    final_email = f'campusadmin.{slug}{counter}@{tenant.subdomain}.local'
                    counter += 1

                user = User.objects.create_user(
                    email=final_email,
                    password=DEFAULT_PASSWORD,
                    full_name=full_name,
                    tenant=tenant,
                    role=it_admin_role,
                    campus=campus,
                    is_active=True,
                )
                self.stdout.write(self.style.SUCCESS(
                    f'   ✚ Created admin for [{campus.name}]: {final_email}'
                ))
                credentials.append({
                    'tenant': tenant.tenant_name,
                    'campus': campus.name,
                    'email': final_email,
                    'password': DEFAULT_PASSWORD,
                    'status': 'created',
                })

        # ── Print credentials summary ─────────────────────────────────────────
        self.stdout.write('\n')
        self.stdout.write(self.style.HTTP_INFO('═' * 80))
        self.stdout.write(self.style.HTTP_INFO('  CAMPUS IT ADMIN CREDENTIALS (for local dev / testing only)'))
        self.stdout.write(self.style.HTTP_INFO('═' * 80))

        col_widths = [20, 25, 38, 12]
        header = (
            f"{'CAMPUS':<{col_widths[0]}} "
            f"{'EMAIL':<{col_widths[1]}} "
            f"{'PASSWORD':<{col_widths[2]}} "
            f"{'STATUS':{col_widths[3]}}"
        )
        self.stdout.write(self.style.HTTP_NOT_MODIFIED(header))
        self.stdout.write('─' * 80)

        for cred in credentials:
            self.stdout.write(
                f"{str(cred['campus'])[:col_widths[0]]:<{col_widths[0]}} "
                f"{str(cred['email'])[:col_widths[1]]:<{col_widths[1]}} "
                f"{str(cred['password'])[:col_widths[2]]:<{col_widths[2]}} "
                f"{cred['status']}"
            )

        self.stdout.write('─' * 80)
        self.stdout.write(self.style.SUCCESS(
            f'\nDone. {len(credentials)} campus admin account(s) processed.'
        ))
        self.stdout.write(self.style.WARNING(
            'WARNING: Do NOT expose these credentials in production endpoints.\n'
        ))
