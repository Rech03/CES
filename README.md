The **Course Engagement System (CES)** is a full-stack web application designed to improve classroom participation in large Computer Science classes. 
CES combines baseline course management with three innovative features:
**AI-Driven Adaptive Quizzes**
**Analytics Dashboards**
**Gamification through Achievements**
**Live Q&A module** to support interactive learning.

## 🚀 Features

### Core Innovations
- **AI-Driven Adaptive Quizzes with Lecturer Moderation**
  - Lecturers upload lecture slides.
  - The system generates quizzes at multiple difficulty levels.
  - Quizzes can be reviewed, edited, and published after moderation.
  - Students complete quizzes in a timed interface with automatic submission.

- **Analytics Dashboards**
  - Lecturers access course, student, and quiz-level analytics.
  - Students view personal dashboards showing scores, progress, and trends.

- **Gamification through Achievements**
  - Students earn badges, XP, and streaks for participation.
  - Achievements are displayed in a dedicated dashboard to motivate engagement.

### Additional Feature
- **Live Q&A**
  - Lecturers create and moderate real-time Q&A sessions during lectures.
  - Students join sessions with a code and participate through a live feed.

### Supporting Functionality
- Course creation and topic management.
- CSV upload for bulk student enrolment.
- Role-based dashboards for lecturers and students.

---

## 🛠️ Technology Stack

- **Frontend**: ReactJS, React Router, Axios, CSS
- **Backend**: Django, Django REST Framework (DRF)
- **Database**: PostgreSQL
- **Authentication**: Token-based authentication with role separation (lecturer/student)
- **Deployment**: Django REST API backend + compiled ReactJS frontend

---

## 📂 Project Structure
CES/
├── backend/ # Django backend
│ ├── users/ # Authentication and profiles
│ ├── courses/ # Course creation and enrolments
│ ├── ai_quiz/ # Slide upload, quiz generation, moderation, attempts
│ ├── analytics/ # Engagement and performance metrics
│ ├── achievements/ # XP, badges, streaks
│ └── live_qna/ # Live Q&A sessions and messages
│
└── frontend/ # ReactJS frontend
├── src/Views/ # Role-based screens (Lacture, Student, Login)
└── src/Componets/ # UI components for quizzes, analytics, achievements, Q&A


---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (>= 16.x)
- Python (>= 3.10)
- PostgreSQL

### Frontend setup
Navigate to the frontend directory
Open terminal in that directory
npm install
npm react-icons
npm moment
npm start

### Backend Setup
open terminal
cd backend
pip install -r requirements.txt
python manage.py makemigrations users
python manage.py makemigrations courses  
python manage.py makemigrations ai_quiz
python manage.py makemigrations analytics
python manage.py makemigrations achievements
python manage.py makemigrations live_qna

python manage.py migrate contenttypes
python manage.py migrate users
python manage.py migrate
python manage.py runserver

Create Admin
python manage.py createsuperuser
python manage.py shell
from users.models import User
admin_user = User.objects.get(username='admin')
admin_user.user_type = 'admin'
admin_user.save()
exit()
