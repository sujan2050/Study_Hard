import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '../types';
import { api } from '../lib/api';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  RotateCw, 
  CheckCircle2, 
  XCircle, 
  Quote, 
  GraduationCap, 
  Award,
  ChevronRight,
  HelpCircle,
  Inbox
} from 'lucide-react';

interface StudyProps {
  onNavigateToInbox: () => void;
  onNavigateToAdd: () => void;
}

type StudyMode = 'flashcards' | 'quiz';

interface QuizQuestion {
  card: Card;
  options: string[];
  correctAnswer: string;
  userAnswer: string | null;
  isAnswered: boolean;
}

export const Study: React.FC<StudyProps> = ({
  onNavigateToInbox,
  onNavigateToAdd
}) => {
  const [approvedCards, setApprovedCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Setup state
  const [mode, setMode] = useState<StudyMode>('flashcards');
  const [sessionLength, setSessionLength] = useState<number | 'all'>(10);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Flashcards state
  const [flashcardQueue, setFlashcardQueue] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [gotItCount, setGotItCount] = useState(0);
  const [missedCount, setMissedCount] = useState(0);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizScore, setQuizScore] = useState(0);

  // Load approved cards
  useEffect(() => {
    const fetchApproved = async () => {
      setLoading(false);
      try {
        const res = await api.getCards('approved');
        setApprovedCards(res.cards);
      } catch (err) {
        console.error('Failed to load approved cards:', err);
      }
    };
    fetchApproved();
  }, []);

  // Prepare session
  const startSession = () => {
    if (approvedCards.length === 0) return;

    // Shuffle approved cards
    const shuffled = [...approvedCards].sort(() => Math.random() - 0.5);
    const limit = sessionLength === 'all' ? shuffled.length : Math.min(sessionLength, shuffled.length);
    const selectedCards = shuffled.slice(0, limit);

    if (mode === 'flashcards') {
      setFlashcardQueue(selectedCards);
      setCurrentIndex(0);
      setIsFlipped(false);
      setGotItCount(0);
      setMissedCount(0);
    } else {
      // Build Quiz Questions
      const questions: QuizQuestion[] = selectedCards.map(targetCard => {
        // Find other approved cards of the SAME TYPE for wrong options
        const sameTypeOthers = approvedCards.filter(c => c.id !== targetCard.id && c.type === targetCard.type);
        let distractorPool = sameTypeOthers.map(c => c.back);

        // If not enough same-type cards, backfill with any other approved card backs
        if (distractorPool.length < 3) {
          const generalOthers = approvedCards.filter(c => c.id !== targetCard.id && !distractorPool.includes(c.back));
          distractorPool = [...distractorPool, ...generalOthers.map(c => c.back)];
        }

        // Shuffle distractors and pick up to 3
        const uniqueDistractors = Array.from(new Set(distractorPool.filter(d => d !== targetCard.back)))
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        const options = [...uniqueDistractors, targetCard.back].sort(() => Math.random() - 0.5);

        return {
          card: targetCard,
          options,
          correctAnswer: targetCard.back,
          userAnswer: null,
          isAnswered: false
        };
      });

      setQuizQuestions(questions);
      setCurrentIndex(0);
      setQuizScore(0);
    }

    setIsSessionActive(true);
    setIsCompleted(false);
  };

  // Keyboard shortcut for flashcards (Space to flip)
  useEffect(() => {
    if (!isSessionActive || isCompleted || mode !== 'flashcards') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSessionActive, isCompleted, mode]);

  // Flashcard Answer
  const handleFlashcardResult = async (gotIt: boolean) => {
    const currentCard = flashcardQueue[currentIndex];
    if (!currentCard) return;

    // Record to database
    api.recordStudyResult(currentCard.id, gotIt).catch(console.error);

    if (gotIt) {
      setGotItCount(prev => prev + 1);
      // Advance to next
      if (currentIndex + 1 >= flashcardQueue.length) {
        finishSession();
      } else {
        setIsFlipped(false);
        setCurrentIndex(prev => prev + 1);
      }
    } else {
      setMissedCount(prev => prev + 1);
      // "Missed cards come back sooner in the session"
      // Re-insert this card 2 positions ahead or at end if queue is short
      const updatedQueue = [...flashcardQueue];
      const reinsertIndex = Math.min(currentIndex + 3, updatedQueue.length);
      updatedQueue.splice(reinsertIndex, 0, currentCard);
      setFlashcardQueue(updatedQueue);

      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
    }
  };

  // Quiz Answer
  const handleQuizAnswer = async (selectedOption: string) => {
    const currentQ = quizQuestions[currentIndex];
    if (!currentQ || currentQ.isAnswered) return;

    const isCorrect = selectedOption === currentQ.correctAnswer;
    
    // Record to database
    api.recordStudyResult(currentQ.card.id, isCorrect).catch(console.error);

    if (isCorrect) {
      setQuizScore(prev => prev + 1);
    }

    setQuizQuestions(prev => prev.map((q, idx) => 
      idx === currentIndex ? { ...q, userAnswer: selectedOption, isAnswered: true } : q
    ));
  };

  const nextQuizQuestion = () => {
    if (currentIndex + 1 >= quizQuestions.length) {
      finishSession();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const finishSession = () => {
    setIsCompleted(true);
    setIsSessionActive(false);
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {}
  };

  const currentFlashcard = flashcardQueue[currentIndex];
  const currentQuiz = quizQuestions[currentIndex];

  return (
    <div className="animate-fade-in" style={{ maxWidth: '780px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header" style={{ textAlign: 'center' }}>
        <div className="page-eyebrow">Active Recall & Retrieval</div>
        <h2 className="page-title">Study Your Library</h2>
        <p className="page-description" style={{ margin: '6px auto 0' }}>
          Reinforce your knowledge through spaced repetition flashcards or multiple-choice questions grounded in your approved notes.
        </p>
      </div>

      {/* Screen 1: Mode & Configuration Selection */}
      {!isSessionActive && !isCompleted && (
        <div className="card-base animate-fade-in" style={{ padding: '32px' }}>
          {approvedCards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }} id="study-zero-approved">
              <div style={{ width: '56px', height: '56px', background: 'var(--bg-sage-subtle)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Inbox size={26} color="var(--primary-forest)" />
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', marginBottom: '8px' }}>
                No Approved Cards Yet
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '440px', margin: '0 auto 20px' }}>
                Remember our core principle: <br />
                <em>"The AI proposes, the source stays visible, the human decides."</em><br />
                Study sessions exclusively test cards you have reviewed and approved.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button onClick={onNavigateToInbox} className="btn btn-primary" id="study-go-inbox-btn">
                  Check Review Inbox
                </button>
                <button onClick={onNavigateToAdd} className="btn btn-secondary" id="study-go-add-btn">
                  Add Notes
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Mode Switcher */}
              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Choose Mode
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div
                    onClick={() => setMode('flashcards')}
                    style={{
                      border: mode === 'flashcards' ? '2px solid var(--primary-forest)' : '1px solid var(--border-subtle)',
                      background: mode === 'flashcards' ? 'rgba(36, 76, 69, 0.04)' : 'var(--bg-surface)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '18px',
                      cursor: 'pointer',
                      transition: 'var(--transition-smooth)'
                    }}
                    id="mode-flashcards-btn"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <RotateCw size={18} color="var(--primary-forest)" />
                      <strong style={{ fontSize: '1rem' }}>Mode A: Flashcards</strong>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Flip front to back with Spacebar. Missed cards return sooner in the session queue.
                    </p>
                  </div>

                  <div
                    onClick={() => approvedCards.length >= 4 && setMode('quiz')}
                    style={{
                      border: mode === 'quiz' ? '2px solid var(--primary-forest)' : '1px solid var(--border-subtle)',
                      background: mode === 'quiz' ? 'rgba(36, 76, 69, 0.04)' : 'var(--bg-surface)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '18px',
                      cursor: approvedCards.length >= 4 ? 'pointer' : 'not-allowed',
                      opacity: approvedCards.length >= 4 ? 1 : 0.6,
                      transition: 'var(--transition-smooth)'
                    }}
                    id="mode-quiz-btn"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <HelpCircle size={18} color="var(--primary-forest)" />
                      <strong style={{ fontSize: '1rem' }}>Mode B: Quiz</strong>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Multiple choice formulated ONLY from your approved cards of matching types.
                    </p>
                    {approvedCards.length < 4 && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--accent-clay)', marginTop: '4px', fontWeight: 600 }}>
                        Requires at least 4 approved cards (you have {approvedCards.length}).
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Session Length */}
              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Session Length
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[5, 10, 'all'].map(len => {
                    const isSelected = sessionLength === len;
                    const label = len === 'all' ? `All (${approvedCards.length})` : `${len} cards`;
                    return (
                      <button
                        key={String(len)}
                        type="button"
                        onClick={() => setSessionLength(len as any)}
                        className={`filter-chip ${isSelected ? 'active' : ''}`}
                        style={{ padding: '8px 18px', fontSize: '0.88rem' }}
                        id={`session-len-${len}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={startSession}
                  className="btn btn-primary"
                  style={{ padding: '12px 36px', fontSize: '1rem' }}
                  id="begin-study-session-btn"
                >
                  <GraduationCap size={20} />
                  <span>Begin Study Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Screen 2: Mode A (Flashcards) */}
      {isSessionActive && mode === 'flashcards' && currentFlashcard && (
        <div>
          {/* Progress Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Card {currentIndex + 1} of {flashcardQueue.length}
            </span>
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--accent-sage)', fontWeight: 600 }}>
                Got it: {gotItCount}
              </span>
              <span style={{ color: 'var(--accent-clay)', fontWeight: 600 }}>
                Missed: {missedCount}
              </span>
            </div>
          </div>

          {/* 3D Flashcard */}
          <div className="flashcard-wrapper" onClick={() => setIsFlipped(prev => !prev)} id="flashcard-interactive-card">
            <div className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}>
              {/* Front Face */}
              <div className="flashcard-face">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <span className={`type-pill ${currentFlashcard.type}`}>
                      {currentFlashcard.type}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-subtle)' }}>
                      Click or press <span className="kbd-badge">Space</span> to flip
                    </span>
                  </div>

                  <div style={{ fontSize: '1.25rem', fontFamily: 'var(--font-serif)', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.4, marginTop: '20px' }}>
                    {currentFlashcard.front}
                  </div>
                </div>

                <div style={{ fontSize: '0.76rem', color: 'var(--text-subtle)', textAlign: 'center' }}>
                  Passage #{currentFlashcard.passage_position || 1} — {currentFlashcard.source_title || 'Notes'}
                </div>
              </div>

              {/* Back Face */}
              <div className="flashcard-face back">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span className={`type-pill ${currentFlashcard.type}`}>
                      Answer
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-subtle)' }}>
                      Press <span className="kbd-badge">Space</span> to flip back
                    </span>
                  </div>

                  <div style={{ fontSize: '1.05rem', color: 'var(--text-main)', lineHeight: 1.5, marginBottom: '16px' }}>
                    {currentFlashcard.back}
                  </div>

                  {/* SOURCE EVIDENCE on Back */}
                  <div className="source-evidence-block" style={{ marginTop: '8px' }}>
                    <div className="source-evidence-header">
                      <div className="source-evidence-label">
                        <Quote size={11} />
                        <span>Source Evidence</span>
                      </div>
                    </div>
                    <div className="source-evidence-quote" style={{ fontSize: '0.88rem' }}>
                      "{currentFlashcard.quote}"
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-subtle)', textAlign: 'center' }}>
                  How well did you know this?
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons for Flashcards */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '24px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); handleFlashcardResult(false); }}
              className="btn btn-discard"
              style={{ padding: '12px 28px', fontSize: '0.95rem' }}
              id="flashcard-missed-btn"
            >
              <XCircle size={18} />
              <span>Missed it</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); handleFlashcardResult(true); }}
              className="btn btn-approve"
              style={{ padding: '12px 28px', fontSize: '0.95rem' }}
              id="flashcard-got-it-btn"
            >
              <CheckCircle2 size={18} />
              <span>Got it</span>
            </button>
          </div>
        </div>
      )}

      {/* Screen 3: Mode B (Quiz) */}
      {isSessionActive && mode === 'quiz' && currentQuiz && (
        <div className="card-base animate-fade-in" style={{ padding: '32px' }} id="quiz-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Question {currentIndex + 1} of {quizQuestions.length}
            </span>
            <span className={`type-pill ${currentQuiz.card.type}`}>
              {currentQuiz.card.type}
            </span>
          </div>

          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '24px', lineHeight: 1.35 }}>
            {currentQuiz.card.front}
          </h3>

          {/* Multiple Choice Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {currentQuiz.options.map((option, idx) => {
              const isSelected = currentQuiz.userAnswer === option;
              const isCorrectAnswer = option === currentQuiz.correctAnswer;
              
              let optionStyle: React.CSSProperties = {
                padding: '14px 18px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                cursor: currentQuiz.isAnswered ? 'default' : 'pointer',
                fontSize: '0.94rem',
                textAlign: 'left',
                lineHeight: 1.45,
                transition: 'var(--transition-smooth)'
              };

              if (currentQuiz.isAnswered) {
                if (isCorrectAnswer) {
                  optionStyle = {
                    ...optionStyle,
                    backgroundColor: '#E8F5E9',
                    borderColor: '#4CAF50',
                    color: '#1B5E20',
                    fontWeight: 600
                  };
                } else if (isSelected && !isCorrectAnswer) {
                  optionStyle = {
                    ...optionStyle,
                    backgroundColor: '#FFEBEE',
                    borderColor: '#EF5350',
                    color: '#B71C1C'
                  };
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={currentQuiz.isAnswered}
                  onClick={() => handleQuizAnswer(option)}
                  style={optionStyle}
                  id={`quiz-option-${idx}`}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-muted)', minWidth: '20px' }}>
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <span>{option}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* After Answering: Reveal Source Quote */}
          {currentQuiz.isAnswered && (
            <div className="animate-fade-in" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                {currentQuiz.userAnswer === currentQuiz.correctAnswer ? (
                  <div style={{ color: '#2D6A4F', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <CheckCircle2 size={18} />
                    <span>Correct!</span>
                  </div>
                ) : (
                  <div style={{ color: '#C0392B', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <XCircle size={18} />
                    <span>Incorrect. Review the source quote:</span>
                  </div>
                )}
              </div>

              {/* Source Evidence Block */}
              <div className="source-evidence-block">
                <div className="source-evidence-header">
                  <div className="source-evidence-label">
                    <Quote size={12} />
                    <span>Source Evidence</span>
                  </div>
                  <div className="source-evidence-meta">
                    Passage #{currentQuiz.card.passage_position || 1}
                  </div>
                </div>
                <div className="source-evidence-quote">
                  "{currentQuiz.card.quote}"
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
                <button
                  onClick={nextQuizQuestion}
                  className="btn btn-primary"
                  id="quiz-next-btn"
                >
                  <span>Next Question</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Screen 4: Completion Summary */}
      {isCompleted && (
        <div className="card-base animate-fade-in" style={{ padding: '40px', textAlign: 'center' }} id="study-completed-card">
          <div style={{ width: '64px', height: '64px', background: 'var(--bg-sage-subtle)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Award size={32} color="var(--primary-forest)" />
          </div>

          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', marginBottom: '8px' }}>
            Study Session Finished!
          </h3>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.96rem', maxWidth: '420px', margin: '0 auto 24px' }}>
            {mode === 'flashcards'
              ? `You reviewed ${flashcardQueue.length} cards (${gotItCount} remembered, ${missedCount} reinforced).`
              : `You scored ${quizScore} out of ${quizQuestions.length} (${Math.round((quizScore / quizQuestions.length) * 100)}% accuracy)!`
            }
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => {
                setIsCompleted(false);
                setIsSessionActive(false);
              }}
              className="btn btn-primary"
              id="study-again-btn"
            >
              Study Again
            </button>
            <button
              onClick={onNavigateToInbox}
              className="btn btn-secondary"
            >
              Review Inbox
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
