from .models import FacultyEligibleSubject, FacultyProfile, SubjectDomain, Course


def profile_completion_state(profile):
    checks = {
        'primary_specialization_domain': bool(profile.primary_specialization_domain_id),
        'years_of_experience': profile.years_of_experience is not None,
        'qualifications': bool((profile.qualifications or '').strip()),
        'skills': bool((profile.skills or '').strip()),
        'certifications': bool((profile.certifications or '').strip()),
        'bio': bool((profile.bio or '').strip()),
    }
    total = len(checks)
    completed = sum(1 for value in checks.values() if value)
    percentage = int(round((completed / total) * 100)) if total else 0
    missing = [key for key, value in checks.items() if not value]
    return {
        'percentage': percentage,
        'missing': missing,
        'ready_for_preferences': checks['primary_specialization_domain'] and checks['years_of_experience'],
    }


def generate_faculty_eligible_subjects(faculty_profile):
    tenant = faculty_profile.tenant
    department = faculty_profile.department
    domain_ids = set()
    if faculty_profile.primary_specialization_domain_id:
        domain_ids.add(faculty_profile.primary_specialization_domain_id)
    domain_ids.update(faculty_profile.secondary_specialization_domains.values_list('id', flat=True))

    current_matches = set()
    if domain_ids:
        course_qs = Course.objects.filter(
            tenant=tenant,
            department=department,
            is_active=True,
        ).filter(
            primary_domain_id__in=domain_ids
        ) | Course.objects.filter(
            tenant=tenant,
            department=department,
            is_active=True,
            secondary_domain_id__in=domain_ids,
        )

        for course in course_qs.distinct().select_related('primary_domain', 'secondary_domain'):
            is_primary_match = course.primary_domain_id in domain_ids if course.primary_domain_id else False
            score = 95 if is_primary_match else 75
            current_matches.add(course.id)
            obj, created = FacultyEligibleSubject.objects.get_or_create(
                tenant=tenant,
                faculty=faculty_profile,
                course=course,
                defaults={
                    'source_type': 'auto_suggested',
                    'status': 'auto_suggested',
                    'score': score,
                },
            )
            if created:
                continue
            obj.score = score
            if obj.source_type == 'auto_suggested' and obj.status == 'auto_suggested':
                obj.status = 'auto_suggested'
            if obj.source_type == 'auto_suggested':
                obj.score = score
            obj.save(update_fields=['score', 'status', 'updated_at'])

    FacultyEligibleSubject.objects.filter(
        tenant=tenant,
        faculty=faculty_profile,
        source_type='auto_suggested',
        status='auto_suggested',
    ).exclude(course_id__in=current_matches).delete()


def regenerate_department_eligibility(tenant, department_ids):
    faculty_qs = FacultyProfile.objects.filter(
        tenant=tenant,
        department_id__in=department_ids,
    ).prefetch_related('secondary_specialization_domains')
    for faculty in faculty_qs:
        generate_faculty_eligible_subjects(faculty)

