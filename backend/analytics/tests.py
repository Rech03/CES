# analytics/tests.py
from django.test import SimpleTestCase, TestCase, override_settings
from django.urls import reverse, resolve
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock
import json
import logging
logging.getLogger("django.request").setLevel(logging.ERROR)
logging.getLogger("django.security").setLevel(logging.ERROR)
from analytics.services import ClaudeAPIService
from analytics.models import LectureSlide, AdaptiveQuiz
from courses.models import Course, Topic
from rest_framework.test import APITestCase

# ---------- 1) Claude service tests ----------

MOCK_JSON = {
    "questions": [
        *[
            {"difficulty": "easy", "question": f"E{i}?", "options": {"A":"a","B":"b","C":"c","D":"d"}, "correct_answer": "A", "explanation": "x"}
            for i in range(5)
        ],
        *[
            {"difficulty": "medium", "question": f"M{i}?", "options": {"A":"a","B":"b","C":"c","D":"d"}, "correct_answer": "B", "explanation": "x"}
            for i in range(5)
        ],
        *[
            {"difficulty": "hard", "question": f"H{i}?", "options": {"A":"a","B":"b","C":"c","D":"d"}, "correct_answer": "C", "explanation": "x"}
            for i in range(5)
        ],
    ]
}

@override_settings(CLAUDE_API_KEY="test-key")
class ClaudeServiceTests(SimpleTestCase):
    @patch("analytics.services.requests.post")
    def test_generate_questions_ok(self, mock_post):
        ok = MagicMock(status_code=200)
        ok.json.return_value = {"content": [{"text": json.dumps(MOCK_JSON)}]}
        mock_post.return_value = ok

        svc = ClaudeAPIService()
        data = svc.generate_questions_from_content("Vars...", "Python Variables")

        self.assertIn("questions", data)
        self.assertEqual(len(data["questions"]), 15)

    @patch("analytics.services.requests.post")
    def test_404_then_retry_fallback(self, mock_post):
        not_found = MagicMock(status_code=404, text="model not found", headers={})
        ok = MagicMock(status_code=200)
        ok.json.return_value = {"content": [{"text": json.dumps({"questions": []})}]}
        mock_post.side_effect = [not_found, ok]

        svc = ClaudeAPIService()
        data = svc.generate_questions_from_content("x", "y")
        self.assertIn("questions", data)

# ---------- 2) LectureSlide PDF validation ----------

User = get_user_model()

class LectureSlideValidationTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.lecturer = User.objects.create_user(
            username="lec",
            email="lec@example.com",
            password="x",
            first_name="Lec",
            last_name="Turer",
            user_type="lecturer",
        )
        cls.course = Course.objects.create(code="CS101", name="Intro", lecturer=cls.lecturer)
        cls.topic = Topic.objects.create(course=cls.course, name="Variables")

    def test_reject_non_pdf_on_save(self):
        slide = LectureSlide(
            topic=self.topic,
            title="Bad",
            slide_file="lecture_slides/bad.txt",  # non-PDF
            uploaded_by=self.lecturer,
        )
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            slide.save()

# ---------- 3) Adaptive URL smoke test ----------

class AdaptiveUrlsTest(SimpleTestCase):
    def test_urls_exist(self):
        # routes without kwargs
        for name in [
            "upload_lecture_slide",
            "generate_adaptive_questions",
            "lecturer_lecture_slides",
            "student_available_slides",
            "submit_adaptive_quiz",
            "student_adaptive_progress",
        ]:
            url = reverse(name)
            self.assertTrue(resolve(url))

        # routes requiring kwargs
        self.assertTrue(resolve(reverse("delete_lecture_slide", kwargs={"slide_id": 1})))
        self.assertTrue(resolve(reverse("regenerate_questions", kwargs={"slide_id": 1})))
        self.assertTrue(resolve(reverse("get_adaptive_quiz", kwargs={"quiz_id": 1})))

# ---------- 4) End-to-end view test (generate_adaptive_questions) ----------

