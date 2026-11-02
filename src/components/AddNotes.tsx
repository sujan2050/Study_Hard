import React, { useState } from 'react';
import { api } from '../lib/api';
import { SAMPLE_NOTES, SampleNote } from '../sampleNotes';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Eye,
  RefreshCw
} from 'lucide-react';

interface AddNotesProps {
  onCardsGenerated: (count: number) => void;
  onNavigateToInbox: () => void;
}

export const AddNotes: React.FC<AddNotesProps> = ({
  onCardsGenerated,
  onNavigateToInbox
}) => {
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [passagesPreview, setPassagesPreview] = useState<{ position: number; text: string }[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [totalSteps, setTotalSteps] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ totalCards: number; sourceTitle: string } | null>(null);

  // Load a sample note
  const handleLoadSample = (sample: SampleNote) => {
    setTitle(sample.title);
    setRawText(sample.content);
    setError(null);
    setSuccessInfo(null);
    // Automatically preview passages
    handlePreviewPassages(sample.content);
  };

  // Preview splitting
  const handlePreviewPassages = async (textToPreview = rawText) => {
    if (!textToPreview.trim()) {
      setPassagesPreview([]);
      return;
    }
    setIsPreviewing(true);
    setError(null);
    try {
      const res = await api.previewPassages(textToPreview);
      setPassagesPreview(res.passages);
    } catch (err: any) {
      setError(err.message || 'Failed to preview passages');
    } finally {
      setIsPreviewing(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExt);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        handlePreviewPassages(content);
      }
    };

    if (file.type === 'application/pdf') {
      // Basic text extraction for PDF
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        // Clean non-printable characters for standard text pdf
        const cleaned = (text || '').replace(/[^\x20-\x7E\t\n\r]/g, ' ');
        if (cleaned.trim().length > 30) {
          setRawText(cleaned);
          handlePreviewPassages(cleaned);
        } else {
          setError('Could not extract plain text from this PDF. Please paste the text directly.');
        }
      };
      reader.readAsText(file);
    } else {
      reader.readAsText(file);
    }
  };

  // Save source and generate cards passage by passage
  const handleGenerate = async () => {
    if (!rawText.trim()) {
      setError('Please provide text notes first.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccessInfo(null);
    setProgressMsg('Saving source and analyzing structure...');

    try {
      // Step 1: Create source and split passages on server
      const { source, passages } = await api.createSource(title || 'Untitled Notes', rawText);
      setTotalSteps(passages.length);

      let totalCardsGenerated = 0;

      // Step 2: Send ONE passage at a time to model + verify quotes server-side
      for (let i = 0; i < passages.length; i++) {
        const passage = passages[i];
        setCurrentStep(i + 1);
        setProgressMsg(`Reading passage ${i + 1} of ${passages.length}...`);

        try {
          const genRes = await api.generatePassageCards(passage.id);
          totalCardsGenerated += genRes.count;
        } catch (genErr: any) {
          console.warn(`Error on passage ${i + 1}:`, genErr);
          // Continue with next passage if one fails
        }
      }

      setSuccessInfo({
        totalCards: totalCardsGenerated,
        sourceTitle: source.title
      });
      onCardsGenerated(totalCardsGenerated);
      setProgressMsg('Generation complete!');
    } catch (err: any) {
      setError(err.message || 'Failed to generate study cards');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '860px', margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-eyebrow">Input & Source Analysis</div>
        <h2 className="page-title">Add Your Notes</h2>
        <p className="page-description">
          Paste your study material, lecture notes, or readings. We will divide them into focused passages and formulate draft study cards with verbatim source evidence.
        </p>
      </div>

      {/* Quick Sample Notes Banner */}
      <div 
        className="card-base" 
        style={{ 
          background: 'var(--bg-surface-soft)', 
          border: '1px dashed var(--accent-sage)', 
          marginBottom: '24px',
          padding: '18px 22px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={20} color="var(--accent-sage)" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Want an immediate walkthrough?</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Load pre-curated study material with one click:</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {SAMPLE_NOTES.map(sample => (
              <button
                key={sample.id}
                type="button"
                onClick={() => handleLoadSample(sample)}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                id={`sample-btn-${sample.id}`}
              >
                <BookOpen size={14} />
                {sample.id === 'cognitive-science' ? 'Memory & Recall' : sample.id === 'cellular-respiration' ? 'Cellular Respiration' : 'Roman Concrete'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          backgroundColor: '#FDF1F0',
          border: '1px solid #F5C6CB',
          borderRadius: 'var(--radius-md)',
          color: '#C0392B',
          fontSize: '0.88rem',
          marginBottom: '20px'
        }}>
          <AlertCircle size={18} />
          <div style={{ flexGrow: 1 }}>{error}</div>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C0392B' }}>
            ✕
          </button>
        </div>
      )}

      {successInfo && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '16px 20px',
          backgroundColor: '#EEF7F2',
          border: '1px solid #C8E6D9',
          borderRadius: 'var(--radius-md)',
          color: '#244C45',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={22} color="#2D6A4F" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                {successInfo.totalCards} draft cards generated from "{successInfo.sourceTitle}"!
              </div>
              <div style={{ fontSize: '0.82rem', color: '#4B6B61' }}>
                Every card is held in your Review Inbox with locked source evidence.
              </div>
            </div>
          </div>
          <button
            onClick={onNavigateToInbox}
            className="btn btn-approve"
            id="go-to-inbox-btn"
          >
            Open Review Inbox
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Main Form */}
      <div className="card-base" style={{ marginBottom: '28px' }}>
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Source Title
          </label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Chapter 4: Neural Adaptations or Biology Lecture 3"
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={isGenerating}
            id="source-title-input"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
              Source Notes Content
            </label>
            <label 
              style={{ 
                cursor: 'pointer', 
                fontSize: '0.8rem', 
                color: 'var(--primary-forest)', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '5px',
                fontWeight: 500
              }}
            >
              <Upload size={14} />
              <span>Upload file (.txt, .md, .pdf)</span>
              <input
                type="file"
                accept=".txt,.md,.markdown,.pdf"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                disabled={isGenerating}
                id="file-upload-input"
              />
            </label>
          </div>
          <textarea
            className="textarea"
            rows={10}
            placeholder="Paste your study text, paragraphs, or book excerpts here..."
            value={rawText}
            onChange={e => {
              setRawText(e.target.value);
              setPassagesPreview([]);
            }}
            disabled={isGenerating}
            id="source-raw-text-input"
          />
        </div>

        {/* Action Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <button
            type="button"
            onClick={() => handlePreviewPassages()}
            disabled={!rawText.trim() || isGenerating || isPreviewing}
            className="btn btn-secondary"
            id="preview-passages-btn"
          >
            <Eye size={16} />
            {isPreviewing ? 'Analyzing...' : 'Preview Passages (3-6 sentences)'}
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!rawText.trim() || isGenerating}
            className="btn btn-primary"
            style={{ padding: '10px 22px' }}
            id="generate-cards-btn"
          >
            {isGenerating ? (
              <>
                <RefreshCw size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>{progressMsg}</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Generate Draft Cards</span>
              </>
            )}
          </button>
        </div>

        {/* Live Progress Bar during generation */}
        {isGenerating && totalSteps > 0 && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              <span>{progressMsg}</span>
              <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
            </div>
            <div style={{ height: '7px', background: 'var(--bg-sage-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div 
                style={{ 
                  height: '100%', 
                  backgroundColor: 'var(--primary-forest)', 
                  width: `${(currentStep / totalSteps) * 100}%`,
                  transition: 'width 0.3s ease'
                }} 
              />
            </div>
          </div>
        )}
      </div>

      {/* Passage Preview Section */}
      {passagesPreview.length > 0 && (
        <div className="card-base animate-fade-in" style={{ backgroundColor: 'var(--bg-surface-soft)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div className="page-eyebrow">Split Preview</div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600 }}>
                {passagesPreview.length} Analyzed Passages
              </h3>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Targeting 3 to 6 sentences per passage
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {passagesPreview.map((p) => (
              <div 
                key={p.position}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-sage)', letterSpacing: '0.04em' }}>
                    PASSAGE #{p.position}
                  </span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  {p.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
