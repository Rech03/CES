import { useState } from "react";

export default function QuizBuilder() {
  const [quizTitle, setQuizTitle] = useState("");
  const [quizType, setQuizType] = useState("in-class");
  const [questions, setQuestions] = useState([]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      { type: "mcq", text: "", time: "", correctAnswer: "", options: [""] },
    ]);
  };

  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index][field] = value;
    setQuestions(updatedQuestions);
  };

  const updateOption = (qIndex, optIndex, value) => {
    const updatedQuestions = [...questions];
    updatedQuestions[qIndex].options[optIndex] = value;
    setQuestions(updatedQuestions);
  };

  const addOption = (qIndex) => {
    const updatedQuestions = [...questions];
    updatedQuestions[qIndex].options.push("");
    setQuestions(updatedQuestions);
  };

  return (
    <div className="quiz-container">
      <h1>Create a Quiz</h1>

      {/* Quiz Title */}
      <div className="Quiz_Title">
        <label className="label">Quiz Title</label>
        <input
          type="text"
          value={quizTitle}
          onChange={(e) => setQuizTitle(e.target.value)}
          className="border rounded-lg p-2 w-full"
          placeholder="Enter quiz title..."
        />
      </div>

      
      {/* Questions */}
      <div className="Question">
        {questions.map((q, index) => (
          <div
            key={index}
            className="border rounded-xl p-4 bg-gray-50 shadow-sm"
          >
            {/* Question Type */}
            <label className="block font-medium">Question Type</label>
            <select
              value={q.type}
              onChange={(e) => updateQuestion(index, "type", e.target.value)}
              className="border rounded-lg p-2 w-full mb-2"
            >
              <option value="mcq">Multiple Choice</option>
              <option value="open">Open Ended</option>
              <option value="one-word">One Word Answer</option>
              <option value="true-false">True / False</option>
            </select>

            {/* Time Limit */}
            <label className="block font-medium">Time Limit (seconds)</label>
            <input
              type="number"
              value={q.time}
              onChange={(e) => updateQuestion(index, "time", e.target.value)}
              className="border rounded-lg p-2 w-full mb-2"
              placeholder="Enter time..."
            />

            {/* Question Text */}
            <label className="block font-medium">Question</label>
            <input
              type="text"
              value={q.text}
              onChange={(e) => updateQuestion(index, "text", e.target.value)}
              className="border rounded-lg p-2 w-full mb-2"
              placeholder="Enter question..."
            />

            {/* Options for MCQ */}
            {q.type === "mcq" && (
              <div className="mb-2">
                <label className="block font-medium">Options</label>
                {q.options.map((opt, optIndex) => (
                  <input
                    key={optIndex}
                    type="text"
                    value={opt}
                    onChange={(e) =>
                      updateOption(index, optIndex, e.target.value)
                    }
                    className="border rounded-lg p-2 w-full mb-1"
                    placeholder={`Option ${optIndex + 1}`}
                  />
                ))}
                <button
                  onClick={() => addOption(index)}
                  className="text-blue-600 mt-1"
                >
                  + Add Option
                </button>
              </div>
            )}

            {/* Correct Answer */}
            <label className="block font-medium">Correct Answer</label>
            <input
              type="text"
              value={q.correctAnswer}
              onChange={(e) =>
                updateQuestion(index, "correctAnswer", e.target.value)
              }
              className="border rounded-lg p-2 w-full"
              placeholder="Enter correct answer..."
            />
          </div>
        ))}
      </div>

      {/* Add Question Button */}
      <div className="mt-6">
        <button
          onClick={addQuestion}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700"
        >
          + Add Question
        </button>
      </div>
    </div>
  );
}
