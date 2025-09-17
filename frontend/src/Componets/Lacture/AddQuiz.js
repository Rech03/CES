import { useEffect, useState } from "react";
import { getMyCourses, listTopics } from "../../api/courses";
import { addChoiceToQuestion, createQuestion, createQuiz } from "../../api/quizzes";
import "./AddQuiz.css";

export default function CreateQuiz({ onQuizCreated, loading: externalLoading }) {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [topics, setTopics] = useState([]);
  const [filteredTopics, setFilteredTopics] = useState([]);
  const [topicId, setTopicId] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [questions, setQuestions] = useState([]);
  const [currentType, setCurrentType] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState({
    text: "",
    options: ["", "", "", ""], // 4 empty options for MCQ
    answer: "",
    points: 1
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Load courses and topics when component mounts
  useEffect(() => {
    loadInitialData();
  }, []);

  // Filter topics when course is selected
  useEffect(() => {
    if (selectedCourse) {
      const courseTopics = topics.filter(topic => topic.course === parseInt(selectedCourse));
      setFilteredTopics(courseTopics);
      setTopicId(""); // Reset topic selection when course changes
    } else {
      setFilteredTopics([]);
      setTopicId("");
    }
  }, [selectedCourse, topics]);

  const loadInitialData = async () => {
    setIsLoadingData(true);
    try {
      // Load courses and topics using the correct API endpoints
      const [coursesResponse, topicsResponse] = await Promise.all([
        getMyCourses(),
        listTopics()
      ]);

      // Handle courses data - using getMyCourses endpoint
      let coursesData = [];
      if (coursesResponse.data && Array.isArray(coursesResponse.data)) {
        coursesData = coursesResponse.data;
      } else if (coursesResponse.data?.courses && Array.isArray(coursesResponse.data.courses)) {
        coursesData = coursesResponse.data.courses;
      }
      setCourses(coursesData);

      // Handle topics data - using listTopics endpoint
      let topicsData = [];
      if (Array.isArray(topicsResponse.data)) {
        topicsData = topicsResponse.data;
      } else if (Array.isArray(topicsResponse.data?.results)) {
        topicsData = topicsResponse.data.results;
      } else if (Array.isArray(topicsResponse.data?.topics)) {
        topicsData = topicsResponse.data.topics;
      }
      setTopics(topicsData);
      
      if (coursesData.length === 0) {
        setError("No courses available. Please create a course first before creating quizzes.");
      } else if (topicsData.length === 0) {
        setError("No topics available. Please create topics first before creating quizzes.");
      }
    } catch (err) {
      console.error("Error fetching initial data:", err);
      
      let errorMessage = "Failed to load courses and topics";
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
          errorMessage = data.non_field_errors[0];
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setCourses([]);
      setTopics([]);
    } finally {
      setIsLoadingData(false);
    }
  };

  const resetCurrentQuestion = () => {
    setCurrentQuestion({
      text: "",
      options: ["", "", "", ""],
      answer: "",
      points: 1
    });
  };

  const handleAddQuestion = () => {
    if (!currentType || !currentQuestion.text.trim()) {
      setError("Please select a question type and enter question text");
      return;
    }

    // Validate based on question type
    if (currentType === "mcq") {
      const validOptions = currentQuestion.options.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        setError("Multiple choice questions need at least 2 options");
        return;
      }
      if (!currentQuestion.answer.trim()) {
        setError("Please select the correct answer for multiple choice question");
        return;
      }
      if (!validOptions.includes(currentQuestion.answer)) {
        setError("The correct answer must be one of the provided options");
        return;
      }
    }

    if (currentType === "truefalse" && !currentQuestion.answer) {
      setError("Please select the correct answer for true/false question");
      return;
    }

    // Add question to list
    const newQuestion = {
      type: currentType,
      text: currentQuestion.text.trim(),
      answer: currentQuestion.answer,
      points: currentQuestion.points || 1,
      tempId: Date.now() // Temporary ID for tracking
    };

    if (currentType === "mcq") {
      newQuestion.options = currentQuestion.options.filter(opt => opt.trim());
    }

    setQuestions([...questions, newQuestion]);
    setCurrentType("");
    resetCurrentQuestion();
    setError("");
    setSuccess(`Question ${questions.length + 1} added successfully!`);
  };

  const removeQuestion = (tempId) => {
    setQuestions(questions.filter(q => q.tempId !== tempId));
    setSuccess("Question removed successfully!");
  };

  const mapQuestionType = (type) => {
    switch (type) {
      case "mcq": return "MCQ";
      case "truefalse": return "TF";
      case "oneword": return "SA";
      case "open": return "SA";
      default: return "SA";
    }
  };

  const handleSubmitQuiz = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      // Validate quiz data
      if (!selectedCourse) {
        throw new Error("Please select a course");
      }
      if (!topicId) {
        throw new Error("Please select a topic");
      }
      if (!quizTitle.trim()) {
        throw new Error("Please enter a quiz title");
      }
      if (questions.length === 0) {
        throw new Error("Please add at least one question");
      }

      // 1) Create the quiz
      const quizPayload = {
        topic: Number(topicId),
        title: quizTitle.trim(),
        description: quizDescription.trim() || "",
        is_graded: true,
      };

      console.log('Creating quiz with payload:', quizPayload);
      const { data: quiz } = await createQuiz(quizPayload);
      console.log('Quiz created successfully:', quiz);

      // 2) Create questions and choices
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const questionType = mapQuestionType(q.type);
        
        // Build base question payload
        let questionPayload = {
          quiz: quiz.id,
          question_text: q.text,
          question_type: questionType,
          points: q.points,
          order: i + 1,
        };

        // Add choices for MCQ and True/False BEFORE creating the question
        if (q.type === "mcq") {
          const choices = q.options.map((option, index) => ({
            choice_text: option,
            is_correct: option === q.answer,
            order: index + 1,
          }));
          questionPayload.choices = choices;
        }

        if (q.type === "truefalse") {
          const choices = [
            {
              choice_text: "True",
              is_correct: q.answer.toLowerCase() === "true",
              order: 1,
            },
            {
              choice_text: "False", 
              is_correct: q.answer.toLowerCase() === "false",
              order: 2,
            }
          ];
          questionPayload.choices = choices;
        }

        console.log('Creating question with payload:', questionPayload);
        
        try {
          const { data: createdQuestion } = await createQuestion(questionPayload);
          console.log('Question created successfully:', createdQuestion);
        } catch (questionError) {
          console.error('Failed to create question:', questionError);
          console.error('Question payload that failed:', questionPayload);
          
          // Get specific error message from response
          let errorMessage = "Failed to create question";
          if (questionError.response?.data) {
            const errorData = questionError.response.data;
            if (typeof errorData === 'string') {
              errorMessage = errorData;
            } else if (errorData.detail) {
              errorMessage = errorData.detail;
            } else if (errorData.non_field_errors) {
              errorMessage = errorData.non_field_errors[0];
            } else if (errorData.choices) {
              errorMessage = `Choices error: ${JSON.stringify(errorData.choices)}`;
            } else if (errorData.quiz) {
              errorMessage = `Quiz error: ${JSON.stringify(errorData.quiz)}`;
            } else {
              // Show all validation errors
              errorMessage = JSON.stringify(errorData);
            }
          }
          
          throw new Error(errorMessage);
        }
      }

      setSuccess(`Quiz "${quizTitle}" created successfully with ${questions.length} questions!`);
      
      // Reset form
      setSelectedCourse("");
      setTopicId("");
      setQuizTitle("");
      setQuizDescription("");
      setQuestions([]);
      setCurrentType("");
      resetCurrentQuestion();

      // Call parent callback if provided
      if (onQuizCreated) {
        await onQuizCreated(quiz);
      }

    } catch (err) {
      console.error("Error creating quiz:", err);
      
      let errorMessage = "Failed to create quiz";
      if (err.message && !err.response) {
        errorMessage = err.message;
      } else if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
          errorMessage = data.non_field_errors[0];
        } else if (data.error) {
          errorMessage = data.error;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = value;
    setCurrentQuestion({ ...currentQuestion, options: newOptions });
  };

  const addOption = () => {
    if (currentQuestion.options.length < 6) { // Max 6 options
      setCurrentQuestion({
        ...currentQuestion,
        options: [...currentQuestion.options, ""]
      });
    }
  };

  const removeOption = (index) => {
    if (currentQuestion.options.length > 2) { // Min 2 options
      const newOptions = currentQuestion.options.filter((_, i) => i !== index);
      setCurrentQuestion({ ...currentQuestion, options: newOptions });
      
      // Reset answer if it was the removed option
      if (currentQuestion.answer === currentQuestion.options[index]) {
        setCurrentQuestion(prev => ({ ...prev, answer: "" }));
      }
    }
  };

  const renderQuestionForm = () => {
    switch (currentType) {
      case "mcq":
        return (
          <div className="form-section mcq-section">
            <div className="question-input">
              <label htmlFor="mcq-question">Question *</label>
              <textarea
                id="mcq-question"
                value={currentQuestion.text}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
                placeholder="Enter your multiple choice question"
                rows="3"
                required
              />
            </div>

            <div className="options-section">
              <label>Answer Options *</label>
              {currentQuestion.options.map((option, index) => (
                <div key={index} className="option-input-group">
                  <div className="option-input">
                    <span className="option-label">{String.fromCharCode(65 + index)}.</span>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      required={index < 2} // First two options required
                    />
                    {currentQuestion.options.length > 2 && index >= 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="remove-option-btn"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {currentQuestion.options.length < 6 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="add-option-btn"
                >
                  + Add Another Option
                </button>
              )}
            </div>

            <div className="correct-answer-section">
              <label htmlFor="mcq-answer">Correct Answer *</label>
              <select
                id="mcq-answer"
                value={currentQuestion.answer}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, answer: e.target.value })}
                required
              >
                <option value="">Select the correct answer</option>
                {currentQuestion.options
                  .filter(opt => opt.trim())
                  .map((option, index) => (
                    <option key={index} value={option}>
                      {String.fromCharCode(65 + index)}. {option}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        );

      case "truefalse":
        return (
          <div className="form-section">
            <div className="question-input">
              <label htmlFor="tf-question">Statement *</label>
              <textarea
                id="tf-question"
                value={currentQuestion.text}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
                placeholder="Enter your true/false statement"
                rows="3"
                required
              />
            </div>
            
            <div className="tf-answer-section">
              <label htmlFor="tf-answer">Correct Answer *</label>
              <select
                id="tf-answer"
                value={currentQuestion.answer}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, answer: e.target.value })}
                required
              >
                <option value="">Select correct answer</option>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>
          </div>
        );

      case "oneword":
        return (
          <div className="form-section">
            <div className="question-input">
              <label htmlFor="oneword-question">Question *</label>
              <textarea
                id="oneword-question"
                value={currentQuestion.text}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
                placeholder="Enter your one-word answer question"
                rows="3"
                required
              />
            </div>
            
            <div className="answer-section">
              <label htmlFor="oneword-answer">Expected Answer</label>
              <input
                id="oneword-answer"
                type="text"
                value={currentQuestion.answer}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, answer: e.target.value })}
                placeholder="Enter the expected one-word answer"
              />
              <small>Optional: Provide expected answer for reference</small>
            </div>
          </div>
        );

      case "open":
        return (
          <div className="form-section">
            <div className="question-input">
              <label htmlFor="open-question">Question *</label>
              <textarea
                id="open-question"
                value={currentQuestion.text}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
                placeholder="Enter your open-ended question"
                rows="3"
                required
              />
            </div>
            
            <div className="answer-section">
              <label htmlFor="open-answer">Sample Answer</label>
              <textarea
                id="open-answer"
                value={currentQuestion.answer}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, answer: e.target.value })}
                placeholder="Enter a sample answer or key points (optional)"
                rows="2"
              />
              <small>Optional: Provide sample answer or grading criteria</small>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const loading = externalLoading || isSaving || isLoadingData;

  if (isLoadingData) {
    return (
      <div className="quiz-container">
        <h2>Create Quiz</h2>
        <div className="loading-message">
          Loading courses and topics...
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <h2>Create Quiz</h2>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="success-message" role="alert">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmitQuiz} className="quiz-form">
        {/* Quiz Basic Information */}
        <div className="quiz-basic-info">
          <div className="quiz-field">
            <label htmlFor="course-select">Course *</label>
            <select 
              id="course-select"
              value={selectedCourse} 
              onChange={(e) => setSelectedCourse(e.target.value)} 
              required
              disabled={loading}
            >
              <option value="">Select a course first</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </select>
            {selectedCourse && (
              <small className="field-hint">
                Selected: {courses.find(c => c.id === parseInt(selectedCourse))?.code}
              </small>
            )}
          </div>

          <div className="quiz-field">
            <label htmlFor="topic-select">Topic *</label>
            <select 
              id="topic-select"
              value={topicId} 
              onChange={(e) => setTopicId(e.target.value)} 
              required
              disabled={loading || !selectedCourse}
            >
              <option value="">
                {!selectedCourse 
                  ? "Select a course first" 
                  : filteredTopics.length === 0 
                    ? "No topics available for this course" 
                    : "Select a topic"
                }
              </option>
              {filteredTopics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
            {selectedCourse && filteredTopics.length === 0 && (
              <small className="field-hint warning">
                No topics found for this course. Please create topics first.
              </small>
            )}
          </div>
        </div>

        <div className="quiz-field full-width">
          <label htmlFor="quiz-title">Quiz Title *</label>
          <input 
            id="quiz-title"
            type="text" 
            value={quizTitle} 
            onChange={(e) => setQuizTitle(e.target.value)} 
            placeholder="Enter quiz title"
            required
            disabled={loading}
          />
        </div>

        <div className="quiz-field full-width">
          <label htmlFor="quiz-description">Quiz Description</label>
          <textarea
            id="quiz-description"
            value={quizDescription}
            onChange={(e) => setQuizDescription(e.target.value)}
            placeholder="Enter quiz description (optional)"
            rows="2"
            disabled={loading}
          />
        </div>

        {/* Question Creation Section */}
        <div className="questions-section">
          <h3>Add Questions</h3>
          
          <div className="question-type-selector">
            <label htmlFor="question-type">Question Type</label>
            <select 
              id="question-type"
              value={currentType} 
              onChange={(e) => {
                setCurrentType(e.target.value);
                resetCurrentQuestion();
                setError("");
              }}
              disabled={loading}
            >
              <option value="">Select question type</option>
              <option value="mcq">Multiple Choice Question</option>
              <option value="truefalse">True or False</option>
              <option value="oneword">One Word Answer</option>
              <option value="open">Open Ended Question</option>
            </select>
          </div>

          {renderQuestionForm()}

          {currentType && (
            <div className="question-points">
              <label htmlFor="question-points">Points</label>
              <input
                id="question-points"
                type="number"
                min="1"
                max="10"
                value={currentQuestion.points}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, points: parseInt(e.target.value) || 1 })}
                disabled={loading}
              />
            </div>
          )}

          {currentType && (
            <button 
              type="button" 
              onClick={handleAddQuestion}
              className="add-question-btn"
              disabled={loading}
            >
              Add Question to Quiz
            </button>
          )}
        </div>

        {/* Questions List */}
        {questions.length > 0 && (
          <div className="questions-list">
            <h3>Questions Added ({questions.length})</h3>
            <div className="questions-preview">
              {questions.map((q, index) => (
                <div key={q.tempId} className="question-preview">
                  <div className="question-header">
                    <span className="question-number">Q{index + 1}</span>
                    <span className="question-type">{q.type.toUpperCase()}</span>
                    <span className="question-points">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                    <button
                      type="button"
                      onClick={() => removeQuestion(q.tempId)}
                      className="remove-question-btn"
                      disabled={loading}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="question-text">{q.text}</div>
                  {q.options && (
                    <div className="question-options">
                      <strong>Options:</strong> {q.options.join(" | ")}
                    </div>
                  )}
                  {q.answer && (
                    <div className="question-answer">
                      <strong>Answer:</strong> {q.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="submit-section">
          <button 
            type="submit" 
            className={`submit-btn ${loading ? 'loading' : ''}`}
            disabled={loading || questions.length === 0}
          >
            {loading ? "Creating Quiz..." : `Create Quiz (${questions.length} question${questions.length !== 1 ? 's' : ''})`}
          </button>
        </div>
      </form>
    </div>
  );
}