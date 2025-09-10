import { useState } from 'react';
import './QuestionComponents.css';

const MultipleChoiceQuestion = ({
  question,
  choices,
  selectedAnswer,
  onAnswerSelect,
  questionNumber,
  totalQuestions,
  isSubmitted = false
}) => {
  const [selectedChoice, setSelectedChoice] = useState(selectedAnswer);

  const handleChoiceSelect = (choiceId) => {
    if (isSubmitted) return;
    
    setSelectedChoice(choiceId);
    onAnswerSelect(choiceId);
  };

  return (
    <div className="question-container">
      <div className="question-header">
        <span className="question-number">Question {questionNumber} of {totalQuestions}</span>
        <span className="question-type-badge multiple-choice">Multiple Choice</span>
      </div>
      
      <div className="question-content">
        <h2 className="question-text">{question}</h2>
        
        <div className="choices-container">
          {choices.map((choice, index) => (
            <div
              key={choice.id}
              className={`choice-option ${selectedChoice === choice.id ? 'selected' : ''} ${isSubmitted ? 'submitted' : ''}`}
              onClick={() => handleChoiceSelect(choice.id)}
            >
              <div className="choice-letter">{String.fromCharCode(65 + index)}</div>
              <div className="choice-text">{choice.text}</div>
              <div className="choice-indicator">
                {selectedChoice === choice.id && (
                  <div className="selected-indicator"></div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MultipleChoiceQuestion;