class GenerateAdaptiveQuestionsViewTest(APITestCase):
    def setUp(self):
        # Create lecturer
        self.lecturer = User.objects.create_user(
            username="lectest",
            email="lec@test.com",
            password="pw12345",
            first_name="Lec",
            last_name="Test",
            user_type="lecturer",
        )
        # Course + topic
        self.course = Course.objects.create(code="CS200", name="Course 200", lecturer=self.lecturer)
        self.topic = Topic.objects.create(course=self.course, name="Functions")
        # Slide with extracted text
        self.slide = LectureSlide.objects.create(
            topic=self.topic,
            title="Week 5",
            slide_file="lecture_slides/week5.pdf",
            uploaded_by=self.lecturer,
            extracted_text="def foo(): pass"
        )
        self.url = reverse("generate_adaptive_questions")

    @patch("analytics.adaptive_views.ClaudeAPIService.generate_questions_from_content")
    def test_generate_adaptive_questions_creates_quizzes(self, mock_generate):
        # Mock Claude output: 1 question per difficulty
        mock_generate.return_value = {
            "questions": [
                {"difficulty":"easy","question":"E?","options":{"A":"a","B":"b","C":"c","D":"d"},"correct_answer":"A","explanation":"x"},
                {"difficulty":"medium","question":"M?","options":{"A":"a","B":"b","C":"c","D":"d"},"correct_answer":"B","explanation":"x"},
                {"difficulty":"hard","question":"H?","options":{"A":"a","B":"b","C":"c","D":"d"},"correct_answer":"C","explanation":"x"},
            ]
        }

        # Authenticate
        self.client.force_authenticate(user=self.lecturer)
        resp = self.client.post(self.url, {"lecture_slide_id": self.slide.id}, format="json")

        self.assertEqual(resp.status_code, 201)
        self.assertEqual(AdaptiveQuiz.objects.filter(lecture_slide=self.slide).count(), 3)
        self.assertTrue(LectureSlide.objects.get(id=self.slide.id).questions_generated)
from analytics.models import StudentAdaptiveProgress

class SubmitAdaptiveQuizViewTest(APITestCase):
    def setUp(self):
        # Lecturer + student
        self.lecturer = User.objects.create_user(
            username="lecsub", email="lecsub@test.com",
            password="pw123", user_type="lecturer"
        )
        self.student = User.objects.create_user(
            username="stusub", email="stusub@test.com",
            password="pw123", user_type="student"
        )

        # Course + topic + slide
        self.course = Course.objects.create(code="CS300", name="Course 300", lecturer=self.lecturer)
        self.topic = Topic.objects.create(course=self.course, name="Conditionals")
        self.slide = LectureSlide.objects.create(
            topic=self.topic, title="Week 6",
            slide_file="lecture_slides/week6.pdf", uploaded_by=self.lecturer,
            extracted_text="if x > 0: pass"
        )

        # Adaptive quiz with 2 questions
        self.quiz = AdaptiveQuiz.objects.create(
            lecture_slide=self.slide, difficulty="easy",
            questions_data={
                "questions": [
                    {
                        "difficulty":"easy","question":"Q1",
                        "options":{"A":"a","B":"b","C":"c","D":"d"},
                        "correct_answer":"A","explanation":"x"
                    },
                    {
                        "difficulty":"easy","question":"Q2",
                        "options":{"A":"a","B":"b","C":"c","D":"d"},
                        "correct_answer":"B","explanation":"y"
                    }
                ]
            }
        )

        self.url = reverse("submit_adaptive_quiz")

    def test_submit_quiz_and_get_score(self):
        self.client.force_authenticate(user=self.student)

        answers = {"question_0": "A", "question_1": "D"}  # 1 correct, 1 wrong
        payload = {"adaptive_quiz_id": self.quiz.id, "answers": answers}

        resp = self.client.post(self.url, payload, format="json")

        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["correct_count"], 1)
        self.assertEqual(data["total_questions"], 2)
        self.assertAlmostEqual(data["score"], 50.0, places=2)
        self.assertTrue(data["completed"])  # >=50% = completed

        # Check progress record updated
        progress = StudentAdaptiveProgress.objects.get(student=self.student, adaptive_quiz=self.quiz)
        self.assertEqual(progress.latest_score, 50.0)
        self.assertTrue(progress.completed)

from rest_framework.test import APITestCase
from django.test import override_settings
from django.core import mail
from django.utils import timezone
from quizzes.models import Quiz, QuizAttempt
from courses.models import Course, Topic, CourseEnrollment
from analytics.models import StudentEngagementMetrics
from django.urls import reverse

class PermissionSmokeTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.lecturer = User.objects.create_user(
            username="perm_lec", email="perm_lec@test.com",
            password="pw", user_type="lecturer"
        )
        self.student = User.objects.create_user(
            username="perm_stu", email="perm_stu@test.com",
            password="pw", user_type="student"
        )
        self.course = Course.objects.create(code="P001", name="Perm Course", lecturer=self.lecturer)
        self.topic = Topic.objects.create(course=self.course, name="Perm Topic")
        CourseEnrollment.objects.create(student=self.student, course=self.course, is_active=True)

    def test_lecturer_only_views_reject_student(self):
        self.client.force_authenticate(user=self.student)
        for name, method, payload in [
            ("lecturer_analytics_dashboard", "get", None),
            ("lecturer_analytics_chart", "post", {"chart_type": "student_distribution"}),
            ("lecturer_course_options", "get", None),
        ]:
            url = reverse(name)
            resp = getattr(self.client, method)(url, payload or {}, format="json")
            self.assertEqual(resp.status_code, 403, msg=f"{name} should be 403 for student")

    def test_student_only_views_reject_lecturer(self):
        self.client.force_authenticate(user=self.lecturer)
        for name in ["student_analytics_dashboard", "student_engagement_heatmap"]:
            url = reverse(name)
            resp = self.client.get(url)
            self.assertEqual(resp.status_code, 403, msg=f"{name} should be 403 for lecturer")


