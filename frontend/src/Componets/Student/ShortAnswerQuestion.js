import { useState, useEffect } from 'react';
import './QuestionComponents.css';

const ShortAnswerQuestion = ({
  question,
  selectedAnswer,
  onAnswerSelect,
  questionNumber,
  totalQuestions,
  isSubmitted = false,
  placeholder = "Type your answer here..."
}) => {
  const [answer, setAnswer] = useState(selectedAnswer || '');

  useEffect(() => {
    setAnswer(selectedAnswer || '');
  }, [selectedAnswer]);

  const handleAnswerChange = (e) => {
    if (isSubmitted) return;
    
    const value = e.target.value;
    setAnswer(value);
    onAnswerSelect(value);
  };

  return (
    <div className="question-container">
      <div className="question-header">
        <span className="question-number">Question {questionNumber} of {totalQuestions}</span>
        <span className="question-type-badge short-answer">Short Answer</span>
      </div>
      
      <div className="question-content">
        <h2 className="question-text">{question}</h2>
        
        <div className="short-answer-container">
          <textarea
            className={`answer-textarea ${isSubmitted ? 'submitted' : ''}`}
            value={answer}
            onChange={handleAnswerChange}
            placeholder={placeholder}
            disabled={isSubmitted}
            rows={4}
          />
          <div className="character-count">
            {answer.length} characters
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShortAnswerQuestion;