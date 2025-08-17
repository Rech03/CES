# users/views.py - SINGLE USER MODEL VIEWS

from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from django.contrib.auth import login, logout
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated

from .models import User, StudentProfile
from .serializers import (
    LoginSerializer, UserSerializer, StudentSerializer, LecturerSerializer,
    UserProfileUpdateSerializer, ChangePasswordSerializer
)


class LoginView(APIView):
    """Handle user login"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            remember_me = serializer.validated_data.get('remember_me', False)
            
            # Log the user in
            login(request, user)
            
            # Set session expiry
            if not remember_me:
                request.session.set_expiry(0)
            else:
                request.session.set_expiry(1209600)  # 2 weeks
            
            # Get or create token
            token, created = Token.objects.get_or_create(user=user)
            
            # Return user data based on type
            if user.user_type == 'student':
                user_data = StudentSerializer(user).data
            elif user.user_type == 'lecturer':
                user_data = LecturerSerializer(user).data
            else:
                user_data = UserSerializer(user).data
            
            return Response({
                'token': token.key,
                'user_type': user.user_type,
                'user': user_data,
                'message': 'Login successful'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """Handle user logout"""
    authentication_classes = [TokenAuthentication]  # Added this
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            if hasattr(request.user, 'auth_token'):
                request.user.auth_token.delete()
            logout(request)
            return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)
        except Exception:
            return Response({'error': 'Logout failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ProfileView(APIView):
    """Get and update user profile"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get current user profile"""
        user = request.user
        
        if user.user_type == 'student':
            serializer = StudentSerializer(user)
        elif user.user_type == 'lecturer':
            serializer = LecturerSerializer(user)
        else:
            serializer = UserSerializer(user)
        
        return Response(serializer.data)
    
    def put(self, request):
        """Update user profile"""
        user = request.user
        
        serializer = UserProfileUpdateSerializer(
            user, 
            data=request.data, 
            context={'request': request},
            partial=True
        )
        
        if serializer.is_valid():
            serializer.save()
            
            # Return updated data based on user type
            if user.user_type == 'student':
                return Response(StudentSerializer(user).data)
            elif user.user_type == 'lecturer':
                return Response(LecturerSerializer(user).data)
            return Response(UserSerializer(user).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """Handle password change"""
    authentication_classes = [TokenAuthentication]  # Added this
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            # Delete all tokens to force re-login
            Token.objects.filter(user=user).delete()
            
            return Response({
                'message': 'Password changed successfully. Please login again.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])  # Added this
@permission_classes([permissions.IsAuthenticated])
def dashboard_data(request):
    """Get dashboard data for current user"""
    user = request.user
    
    if user.user_type == 'student':
        profile = getattr(user, 'student_profile', None)
        dashboard_data = {
            'user_type': 'student',
            'user': StudentSerializer(user).data,
            'stats': {
                'total_quizzes': profile.total_quizzes_completed if profile else 0,
                'correct_answers': profile.total_correct_answers if profile else 0,
                'current_streak': profile.current_streak if profile else 0,
                'fastest_time': profile.fastest_quiz_time if profile else None,
            },
            'courses_count': user.get_enrolled_courses().count(),
        }
    elif user.user_type == 'lecturer':
        dashboard_data = {
            'user_type': 'lecturer',
            'user': LecturerSerializer(user).data,
            'stats': {
                # Will implement when course models are ready
            },
        }
    else:
        dashboard_data = {
            'user_type': 'user',
            'user': UserSerializer(user).data,
        }
    
    return Response(dashboard_data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def check_student_enrollment(request):
    """Check if a student is enrolled in courses"""
    student_number = request.GET.get('student_number')
    
    if not student_number:
        return Response({
            'error': 'Student number is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        student = User.objects.get(student_number=student_number, user_type='student')
        courses_count = student.get_enrolled_courses().count()
        
        return Response({
            'exists': True,
            'enrolled': courses_count > 0,
            'courses_count': courses_count,
            'is_active': student.is_active
        })
    
    except User.DoesNotExist:
        return Response({
            'exists': False,
            'enrolled': False,
            'courses_count': 0
        })