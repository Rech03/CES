import './CoursesList.css';

function CoursesList({ courses = [] }) {
  const defaultCourses = [
    {
      id: 1,
      code: 'CSC3002F',
      lastQuiz: '10 July 2025',
      isActive: true
    },
    {
      id: 2,
      code: 'CSC3001F',
      lastQuiz: '12 June 2025',
      isActive: true
    },
    {
      id: 3,
      code: 'CSC3003S',
      lastQuiz: '12 July 2025',
      isActive: false
    },
    {
      id: 4,
      code: 'CSC2001F',
      lastQuiz: '12 May 2025',
      isActive: true
    }
  ];

  const displayCourses = courses.length > 0 ? courses : defaultCourses;

  const renderIcon = (isActive) => {
    return (
      <div className="course-icon-container">
        <div className="course-icon">
          <svg 
            className="icon-svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {isActive ? (
              <path 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            ) : (
              <path 
                d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            )}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="courses-list-container">
      <div className="courses-header">
        <div className="courses-title">Courses</div>
      </div>
      
      <div className="courses-content">
        {displayCourses.map((course, index) => (
          <div key={course.id || index}>
            <div className="course-item">
              {renderIcon(course.isActive)}
              <div className="course-info">
                <div className="course-code">{course.code}</div>
                <div className="course-last-quiz">Last Quiz: {course.lastQuiz}</div>
              </div>
            </div>
            {index < displayCourses.length - 1 && <div className="course-divider"></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CoursesList;