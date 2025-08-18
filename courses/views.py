from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authentication import TokenAuthentication
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Count, Avg
from django.db import transaction

from .models import Course, CourseEnrollment, Topic
from .serializers import (
    CourseSerializer, CourseCreateSerializer, CourseEnrollmentSerializer,
    EnrollStudentSerializer, TopicSerializer, CourseDashboardSerializer, 
    StudentDashboardSerializer, EnrollWithCodeSerializer
)


class IsLecturerOrReadOnly(permissions.BasePermission):
    """Custom permission for lecturers"""
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.is_lecturer


class IsEnrolledStudent(permissions.BasePermission):
    """Permission for enrolled students"""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_student
    
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'course'):
            course = obj.course
        else:
            course = obj
        
        return CourseEnrollment.objects.filter(
            student=request.user,
            course=course,
            is_active=True
        ).exists()


class CourseViewSet(viewsets.ModelViewSet):
    """Course CRUD operations"""
    queryset = Course.objects.all()
    authentication_classes = [TokenAuthentication]
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, IsLecturerOrReadOnly]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CourseCreateSerializer
        return CourseSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.is_lecturer:
            # Lecturers see only their courses
            return Course.objects.filter(lecturer=user)
        elif user.is_student:
            # Students see only enrolled courses
            return Course.objects.filter(
                enrollments__student=user,
                enrollments__is_active=True
            )
        return Course.objects.none()
    
    @action(detail=True, methods=['post'])
    def enroll_student(self, request, pk=None):
        """Enroll a student in the course"""
        course = self.get_object()
        
        # Only lecturer of the course can enroll students
        if course.lecturer != request.user:
            return Response(
                {'error': 'Only the course lecturer can enroll students'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = EnrollStudentSerializer(data=request.data)
        if serializer.is_valid():
            student = serializer.validated_data['student']
            
            enrollment = CourseEnrollment.objects.create(
                student=student,
                course=course
            )
            
            return Response({
                'message': f'Student {student.get_full_name()} enrolled successfully',
                'enrollment': CourseEnrollmentSerializer(enrollment).data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        """Get enrolled students for the course"""
        course = self.get_object()
        
        if course.lecturer != request.user:
            return Response(
                {'error': 'Only the course lecturer can view students'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        enrollments = CourseEnrollment.objects.filter(
            course=course, is_active=True
        ).order_by('student__first_name', 'student__last_name')
        
        serializer = CourseEnrollmentSerializer(enrollments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        """Get course dashboard data"""
        course = self.get_object()
        
        if course.lecturer != request.user:
            return Response(
                {'error': 'Only the course lecturer can view dashboard'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = CourseDashboardSerializer(course)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def remove_student(self, request, pk=None):
        """Remove a student from the course"""
        course = self.get_object()
        
        if course.lecturer != request.user:
            return Response(
                {'error': 'Only the course lecturer can remove students'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        student_id = request.data.get('student_id')
        if not student_id:
            return Response(
                {'error': 'Student ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            enrollment = CourseEnrollment.objects.get(
                course=course,
                student_id=student_id,
                is_active=True
            )
            enrollment.is_active = False
            enrollment.save()
            
            return Response({
                'message': 'Student removed from course successfully'
            })
        except CourseEnrollment.DoesNotExist:
            return Response(
                {'error': 'Student not found in this course'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['get'])
    def topics(self, request, pk=None):
        """Get topics for the course"""
        course = self.get_object()
        
        # Check permissions
        if request.user.is_lecturer and course.lecturer != request.user:
            return Response(
                {'error': 'You can only view topics for your courses'},
                status=status.HTTP_403_FORBIDDEN
            )
        elif request.user.is_student:
            if not CourseEnrollment.objects.filter(
                student=request.user, course=course, is_active=True
            ).exists():
                return Response(
                    {'error': 'You must be enrolled to view course topics'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        topics = course.topics.filter(is_active=True).order_by('created_at')
        serializer = TopicSerializer(topics, many=True)
        return Response(serializer.data)


class TopicViewSet(viewsets.ModelViewSet):
    """Topic CRUD operations"""
    serializer_class = TopicSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_lecturer:
            return Topic.objects.filter(course__lecturer=user)
        elif user.is_student:
            return Topic.objects.filter(
                course__enrollments__student=user,
                course__enrollments__is_active=True,
                is_active=True
            )
        return Topic.objects.none()
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated, IsLecturerOrReadOnly]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def perform_create(self, serializer):
        # Ensure lecturer owns the course
        course = serializer.validated_data['course']
        if course.lecturer != self.request.user:
            raise permissions.PermissionDenied(
                "You can only create topics for your own courses"
            )
        serializer.save()


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def student_dashboard(request):
    """Get student dashboard data"""
    if not request.user.is_student:
        return Response(
            {'error': 'Only students can access dashboard'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = StudentDashboardSerializer(request.user)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def enroll_with_code(request):
    """Allow students to enroll using enrollment code"""
    if not request.user.is_student:
        return Response(
            {'error': 'Only students can enroll in courses'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = EnrollWithCodeSerializer(data=request.data)
    if serializer.is_valid():
        enrollment_code = serializer.validated_data['enrollment_code']
        
        try:
            course = Course.objects.get(enrollment_code=enrollment_code, is_active=True)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Invalid enrollment code'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already enrolled
        if CourseEnrollment.objects.filter(
            student=request.user,
            course=course
        ).exists():
            return Response(
                {'error': 'You are already enrolled in this course'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create enrollment
        enrollment = CourseEnrollment.objects.create(
            student=request.user,
            course=course
        )
        
        return Response({
            'message': f'Successfully enrolled in {course.name}',
            'enrollment': CourseEnrollmentSerializer(enrollment).data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def regenerate_enrollment_code(request, course_id):
    """Regenerate enrollment code for a course"""
    if not request.user.is_lecturer:
        return Response(
            {'error': 'Only lecturers can regenerate enrollment codes'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        course = Course.objects.get(id=course_id, lecturer=request.user)
    except Course.DoesNotExist:
        return Response(
            {'error': 'Course not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Generate new enrollment code
    course.enrollment_code = course.generate_enrollment_code()
    course.save()
    
    return Response({
        'message': 'Enrollment code regenerated successfully',
        'new_enrollment_code': course.enrollment_code
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def course_statistics(request, course_id):
    """Get basic course statistics for lecturers"""
    if not request.user.is_lecturer:
        return Response(
            {'error': 'Only lecturers can view course statistics'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        course = Course.objects.get(id=course_id, lecturer=request.user)
    except Course.DoesNotExist:
        return Response(
            {'error': 'Course not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Get basic statistics
    enrollments = CourseEnrollment.objects.filter(course=course, is_active=True)
    total_students = enrollments.count()
    
    # Topic statistics
    topics = course.topics.filter(is_active=True)
    total_topics = topics.count()
    
    statistics = {
        'course_info': CourseSerializer(course).data,
        'students': {
            'total_enrolled': total_students,
            'enrollments': CourseEnrollmentSerializer(enrollments, many=True).data
        },
        'topics': {
            'total': total_topics,
            'topics_list': TopicSerializer(topics, many=True).data
        }
    }
    
    return Response(statistics)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def my_courses(request):
    """Get user's courses"""
    user = request.user
    
    if user.is_lecturer:
        courses = Course.objects.filter(lecturer=user)
        serializer = CourseSerializer(courses, many=True)
        return Response({
            'user_type': 'lecturer',
            'courses': serializer.data
        })
    elif user.is_student:
        enrollments = CourseEnrollment.objects.filter(
            student=user, is_active=True
        ).select_related('course')
        serializer = CourseEnrollmentSerializer(enrollments, many=True)
        return Response({
            'user_type': 'student', 
            'enrollments': serializer.data
        })
    
    return Response({'courses': []})