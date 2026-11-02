import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from './db/index.js';
import { splitIntoPassages } from './services/passageSplitter.js';
import { generateCardsForPassage } from './services/aiGenerator.js';
import { CardStatus } from '../src/types/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'quiet_study_super_secret_jwt_key_2026';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string };
  ownerId?: string;
}

// Middleware to extract user from JWT Bearer token or x-owner-id header
app.use((req: Request, _res: Response, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
      (req as AuthenticatedRequest).user = decoded;
      (req as AuthenticatedRequest).ownerId = decoded.userId;
    } catch {
      // Token invalid or expired - proceed to fallback
    }
  }
  next();
});

// Helper to get owner ID (authenticated user ID prioritized, fallback to anonymous header)
function getOwnerId(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  if (authReq.ownerId) {
    return authReq.ownerId;
  }
  const ownerId = (req.headers['x-owner-id'] as string) || (req.query.owner_id as string);
  if (!ownerId) {
    return 'anonymous_default_user';
  }
  return ownerId;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiConfigured: !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.REPLIT_AI_KEY)
  });
});

// Auth: Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, anonymousOwnerId } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const db = await getDatabase();
    const existing = await db.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.createUser(email, passwordHash, name);

    // Link existing anonymous notes and cards to this user's account
    if (anonymousOwnerId && anonymousOwnerId !== user.id) {
      await db.migrateOwnerData(anonymousOwnerId, user.id);
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ user, token, message: 'Account created successfully' });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// Auth: Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, anonymousOwnerId } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = await getDatabase();
    const dbUser = await db.getUserByEmail(email);
    if (!dbUser) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, dbUser.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Link existing anonymous notes and cards to this user's account
    if (anonymousOwnerId && anonymousOwnerId !== dbUser.id) {
      await db.migrateOwnerData(anonymousOwnerId, dbUser.id);
    }

    const user = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      created_at: dbUser.created_at
    };

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ user, token });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Auth: Current User Profile
app.get('/api/auth/me', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const db = await getDatabase();
    const user = await db.getUserById(authReq.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Preview passage splitting without saving
app.post('/api/sources/preview-passages', (req, res) => {
  const { raw_text } = req.body;
  if (!raw_text || typeof raw_text !== 'string') {
    return res.status(400).json({ error: 'raw_text is required' });
  }
  const passages = splitIntoPassages(raw_text);
  res.json({ passages });
});

// Create source and its passages
app.post('/api/sources', async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const { title, raw_text } = req.body;

    if (!raw_text || !raw_text.trim()) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const db = await getDatabase();
    const source = await db.createSource(ownerId, title || 'Untitled Notes', raw_text);

    const splitResult = splitIntoPassages(raw_text);
    const passagesToCreate = splitResult.map(p => ({
      id: '',
      source_id: source.id,
      position: p.position,
      text: p.text
    }));

    const passages = await db.createPassages(passagesToCreate);

    res.status(201).json({ source, passages });
  } catch (err: any) {
    console.error('Error creating source:', err);
    res.status(500).json({ error: err.message || 'Failed to create source' });
  }
});

// Get user's sources
app.get('/api/sources', async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const db = await getDatabase();
    const sources = await db.getSources(ownerId);
    res.json({ sources });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get passages for a source
app.get('/api/sources/:id/passages', async (req, res) => {
  try {
    const db = await getDatabase();
    const passages = await db.getPassagesBySource(req.params.id);
    res.json({ passages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a source
app.delete('/api/sources/:id', async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const db = await getDatabase();
    await db.deleteSource(ownerId, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate cards for a single passage (allows client to show live "Reading passage X of Y..." progress!)
app.post('/api/generate-passage', async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const { passage_id } = req.body;

    if (!passage_id) {
      return res.status(400).json({ error: 'passage_id is required' });
    }

    const db = await getDatabase();
    const passage = await db.getPassage(passage_id);
    if (!passage) {
      return res.status(404).json({ error: 'Passage not found' });
    }

    // Fetch existing card front texts to avoid near-duplicates
    const existingCards = await db.getCards(ownerId);
    const existingFronts = existingCards.map(c => c.front);

    // Call AI with single passage only + server-side quote verification
    const verifiedAICards = await generateCardsForPassage(passage.text, existingFronts);

    if (verifiedAICards.length === 0) {
      return res.json({ cards: [], count: 0 });
    }

    // Save as 'draft' status. NEVER auto-approve.
    const cardsToInsert = verifiedAICards.map(c => ({
      owner_id: ownerId,
      passage_id: passage.id,
      type: c.type,
      front: c.front,
      back: c.back,
      quote: c.quote,
      status: 'draft' as CardStatus,
      edited: false,
      times_correct: 0,
      times_wrong: 0
    }));

    const createdCards = await db.createCards(cardsToInsert);
    res.json({ cards: createdCards, count: createdCards.length });
  } catch (err: any) {
    console.error('Error generating cards for passage:', err);
    res.status(500).json({ error: err.message || 'Generation failed' });
  }
});

// Cards endpoints
app.get('/api/cards', async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const status = req.query.status as CardStatus | undefined;
    const db = await getDatabase();
    const cards = await db.getCards(ownerId, status);
    res.json({ cards });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update card status (Approve, Discard, or reset to Draft)
app.patch('/api/cards/:id/status', async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const { status } = req.body;
    if (!status || !['draft', 'approved', 'discarded'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const db = await getDatabase();
    const updated = await db.updateCardStatus(ownerId, req.params.id, status as CardStatus);
    if (!updated) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json({ card: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk update card status (Bulk Approve / Bulk Discard)
app.post('/api/cards/bulk-status', async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const { card_ids, status } = req.body;

    if (!Array.isArray(card_ids) || !status || !['approved', 'discarded', 'draft'].includes(status)) {
      return res.status(400).json({ error: 'Invalid card_ids array or status' });
    }

    const db = await getDatabase();
    const count = await db.bulkUpdateCardStatus(ownerId, card_ids, status as CardStatus);
    res.json({ updatedCount: count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Edit card content (inline edit of front/back, quote stays locked)
app.patch('/api/cards/:id', async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const { front, back } = req.body;

    if (!front || !back) {
      return res.status(400).json({ error: 'Front and back are required' });
    }

    const db = await getDatabase();
    const updated = await db.updateCardContent(ownerId, req.params.id, front.trim(), back.trim());
    if (!updated) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json({ card: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete card permanently
app.delete('/api/cards/:id', async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const db = await getDatabase();
    await db.deleteCard(ownerId, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Study result tracking (times_correct / times_wrong)
app.post('/api/cards/:id/study-result', async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const { correct } = req.body;

    const db = await getDatabase();
    const updated = await db.recordStudyResult(ownerId, req.params.id, !!correct);
    if (!updated) {
      return res.status(404).json({ error: 'Card not found' });
    }
    res.json({ card: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Progress Stats
app.get('/api/stats', async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    const db = await getDatabase();
    const stats = await db.getStats(ownerId);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend built assets if available
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(path.join(distPath, 'index.html'))) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[Server] Quiet Study backend running on http://localhost:${PORT}`);
});
