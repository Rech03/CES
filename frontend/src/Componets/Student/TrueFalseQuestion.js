import { useState } from 'react';
import './QuestionComponents.css';

const TrueFalseQuestion = ({
  question,
  selectedAnswer,
  onAnswerSelect,
  questionNumber,
  totalQuestions,
  isSubmitted = false
}) => {
  const [selectedChoice, setSelectedChoice] = useState(selectedAnswer);

  const handleChoiceSelect = (value) => {
    if (isSubmitted) return;
    
    setSelectedChoice(value);
    onAnswerSelect(value);
  };

  return (
    <div className="question-container">
      <div className="question-header">
        <span className="question-number">Question {questionNumber} of {totalQuestions}</span>
        <span className="question-type-badge true-false">True/False</span>
      </div>
      
      <div className="question-content">
        <h2 className="question-text">{question}</h2>
        
        <div className="true-false-container">
          <div
            className={`true-false-option true-option ${selectedChoice === true ? 'selected' : ''} ${isSubmitted ? 'submitted' : ''}`}
            onClick={() => handleChoiceSelect(true)}
          >
            <div className="option-icon">✓</div>
            <div className="option-text">True</div>
            {selectedChoice === true && (
              <div className="selected-indicator"></div>
            )}
          </div>
          
          <div
            className={`true-false-option false-option ${selectedChoice === false ? 'selected' : ''} ${isSubmitted ? 'submitted' : ''}`}
            onClick={() => handleChoiceSelect(false)}
          >
            <div className="option-icon">✗</div>
            <div className="option-text">False</div>
            {selectedChoice === false && (
              <div className="selected-indicator"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrueFalseQuestion;