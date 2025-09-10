import { useEffect, useState } from "react";
import { listCourses, listModules, listTopics } from "../../api/courses"; // adjust paths
import { addChoiceToQuestion, createQuestion, createQuiz } from "../../api/quizzes";
import "./AddQuiz.css";

export default function CreateQuiz() {
  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [topicId, setTopicId] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState([]);
  const [currentType, setCurrentType] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState({ options: [], correctIndex: null });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch courses
  useEffect(() => {
    listCourses()
      .then(({ data }) => setCourses(data || []))
      .catch(() => setCourses([]));
  }, []);

  // Fetch modules whenever course changes
  useEffect(() => {
    if (!selectedCourse) {
      setModules([]);
      setSelectedModule("");
      return;
    }
    listModules(selectedCourse)
      .then(({ data }) => setModules(data || []))
      .catch(() => setModules([]));
  }, [selectedCourse]);

  // Fetch topics
  useEffect(() => {
    listTopics()
      .then(({ data }) => {
        if (Array.isArray(data)) setTopics(data);
        else if (Array.isArray(data?.topics)) setTopics(data.topics);
        else setTopics([]);
      })
      .catch(() => setTopics([]));
  }, []);

  const handleAddQuestion = () => {
    if (!currentType) return;
    const questionToAdd = { ...currentQuestion, type: currentType };
    setQuestions([...questions, questionToAdd]);
    setCurrentType("");
    setCurrentQuestion({ options: [], correctIndex: null });
  };

  const handleDeleteQuestion = (index) => {
    const newQuestions = [...questions];
    newQuestions.splice(index, 1);
    setQuestions(newQuestions);
  };

  const mapType = (t) => {
    if (t === "mcq") return "MCQ";
    if (t === "truefalse") return "TF";
    return "SA"; // open or oneword
  };

  const handleSubmitQuiz = async (e) => {
    e.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      // Create quiz
      const { data: quiz } = await createQuiz({
        topic: Number(topicId),
        title: quizTitle,
        description: "",
        is_graded: true,
        course: selectedCourse,
        module: selectedModule,
      });

      for (const q of questions) {
        const type = mapType(q.type);
        const { data: created } = await createQuestion({
          quiz: quiz.id,
          question_text: q.text,
          question_type: type,
          points: 1,
          order: 1,
        });

        if (type === "MCQ") {
          q.options.forEach((opt, idx) => {
            if (!opt) return;
            addChoiceToQuestion(created.id, {
              choice_text: opt,
              is_correct: q.correctIndex === idx,
              order: idx + 1,
            });
          });
        }

        if (type === "TF") {
          ["True", "False"].forEach((val, idx) => {
            addChoiceToQuestion(created.id, {
              choice_text: val,
              is_correct: String(q.answer).toLowerCase() === val.toLowerCase(),
              order: idx + 1,
            });
          });
        }
      }

      alert("Quiz Created and Questions Saved!");
      setTopicId("");
      setQuizTitle("");
      setQuestions([]);
      setSelectedCourse("");
      setSelectedModule("");
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to save quiz";
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const renderMCQOptions = () => {
    return (
      <div className="form-section">
        <label>Question</label>
        <input
          type="text"
          value={currentQuestion.text || ""}
          onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
        />
        <label>Options</label>
        {currentQuestion.options.map((opt, idx) => (
          <div key={idx}>
            <input
              type="text"
              value={opt}
              onChange={(e) => {
                const newOptions = [...currentQuestion.options];
                newOptions[idx] = e.target.value;
                setCurrentQuestion({ ...currentQuestion, options: newOptions });
              }}
            />
            <input
              type="radio"
              name="correctOption"
              checked={currentQuestion.correctIndex === idx}
              onChange={() => setCurrentQuestion({ ...currentQuestion, correctIndex: idx })}
            />{" "}
            Correct
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setCurrentQuestion({ ...currentQuestion, options: [...currentQuestion.options, ""] })
          }
        >
          Add Option
        </button>
      </div>
    );
  };

  const renderQuestionForm = () => {
    switch (currentType) {
      case "mcq":
        return renderMCQOptions();
      case "open":
      case "oneword":
        return (
          <div className="form-section">
            <label>Question</label>
            <input
              type="text"
              value={currentQuestion.text || ""}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
            />
            {currentType === "oneword" && (
              <>
                <label>Answer (one word)</label>
                <input
                  type="text"
                  value={currentQuestion.answer || ""}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, answer: e.target.value })}
                />
              </>
            )}
          </div>
        );
      case "truefalse":
        return (
          <div className="form-section">
            <label>Question</label>
            <input
              type="text"
              value={currentQuestion.text || ""}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
            />
            <label>Correct Answer</label>
            <select
              value={currentQuestion.answer || ""}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, answer: e.target.value })}
            >
              <option value="">Select</option>
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="quiz-container">
      <h2>Create a Quiz</h2>
      {error && <p className="error">{error}</p>}

      <form onSubmit={handleSubmitQuiz}>
        <label>Course</label>
        <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} required>
          <option value="">Select Course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {modules.length > 0 && (
          <>
            <label>Module</label>
            <select value={selectedModule} onChange={(e) => setSelectedModule(e.target.value)} required>
              <option value="">Select Module</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </>
        )}

        <label>Topic</label>
        <select value={topicId} onChange={(e) => setTopicId(e.target.value)} required>
          <option value="">Select Topic</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <label>Quiz Title</label>
        <input type="text" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} required />

        <h3>Add Questions</h3>
        <label>Select Question Type</label>
        <select value={currentType} onChange={(e) => setCurrentType(e.target.value)}>
          <option value="">Select Type</option>
          <option value="mcq">Multiple Choice (MCQ)</option>
          <option value="open">Open Ended</option>
          <option value="oneword">One Word Answer</option>
          <option value="truefalse">True / False</option>
        </select>

        {renderQuestionForm()}

        {currentType && (
          <button type="button" onClick={handleAddQuestion}>
            Add Question
          </button>
        )}

        <h3>Questions Added</h3>
        <ul>
          {questions.map((q, index) => (
            <li key={index}>
              <strong>{q.type.toUpperCase()}:</strong> {q.text}{" "}
              {q.options ? `(Options: ${q.options.join(", ")})` : ""}{" "}
              {q.correctIndex != null ? `(Correct: ${q.options[q.correctIndex]})` : ""}
              {q.answer ? `Answer: ${q.answer}` : ""}
              <button
                type="button"
                style={{ marginLeft: "10px" }}
                onClick={() => handleDeleteQuestion(index)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>

        <button type="submit" className="submit-btn" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Quiz"}
        </button>
      </form>
    </div>
  );
}
