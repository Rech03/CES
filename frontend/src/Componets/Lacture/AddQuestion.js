import { useState } from "react";
import "./QuestionForm.css";
import { createQuestion, addChoiceToQuestion } from "../../api/quizzes"; 

export default function QuestionForm({ quizId, onQuestionAdded }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // We’ll treat this form as MCQ
      const { data: q } = await createQuestion({
        quiz: Number(quizId),
        question_text: question,
        question_type: "MCQ",
        points: 1,
        order: 1,
      });

      // Add choices; mark the correct one
      let order = 1;
      for (const opt of options) {
        if (!opt) continue;
        await addChoiceToQuestion(q.id, {
          choice_text: opt,
          is_correct: opt === correctAnswer,
          order: order++,
        });
      }

      if (onQuestionAdded) onQuestionAdded({ id: q.id, question, options, correctAnswer });

      // Reset form
      setQuestion("");
      setOptions(["", "", "", ""]);
      setCorrectAnswer("");
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to add question";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="question-form-container">
      <h2>Add a Question</h2>

      {error && <p className="error">{error}</p>}

      <form onSubmit={handleSubmit} className="question-form">
        <label>Question</label>
        <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} required />

        <label>Options</label>
        {options.map((opt, index) => (
          <input
            key={index}
            type="text"
            value={opt}
            placeholder={`Option ${index + 1}`}
            onChange={(e) => handleOptionChange(index, e.target.value)}
            required
          />
        ))}

        <label>Correct Answer</label>
        <select value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} required>
          <option value="">Select Correct Option</option>
          {options.map((opt, index) => (
            <option key={index} value={opt}>
              {opt || `Option ${index + 1}`}
            </option>
          ))}
        </select>

        <button type="submit" disabled={isLoading}>
          {isLoading ? "Adding..." : "Add Question"}
        </button>
      </form>
    </div>
  );
}
