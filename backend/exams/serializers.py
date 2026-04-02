from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import (
    ExamPlan, ExamSession, ExamCourseAssignment, 
    ExamHallAllocation, SeatingPlan, InvigilatorAssignment, ExamPublishLog
)

class ExamPlanSerializer(serializers.ModelSerializer):
    semester_name = serializers.CharField(source='semester.__str__', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = ExamPlan
        fields = ['id', 'name', 'department', 'department_name', 'semester', 'semester_name', 'status', 'status_display',
                  'start_date', 'end_date', 'instructions', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'status']

class ExamSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamSession
        fields = ['id', 'plan', 'name', 'date', 'start_time', 'end_time']
        read_only_fields = ['id']

    def validate(self, data):
        instance = ExamSession(**data)
        instance.tenant = self.context['request'].user.tenant
        try:
            instance.clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return data

class ExamCourseAssignmentSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course_section.course.name', read_only=True)
    course_code = serializers.CharField(source='course_section.course.code', read_only=True)
    section_name = serializers.CharField(source='course_section.section.name', read_only=True)
    batch_name = serializers.CharField(source='course_section.section.batch_name', read_only=True)
    student_count = serializers.IntegerField(source='course_section.section.strength', read_only=True)

    class Meta:
        model = ExamCourseAssignment
        fields = ['id', 'session', 'course_section', 'course_name', 'course_code', 
                  'section_name', 'batch_name', 'student_count']
        read_only_fields = ['id']

    def validate(self, data):
        instance = ExamCourseAssignment(**data)
        instance.tenant = self.context['request'].user.tenant
        try:
            instance.clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return data

class ExamHallAllocationSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(source='room.room_number', read_only=True)
    room_name = serializers.CharField(source='room.room_name', read_only=True)
    capacity = serializers.IntegerField(source='room.capacity', read_only=True)

    class Meta:
        model = ExamHallAllocation
        fields = ['id', 'session', 'room', 'room_number', 'room_name', 'capacity']
        read_only_fields = ['id']

    def validate(self, data):
        instance = ExamHallAllocation(**data)
        instance.tenant = self.context['request'].user.tenant
        try:
            instance.clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return data

class SeatingPlanSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source='exam_assignment.course_section.course.code', read_only=True)
    section_name = serializers.CharField(source='exam_assignment.course_section.section.name', read_only=True)
    room_number = serializers.CharField(source='hall_allocation.room.room_number', read_only=True)
    
    class Meta:
        model = SeatingPlan
        fields = ['id', 'exam_assignment', 'hall_allocation', 'allocated_count',
                  'course_code', 'section_name', 'room_number']
        read_only_fields = ['id']

    def validate(self, data):
        instance = SeatingPlan(**data)
        instance.tenant = self.context['request'].user.tenant
        try:
            instance.clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return data

class InvigilatorAssignmentSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.user_name', read_only=True)
    room_number = serializers.CharField(source='hall_allocation.room.room_number', read_only=True)
    
    class Meta:
        model = InvigilatorAssignment
        fields = ['id', 'hall_allocation', 'faculty', 'faculty_name', 'is_chief', 'room_number']
        read_only_fields = ['id']

    def validate(self, data):
        instance = InvigilatorAssignment(**data)
        instance.tenant = self.context['request'].user.tenant
        try:
            instance.clean()
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return data

class ExamPublishLogSerializer(serializers.ModelSerializer):
    published_by_name = serializers.CharField(source='published_by.full_name', read_only=True)

    class Meta:
        model = ExamPublishLog
        fields = ['id', 'plan', 'published_by', 'published_by_name', 'published_at', 'version', 'notes']
        read_only_fields = ['id', 'published_at', 'version']
