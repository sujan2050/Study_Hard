import React, { useState } from 'react';
import { 
  BookMarked, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  FileText, 
  Inbox, 
  GraduationCap, 
  Quote, 
  Database,
  Lock,
  ChevronRight,
  HelpCircle,
  BarChart3,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SAMPLE_NOTES } from '../sampleNotes';

interface WelcomePageProps {
  onNavigateToAdd: (sampleId?: string) => void;
  onNavigateToInbox: () => void;
  onNavigateToLibrary: () => void;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({
  onNavigateToAdd,
  onNavigateToInbox,
  onNavigateToLibrary
}) => {
  const { isAuthenticated, openAuthModal, user } = useAuth();
  const [activeDemoTab, setActiveDemoTab] = useState<'front' | 'back' | 'quote'>('front');

  return (
    <div className="welcome-container animate-fade-in" style={{ maxWidth: '980px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Hero Section */}
      <section className="welcome-hero" style={{ textAlign: 'center', padding: '24px 0 44px' }}>
        <div 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            backgroundColor: 'var(--bg-sage-subtle)', 
            border: '1px solid #C8DDD6', 
            color: 'var(--primary-forest)', 
            padding: '6px 14px', 
            borderRadius: 'var(--radius-full)', 
            fontSize: '0.84rem', 
            fontWeight: 600,
            marginBottom: '18px' 
          }}
        >
          <Sparkles size={15} color="var(--accent-sage)" />
          <span>Living Study Guide &bull; Verifiable Active Recall</span>
        </div>

        <h1 
          style={{ 
            fontFamily: 'var(--font-serif)', 
            fontSize: '2.8rem', 
            fontWeight: 700, 
            lineHeight: 1.18, 
            color: 'var(--text-main)', 
            marginBottom: '18px',
            letterSpacing: '-0.02em'
          }}
        >
          Don't just memorize.<br />
          <span style={{ color: 'var(--primary-forest)' }}>Understand where every answer comes from.</span>
        </h1>

        <p 
          style={{ 
            fontSize: '1.14rem', 
            color: 'var(--text-muted)', 
            maxWidth: '720px', 
            margin: '0 auto 32px', 
            lineHeight: 1.6 
          }}
        >
          <strong>Study Hard</strong> transforms your raw lectures, research notes, and textbook excerpts into high-yield flashcards. Every single card is tethered to a <em>verbatim source quote</em>, completely eliminating AI hallucinations.
        </p>

        {/* Hero CTA buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigateToAdd()}
            className="btn btn-primary"
            style={{ padding: '13px 26px', fontSize: '1rem', fontWeight: 600, boxShadow: 'var(--shadow-card)' }}
            id="hero-add-notes-btn"
          >
            <span>Add Your Notes</span>
            <ArrowRight size={18} />
          </button>

          <button
            onClick={() => onNavigateToAdd(SAMPLE_NOTES[0].id)}
            className="btn btn-secondary"
            style={{ padding: '13px 22px', fontSize: '0.96rem', fontWeight: 500 }}
            id="hero-try-sample-btn"
          >
            <Sparkles size={17} color="var(--accent-sage)" />
            <span>Try Sample Notes</span>
          </button>

          {!isAuthenticated && (
            <button
              onClick={() => openAuthModal('register')}
              className="btn btn-secondary"
              style={{ padding: '13px 22px', fontSize: '0.96rem', fontWeight: 500 }}
              id="hero-register-btn"
            >
              <Lock size={16} />
              <span>Sign Up / Log In</span>
            </button>
          )}
        </div>
      </section>

      {/* Interactive Demonstration: The Power of Verbatim Source Evidence */}
      <section 
        className="card-base"
        style={{ 
          marginBottom: '48px', 
          padding: '30px', 
          backgroundColor: '#FFFFFF', 
          borderRadius: 'var(--radius-lg)', 
          border: '1px solid var(--border-card)',
          boxShadow: 'var(--shadow-elevated)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div className="page-eyebrow" style={{ color: 'var(--accent-sage)' }}>Interactive Preview</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', fontWeight: 600, color: 'var(--text-main)' }}>
              How Source-Verified Cards Work
            </h2>
          </div>

          <div style={{ display: 'flex', backgroundColor: 'var(--bg-cream)', padding: '4px', borderRadius: 'var(--radius-sm)', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setActiveDemoTab('front')}
              style={{
                padding: '6px 14px',
                fontSize: '0.84rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                backgroundColor: activeDemoTab === 'front' ? '#FFFFFF' : 'transparent',
                color: activeDemoTab === 'front' ? 'var(--primary-forest)' : 'var(--text-muted)',
                boxShadow: activeDemoTab === 'front' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              1. Card Front
            </button>
            <button
              type="button"
              onClick={() => setActiveDemoTab('back')}
              style={{
                padding: '6px 14px',
                fontSize: '0.84rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                backgroundColor: activeDemoTab === 'back' ? '#FFFFFF' : 'transparent',
                color: activeDemoTab === 'back' ? 'var(--primary-forest)' : 'var(--text-muted)',
                boxShadow: activeDemoTab === 'back' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              2. Card Back
            </button>
            <button
              type="button"
              onClick={() => setActiveDemoTab('quote')}
              style={{
                padding: '6px 14px',
                fontSize: '0.84rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                backgroundColor: activeDemoTab === 'quote' ? '#FFFFFF' : 'transparent',
                color: activeDemoTab === 'quote' ? 'var(--primary-forest)' : 'var(--text-muted)',
                boxShadow: activeDemoTab === 'quote' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              3. Verbatim Source
            </button>
          </div>
        </div>

        {/* Dynamic Display of Demo Card */}
        <div 
          style={{ 
            backgroundColor: 'var(--bg-surface-soft)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: 'var(--radius-md)', 
            padding: '24px', 
            minHeight: '160px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
        >
          {activeDemoTab === 'front' && (
            <div className="animate-fade-in">
              <span className="card-type-tag" style={{ marginBottom: '10px', display: 'inline-block' }}>Concept Question</span>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--text-main)', marginBottom: '8px' }}>
                Why does active recall dramatically improve long-term synaptic retention?
              </h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-subtle)' }}>
                👉 Tap "2. Card Back" to reveal the answer, or "3. Verbatim Source" to see where it came from.
              </p>
            </div>
          )}

          {activeDemoTab === 'back' && (
            <div className="animate-fade-in">
              <span className="card-type-tag" style={{ marginBottom: '10px', display: 'inline-block', backgroundColor: '#E0EAE7', color: 'var(--primary-forest)' }}>Answer Explanation</span>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-main)', lineHeight: 1.55, marginBottom: '8px' }}>
                Deliberately retrieving information from memory reinforces the associated neural pathways through synaptic plasticity, far more effectively than passive re-reading.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--accent-sage)', fontWeight: 600 }}>
                <CheckCircle2 size={14} />
                <span>Verified by passage quote</span>
              </div>
            </div>
          )}

          {activeDemoTab === 'quote' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: 'var(--primary-forest)', fontSize: '0.84rem', fontWeight: 600 }}>
                <Quote size={15} />
                <span>Original Lecture Excerpt &bull; Passage 1</span>
              </div>
              <div 
                style={{ 
                  backgroundColor: 'var(--bg-quote)', 
                  borderLeft: '4px solid var(--accent-sage)', 
                  padding: '14px 18px', 
                  fontFamily: 'var(--font-quote)', 
                  fontSize: '1.05rem', 
                  lineHeight: 1.55, 
                  color: 'var(--text-main)',
                  borderRadius: '0 var(--radius-sm) var(--radius-sm) 0'
                }}
              >
                "Active recall is a learning principle where the learner deliberately retrieves information from memory rather than passively re-reading it. <mark style={{ backgroundColor: '#D4E8E1', padding: '2px 4px', borderRadius: '3px', fontWeight: 600 }}>When a concept is actively retrieved, the neural pathways associated with that memory trace are reinforced through synaptic plasticity.</mark>"
              </div>
              <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ✓ The AI can never invent quotes. Every card is locked to this exact phrase in your uploaded material.
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Instructions: Step-by-Step Guide */}
      <section style={{ marginBottom: '48px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="page-eyebrow" style={{ color: 'var(--accent-sage)' }}>How It Works</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
            4 Simple Steps to Study Smarter
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.96rem', marginTop: '6px' }}>
            A streamlined workflow designed for deep comprehension, not mindless flashcard swiping.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          {/* Step 1 */}
          <div 
            className="card-base"
            style={{ 
              padding: '24px', 
              backgroundColor: '#FFFFFF', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border-card)',
              display: 'flex',
              flexDirection: 'column',
              transition: 'var(--transition-smooth)'
            }}
          >
            <div 
              style={{ 
                width: '44px', 
                height: '44px', 
                borderRadius: 'var(--radius-md)', 
                backgroundColor: 'var(--bg-sage-subtle)', 
                color: 'var(--primary-forest)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 700, 
                fontSize: '1.1rem',
                marginBottom: '16px' 
              }}
            >
              1
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
              Add Your Notes
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, flexGrow: 1 }}>
              Paste study notes, lecture slides, or summaries. Study Hard automatically splits long text into digestible, coherent passages.
            </p>
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--primary-forest)', fontWeight: 600 }}>
              Passage preview included &rarr;
            </div>
          </div>

          {/* Step 2 */}
          <div 
            className="card-base"
            style={{ 
              padding: '24px', 
              backgroundColor: '#FFFFFF', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border-card)',
              display: 'flex',
              flexDirection: 'column',
              transition: 'var(--transition-smooth)'
            }}
          >
            <div 
              style={{ 
                width: '44px', 
                height: '44px', 
                borderRadius: 'var(--radius-md)', 
                backgroundColor: 'var(--bg-sage-subtle)', 
                color: 'var(--primary-forest)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 700, 
                fontSize: '1.1rem',
                marginBottom: '16px' 
              }}
            >
              2
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
              AI Generates & Verifies
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, flexGrow: 1 }}>
              AI crafts concept questions, terms, and processes. Each card must cite an exact verbatim sentence or it is discarded immediately.
            </p>
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--primary-forest)', fontWeight: 600 }}>
              Zero hallucinations &rarr;
            </div>
          </div>

          {/* Step 3 */}
          <div 
            className="card-base"
            style={{ 
              padding: '24px', 
              backgroundColor: '#FFFFFF', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border-card)',
              display: 'flex',
              flexDirection: 'column',
              transition: 'var(--transition-smooth)'
            }}
          >
            <div 
              style={{ 
                width: '44px', 
                height: '44px', 
                borderRadius: 'var(--radius-md)', 
                backgroundColor: 'var(--bg-sage-subtle)', 
                color: 'var(--primary-forest)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 700, 
                fontSize: '1.1rem',
                marginBottom: '16px' 
              }}
            >
              3
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
              Review In Inbox
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, flexGrow: 1 }}>
              Nothing enters your deck automatically. In the Review Inbox, accept drafts, refine front/back wording, or discard cards.
            </p>
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--primary-forest)', fontWeight: 600 }}>
              You are the gatekeeper &rarr;
            </div>
          </div>

          {/* Step 4 */}
          <div 
            className="card-base"
            style={{ 
              padding: '24px', 
              backgroundColor: '#FFFFFF', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border-card)',
              display: 'flex',
              flexDirection: 'column',
              transition: 'var(--transition-smooth)'
            }}
          >
            <div 
              style={{ 
                width: '44px', 
                height: '44px', 
                borderRadius: 'var(--radius-md)', 
                backgroundColor: 'var(--bg-sage-subtle)', 
                color: 'var(--primary-forest)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 700, 
                fontSize: '1.1rem',
                marginBottom: '16px' 
              }}
            >
              4
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
              Active Recall Quizzes
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, flexGrow: 1 }}>
              Practice approved cards. Whenever you feel unsure, flip directly to the source passage. Track your mastery in the Progress tab.
            </p>
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--primary-forest)', fontWeight: 600 }}>
              Real retention mastery &rarr;
            </div>
          </div>
        </div>
      </section>

      {/* Key Features & Architecture Grid */}
      <section 
        style={{ 
          backgroundColor: 'var(--primary-forest)', 
          color: '#FFFFFF', 
          borderRadius: 'var(--radius-lg)', 
          padding: '36px 32px', 
          marginBottom: '48px',
          boxShadow: 'var(--shadow-elevated)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '8px' }}>
            Built for Academic Integrity & Precision
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.78)', fontSize: '0.94rem' }}>
            Why students and researchers trust Study Hard over generic AI flashcard apps.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
          <div style={{ display: 'flex', gap: '14px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheck size={20} color="#A3D9C9" />
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>Verbatim Quote Anchor</h4>
              <p style={{ fontSize: '0.86rem', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.45 }}>
                Every card must cite an actual sentence from your text. If the AI invents facts, the server blocks it.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Database size={20} color="#A3D9C9" />
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>MySQL Powered</h4>
              <p style={{ fontSize: '0.86rem', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.45 }}>
                Backed by a persistent MySQL engine (`study_hard`). Your notes and study metrics are safely stored.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={20} color="#A3D9C9" />
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>Near-Duplicate Filtering</h4>
              <p style={{ fontSize: '0.86rem', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.45 }}>
                Our algorithms cross-check existing questions to prevent cluttering your deck with repetitive cards.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BarChart3 size={20} color="#A3D9C9" />
            </div>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>Adaptive Accuracy Analytics</h4>
              <p style={{ fontSize: '0.86rem', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.45 }}>
                Pinpoints your "Most Missed Cards" so you can target weak areas before exam day.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Navigation Cards */}
      <section style={{ textAlign: 'center', padding: '16px 0' }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '14px' }}>
          Ready to begin?
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.94rem', marginBottom: '24px' }}>
          Choose where you want to go next:
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigateToAdd()}
            className="btn btn-primary"
            style={{ padding: '12px 24px', fontSize: '0.95rem' }}
          >
            <FileText size={18} />
            <span>Add Study Notes</span>
          </button>

          <button
            onClick={onNavigateToInbox}
            className="btn btn-secondary"
            style={{ padding: '12px 24px', fontSize: '0.95rem' }}
          >
            <Inbox size={18} />
            <span>Review Inbox</span>
          </button>

          <button
            onClick={onNavigateToLibrary}
            className="btn btn-secondary"
            style={{ padding: '12px 24px', fontSize: '0.95rem' }}
          >
            <BookOpen size={18} />
            <span>View Library</span>
          </button>
        </div>
      </section>
    </div>
  );
};
