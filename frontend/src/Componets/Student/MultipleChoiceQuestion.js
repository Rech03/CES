import { useState, useEffect } from 'react';
import './QuestionComponents.css';

const MultipleChoiceQuestion = ({
  question,
  choices = [],
  selectedAnswer,
  onAnswerSelect,
  questionNumber,
  totalQuestions,
  isSubmitted = false,
  points = 1,
  required = true,
  showFeedback = false,
  correctAnswer = null
}) => {
  const [selectedChoice, setSelectedChoice] = useState(selectedAnswer);

  // Update local state when selectedAnswer changes (navigation between questions)
  useEffect(() => {
    setSelectedChoice(selectedAnswer);
  }, [selectedAnswer]);

  const handleChoiceSelect = (choiceId) => {
    if (isSubmitted) return;
    
    setSelectedChoice(choiceId);
    onAnswerSelect(choiceId);
  };

  // Ensure choices have proper structure from API data
  const processedChoices = choices.map((choice, index) => {
    // Handle different API response formats
    return {
      id: choice.id || index + 1,
      text: choice.text || choice.choice_text || choice.answer_text || `Option ${index + 1}`,
      is_correct: choice.is_correct || false
    };
  });

  const getChoiceClassName = (choice) => {
    let className = 'choice-option';
    
    if (selectedChoice === choice.id) {
      className += ' selected';
    }
    
    if (isSubmitted) {
      className += ' submitted';
      
      // Show correct/incorrect feedback if enabled
      if (showFeedback) {
        if (choice.is_correct) {
          className += ' correct-answer';
        } else if (selectedChoice === choice.id && !choice.is_correct) {
          className += ' incorrect-answer';
        }
      }
    }
    
    return className;
  };

  return (
    <div className="question-container">
      <div className="question-header">
        <span className="question-number">Question {questionNumber} of {totalQuestions}</span>
        <span className="question-type-badge multiple-choice">Multiple Choice</span>
        {points && points > 1 && (
          <span className="question-points">{points} point{points !== 1 ? 's' : ''}</span>
        )}
        {required && (
          <span className="required-indicator">*</span>
        )}
      </div>
      
      <div className="question-content">
        <h2 className="question-text">{question}</h2>
        
        {/* Instructions */}
        <div className="question-instructions">
          <p>Select the best answer from the options below:</p>
        </div>
        
        <div className="choices-container">
          {processedChoices.length > 0 ? (
            processedChoices.map((choice, index) => (
              <div
                key={choice.id}
                className={getChoiceClassName(choice)}
                onClick={() => handleChoiceSelect(choice.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleChoiceSelect(choice.id);
                  }
                }}
              >
                <div className="choice-letter">{String.fromCharCode(65 + index)}</div>
                <div className="choice-text">{choice.text}</div>
                <div className="choice-indicator">
                  {selectedChoice === choice.id && (
                    <div className="selected-indicator">
                      {isSubmitted && showFeedback ? (
                        choice.is_correct ? 
                          <span className="correct-icon">✓</span> : 
                          <span className="incorrect-icon">✗</span>
                      ) : (
                        <div className="selection-dot"></div>
                      )}
                    </div>
                  )}
                  {isSubmitted && showFeedback && choice.is_correct && selectedChoice !== choice.id && (
                    <div className="correct-answer-indicator">
                      <span className="correct-icon">✓</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="no-choices">
              <p>No answer choices available for this question.</p>
            </div>
          )}
        </div>
        
        {/* Answer status */}
        <div className="answer-status">
          {selectedChoice ? (
            <span className="answered">Answer selected</span>
          ) : (
            <span className="unanswered">
              {required ? 'Please select an answer' : 'Optional question'}
            </span>
          )}
        </div>

        {/* Feedback section (shown after submission if enabled) */}
        {isSubmitted && showFeedback && (
          <div className="question-feedback">
            {selectedChoice && processedChoices.find(c => c.id === selectedChoice)?.is_correct ? (
              <div className="feedback correct-feedback">
                <span className="feedback-icon">✓</span>
                <span className="feedback-text">Correct! Well done.</span>
              </div>
            ) : (
              <div className="feedback incorrect-feedback">
                <span className="feedback-icon">✗</span>
                <span className="feedback-text">
                  {selectedChoice ? 'Incorrect. ' : 'No answer selected. '}
                  {correctAnswer && `The correct answer was: ${correctAnswer}`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultipleChoiceQuestion;