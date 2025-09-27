import json
import time
import requests
from django.conf import settings
from typing import Dict, List, Any
from .models import StudentAdaptiveProgress, AdaptiveQuiz, AdaptiveQuizAttempt
from django.utils import timezone
from django.db import transaction


class ClaudeAPIService:
    """Service for interacting with Claude API to generate quiz questions"""
    PREFERRED_MODEL = "claude-sonnet-4-20250514"
    FALLBACK_MODELS = [
        "claude-3-7-sonnet-20250219",
        "claude-3-7-sonnet-latest",
    ]
    def __init__(self):
        self.api_key = settings.CLAUDE_API_KEY
        self.base_url = "https://api.anthropic.com/v1/messages"
        self.headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01"
        }
        self.request_timeout = 60
        self.max_retries = 3
        self.backoff_base_seconds = 1.0
    
    def generate_questions_from_content(self, text_content: str, slide_title: str) -> Dict[str, Any]:
        """
        Generate adaptive quiz questions from lecture slide content
        
        Args:
            text_content: Extracted text from PDF slide
            slide_title: Title of the lecture slide
            
        Returns:
            Dictionary containing generated questions organized by difficulty
        """
        if not self.api_key:
            raise ValueError("Claude API key not configured")
        
        prompt = self._build_question_generation_prompt(text_content, slide_title)
        
        try:
            response = self._make_api_request(prompt)
            questions_data = self._parse_response(response)
            return questions_data
            
        except requests.exceptions.RequestException as e:
            raise ValueError(f"API request failed: {str(e)}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse API response: {str(e)}")
        except Exception as e:
            raise ValueError(f"Question generation failed: {str(e)}")
    
    def _build_question_generation_prompt(self, content: str, title: str) -> str:
        """Build the prompt for question generation"""
        return f"""
You are an expert educator creating adaptive quiz questions from lecture content. 

Lecture Title: {title}
Lecture Content: {content}

Generate exactly 15 multiple-choice questions (5 easy, 5 medium, 5 hard) based on this content.

Requirements:
1. Questions should test understanding at different cognitive levels
2. Easy: Basic recall and comprehension
3. Medium: Application and analysis  
4. Hard: Synthesis and evaluation
5. Each question must have exactly 4 options (A, B, C, D)
6. Include clear explanations for correct answers
7. Ensure questions are directly related to the provided content

Return your response as a valid JSON object with this exact structure:
{{
    "questions": [
        {{
            "difficulty": "easy",
            "question": "Question text here?",
            "options": {{
                "A": "Option A text",
                "B": "Option B text", 
                "C": "Option C text",
                "D": "Option D text"
            }},
            "correct_answer": "A",
            "explanation": "Detailed explanation of why this answer is correct and others are wrong."
        }}
    ]
}}

Important: Return ONLY the JSON object, no additional text or formatting.
"""
    
    def _make_api_request(self, prompt: str) -> Dict[str, Any]:
        """Call Anthropic Messages API with model fallbacks + retries."""
        models_to_try = [self.PREFERRED_MODEL, *self.FALLBACK_MODELS]
        last_error = None

        for model in models_to_try:
            payload = {
                "model": model,
                "max_tokens": 4000,
                "messages": [{"role": "user", "content": prompt}],
            }

            # Basic retry loop for transient errors
            for attempt in range(self.max_retries):
                try:
                    resp = requests.post(
                        self.base_url,
                        headers=self.headers,
                        json=payload,
                        timeout=self.request_timeout,
                    )

                    # Success
                    if resp.status_code == 200:
                        return resp.json()

                    # 404 -> likely retired/unknown model: break to try next model
                    if resp.status_code == 404:
                        last_error = f"404 for model '{model}': {resp.text}"
                        break

                    # 429/5xx -> retry with backoff
                    if resp.status_code == 429 or 500 <= resp.status_code < 600:
                        retry_after = float(resp.headers.get("retry-after", 0)) or (self.backoff_base_seconds * (2 ** attempt))
                        time.sleep(min(retry_after, 8.0))
                        continue

                    # Other non-200 -> do not retry (client errors etc.)
                    last_error = f"API request failed with status {resp.status_code}: {resp.text}"
                    break

                except requests.exceptions.Timeout as e:
                    # retry timeouts
                    if attempt < self.max_retries - 1:
                        time.sleep(self.backoff_base_seconds * (2 ** attempt))
                        continue
                    last_error = f"Timeout contacting Anthropic: {e}"
                except requests.exceptions.RequestException as e:
                    # network issues; retry
                    if attempt < self.max_retries - 1:
                        time.sleep(self.backoff_base_seconds * (2 ** attempt))
                        continue
                    last_error = f"Network error contacting Anthropic: {e}"

            # try the next model if this one failed
            continue

        # If we get here, no model worked
        raise requests.exceptions.RequestException(last_error or "No supported Claude model available; update model IDs.")
    
    def _parse_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Claude API response and extract questions"""
        try:
            content = response['content'][0]['text']
            
            # Clean up the response - remove any markdown formatting
            content = content.strip()
            if content.startswith('```json'):
                content = content[7:]
            if content.endswith('```'):
                content = content[:-3]
            content = content.strip()
            
            questions_data = json.loads(content)
            
            # Validate the structure
            if 'questions' not in questions_data:
                raise ValueError("Response missing 'questions' key")
            
            # Validate each question
            for question in questions_data['questions']:
                required_keys = ['difficulty', 'question', 'options', 'correct_answer', 'explanation']
                for key in required_keys:
                    if key not in question:
                        raise ValueError(f"Question missing required key: {key}")
                
                # Validate options structure
                if not isinstance(question['options'], dict):
                    raise ValueError("Question options must be a dictionary")
                
                expected_options = ['A', 'B', 'C', 'D']
                if set(question['options'].keys()) != set(expected_options):
                    raise ValueError("Question must have exactly options A, B, C, D")
                
                # Validate correct answer
                if question['correct_answer'] not in expected_options:
                    raise ValueError("Correct answer must be A, B, C, or D")
                
                # Validate difficulty
                if question['difficulty'] not in ['easy', 'medium', 'hard']:
                    raise ValueError("Difficulty must be easy, medium, or hard")
            
            return questions_data
            
        except KeyError as e:
            raise ValueError(f"Unexpected response structure: missing {e}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in response: {e}")


class AdaptiveQuizService:
    """Service for managing adaptive quiz logic and student progress"""
    
    @staticmethod
    def get_available_quizzes_for_student(student, lecture_slide):
        """
        Get all available quizzes for a student with access information
        
        Args:
            student: User object (student)
            lecture_slide: LectureSlide object
            
        Returns:
            List of quiz information with accessibility status
        """
        quizzes = AdaptiveQuiz.objects.filter(
            lecture_slide=lecture_slide,
            is_active=True,
            status='published'
        ).order_by('difficulty')
        
        quiz_info_list = []
        
        for quiz in quizzes:
            # Get or create progress record
            progress, created = StudentAdaptiveProgress.objects.get_or_create(
                student=student,
                adaptive_quiz=quiz
            )
            
            # Determine accessibility
            accessible = AdaptiveQuizService._is_quiz_accessible(student, quiz, lecture_slide)
            
            # Determine status
            if progress.completed:
                status = 'completed'
            elif accessible:
                status = 'available'
            else:
                status = 'locked'
            
            quiz_info = {
                'quiz': quiz,
                'progress': progress,
                'accessible': accessible,
                'status': status
            }
            
            quiz_info_list.append(quiz_info)
        
        return quiz_info_list
    
    @staticmethod
    def _is_quiz_accessible(student, quiz, lecture_slide):
        """
        Check if a student can access a specific quiz based on progression rules
        """
        # Easy quizzes are always accessible
        if quiz.difficulty == 'easy':
            return True
        
        # For medium and hard, check if previous difficulty is completed
        difficulty_order = ['easy', 'medium', 'hard']
        current_index = difficulty_order.index(quiz.difficulty)
        
        if current_index > 0:
            previous_difficulty = difficulty_order[current_index - 1]
            
            try:
                previous_quiz = AdaptiveQuiz.objects.get(
                    lecture_slide=lecture_slide,
                    difficulty=previous_difficulty,
                    is_active=True,
                    status='published'  # FIXED: Only check published quizzes
                )
                
                previous_progress = StudentAdaptiveProgress.objects.get(
                    student=student,
                    adaptive_quiz=previous_quiz
                )
                
                return previous_progress.completed
                
            except (AdaptiveQuiz.DoesNotExist, StudentAdaptiveProgress.DoesNotExist):
                return False
        
        return True
    
    @staticmethod
    def process_quiz_attempt(student, adaptive_quiz, answers):
        """
        Process a student's adaptive quiz attempt
        
        Args:
            student: User object
            adaptive_quiz: AdaptiveQuiz object
            answers: Dictionary of student answers
            
        Returns:
            Dictionary with attempt results
        """
        questions_data = adaptive_quiz.get_questions()
        questions = questions_data.get('questions', [])
        
        if not questions:
            raise ValueError("Quiz has no questions")
        
        # Calculate score
        correct_count = 0
        total_questions = len(questions)
        
        for i, question in enumerate(questions):
            question_key = f"question_{i}"
            student_answer = answers.get(question_key)
            correct_answer = question.get('correct_answer')
            
            if student_answer == correct_answer:
                correct_count += 1
        
        score_percentage = (correct_count / total_questions) * 100
        
        # Get or create progress record
        progress, created = StudentAdaptiveProgress.objects.get_or_create(
            student=student,
            adaptive_quiz=adaptive_quiz
        )
        
        # Update progress
        with transaction.atomic():
            progress.attempts_count += 1
            progress.latest_score = score_percentage
            
            if score_percentage > progress.best_score:
                progress.best_score = score_percentage
            
            # Check if completed (50% threshold)
            if score_percentage >= 50 and not progress.completed:
                progress.mark_completed(score_percentage)
            
            progress.save()
            
            # Create attempt record
            attempt = AdaptiveQuizAttempt.objects.create(
                progress=progress,
                answers_data=answers,
                score_percentage=score_percentage
            )
        
        # Determine if explanations should be shown
        show_explanation = progress.should_show_explanation()
        
        # Check if next level was unlocked
        unlocked_next = progress.unlocked_next_level
        
        result = {
            'score': score_percentage,
            'correct_count': correct_count,
            'total_questions': total_questions,
            'completed': progress.completed,
            'show_explanation': show_explanation,
            'unlocked_next': unlocked_next,
            'attempt_id': attempt.id
        }
        
        return result