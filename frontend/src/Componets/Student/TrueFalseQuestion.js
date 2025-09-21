import { useState, useEffect } from 'react';
import './QuestionComponents.css';

const TrueFalseQuestion = ({
  question,
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

  const handleChoiceSelect = (value) => {
    if (isSubmitted) return;
    
    setSelectedChoice(value);
    onAnswerSelect(value);
  };

  const getOptionClassName = (value) => {
    let className = `true-false-option ${value ? 'true-option' : 'false-option'}`;
    
    if (selectedChoice === value) {
      className += ' selected';
    }
    
    if (isSubmitted) {
      className += ' submitted';
      
      // Show correct/incorrect feedback if enabled
      if (showFeedback) {
        if (correctAnswer === value) {
          className += ' correct-answer';
        } else if (selectedChoice === value && correctAnswer !== value) {
          className += ' incorrect-answer';
        }
      }
    }
    
    return className;
  };

  const isCorrectAnswer = (value) => {
    return correctAnswer === value;
  };

  const isSelectedAnswer = (value) => {
    return selectedChoice === value;
  };

  return (
    <div className="question-container">
      <div className="question-header">
        <span className="question-number">Question {questionNumber} of {totalQuestions}</span>
        <span className="question-type-badge true-false">True/False</span>
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
          <p>Select True or False for the statement above:</p>
        </div>
        
        <div className="true-false-container">
          {/* True Option */}
          <div
            className={getOptionClassName(true)}
            onClick={() => handleChoiceSelect(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleChoiceSelect(true);
              }
            }}
          >
            <div className="option-icon">
              {isSubmitted && showFeedback && isCorrectAnswer(true) ? 
                <span className="correct-mark">✓</span> : 
                <span className="true-mark">✓</span>
              }
            </div>
            <div className="option-text">True</div>
            <div className="option-indicator">
              {isSelectedAnswer(true) && (
                <div className="selected-indicator">
                  {isSubmitted && showFeedback ? (
                    isCorrectAnswer(true) ? 
                      <span className="correct-icon">✓</span> : 
                      <span className="incorrect-icon">✗</span>
                  ) : (
                    <div className="selection-dot"></div>
                  )}
                </div>
              )}
              {isSubmitted && showFeedback && isCorrectAnswer(true) && !isSelectedAnswer(true) && (
                <div className="correct-answer-indicator">
                  <span className="correct-icon">✓</span>
                </div>
              )}
            </div>
          </div>
          
          {/* False Option */}
          <div
            className={getOptionClassName(false)}
            onClick={() => handleChoiceSelect(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleChoiceSelect(false);
              }
            }}
          >
            <div className="option-icon">
              {isSubmitted && showFeedback && isCorrectAnswer(false) ? 
                <span className="correct-mark">✓</span> : 
                <span className="false-mark">✗</span>
              }
            </div>
            <div className="option-text">False</div>
            <div className="option-indicator">
              {isSelectedAnswer(false) && (
                <div className="selected-indicator">
                  {isSubmitted && showFeedback ? (
                    isCorrectAnswer(false) ? 
                      <span className="correct-icon">✓</span> : 
                      <span className="incorrect-icon">✗</span>
                  ) : (
                    <div className="selection-dot"></div>
                  )}
                </div>
              )}
              {isSubmitted && showFeedback && isCorrectAnswer(false) && !isSelectedAnswer(false) && (
                <div className="correct-answer-indicator">
                  <span className="correct-icon">✓</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Answer status */}
        <div className="answer-status">
          {selectedChoice !== null && selectedChoice !== undefined ? (
            <span className="answered">Answer selected: {selectedChoice ? 'True' : 'False'}</span>
          ) : (
            <span className="unanswered">
              {required ? 'Please select True or False' : 'Optional question'}
            </span>
          )}
        </div>

        {/* Feedback section (shown after submission if enabled) */}
        {isSubmitted && showFeedback && (
          <div className="question-feedback">
            {selectedChoice === correctAnswer ? (
              <div className="feedback correct-feedback">
                <span className="feedback-icon">✓</span>
                <span className="feedback-text">
                  Correct! The answer is {correctAnswer ? 'True' : 'False'}.
                </span>
              </div>
            ) : (
              <div className="feedback incorrect-feedback">
                <span className="feedback-icon">✗</span>
                <span className="feedback-text">
                  {selectedChoice !== null && selectedChoice !== undefined ? 
                    `Incorrect. You selected ${selectedChoice ? 'True' : 'False'}, but the correct answer is ${correctAnswer ? 'True' : 'False'}.` :
                    `No answer selected. The correct answer is ${correctAnswer ? 'True' : 'False'}.`
                  }
                </span>
              </div>
            )}
          </div>
        )}

        {/* Additional explanation (if provided by API) */}
        {isSubmitted && showFeedback && question.explanation && (
          <div className="question-explanation">
            <h4>Explanation:</h4>
            <p>{question.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrueFalseQuestion;