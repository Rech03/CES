from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authentication import TokenAuthentication
from django.utils import timezone
from django.db import transaction
import csv
import io
from django.contrib.auth.hashers import make_password

from users.models import User
from .models import Course, CourseEnrollment, Topic, Attendance
from .serializers import (
    CourseSerializer, CourseCreateSerializer, CourseEnrollmentSerializer,
    TopicSerializer, CourseDashboardSerializer, StudentDashboardSerializer,
    AttendanceSerializer
)


class IsLecturerOrReadOnly(permissions.BasePermission):
    """Custom permission for lecturers"""
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.is_lecturer


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
            return Course.objects.filter(lecturer=user)
        elif user.is_student:
            return Course.objects.filter(
                enrollments__student=user,
                enrollments__is_active=True
            )
        return Course.objects.none()
    
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


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def upload_students_csv(request, course_id):
    """Upload CSV to create and enroll students"""
    if not request.user.is_lecturer:
        return Response(
            {'error': 'Only lecturers can upload student data'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        course = Course.objects.get(id=course_id, lecturer=request.user)
    except Course.DoesNotExist:
        return Response(
            {'error': 'Course not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if 'csv_file' not in request.FILES:
        return Response(
            {'error': 'CSV file is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    csv_file = request.FILES['csv_file']
    
    if not csv_file.name.endswith('.csv'):
        return Response(
            {'error': 'File must be a CSV'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        decoded_file = csv_file.read().decode('utf-8')
        csv_data = csv.DictReader(io.StringIO(decoded_file))
        
        required_columns = ['first_name', 'last_name', 'student_number', 'password']
        if not all(col in csv_data.fieldnames for col in required_columns):
            return Response(
                {'error': f'CSV must contain columns: {", ".join(required_columns)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_students = []
        updated_students = []
        errors = []
        
        with transaction.atomic():
            for row_num, row in enumerate(csv_data, start=2):
                try:
                    first_name = row['first_name'].strip()
                    last_name = row['last_name'].strip()
                    student_number = row['student_number'].strip()
                    password = row['password'].strip()
                    
                    if not all([first_name, last_name, student_number, password]):
                        errors.append(f"Row {row_num}: Missing required data")
                        continue
                    
                    username = student_number.lower()
                    email = f"{student_number}@student.uct.ac.za"
                    
                    try:
                        user = User.objects.get(student_number=student_number)
                        user.first_name = first_name
                        user.last_name = last_name
                        user.set_password(password)
                        user.save()
                        updated_students.append(user)
                    except User.DoesNotExist:
                        user = User.objects.create(
                            username=username,
                            email=email,
                            first_name=first_name,
                            last_name=last_name,
                            student_number=student_number,
                            user_type='student',
                            password=make_password(password)
                        )
                        created_students.append(user)
                    
                    enrollment, created = CourseEnrollment.objects.get_or_create(
                        student=user,
                        course=course,
                        defaults={'is_active': True}
                    )
                    
                    if not created and not enrollment.is_active:
                        enrollment.is_active = True
                        enrollment.save()
                    
                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")
                    continue
        
        return Response({
            'message': 'CSV processed successfully',
            'created_students': len(created_students),
            'updated_students': len(updated_students),
            'errors': errors,
            'total_enrolled': course.get_enrolled_students_count()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Error processing CSV: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def course_attendance(request, course_id):
    """Get attendance records for a course"""
    if not request.user.is_lecturer:
        return Response(
            {'error': 'Only lecturers can view attendance'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        course = Course.objects.get(id=course_id, lecturer=request.user)
    except Course.DoesNotExist:
        return Response(
            {'error': 'Course not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    date_filter = request.GET.get('date')
    attendance_records = Attendance.objects.filter(course=course)
    
    if date_filter:
        try:
            filter_date = timezone.datetime.strptime(date_filter, '%Y-%m-%d').date()
            attendance_records = attendance_records.filter(date=filter_date)
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    attendance_records = attendance_records.order_by('-date', 'student__first_name')
    serializer = AttendanceSerializer(attendance_records, many=True)
    
    total_students = course.get_enrolled_students_count()
    if date_filter:
        present_count = attendance_records.filter(is_present=True).count()
        attendance_rate = (present_count / total_students * 100) if total_students > 0 else 0
    else:
        attendance_rate = None
    
    return Response({
        'attendance_records': serializer.data,
        'statistics': {
            'total_students': total_students,
            'present_count': present_count if date_filter else None,
            'attendance_rate': round(attendance_rate, 2) if attendance_rate else None
        }
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_attendance(request, course_id):
    """Manually mark attendance for students"""
    if not request.user.is_lecturer:
        return Response(
            {'error': 'Only lecturers can mark attendance'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        course = Course.objects.get(id=course_id, lecturer=request.user)
    except Course.DoesNotExist:
        return Response(
            {'error': 'Course not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    student_id = request.data.get('student_id')
    is_present = request.data.get('is_present', False)
    date_str = request.data.get('date')
    
    if not student_id:
        return Response(
            {'error': 'Student ID is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        student = User.objects.get(id=student_id, user_type='student')
    except User.DoesNotExist:
        return Response(
            {'error': 'Student not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if not CourseEnrollment.objects.filter(
        student=student, course=course, is_active=True
    ).exists():
        return Response(
            {'error': 'Student is not enrolled in this course'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if date_str:
        try:
            attendance_date = timezone.datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
    else:
        attendance_date = timezone.now().date()
    
    attendance, created = Attendance.objects.update_or_create(
        student=student,
        course=course,
        date=attendance_date,
        defaults={'is_present': is_present}
    )
    
    action = "marked" if created else "updated"
    return Response({
        'message': f'Attendance {action} successfully',
        'attendance': AttendanceSerializer(attendance).data
    })