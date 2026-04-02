from rest_framework import serializers
from django.db.models import Q
from .models import (
    Department, Program, Semester, Course, Batch, Section, StudentGroup,
    SubjectDomain, FacultyProfile, FacultyAvailability, FacultyPreference,
    FacultyPreferredSubject, FacultyEligibleSubject, FacultySubjectAssignment,
    CourseSection, DepartmentRoomPreference
)


class DepartmentSerializer(serializers.ModelSerializer):
    hod_name = serializers.CharField(source='head_of_department.full_name', read_only=True, default=None)
    campus_name = serializers.CharField(source='campus.name', read_only=True, default=None)

    class Meta:
        model = Department
        fields = ['id', 'campus', 'campus_name', 'name', 'code', 'description', 'head_of_department', 'hod_name', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class SubjectDomainSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    campus_id = serializers.CharField(source='department.campus_id', read_only=True)
    campus_name = serializers.CharField(source='department.campus.name', read_only=True, default=None)
    description = serializers.SerializerMethodField()
    mapped_subject_names = serializers.SerializerMethodField()

    class Meta:
        model = SubjectDomain
        fields = [
            'id', 'department', 'department_name', 'campus_id', 'campus_name',
            'name', 'code', 'description', 'mapped_subject_names', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_mapped_subject_names(self, obj):
        subject_names = set(obj.primary_courses.values_list('name', flat=True))
        subject_names.update(obj.secondary_courses.values_list('name', flat=True))
        return ', '.join(sorted(name for name in subject_names if name))

    def get_description(self, obj):
        mapped_subjects = self.get_mapped_subject_names(obj)
        return mapped_subjects or obj.description

    def validate(self, attrs):
        department = attrs.get('department') or getattr(self.instance, 'department', None)
        name = (attrs.get('name') or getattr(self.instance, 'name', '')).strip()
        if department and name:
            qs = SubjectDomain.objects.filter(
                tenant=department.tenant,
                department=department,
                name__iexact=name,
            )
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({'name': 'A subject domain with this name already exists in the department.'})
        return attrs


class ProgramSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    campus_id = serializers.CharField(source='department.campus_id', read_only=True)
    campus_name = serializers.CharField(source='department.campus.name', read_only=True, default=None)
    degree_type_display = serializers.CharField(source='get_degree_type_display', read_only=True)
    has_syllabus = serializers.SerializerMethodField()
    syllabus_parse_status_display = serializers.CharField(source='get_syllabus_parse_status_display', read_only=True)
    syllabus_file_url = serializers.SerializerMethodField()

    class Meta:
        model = Program
        fields = ['id', 'name', 'code', 'department', 'department_name', 'campus_id', 'campus_name', 
                  'degree_type', 'degree_type_display', 'duration_years', 'total_semesters',
                  'syllabus_overview', 'syllabus_document_url', 'syllabus_file', 'syllabus_file_url',
                  'syllabus_parse_status', 'syllabus_parse_status_display', 'syllabus_extracted_subjects',
                  'syllabus_last_error', 'syllabus_updated_at', 'has_syllabus',
                  'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_has_syllabus(self, obj):
        return bool(obj.syllabus_overview or obj.syllabus_document_url or obj.syllabus_file)

    def get_syllabus_file_url(self, obj):
        if not obj.syllabus_file:
            return None
        request = self.context.get('request')
        url = obj.syllabus_file.url
        return request.build_absolute_uri(url) if request else url


class SemesterSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source='program.name', read_only=True)
    department_id = serializers.CharField(source='program.department_id', read_only=True)
    department_name = serializers.CharField(source='program.department.name', read_only=True, default=None)
    campus_id = serializers.CharField(source='program.department.campus_id', read_only=True)
    campus_name = serializers.CharField(source='program.department.campus.name', read_only=True, default=None)
    term_display = serializers.CharField(source='get_term_display', read_only=True)

    class Meta:
        model = Semester
        fields = ['id', 'name', 'semester_number', 'term', 'term_display', 'academic_year',
                  'program', 'program_name', 'department_id', 'department_name', 'campus_id', 'campus_name', 
                  'start_date', 'end_date', 'is_current']
        read_only_fields = ['id']


class CourseSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    campus_id = serializers.CharField(source='department.campus_id', read_only=True)
    campus_name = serializers.CharField(source='department.campus.name', read_only=True, default=None)
    semester_name = serializers.CharField(source='semester.name', read_only=True, default=None)
    semester_number = serializers.IntegerField(source='semester.semester_number', read_only=True, default=None)
    program_id = serializers.CharField(source='semester.program_id', read_only=True, default=None)
    program_name = serializers.CharField(source='semester.program.name', read_only=True, default=None)
    primary_domain_name = serializers.CharField(source='primary_domain.name', read_only=True, default=None)
    secondary_domain_name = serializers.CharField(source='secondary_domain.name', read_only=True, default=None)
    course_type_display = serializers.CharField(source='get_course_type_display', read_only=True)
    total_hours = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'name', 'code', 'course_type', 'course_type_display', 'credits',
                  'lecture_hours', 'tutorial_hours', 'practical_hours', 'total_hours',
                  'department', 'department_name', 'campus_id', 'campus_name', 
                  'semester', 'semester_name', 'semester_number', 'program_id', 'program_name',
                  'primary_domain', 'primary_domain_name', 'secondary_domain', 'secondary_domain_name',
                  'is_elective', 'is_active', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_total_hours(self, obj):
        return obj.total_hours()

    def validate(self, attrs):
        department = attrs.get('department') or getattr(self.instance, 'department', None)
        primary_domain = attrs.get('primary_domain') or getattr(self.instance, 'primary_domain', None)
        secondary_domain = attrs.get('secondary_domain') or getattr(self.instance, 'secondary_domain', None)
        if primary_domain and department and primary_domain.department_id != department.id:
            raise serializers.ValidationError({'primary_domain': 'Primary domain must belong to the same department.'})
        if secondary_domain and department and secondary_domain.department_id != department.id:
            raise serializers.ValidationError({'secondary_domain': 'Secondary domain must belong to the same department.'})
        return attrs


class BatchSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source='program.name', read_only=True)
    department_id = serializers.CharField(source='program.department_id', read_only=True)
    department_name = serializers.CharField(source='program.department.name', read_only=True, default=None)
    campus_id = serializers.CharField(source='program.department.campus_id', read_only=True)
    campus_name = serializers.CharField(source='program.department.campus.name', read_only=True, default=None)
    section_count = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = ['id', 'name', 'program', 'program_name', 'department_id', 'department_name', 'campus_id', 'campus_name', 
                  'start_year', 'end_year', 'is_active', 'section_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_section_count(self, obj):
        return obj.sections.count()


class SectionSerializer(serializers.ModelSerializer):
    batch_name = serializers.CharField(source='batch.name', read_only=True)
    program_name = serializers.CharField(source='batch.program.name', read_only=True, default=None)
    advisor_name = serializers.CharField(source='class_advisor.full_name', read_only=True, default=None)

    class Meta:
        model = Section
        fields = ['id', 'name', 'batch', 'batch_name', 'program_name', 'strength', 'class_advisor', 'advisor_name', 'is_active']
        read_only_fields = ['id']


class StudentGroupSerializer(serializers.ModelSerializer):
    section_name = serializers.CharField(source='section.__str__', read_only=True)

    class Meta:
        model = StudentGroup
        fields = ['id', 'name', 'section', 'section_name', 'strength']
        read_only_fields = ['id']


class FacultyProfileSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    campus_id = serializers.CharField(source='department.campus_id', read_only=True)
    campus_name = serializers.CharField(source='department.campus.name', read_only=True, default=None)
    designation_display = serializers.CharField(source='get_designation_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    primary_specialization_domain_name = serializers.CharField(source='primary_specialization_domain.name', read_only=True, default=None)
    secondary_specialization_domain_ids = serializers.PrimaryKeyRelatedField(
        source='secondary_specialization_domains',
        many=True,
        queryset=SubjectDomain.objects.all(),
        required=False,
    )
    secondary_specialization_domain_names = serializers.SerializerMethodField()
    profile_completion = serializers.SerializerMethodField()
    profile_is_complete = serializers.SerializerMethodField()
    profile_missing_fields = serializers.SerializerMethodField()

    class Meta:
        model = FacultyProfile
        fields = [
            'id', 'user', 'user_name', 'user_email', 'department', 'department_name', 'campus_id', 'campus_name',
            'employee_id', 'designation', 'designation_display', 'specialization',
            'primary_specialization_domain', 'primary_specialization_domain_name',
            'secondary_specialization_domain_ids', 'secondary_specialization_domain_names',
            'max_weekly_hours', 'status', 'status_display', 'joined_date', 'qualifications',
            'skills', 'years_of_experience', 'certifications', 'research_interests',
            'industry_experience', 'bio', 'profile_completion', 'profile_is_complete', 'profile_missing_fields', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_secondary_specialization_domain_names(self, obj):
        return [item.name for item in obj.secondary_specialization_domains.all()]

    def _completion_state(self, obj):
        checks = {
            'primary_specialization_domain': bool(obj.primary_specialization_domain_id),
            'years_of_experience': obj.years_of_experience is not None,
            'qualifications': bool((obj.qualifications or '').strip()),
            'skills': bool((obj.skills or '').strip()),
            'certifications': bool((obj.certifications or '').strip()),
            'bio': bool((obj.bio or '').strip()),
        }
        total = len(checks)
        completed = sum(1 for value in checks.values() if value)
        percentage = int(round((completed / total) * 100)) if total else 0
        missing = [key for key, value in checks.items() if not value]
        return {
            'percentage': percentage,
            'missing': missing,
            'complete': checks['primary_specialization_domain'] and checks['years_of_experience'],
        }

    def get_profile_completion(self, obj):
        return self._completion_state(obj)['percentage']

    def get_profile_is_complete(self, obj):
        return self._completion_state(obj)['complete']

    def get_profile_missing_fields(self, obj):
        return self._completion_state(obj)['missing']

    def _normalize_department_name(self, value):
        if not value:
            return ''
        base = str(value).split('(')[0].strip().lower().replace('&', 'and')
        return ' '.join(base.split())

    def _department_family_ids(self, department):
        if not department:
            return set()
        normalized_name = self._normalize_department_name(department.name)
        qs = Department.objects.filter(tenant=department.tenant)
        if department.campus_id:
            qs = qs.filter(campus_id=department.campus_id)
        if not normalized_name:
            return {department.id}
        family_ids = {
            item.id for item in qs
            if self._normalize_department_name(item.name) == normalized_name
        }
        return family_ids or {department.id}

    def validate(self, attrs):
        department = attrs.get('department') or getattr(self.instance, 'department', None)
        primary_domain = attrs.get('primary_specialization_domain') or getattr(self.instance, 'primary_specialization_domain', None)
        secondary_domains = attrs.get('secondary_specialization_domains')
        allowed_department_ids = self._department_family_ids(department)
        if primary_domain and department and primary_domain.department_id not in allowed_department_ids:
            raise serializers.ValidationError({'primary_specialization_domain': 'Primary specialization must belong to the same department.'})
        if secondary_domains is not None and department:
            invalid_secondary = [item.name for item in secondary_domains if item.department_id not in allowed_department_ids]
            if invalid_secondary:
                raise serializers.ValidationError({'secondary_specialization_domain_ids': f'Secondary specialization domains must belong to the same department: {", ".join(invalid_secondary)}'})
        return attrs

    def update(self, instance, validated_data):
        secondary_domains = validated_data.pop('secondary_specialization_domains', None)
        profile = super().update(instance, validated_data)
        if secondary_domains is not None:
            profile.secondary_specialization_domains.set(secondary_domains)
        if profile.primary_specialization_domain and profile.specialization != profile.primary_specialization_domain.name:
            profile.specialization = profile.primary_specialization_domain.name
            profile.save(update_fields=['specialization'])
        return profile


class FacultyProfessionalDetailSerializer(serializers.ModelSerializer):
    """Read-only serializer that exposes all professional profile fields — used by admins/HOD."""
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    campus_name = serializers.CharField(source='department.campus.name', read_only=True, default=None)
    designation_display = serializers.CharField(source='get_designation_display', read_only=True)
    primary_specialization_domain_name = serializers.CharField(source='primary_specialization_domain.name', read_only=True, default=None)
    secondary_specialization_domain_names = serializers.SerializerMethodField()

    class Meta:
        model = FacultyProfile
        fields = [
            'id', 'user_name', 'user_email', 'employee_id',
            'department_name', 'campus_name', 'designation_display',
            'specialization', 'primary_specialization_domain_name', 'secondary_specialization_domain_names', 'qualifications',
            'skills', 'years_of_experience', 'certifications',
            'research_interests', 'industry_experience', 'bio',
        ]
        read_only_fields = fields

    def get_secondary_specialization_domain_names(self, obj):
        return [item.name for item in obj.secondary_specialization_domains.all()]


class FacultyAvailabilitySerializer(serializers.ModelSerializer):
    day_display = serializers.CharField(source='get_day_display', read_only=True)
    faculty_name = serializers.CharField(source='faculty.user.full_name', read_only=True)

    class Meta:
        model = FacultyAvailability
        fields = ['id', 'faculty', 'faculty_name', 'day', 'day_display', 'start_time', 'end_time', 'is_available', 'note']
        read_only_fields = ['id']


class FacultyPreferredSubjectSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source='course.code', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    program_name = serializers.CharField(source='course.semester.program.name', read_only=True, default=None)
    semester_name = serializers.CharField(source='course.semester.name', read_only=True, default=None)
    domain_name = serializers.CharField(source='course.primary_domain.name', read_only=True, default=None)

    class Meta:
        model = FacultyPreferredSubject
        fields = ['id', 'course', 'course_code', 'course_name', 'program_name', 'semester_name', 'domain_name', 'rank']
        read_only_fields = ['id']


class FacultyPreferenceSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.user.full_name', read_only=True)
    faculty_email = serializers.CharField(source='faculty.user.email', read_only=True)
    department_name = serializers.CharField(source='faculty.department.name', read_only=True, default=None)
    department_id = serializers.CharField(source='faculty.department_id', read_only=True, default=None)
    campus_name = serializers.CharField(source='faculty.department.campus.name', read_only=True, default=None)
    campus_id = serializers.CharField(source='faculty.department.campus_id', read_only=True, default=None)
    preferred_courses_detail = serializers.SerializerMethodField()
    ranked_preferences = FacultyPreferredSubjectSerializer(many=True, read_only=True, source='ranked_subjects')
    preference_rankings = serializers.ListField(child=serializers.UUIDField(), write_only=True, required=False)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    hod_reviewed_by_name = serializers.CharField(source='hod_reviewed_by.full_name', read_only=True, default=None)

    class Meta:
        model = FacultyPreference
        fields = ['id', 'faculty', 'faculty_name', 'faculty_email',
                    'department_name', 'department_id', 'campus_name', 'campus_id',
                    'preferred_courses', 'preferred_courses_detail',
                    'ranked_preferences', 'preference_rankings',
                    'status', 'status_display', 'hod_review_note', 'hod_reviewed_by', 'hod_reviewed_by_name', 'hod_reviewed_at',
                    'preferred_days', 'preferred_time_start', 'preferred_time_end',
                    'avoid_early_morning', 'avoid_consecutive_hours',
                    'max_courses_per_semester', 'notes', 'updated_at']
        read_only_fields = ['id', 'updated_at', 'status', 'hod_review_note', 'hod_reviewed_by', 'hod_reviewed_by_name', 'hod_reviewed_at']

    def get_preferred_courses_detail(self, obj):
        return [
            {'id': str(c.id), 'code': c.code, 'name': c.name}
            for c in obj.preferred_courses.all()
        ]

    def validate_preferred_courses(self, value):
        """
        Verify that all preferred courses belong to the faculty's department.
        """
        faculty = self.instance.faculty if self.instance else None
        if not faculty:
            # For creation, we'll need to check the 'faculty' in data if provided
            faculty_id = self.initial_data.get('faculty')
            if faculty_id:
                try:
                    faculty = FacultyProfile.objects.get(id=faculty_id)
                except Exception:
                    pass
        
        if faculty:
            dept = faculty.department
            invalid_courses = [c.code for c in value if c.department != dept]
            if invalid_courses:
                raise serializers.ValidationError(
                    f"The following courses do not belong to your department ({dept.code}): {', '.join(invalid_courses)}"
                )
        return value

    def validate_preference_rankings(self, value):
        if len(value) != len(set(str(item) for item in value)):
            raise serializers.ValidationError('Duplicate courses are not allowed in ranked preferences.')
        if len(value) > 3:
            raise serializers.ValidationError('You can submit at most 3 ranked subject preferences.')
        return value

    def _normalize_department_name(self, value):
        if not value:
            return ''
        base = str(value).split('(')[0].strip().lower().replace('&', 'and')
        return ' '.join(base.split())

    def _faculty_for_validation(self):
        faculty = self.instance.faculty if self.instance else None
        if faculty:
            return faculty
        faculty_id = self.initial_data.get('faculty')
        if faculty_id:
            try:
                return FacultyProfile.objects.get(id=faculty_id)
            except FacultyProfile.DoesNotExist:
                return None
        return None

    def validate(self, attrs):
        attrs = super().validate(attrs)
        faculty = self._faculty_for_validation()
        rankings = attrs.get('preference_rankings')
        if rankings is not None and faculty:
            selected_domain_ids = set()
            if faculty.primary_specialization_domain_id:
                selected_domain_ids.add(faculty.primary_specialization_domain_id)
            selected_domain_ids.update(faculty.secondary_specialization_domains.values_list('id', flat=True))
            allowed_course_ids = set()
            if selected_domain_ids:
                normalized_name = self._normalize_department_name(faculty.department.name if faculty.department_id else '')
                department_ids = [faculty.department_id] if faculty.department_id else []
                if normalized_name:
                    dept_qs = Department.objects.filter(tenant=faculty.tenant)
                    if faculty.department_id and faculty.department.campus_id:
                        dept_qs = dept_qs.filter(campus_id=faculty.department.campus_id)
                    for dept in dept_qs:
                        if self._normalize_department_name(dept.name) == normalized_name and dept.id not in department_ids:
                            department_ids.append(dept.id)
                allowed_course_ids = set(
                    Course.objects.filter(
                        tenant=faculty.tenant,
                        department_id__in=department_ids,
                        is_active=True,
                    ).filter(
                        Q(primary_domain_id__in=selected_domain_ids) |
                        Q(secondary_domain_id__in=selected_domain_ids)
                    ).values_list('id', flat=True)
                )
            invalid_ids = [str(item) for item in rankings if str(item) not in {str(pk) for pk in allowed_course_ids}]
            if invalid_ids:
                raise serializers.ValidationError({
                    'preference_rankings': 'Ranked preferences must be chosen only from the subjects available for your selected specialization domains.'
                })
        return attrs

    def create(self, validated_data):
        rankings = validated_data.pop('preference_rankings', [])
        preference = super().create(validated_data)
        self._save_rankings(preference, rankings)
        return preference

    def update(self, instance, validated_data):
        rankings = validated_data.pop('preference_rankings', None)
        preference = super().update(instance, validated_data)
        if rankings is not None:
            self._save_rankings(preference, rankings)
            preference.status = 'submitted' if rankings else 'draft'
            preference.hod_review_note = ''
            preference.hod_reviewed_by = None
            preference.hod_reviewed_at = None
            preference.save(update_fields=['status', 'hod_review_note', 'hod_reviewed_by', 'hod_reviewed_at', 'updated_at'])
        return preference

    def _save_rankings(self, preference, rankings):
        if rankings is None:
            return
        preference.ranked_subjects.all().delete()
        if rankings:
            courses = list(Course.objects.filter(id__in=rankings))
            course_map = {str(item.id): item for item in courses}
            preference.preferred_courses.set(courses)
            for index, course_id in enumerate(rankings, start=1):
                course = course_map.get(str(course_id))
                if course:
                    FacultyPreferredSubject.objects.create(
                        tenant=preference.tenant,
                        faculty_preference=preference,
                        course=course,
                        rank=index,
                    )
        else:
            preference.preferred_courses.clear()


class FacultyEligibleSubjectSerializer(serializers.ModelSerializer):
    faculty_profile_id = serializers.CharField(source='faculty_id', read_only=True)
    faculty_name = serializers.CharField(source='faculty.user.full_name', read_only=True)
    faculty_email = serializers.CharField(source='faculty.user.email', read_only=True)
    faculty_designation = serializers.CharField(source='faculty.get_designation_display', read_only=True)
    faculty_primary_domain_name = serializers.CharField(source='faculty.primary_specialization_domain.name', read_only=True, default=None)
    course_code = serializers.CharField(source='course.code', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    program = serializers.CharField(source='course.semester.program_id', read_only=True, default=None)
    program_name = serializers.CharField(source='course.semester.program.name', read_only=True, default=None)
    semester_number = serializers.IntegerField(source='course.semester.semester_number', read_only=True, default=None)
    semester_name = serializers.CharField(source='course.semester.name', read_only=True, default=None)
    primary_domain_name = serializers.CharField(source='course.primary_domain.name', read_only=True, default=None)
    secondary_domain_name = serializers.CharField(source='course.secondary_domain.name', read_only=True, default=None)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    source_type_display = serializers.CharField(source='get_source_type_display', read_only=True)

    class Meta:
        model = FacultyEligibleSubject
        fields = [
            'id', 'faculty', 'faculty_profile_id', 'faculty_name', 'faculty_email', 'faculty_designation', 'faculty_primary_domain_name',
            'course', 'course_code', 'course_name', 'program', 'program_name', 'semester_number', 'semester_name',
            'primary_domain_name', 'secondary_domain_name',
            'source_type', 'source_type_display', 'status', 'status_display', 'score', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class FacultySubjectAssignmentSerializer(serializers.ModelSerializer):
    faculty_profile_id = serializers.CharField(source='faculty_id', read_only=True)
    faculty_name = serializers.CharField(source='faculty.user.full_name', read_only=True)
    faculty_email = serializers.CharField(source='faculty.user.email', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    program = serializers.CharField(source='course.semester.program_id', read_only=True, default=None)
    program_name = serializers.CharField(source='course.semester.program.name', read_only=True, default=None)
    semester_number = serializers.IntegerField(source='course.semester.semester_number', read_only=True, default=None)
    semester_name = serializers.CharField(source='course.semester.name', read_only=True, default=None)
    assigned_by_name = serializers.CharField(source='assigned_by.full_name', read_only=True, default=None)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = FacultySubjectAssignment
        fields = [
            'id', 'faculty', 'faculty_profile_id', 'faculty_name', 'faculty_email',
            'course', 'course_code', 'course_name', 'program', 'program_name', 'semester_number', 'semester_name',
            'assigned_by', 'assigned_by_name', 'status', 'status_display', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CourseSectionSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    department_id = serializers.CharField(source='course.department_id', read_only=True)
    department_name = serializers.CharField(source='course.department.name', read_only=True, default=None)
    campus_id = serializers.CharField(source='course.department.campus_id', read_only=True)
    campus_name = serializers.CharField(source='course.department.campus.name', read_only=True, default=None)
    section_label = serializers.CharField(source='section.__str__', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True, default=None)
    batch_name = serializers.CharField(source='section.batch.name', read_only=True, default=None)
    semester_name = serializers.CharField(source='semester.name', read_only=True)
    faculty_name = serializers.CharField(source='faculty.user.full_name', read_only=True, default=None)
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = CourseSection
        fields = ['id', 'course', 'course_name', 'course_code', 'department_id', 'department_name', 
                  'campus_id', 'campus_name', 'section', 'section_label', 'section_name', 'batch_name',
                  'semester', 'semester_name', 'faculty', 'faculty_name', 'student_group',
                  'student_count', 'is_active', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_student_count(self, obj):
        if obj.student_group:
            return obj.student_group.strength
        if obj.section:
            return obj.section.strength
        return 0


class DepartmentRoomPreferenceSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    room_label = serializers.CharField(source='room.room_number', read_only=True)

    class Meta:
        model = DepartmentRoomPreference
        fields = ['id', 'department', 'department_name', 'room', 'room_label', 'course_type', 'priority', 'notes']
        read_only_fields = ['id']
