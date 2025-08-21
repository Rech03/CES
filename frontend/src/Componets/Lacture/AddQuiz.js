import { useEffect, useState } from "react";
import { listTopics } from "../../api/courses"; // adjust path if needed
import { addChoiceToQuestion, createQuestion, createQuiz } from "../../api/quizzes";
import "./AddQuiz.css";

export default function CreateQuiz() {
  const [topics, setTopics] = useState([]);
  const [topicId, setTopicId] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState([]);
  const [currentType, setCurrentType] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState({});
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load topics safely
  useEffect(() => {
    listTopics()
      .then(({ data }) => {
        console.log("listTopics data:", data); // debug
        if (Array.isArray(data)) setTopics(data);
        else if (Array.isArray(data?.topics)) setTopics(data.topics);
        else setTopics([]);
      })
      .catch((err) => {
        console.error("Error fetching topics:", err);
        setTopics([]);
      });
  }, []);

  const handleAddQuestion = () => {
    if (!currentType) return;
    setQuestions([...questions, { type: currentType, ...currentQuestion }]);
    setCurrentType("");
    setCurrentQuestion({});
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
      // 1) Create the quiz
      const { data: quiz } = await createQuiz({
        topic: Number(topicId),
        title: quizTitle,
        description: "",
        is_graded: true,
      });

      // 2) Create questions (+ choices when MCQ/TF)
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
          let order = 1;
          for (const opt of q.options || []) {
            if (!opt) continue;
            await addChoiceToQuestion(created.id, {
              choice_text: opt,
              is_correct: String(q.answer).trim() === String(opt).trim(),
              order: order++,
            });
          }
        }

        if (type === "TF") {
          await addChoiceToQuestion(created.id, {
            choice_text: "True",
            is_correct: String(q.answer).toLowerCase() === "true",
            order: 1,
          });
          await addChoiceToQuestion(created.id, {
            choice_text: "False",
            is_correct: String(q.answer).toLowerCase() === "false",
            order: 2,
          });
        }
      }

      alert("Quiz Created and Questions Saved!");
      setTopicId("");
      setQuizTitle("");
      setQuestions([]);
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to save quiz";
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const renderQuestionForm = () => {
    switch (currentType) {
      case "mcq":
        return (
          <div className="form-section">
            <label>Question</label>
            <input
              type="text"
              value={currentQuestion.text || ""}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, text: e.target.value })}
            />
            <label>Options (comma separated)</label>
            <input
              type="text"
              value={(currentQuestion.options || []).join(",")}
              onChange={(e) =>
                setCurrentQuestion({
                  ...currentQuestion,
                  options: e.target.value.split(",").map((s) => s.trim()),
                })
              }
            />
            <label>Correct Answer</label>
            <input
              type="text"
              value={currentQuestion.answer || ""}
              onChange={(e) => setCurrentQuestion({ ...currentQuestion, answer: e.target.value })}
            />
          </div>
        );
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
              {q.answer ? `Answer: ${q.answer}` : ""}
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
