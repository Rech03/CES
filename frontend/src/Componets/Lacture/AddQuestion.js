import { useState } from "react";
import "./QuestionForm.css";

export default function QuestionForm({ onQuestionAdded }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("");

  const handleOptionChange = (index, value) => {
    const updatedOptions = [...options];
    updatedOptions[index] = value;
    setOptions(updatedOptions);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newQuestion = { question, options, correctAnswer };
    console.log("Question Added:", newQuestion);
    if (onQuestionAdded) onQuestionAdded(newQuestion);
    setQuestion("");
    setOptions(["", "", "", ""]);
    setCorrectAnswer("");
  };

  return (
    <div className="question-form-container">
      <h2>Add a Question</h2>
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

        <button type="submit">Add Question</button>
      </form>
    </div>
  );
}
