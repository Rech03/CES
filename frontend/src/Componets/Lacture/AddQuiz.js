import { useState } from "react";
import "./CreateQuiz.css";

export default function CreateQuiz() {
  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState([]);
  const [currentType, setCurrentType] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState({});

  const handleAddQuestion = () => {
    setQuestions([...questions, { type: currentType, ...currentQuestion }]);
    setCurrentType("");
    setCurrentQuestion({});
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
              onChange={(e) =>
                setCurrentQuestion({ ...currentQuestion, text: e.target.value })
              }
            />
            <label>Options (comma separated)</label>
            <input
              type="text"
              value={currentQuestion.options || ""}
              onChange={(e) =>
                setCurrentQuestion({
                  ...currentQuestion,
                  options: e.target.value.split(","),
                })
              }
            />
            <label>Correct Answer</label>
            <input
              type="text"
              value={currentQuestion.answer || ""}
              onChange={(e) =>
                setCurrentQuestion({ ...currentQuestion, answer: e.target.value })
              }
            />
          </div>
        );
      case "open":
        return (
          <div className="form-section">
            <label>Question</label>
            <input
              type="text"
              value={currentQuestion.text || ""}
              onChange={(e) =>
                setCurrentQuestion({ ...currentQuestion, text: e.target.value })
              }
            />
          </div>
        );
      case "oneword":
        return (
          <div className="form-section">
            <label>Question</label>
            <input
              type="text"
              value={currentQuestion.text || ""}
              onChange={(e) =>
                setCurrentQuestion({ ...currentQuestion, text: e.target.value })
              }
            />
            <label>Answer (one word)</label>
            <input
              type="text"
              value={currentQuestion.answer || ""}
              onChange={(e) =>
                setCurrentQuestion({ ...currentQuestion, answer: e.target.value })
              }
            />
          </div>
        );
      case "truefalse":
        return (
          <div className="form-section">
            <label>Question</label>
            <input
              type="text"
              value={currentQuestion.text || ""}
              onChange={(e) =>
                setCurrentQuestion({ ...currentQuestion, text: e.target.value })
              }
            />
            <label>Correct Answer</label>
            <select
              value={currentQuestion.answer || ""}
              onChange={(e) =>
                setCurrentQuestion({ ...currentQuestion, answer: e.target.value })
              }
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

  const handleSubmitQuiz = (e) => {
    e.preventDefault();
    const quiz = {
      title: quizTitle,
      questions: questions,
    };
    console.log("Quiz Created:", quiz);
    alert("Quiz Created! Check console for data.");
  };

  return (
    <div className="quiz-container">
      <h2>Create a Quiz</h2>
      <form onSubmit={handleSubmitQuiz}>
        <label>Quiz Title</label>
        <input
          type="text"
          value={quizTitle}
          onChange={(e) => setQuizTitle(e.target.value)}
        />

        <h3>Add Questions</h3>
        <label>Select Question Type</label>
        <select
          value={currentType}
          onChange={(e) => setCurrentType(e.target.value)}
        >
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

        <button type="submit" className="submit-btn">
          Save Quiz
        </button>
      </form>
    </div>
  );
}