# === 6) Intervention email flow (uses locmem backend) ===
@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    DEFAULT_FROM_EMAIL="noreply@test.local",
)
class InterventionEmailTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.lecturer = User.objects.create_user(
            username="int_lec", email="int_lec@test.com", password="pw", user_type="lecturer"
        )
        self.student = User.objects.create_user(
            username="int_stu", email="int_stu@test.com", password="pw", user_type="student"
        )
        self.course = Course.objects.create(code="INT101", name="Intervention 101", lecturer=self.lecturer)
        self.topic = Topic.objects.create(course=self.course, name="Intro")
        CourseEnrollment.objects.create(student=self.student, course=self.course, is_active=True)

        # Create 3 active quizzes the student has NOT attempted
        self.q1 = Quiz.objects.create(topic=self.topic, title="Q1", is_active=True)
        self.q2 = Quiz.objects.create(topic=self.topic, title="Q2", is_active=True)
        self.q3 = Quiz.objects.create(topic=self.topic, title="Q3", is_active=True)

    def test_three_misses_triggers_email(self):
        metrics = StudentEngagementMetrics.objects.create(student=self.student, course=self.course)
        # This counts latest active quizzes (ordered -created_at) and marks misses.
        metrics.calculate_consecutive_misses()

        self.assertEqual(metrics.consecutive_missed_quizzes, 3)
        self.assertTrue(metrics.intervention_email_sent)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(self.course.code, mail.outbox[0].subject)

    def test_no_email_if_less_than_three_misses(self):
        # Give the student an attempt on the most recent quiz so only 2 misses are counted
        QuizAttempt.objects.create(student=self.student, quiz=self.q3, is_completed=True, score_percentage=70)
        metrics = StudentEngagementMetrics.objects.create(student=self.student, course=self.course)
        metrics.calculate_consecutive_misses()

        self.assertLess(metrics.consecutive_missed_quizzes, 3)
        self.assertFalse(metrics.intervention_email_sent)
        self.assertEqual(len(mail.outbox), 0)


# === 7) Parser robustness: handles ```json fenced content ===
@override_settings(CLAUDE_API_KEY="test-key")
class ClaudeParserFenceTest(SimpleTestCase):
    @patch("analytics.services.requests.post")
    def test_parses_json_inside_fences(self, mock_post):
        fenced = "```json\n" + json.dumps({"questions": []}) + "\n```"
        ok = MagicMock(status_code=200)
        ok.json.return_value = {"content": [{"text": fenced}]}
        mock_post.return_value = ok

        svc = ClaudeAPIService()
        data = svc.generate_questions_from_content("x", "y")
        self.assertIn("questions", data)

class PermissionSmokeTests(MuteDjangoLogsMixin, APITestCase):
    def setUp(self):
        User = get_user_model()
        self.lecturer = User.objects.create_user(
            username="perm_lec", email="perm_lec@test.com",
            password="pw", user_type="lecturer"
        )
        self.student = User.objects.create_user(
            username="perm_stu", email="perm_stu@test.com",
            password="pw", user_type="student"
        )
        self.course = Course.objects.create(code="P001", name="Perm Course", lecturer=self.lecturer)
        self.topic = Topic.objects.create(course=self.course, name="Perm Topic")
        CourseEnrollment.objects.create(student=self.student, course=self.course, is_active=True)

    def test_lecturer_only_views_reject_student(self):
        self.client.force_authenticate(user=self.student)
        for name, method, payload in [
            ("lecturer_analytics_dashboard", "get", None),
            ("lecturer_analytics_chart", "post", {"chart_type": "student_distribution"}),
            ("lecturer_course_options", "get", None),
        ]:
            url = reverse(name)
            resp = getattr(self.client, method)(url, payload or {}, format="json")
            self.assertEqual(resp.status_code, 403, msg=f"{name} should be 403 for student")

    def test_student_only_views_reject_lecturer(self):
        self.client.force_authenticate(user=self.lecturer)
        for name in ["student_analytics_dashboard", "student_engagement_heatmap"]:
            url = reverse(name)
            resp = self.client.get(url)
            self.assertEqual(resp.status_code, 403, msg=f"{name} should be 403 for lecturer")
import logging

class MuteDjangoLogsMixin:
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._old_lvl_req = logging.getLogger("django.request").level
        cls._old_lvl_sec = logging.getLogger("django.security").level
        logging.getLogger("django.request").setLevel(logging.ERROR)
        logging.getLogger("django.security").setLevel(logging.ERROR)

    @classmethod
    def tearDownClass(cls):
        logging.getLogger("django.request").setLevel(cls._old_lvl_req)
        logging.getLogger("django.security").setLevel(cls._old_lvl_sec)
        super().tearDownClass()