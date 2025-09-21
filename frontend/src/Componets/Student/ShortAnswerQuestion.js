import { useState, useEffect, useRef } from 'react';
import './QuestionComponents.css';

const ShortAnswerQuestion = ({
  question,
  selectedAnswer,
  onAnswerSelect,
  questionNumber,
  totalQuestions,
  isSubmitted = false,
  placeholder = "Type your answer here...",
  points = 1,
  required = true,
  maxLength = 1000,
  minLength = 0,
  showFeedback = false,
  modelAnswer = null,
  feedback = null,
  autoSave = true,
  autoSaveDelay = 2000
}) => {
  const [answer, setAnswer] = useState(selectedAnswer || '');
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState('');
  const [hasChanged, setHasChanged] = useState(false);
  
  const textareaRef = useRef(null);
  const autoSaveTimer = useRef(null);

  // Update local state when selectedAnswer changes (navigation between questions)
  useEffect(() => {
    const newAnswer = selectedAnswer || '';
    setAnswer(newAnswer);
    setCharacterCount(newAnswer.length);
    setWordCount(countWords(newAnswer));
    setHasChanged(false);
  }, [selectedAnswer]);

  // Auto-save functionality
  useEffect(() => {
    if (hasChanged && autoSave && !isSubmitted) {
      // Clear existing timer
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }

      // Set new timer
      autoSaveTimer.current = setTimeout(() => {
        setSaveStatus('Saving...');
        onAnswerSelect(answer);
        setTimeout(() => setSaveStatus('Saved'), 1000);
        setHasChanged(false);
      }, autoSaveDelay);
    }

    // Cleanup timer on unmount
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [answer, hasChanged, autoSave, autoSaveDelay, onAnswerSelect, isSubmitted]);

  const countWords = (text) => {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  };

  const handleAnswerChange = (e) => {
    if (isSubmitted) return;
    
    const value = e.target.value;
    
    // Check max length
    if (maxLength && value.length > maxLength) {
      return;
    }
    
    setAnswer(value);
    setCharacterCount(value.length);
    setWordCount(countWords(value));
    setHasChanged(true);
    setSaveStatus('');
    
    // If not using auto-save, submit immediately
    if (!autoSave) {
      onAnswerSelect(value);
    }
  };

  const handleBlur = () => {
    // Save on blur if auto-save is enabled and there are changes
    if (hasChanged && autoSave && !isSubmitted) {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
      setSaveStatus('Saving...');
      onAnswerSelect(answer);
      setTimeout(() => setSaveStatus('Saved'), 1000);
      setHasChanged(false);
    }
  };

  const getValidationStatus = () => {
    if (!required) return { isValid: true, message: '' };
    
    const trimmedAnswer = answer.trim();
    
    if (trimmedAnswer.length < minLength) {
      return {
        isValid: false,
        message: minLength > 0 ? `Minimum ${minLength} character${minLength !== 1 ? 's' : ''} required` : 'Answer required'
      };
    }
    
    return { isValid: true, message: '' };
  };

  const validation = getValidationStatus();

  const getTextareaClassName = () => {
    let className = 'answer-textarea';
    
    if (isSubmitted) {
      className += ' submitted';
    }
    
    if (!validation.isValid && answer.length > 0) {
      className += ' invalid';
    } else if (validation.isValid && answer.length > 0) {
      className += ' valid';
    }
    
    return className;
  };

  return (
    <div className="question-container">
      <div className="question-header">
        <span className="question-number">Question {questionNumber} of {totalQuestions}</span>
        <span className="question-type-badge short-answer">Short Answer</span>
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
          <p>
            Provide a {required ? 'complete' : 'brief'} answer in your own words.
            {minLength > 0 && ` Minimum ${minLength} characters required.`}
            {maxLength && ` Maximum ${maxLength} characters allowed.`}
          </p>
        </div>
        
        <div className="short-answer-container">
          <textarea
            ref={textareaRef}
            className={getTextareaClassName()}
            value={answer}
            onChange={handleAnswerChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={isSubmitted}
            rows={6}
            maxLength={maxLength}
          />
          
          {/* Status and character count */}
          <div className="answer-metadata">
            <div className="counts">
              <span className="character-count">
                {characterCount}{maxLength && `/${maxLength}`} characters
              </span>
              <span className="word-count">
                {wordCount} word{wordCount !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="status-indicators">
              {saveStatus && (
                <span className={`save-status ${saveStatus.includes('Saved') ? 'success' : 'pending'}`}>
                  {saveStatus}
                </span>
              )}
              
              {!validation.isValid && (
                <span className="validation-error">
                  {validation.message}
                </span>
              )}
              
              {validation.isValid && answer.trim().length > 0 && (
                <span className="validation-success">
                  Answer complete
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Answer status */}
        <div className="answer-status">
          {answer.trim().length > 0 ? (
            <span className={`answered ${validation.isValid ? 'valid' : 'invalid'}`}>
              {validation.isValid ? 'Answer provided' : 'Answer needs revision'}
            </span>
          ) : (
            <span className="unanswered">
              {required ? 'Please provide an answer' : 'Optional question'}
            </span>
          )}
        </div>

        {/* Feedback section (shown after submission if enabled) */}
        {isSubmitted && showFeedback && (
          <div className="question-feedback">
            {feedback ? (
              <div className="instructor-feedback">
                <h4>Instructor Feedback:</h4>
                <p>{feedback}</p>
              </div>
            ) : (
              <div className="generic-feedback">
                <span className="feedback-text">
                  Your answer has been submitted for review.
                </span>
              </div>
            )}
            
            {modelAnswer && (
              <div className="model-answer">
                <h4>Sample Answer:</h4>
                <p>{modelAnswer}</p>
                <small className="disclaimer">
                  This is one possible answer. Other correct responses may be accepted.
                </small>
              </div>
            )}
          </div>
        )}

        {/* Writing tips (when not submitted) */}
        {!isSubmitted && answer.length === 0 && (
          <div className="writing-tips">
            <h4>Writing Tips:</h4>
            <ul>
              <li>Read the question carefully and answer all parts</li>
              <li>Use clear, concise language</li>
              <li>Support your answer with specific examples if applicable</li>
              <li>Review your answer before moving on</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShortAnswerQuestion;