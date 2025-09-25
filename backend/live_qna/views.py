from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import LiveQASession, LiveQAMessage
from .serializers import (
    LiveQASessionSerializer, LiveQASessionCreateSerializer,
    LiveQAMessageSerializer, SendMessageSerializer, JoinSessionSerializer
)
from courses.models import Course

class IsLecturerPermission(permissions.BasePermission):
    """Permission for lecturers only"""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_lecturer

# LECTURER ENDPOINTS
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def lecturer_courses(request):
    """Get lecturer's courses for Live Q&A"""
    lecturer = request.user
    
    courses = Course.objects.filter(
        lecturer=lecturer,
        is_active=True
    ).order_by('code')
    
    courses_data = []
    for course in courses:
        active_sessions = LiveQASession.objects.filter(
            course=course,
            status='active'
        ).count()
        
        courses_data.append({
            'id': course.id,
            'name': course.name,
            'code': course.code,
            'enrolled_students': course.get_enrolled_students_count(),
            'active_sessions': active_sessions,
            'total_sessions': LiveQASession.objects.filter(course=course).count()
        })
    
    return Response(courses_data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def create_live_session(request):
    """Create a new Live Q&A session"""
    serializer = LiveQASessionCreateSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        session = serializer.save()
        
        response_data = LiveQASessionSerializer(session).data
        return Response({
            'message': 'Live Q&A session created successfully',
            'session': response_data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def lecturer_sessions(request):
    """Get all sessions for lecturer"""
    lecturer = request.user
    session_status = request.query_params.get('status')
    course_id = request.query_params.get('course_id')
    
    sessions = LiveQASession.objects.filter(lecturer=lecturer)
    
    if session_status:
        sessions = sessions.filter(status=session_status)
    
    if course_id:
        sessions = sessions.filter(course_id=course_id)
    
    sessions = sessions.order_by('-created_at')
    
    serializer = LiveQASessionSerializer(sessions, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def session_messages(request, session_id):
    """Get all messages for a session (lecturer view)"""
    session = get_object_or_404(
        LiveQASession,
        id=session_id,
        lecturer=request.user
    )
    
    messages = session.messages.all().order_by('-created_at')
    
    serializer = LiveQAMessageSerializer(messages, many=True)
    
    return Response({
        'session': LiveQASessionSerializer(session).data,
        'messages': serializer.data
    })

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsLecturerPermission])
def end_session(request, session_id):
    """End a Live Q&A session"""
    session = get_object_or_404(
        LiveQASession,
        id=session_id,
        lecturer=request.user,
        status='active'
    )
    
    session.end_session()
    
    return Response({
        'message': 'Session ended successfully',
        'session': LiveQASessionSerializer(session).data
    })

# STUDENT ENDPOINTS
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def join_session(request):
    """Join a Live Q&A session with session code"""
    serializer = JoinSessionSerializer(data=request.data)
    
    if serializer.is_valid():
        session_code = serializer.validated_data['session_code']
        
        try:
            session = LiveQASession.objects.get(
                session_code=session_code,
                status='active'
            )
        except LiveQASession.DoesNotExist:
            return Response(
                {'error': 'Session not found or inactive'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({
            'message': 'Session found',
            'session': {
                'id': session.id,
                'title': session.title,
                'course_code': session.course.code,
                'course_name': session.course.name,
                'session_code': session.session_code,
                'status': session.status
            }
        })
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def send_message(request, session_code):
    """Send a message to Live Q&A session"""
    try:
        session = LiveQASession.objects.get(
            session_code=session_code.upper(),
            status='active'
        )
    except LiveQASession.DoesNotExist:
        return Response(
            {'error': 'Session not found or inactive'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = SendMessageSerializer(data=request.data)
    
    if serializer.is_valid():
        message = serializer.save(session=session)
        
        response_data = LiveQAMessageSerializer(message).data
        
        return Response({
            'message': 'Message sent successfully',
            'data': response_data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_session_messages(request, session_code):
    """Get messages for a session (student view)"""
    try:
        session = LiveQASession.objects.get(
            session_code=session_code.upper(),
            status='active'
        )
    except LiveQASession.DoesNotExist:
        return Response(
            {'error': 'Session not found or inactive'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    messages = session.messages.all().order_by('-created_at')
    serializer = LiveQAMessageSerializer(messages, many=True)
    
    return Response({
        'session': {
            'title': session.title,
            'course_code': session.course.code,
            'course_name': session.course.name,
            'messages_count': session.get_messages_count()
        },
        'messages': serializer.data
    })

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def validate_session_code(request):
    """Validate a session code"""
    session_code = request.query_params.get('code')
    
    if not session_code:
        return Response(
            {'error': 'Session code is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        session = LiveQASession.objects.get(
            session_code=session_code.upper(),
            status='active'
        )
        
        return Response({
            'valid': True,
            'session': {
                'title': session.title,
                'course_name': session.course.name,
                'course_code': session.course.code,
                'messages_count': session.get_messages_count()
            }
        })
    except LiveQASession.DoesNotExist:
        return Response({
            'valid': False,
            'error': 'Invalid or expired session code'
        })