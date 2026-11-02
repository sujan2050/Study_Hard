import fs from 'fs';
import path from 'path';
import pg from 'pg';
import mysql from 'mysql2/promise';
import { Card, Passage, Source, CardStatus, CardType, User, DbUser } from '../../src/types/index.js';

const { Pool } = pg;

export interface DBInterface {
  init(): Promise<void>;
  
  // Users & Auth
  createUser(email: string, passwordHash: string, name?: string): Promise<User>;
  getUserByEmail(email: string): Promise<DbUser | null>;
  getUserById(id: string): Promise<User | null>;
  migrateOwnerData(fromOwnerId: string, toUserId: string): Promise<{ sourcesCount: number; cardsCount: number }>;

  // Sources
  createSource(ownerId: string, title: string, rawText: string): Promise<Source>;
  getSources(ownerId: string): Promise<Source[]>;
  getSource(ownerId: string, sourceId: string): Promise<Source | null>;
  deleteSource(ownerId: string, sourceId: string): Promise<void>;

  // Passages
  createPassages(passages: { id: string; source_id: string; position: number; text: string }[]): Promise<Passage[]>;
  getPassagesBySource(sourceId: string): Promise<Passage[]>;
  getPassage(passageId: string): Promise<Passage | null>;

  // Cards
  createCards(cards: Omit<Card, 'id' | 'created_at' | 'approved_at'>[]): Promise<Card[]>;
  getCards(ownerId: string, status?: CardStatus): Promise<Card[]>;
  getCard(ownerId: string, cardId: string): Promise<Card | null>;
  updateCardStatus(ownerId: string, cardId: string, status: CardStatus): Promise<Card | null>;
  bulkUpdateCardStatus(ownerId: string, cardIds: string[], status: CardStatus): Promise<number>;
  updateCardContent(ownerId: string, cardId: string, front: string, back: string): Promise<Card | null>;
  deleteCard(ownerId: string, cardId: string): Promise<void>;
  recordStudyResult(ownerId: string, cardId: string, correct: boolean): Promise<Card | null>;

  // Stats
  getStats(ownerId: string): Promise<{
    counts: { approved: number; draft: number; discarded: number; total: number };
    quizAccuracy: { totalAnswers: number; correctAnswers: number; percentage: number };
    mostMissedCards: Card[];
  }>;
}

// Generate simple unique IDs without external dependency
export function generateId(prefix = ''): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${ts}_${rnd}` : `${ts}_${rnd}`;
}

/**
 * Robust JSON File Storage Engine (Local Development Fallback)
 * Fully atomic, persistent across reboots, zero external dependencies required.
 */
class LocalJsonDB implements DBInterface {
  private filePath: string;
  private data: {
    users: DbUser[];
    sources: Source[];
    passages: Passage[];
    cards: Card[];
  };

  constructor(storageDir: string) {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    this.filePath = path.join(storageDir, 'quiet_study_store.json');
    this.data = { users: [], sources: [], passages: [], cards: [] };
  }

  async init(): Promise<void> {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.users) this.data.users = [];
        if (!this.data.sources) this.data.sources = [];
        if (!this.data.passages) this.data.passages = [];
        if (!this.data.cards) this.data.cards = [];
        console.log(`[Database] Loaded local store from ${this.filePath} (${this.data.cards.length} cards, ${this.data.sources.length} sources, ${this.data.users.length} users)`);
      } catch (err) {
        console.warn('[Database] Error reading store, starting fresh', err);
        this.data = { users: [], sources: [], passages: [], cards: [] };
      }
    } else {
      this.save();
      console.log(`[Database] Created fresh local store at ${this.filePath}`);
    }
  }

  private save(): void {
    try {
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (e) {
      console.error('[Database] Failed to write database file', e);
    }
  }

  // Users & Auth
  async createUser(email: string, passwordHash: string, name?: string): Promise<User> {
    const user: DbUser = {
      id: generateId('usr'),
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      name: name?.trim() || undefined,
      created_at: new Date().toISOString()
    };
    this.data.users.push(user);
    this.save();
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at
    };
  }

  async getUserByEmail(email: string): Promise<DbUser | null> {
    const normalized = email.toLowerCase().trim();
    return this.data.users.find(u => u.email.toLowerCase() === normalized) || null;
  }

  async getUserById(id: string): Promise<User | null> {
    const user = this.data.users.find(u => u.id === id);
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at
    };
  }

  async migrateOwnerData(fromOwnerId: string, toUserId: string): Promise<{ sourcesCount: number; cardsCount: number }> {
    if (!fromOwnerId || !toUserId || fromOwnerId === toUserId) {
      return { sourcesCount: 0, cardsCount: 0 };
    }

    let sourcesCount = 0;
    for (const source of this.data.sources) {
      if (source.owner_id === fromOwnerId) {
        source.owner_id = toUserId;
        sourcesCount++;
      }
    }

    let cardsCount = 0;
    for (const card of this.data.cards) {
      if (card.owner_id === fromOwnerId) {
        card.owner_id = toUserId;
        cardsCount++;
      }
    }

    if (sourcesCount > 0 || cardsCount > 0) {
      this.save();
      console.log(`[Database] Migrated ${sourcesCount} sources and ${cardsCount} cards from ${fromOwnerId} to ${toUserId}`);
    }

    return { sourcesCount, cardsCount };
  }

  // Sources
  async createSource(ownerId: string, title: string, rawText: string): Promise<Source> {
    const source: Source = {
      id: generateId('src'),
      owner_id: ownerId,
      title: title || 'Untitled Notes',
      raw_text: rawText,
      created_at: new Date().toISOString()
    };
    this.data.sources.unshift(source);
    this.save();
    return source;
  }

  async getSources(ownerId: string): Promise<Source[]> {
    return this.data.sources.filter(s => s.owner_id === ownerId);
  }

  async getSource(ownerId: string, sourceId: string): Promise<Source | null> {
    return this.data.sources.find(s => s.owner_id === ownerId && s.id === sourceId) || null;
  }

  async deleteSource(ownerId: string, sourceId: string): Promise<void> {
    const passageIds = this.data.passages.filter(p => p.source_id === sourceId).map(p => p.id);
    this.data.cards = this.data.cards.filter(c => !passageIds.includes(c.passage_id));
    this.data.passages = this.data.passages.filter(p => p.source_id !== sourceId);
    this.data.sources = this.data.sources.filter(s => !(s.owner_id === ownerId && s.id === sourceId));
    this.save();
  }

  // Passages
  async createPassages(passages: { id: string; source_id: string; position: number; text: string }[]): Promise<Passage[]> {
    const created: Passage[] = passages.map(p => ({
      id: p.id || generateId('psg'),
      source_id: p.source_id,
      position: p.position,
      text: p.text
    }));
    this.data.passages.push(...created);
    this.save();
    return created;
  }

  async getPassagesBySource(sourceId: string): Promise<Passage[]> {
    return this.data.passages
      .filter(p => p.source_id === sourceId)
      .sort((a, b) => a.position - b.position);
  }

  async getPassage(passageId: string): Promise<Passage | null> {
    return this.data.passages.find(p => p.id === passageId) || null;
  }

  // Cards
  async createCards(cards: Omit<Card, 'id' | 'created_at' | 'approved_at'>[]): Promise<Card[]> {
    const now = new Date().toISOString();
    const created: Card[] = cards.map(c => ({
      ...c,
      id: generateId('crd'),
      created_at: now,
      approved_at: c.status === 'approved' ? now : null,
      edited: c.edited || false,
      times_correct: c.times_correct || 0,
      times_wrong: c.times_wrong || 0
    }));

    this.data.cards.unshift(...created);
    this.save();
    return created;
  }

  private enrichCard(card: Card): Card {
    const passage = this.data.passages.find(p => p.id === card.passage_id);
    const source = passage ? this.data.sources.find(s => s.id === passage.source_id) : undefined;
    return {
      ...card,
      passage_position: passage ? passage.position : undefined,
      passage_text: passage ? passage.text : undefined,
      source_id: source ? source.id : undefined,
      source_title: source ? source.title : undefined
    };
  }

  async getCards(ownerId: string, status?: CardStatus): Promise<Card[]> {
    return this.data.cards
      .filter(c => c.owner_id === ownerId && (!status || c.status === status))
      .map(c => this.enrichCard(c));
  }

  async getCard(ownerId: string, cardId: string): Promise<Card | null> {
    const card = this.data.cards.find(c => c.owner_id === ownerId && c.id === cardId);
    return card ? this.enrichCard(card) : null;
  }

  async updateCardStatus(ownerId: string, cardId: string, status: CardStatus): Promise<Card | null> {
    const card = this.data.cards.find(c => c.owner_id === ownerId && c.id === cardId);
    if (!card) return null;
    card.status = status;
    if (status === 'approved' && !card.approved_at) {
      card.approved_at = new Date().toISOString();
    }
    this.save();
    return this.enrichCard(card);
  }

  async bulkUpdateCardStatus(ownerId: string, cardIds: string[], status: CardStatus): Promise<number> {
    let count = 0;
    const now = new Date().toISOString();
    for (const card of this.data.cards) {
      if (card.owner_id === ownerId && cardIds.includes(card.id)) {
        card.status = status;
        if (status === 'approved' && !card.approved_at) {
          card.approved_at = now;
        }
        count++;
      }
    }
    if (count > 0) this.save();
    return count;
  }

  async updateCardContent(ownerId: string, cardId: string, front: string, back: string): Promise<Card | null> {
    const card = this.data.cards.find(c => c.owner_id === ownerId && c.id === cardId);
    if (!card) return null;
    card.front = front;
    card.back = back;
    card.edited = true;
    this.save();
    return this.enrichCard(card);
  }

  async deleteCard(ownerId: string, cardId: string): Promise<void> {
    this.data.cards = this.data.cards.filter(c => !(c.owner_id === ownerId && c.id === cardId));
    this.save();
  }

  async recordStudyResult(ownerId: string, cardId: string, correct: boolean): Promise<Card | null> {
    const card = this.data.cards.find(c => c.owner_id === ownerId && c.id === cardId);
    if (!card) return null;
    if (correct) {
      card.times_correct = (card.times_correct || 0) + 1;
    } else {
      card.times_wrong = (card.times_wrong || 0) + 1;
    }
    this.save();
    return this.enrichCard(card);
  }

  async getStats(ownerId: string) {
    const userCards = this.data.cards.filter(c => c.owner_id === ownerId);
    const approved = userCards.filter(c => c.status === 'approved');
    const draft = userCards.filter(c => c.status === 'draft');
    const discarded = userCards.filter(c => c.status === 'discarded');

    let totalCorrect = 0;
    let totalWrong = 0;
    for (const c of approved) {
      totalCorrect += c.times_correct || 0;
      totalWrong += c.times_wrong || 0;
    }
    const totalAnswers = totalCorrect + totalWrong;
    const percentage = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

    const mostMissedCards = [...approved]
      .filter(c => (c.times_wrong || 0) > 0)
      .sort((a, b) => (b.times_wrong || 0) - (a.times_wrong || 0))
      .slice(0, 5)
      .map(c => this.enrichCard(c));

    return {
      counts: {
        approved: approved.length,
        draft: draft.length,
        discarded: discarded.length,
        total: userCards.length
      },
      quizAccuracy: {
        totalAnswers,
        correctAnswers: totalCorrect,
        percentage
      },
      mostMissedCards
    };
  }
}

/**
 * PostgreSQL Database Implementation (for Replit & Production PostgreSQL)
 */
class PostgresDB implements DBInterface {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' || connectionString.includes('neon.tech') || connectionString.includes('replit')
        ? { rejectUnauthorized: false }
        : undefined
    });
  }

  async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sources (
        id VARCHAR(64) PRIMARY KEY,
        owner_id VARCHAR(64) NOT NULL,
        title TEXT NOT NULL,
        raw_text TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS passages (
        id VARCHAR(64) PRIMARY KEY,
        source_id VARCHAR(64) REFERENCES sources(id) ON DELETE CASCADE,
        position INT NOT NULL,
        text TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cards (
        id VARCHAR(64) PRIMARY KEY,
        owner_id VARCHAR(64) NOT NULL,
        passage_id VARCHAR(64) REFERENCES passages(id) ON DELETE CASCADE,
        type VARCHAR(32) NOT NULL,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        quote TEXT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        edited BOOLEAN NOT NULL DEFAULT FALSE,
        times_correct INT NOT NULL DEFAULT 0,
        times_wrong INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        approved_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_cards_owner_status ON cards(owner_id, status);
      CREATE INDEX IF NOT EXISTS idx_passages_source ON passages(source_id);
    `);
    console.log('[Database] Connected to PostgreSQL and verified schema.');
  }

  // Users & Auth
  async createUser(email: string, passwordHash: string, name?: string): Promise<User> {
    const id = generateId('usr');
    const res = await this.pool.query(
      `INSERT INTO users (id, email, password_hash, name) VALUES ($1, LOWER($2), $3, $4) RETURNING id, email, name, created_at`,
      [id, email.trim(), passwordHash, name?.trim() || null]
    );
    return res.rows[0];
  }

  async getUserByEmail(email: string): Promise<DbUser | null> {
    const res = await this.pool.query(
      `SELECT * FROM users WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );
    return res.rows[0] || null;
  }

  async getUserById(id: string): Promise<User | null> {
    const res = await this.pool.query(
      `SELECT id, email, name, created_at FROM users WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  async migrateOwnerData(fromOwnerId: string, toUserId: string): Promise<{ sourcesCount: number; cardsCount: number }> {
    if (!fromOwnerId || !toUserId || fromOwnerId === toUserId) {
      return { sourcesCount: 0, cardsCount: 0 };
    }
    const sRes = await this.pool.query(
      `UPDATE sources SET owner_id = $1 WHERE owner_id = $2`,
      [toUserId, fromOwnerId]
    );
    const cRes = await this.pool.query(
      `UPDATE cards SET owner_id = $1 WHERE owner_id = $2`,
      [toUserId, fromOwnerId]
    );
    const sourcesCount = sRes.rowCount || 0;
    const cardsCount = cRes.rowCount || 0;
    console.log(`[Database] Migrated ${sourcesCount} sources and ${cardsCount} cards from ${fromOwnerId} to ${toUserId}`);
    return { sourcesCount, cardsCount };
  }

  async createSource(ownerId: string, title: string, rawText: string): Promise<Source> {
    const id = generateId('src');
    const res = await this.pool.query(
      `INSERT INTO sources (id, owner_id, title, raw_text) VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, ownerId, title || 'Untitled Notes', rawText]
    );
    return res.rows[0];
  }

  async getSources(ownerId: string): Promise<Source[]> {
    const res = await this.pool.query(
      `SELECT * FROM sources WHERE owner_id = $1 ORDER BY created_at DESC`,
      [ownerId]
    );
    return res.rows;
  }

  async getSource(ownerId: string, sourceId: string): Promise<Source | null> {
    const res = await this.pool.query(
      `SELECT * FROM sources WHERE owner_id = $1 AND id = $2`,
      [ownerId, sourceId]
    );
    return res.rows[0] || null;
  }

  async deleteSource(ownerId: string, sourceId: string): Promise<void> {
    await this.pool.query(`DELETE FROM sources WHERE owner_id = $1 AND id = $2`, [ownerId, sourceId]);
  }

  async createPassages(passages: { id: string; source_id: string; position: number; text: string }[]): Promise<Passage[]> {
    const created: Passage[] = [];
    for (const p of passages) {
      const id = p.id || generateId('psg');
      const res = await this.pool.query(
        `INSERT INTO passages (id, source_id, position, text) VALUES ($1, $2, $3, $4) RETURNING *`,
        [id, p.source_id, p.position, p.text]
      );
      created.push(res.rows[0]);
    }
    return created;
  }

  async getPassagesBySource(sourceId: string): Promise<Passage[]> {
    const res = await this.pool.query(
      `SELECT * FROM passages WHERE source_id = $1 ORDER BY position ASC`,
      [sourceId]
    );
    return res.rows;
  }

  async getPassage(passageId: string): Promise<Passage | null> {
    const res = await this.pool.query(`SELECT * FROM passages WHERE id = $1`, [passageId]);
    return res.rows[0] || null;
  }

  async createCards(cards: Omit<Card, 'id' | 'created_at' | 'approved_at'>[]): Promise<Card[]> {
    const created: Card[] = [];
    for (const c of cards) {
      const id = generateId('crd');
      const approvedAt = c.status === 'approved' ? new Date().toISOString() : null;
      const res = await this.pool.query(
        `INSERT INTO cards (id, owner_id, passage_id, type, front, back, quote, status, edited, times_correct, times_wrong, approved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [id, c.owner_id, c.passage_id, c.type, c.front, c.back, c.quote, c.status || 'draft', c.edited || false, c.times_correct || 0, c.times_wrong || 0, approvedAt]
      );
      created.push(res.rows[0]);
    }
    return created;
  }

  async getCards(ownerId: string, status?: CardStatus): Promise<Card[]> {
    let query = `
      SELECT c.*, p.position as passage_position, p.text as passage_text, s.id as source_id, s.title as source_title
      FROM cards c
      JOIN passages p ON c.passage_id = p.id
      JOIN sources s ON p.source_id = s.id
      WHERE c.owner_id = $1
    `;
    const params: any[] = [ownerId];
    if (status) {
      query += ` AND c.status = $2`;
      params.push(status);
    }
    query += ` ORDER BY c.created_at DESC`;
    const res = await this.pool.query(query, params);
    return res.rows;
  }

  async getCard(ownerId: string, cardId: string): Promise<Card | null> {
    const res = await this.pool.query(`
      SELECT c.*, p.position as passage_position, p.text as passage_text, s.id as source_id, s.title as source_title
      FROM cards c
      JOIN passages p ON c.passage_id = p.id
      JOIN sources s ON p.source_id = s.id
      WHERE c.owner_id = $1 AND c.id = $2
    `, [ownerId, cardId]);
    return res.rows[0] || null;
  }

  async updateCardStatus(ownerId: string, cardId: string, status: CardStatus): Promise<Card | null> {
    const approvedAt = status === 'approved' ? 'NOW()' : 'approved_at';
    const res = await this.pool.query(`
      UPDATE cards
      SET status = $1, approved_at = ${approvedAt}
      WHERE owner_id = $2 AND id = $3
      RETURNING *
    `, [status, ownerId, cardId]);
    return res.rows[0] ? this.getCard(ownerId, cardId) : null;
  }

  async bulkUpdateCardStatus(ownerId: string, cardIds: string[], status: CardStatus): Promise<number> {
    if (cardIds.length === 0) return 0;
    const placeholders = cardIds.map((_, i) => `$${i + 3}`).join(',');
    const approvedAt = status === 'approved' ? 'NOW()' : 'approved_at';
    const res = await this.pool.query(`
      UPDATE cards
      SET status = $1, approved_at = ${approvedAt}
      WHERE owner_id = $2 AND id IN (${placeholders})
    `, [status, ownerId, ...cardIds]);
    return res.rowCount || 0;
  }

  async updateCardContent(ownerId: string, cardId: string, front: string, back: string): Promise<Card | null> {
    await this.pool.query(`
      UPDATE cards
      SET front = $1, back = $2, edited = TRUE
      WHERE owner_id = $3 AND id = $4
    `, [front, back, ownerId, cardId]);
    return this.getCard(ownerId, cardId);
  }

  async deleteCard(ownerId: string, cardId: string): Promise<void> {
    await this.pool.query(`DELETE FROM cards WHERE owner_id = $1 AND id = $2`, [ownerId, cardId]);
  }

  async recordStudyResult(ownerId: string, cardId: string, correct: boolean): Promise<Card | null> {
    const col = correct ? 'times_correct = times_correct + 1' : 'times_wrong = times_wrong + 1';
    await this.pool.query(`UPDATE cards SET ${col} WHERE owner_id = $1 AND id = $2`, [ownerId, cardId]);
    return this.getCard(ownerId, cardId);
  }

  async getStats(ownerId: string) {
    const countsRes = await this.pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
        COUNT(CASE WHEN status = 'discarded' THEN 1 END) as discarded,
        COUNT(*) as total,
        COALESCE(SUM(times_correct), 0) as total_correct,
        COALESCE(SUM(times_wrong), 0) as total_wrong
      FROM cards
      WHERE owner_id = $1
    `, [ownerId]);

    const row = countsRes.rows[0] || {};
    const totalCorrect = parseInt(row.total_correct || '0', 10);
    const totalWrong = parseInt(row.total_wrong || '0', 10);
    const totalAnswers = totalCorrect + totalWrong;
    const percentage = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

    const mostMissedRes = await this.pool.query(`
      SELECT c.*, p.position as passage_position, s.title as source_title
      FROM cards c
      JOIN passages p ON c.passage_id = p.id
      JOIN sources s ON p.source_id = s.id
      WHERE c.owner_id = $1 AND c.status = 'approved' AND c.times_wrong > 0
      ORDER BY c.times_wrong DESC
      LIMIT 5
    `, [ownerId]);

    return {
      counts: {
        approved: parseInt(row.approved || '0', 10),
        draft: parseInt(row.draft || '0', 10),
        discarded: parseInt(row.discarded || '0', 10),
        total: parseInt(row.total || '0', 10)
      },
      quizAccuracy: {
        totalAnswers,
        correctAnswers: totalCorrect,
        percentage
      },
      mostMissedCards: mostMissedRes.rows
    };
  }
}

/**
 * MySQL Database Implementation (for Local MySQL & Managed Cloud MySQL)
 */
class MySQLDB implements DBInterface {
  private pool: mysql.Pool;

  constructor(config: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  }) {
    this.pool = mysql.createPool({
      host: config.host || 'localhost',
      port: config.port || 3306,
      user: config.user || 'root',
      password: config.password || '',
      database: config.database || 'study_hard',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4'
    });
  }

  async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_users_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS sources (
        id VARCHAR(64) PRIMARY KEY,
        owner_id VARCHAR(64) NOT NULL,
        title TEXT NOT NULL,
        raw_text LONGTEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sources_owner (owner_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS passages (
        id VARCHAR(64) PRIMARY KEY,
        source_id VARCHAR(64) NOT NULL,
        position INT NOT NULL,
        text LONGTEXT NOT NULL,
        INDEX idx_passages_source (source_id),
        FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id VARCHAR(64) PRIMARY KEY,
        owner_id VARCHAR(64) NOT NULL,
        passage_id VARCHAR(64) NOT NULL,
        type VARCHAR(32) NOT NULL,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        quote TEXT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        edited BOOLEAN NOT NULL DEFAULT FALSE,
        times_correct INT NOT NULL DEFAULT 0,
        times_wrong INT NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        approved_at DATETIME NULL,
        INDEX idx_cards_owner_status (owner_id, status),
        INDEX idx_cards_passage (passage_id),
        FOREIGN KEY (passage_id) REFERENCES passages(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('[Database] Connected to MySQL (study_hard) and verified schema.');
  }

  // Users & Auth
  async createUser(email: string, passwordHash: string, name?: string): Promise<User> {
    const id = generateId('usr');
    const now = new Date();
    await this.pool.query(
      'INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, LOWER(?), ?, ?, ?)',
      [id, email.trim(), passwordHash, name?.trim() || null, now]
    );
    return {
      id,
      email: email.toLowerCase().trim(),
      name: name?.trim() || undefined,
      created_at: now.toISOString()
    };
  }

  async getUserByEmail(email: string): Promise<DbUser | null> {
    const [rows]: any = await this.pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER(?)',
      [email.trim()]
    );
    if (!rows || rows.length === 0) return null;
    const u = rows[0];
    return {
      id: u.id,
      email: u.email,
      password_hash: u.password_hash,
      name: u.name,
      created_at: new Date(u.created_at).toISOString()
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const [rows]: any = await this.pool.query(
      'SELECT id, email, name, created_at FROM users WHERE id = ?',
      [id]
    );
    if (!rows || rows.length === 0) return null;
    const u = rows[0];
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      created_at: new Date(u.created_at).toISOString()
    };
  }

  async migrateOwnerData(fromOwnerId: string, toUserId: string): Promise<{ sourcesCount: number; cardsCount: number }> {
    if (!fromOwnerId || !toUserId || fromOwnerId === toUserId) {
      return { sourcesCount: 0, cardsCount: 0 };
    }
    const [sRes]: any = await this.pool.query('UPDATE sources SET owner_id = ? WHERE owner_id = ?', [toUserId, fromOwnerId]);
    const [cRes]: any = await this.pool.query('UPDATE cards SET owner_id = ? WHERE owner_id = ?', [toUserId, fromOwnerId]);
    const sourcesCount = sRes?.affectedRows || 0;
    const cardsCount = cRes?.affectedRows || 0;
    console.log(`[Database] Migrated ${sourcesCount} sources and ${cardsCount} cards from ${fromOwnerId} to ${toUserId}`);
    return { sourcesCount, cardsCount };
  }

  async createSource(ownerId: string, title: string, rawText: string): Promise<Source> {
    const id = generateId('src');
    const now = new Date();
    await this.pool.query(
      'INSERT INTO sources (id, owner_id, title, raw_text, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, ownerId, title || 'Untitled Notes', rawText, now]
    );
    return {
      id,
      owner_id: ownerId,
      title: title || 'Untitled Notes',
      raw_text: rawText,
      created_at: now.toISOString()
    };
  }

  async getSources(ownerId: string): Promise<Source[]> {
    const [rows]: any = await this.pool.query(
      'SELECT * FROM sources WHERE owner_id = ? ORDER BY created_at DESC',
      [ownerId]
    );
    return rows.map((r: any) => ({ ...r, created_at: new Date(r.created_at).toISOString() }));
  }

  async getSource(ownerId: string, sourceId: string): Promise<Source | null> {
    const [rows]: any = await this.pool.query(
      'SELECT * FROM sources WHERE owner_id = ? AND id = ?',
      [ownerId, sourceId]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return { ...r, created_at: new Date(r.created_at).toISOString() };
  }

  async deleteSource(ownerId: string, sourceId: string): Promise<void> {
    await this.pool.query('DELETE FROM sources WHERE owner_id = ? AND id = ?', [ownerId, sourceId]);
  }

  async createPassages(passages: { id: string; source_id: string; position: number; text: string }[]): Promise<Passage[]> {
    const created: Passage[] = [];
    for (const p of passages) {
      const id = p.id || generateId('psg');
      await this.pool.query(
        'INSERT INTO passages (id, source_id, position, text) VALUES (?, ?, ?, ?)',
        [id, p.source_id, p.position, p.text]
      );
      created.push({ id, source_id: p.source_id, position: p.position, text: p.text });
    }
    return created;
  }

  async getPassagesBySource(sourceId: string): Promise<Passage[]> {
    const [rows]: any = await this.pool.query(
      'SELECT * FROM passages WHERE source_id = ? ORDER BY position ASC',
      [sourceId]
    );
    return rows;
  }

  async getPassage(passageId: string): Promise<Passage | null> {
    const [rows]: any = await this.pool.query('SELECT * FROM passages WHERE id = ?', [passageId]);
    return rows[0] || null;
  }

  async createCards(cards: Omit<Card, 'id' | 'created_at' | 'approved_at'>[]): Promise<Card[]> {
    const created: Card[] = [];
    for (const c of cards) {
      const id = generateId('crd');
      const now = new Date();
      const approvedAt = c.status === 'approved' ? now : null;
      await this.pool.query(
        `INSERT INTO cards (id, owner_id, passage_id, type, front, back, quote, status, edited, times_correct, times_wrong, created_at, approved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, c.owner_id, c.passage_id, c.type, c.front, c.back, c.quote, c.status || 'draft', c.edited ? 1 : 0, c.times_correct || 0, c.times_wrong || 0, now, approvedAt]
      );
      created.push({
        ...c,
        id,
        edited: c.edited || false,
        times_correct: c.times_correct || 0,
        times_wrong: c.times_wrong || 0,
        created_at: now.toISOString(),
        approved_at: approvedAt ? approvedAt.toISOString() : null
      });
    }
    return created;
  }

  async getCards(ownerId: string, status?: CardStatus): Promise<Card[]> {
    let query = `
      SELECT c.*, p.position as passage_position, p.text as passage_text, s.id as source_id, s.title as source_title
      FROM cards c
      JOIN passages p ON c.passage_id = p.id
      JOIN sources s ON p.source_id = s.id
      WHERE c.owner_id = ?
    `;
    const params: any[] = [ownerId];
    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }
    query += ' ORDER BY c.created_at DESC';
    const [rows]: any = await this.pool.query(query, params);
    return rows.map((r: any) => ({
      ...r,
      edited: !!r.edited,
      created_at: new Date(r.created_at).toISOString(),
      approved_at: r.approved_at ? new Date(r.approved_at).toISOString() : null
    }));
  }

  async getCard(ownerId: string, cardId: string): Promise<Card | null> {
    const [rows]: any = await this.pool.query(`
      SELECT c.*, p.position as passage_position, p.text as passage_text, s.id as source_id, s.title as source_title
      FROM cards c
      JOIN passages p ON c.passage_id = p.id
      JOIN sources s ON p.source_id = s.id
      WHERE c.owner_id = ? AND c.id = ?
    `, [ownerId, cardId]);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
      edited: !!r.edited,
      created_at: new Date(r.created_at).toISOString(),
      approved_at: r.approved_at ? new Date(r.approved_at).toISOString() : null
    };
  }

  async updateCardStatus(ownerId: string, cardId: string, status: CardStatus): Promise<Card | null> {
    if (status === 'approved') {
      await this.pool.query('UPDATE cards SET status = ?, approved_at = NOW() WHERE owner_id = ? AND id = ?', [status, ownerId, cardId]);
    } else {
      await this.pool.query('UPDATE cards SET status = ? WHERE owner_id = ? AND id = ?', [status, ownerId, cardId]);
    }
    return this.getCard(ownerId, cardId);
  }

  async bulkUpdateCardStatus(ownerId: string, cardIds: string[], status: CardStatus): Promise<number> {
    if (cardIds.length === 0) return 0;
    const placeholders = cardIds.map(() => '?').join(',');
    let sql = `UPDATE cards SET status = ?`;
    if (status === 'approved') {
      sql += `, approved_at = NOW()`;
    }
    sql += ` WHERE owner_id = ? AND id IN (${placeholders})`;
    const [res]: any = await this.pool.query(sql, [status, ownerId, ...cardIds]);
    return res?.affectedRows || 0;
  }

  async updateCardContent(ownerId: string, cardId: string, front: string, back: string): Promise<Card | null> {
    await this.pool.query('UPDATE cards SET front = ?, back = ?, edited = 1 WHERE owner_id = ? AND id = ?', [front, back, ownerId, cardId]);
    return this.getCard(ownerId, cardId);
  }

  async deleteCard(ownerId: string, cardId: string): Promise<void> {
    await this.pool.query('DELETE FROM cards WHERE owner_id = ? AND id = ?', [ownerId, cardId]);
  }

  async recordStudyResult(ownerId: string, cardId: string, correct: boolean): Promise<Card | null> {
    const col = correct ? 'times_correct = times_correct + 1' : 'times_wrong = times_wrong + 1';
    await this.pool.query(`UPDATE cards SET ${col} WHERE owner_id = ? AND id = ?`, [ownerId, cardId]);
    return this.getCard(ownerId, cardId);
  }

  async getStats(ownerId: string) {
    const [countsRows]: any = await this.pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
        COUNT(CASE WHEN status = 'discarded' THEN 1 END) as discarded,
        COUNT(*) as total,
        COALESCE(SUM(times_correct), 0) as total_correct,
        COALESCE(SUM(times_wrong), 0) as total_wrong
      FROM cards
      WHERE owner_id = ?
    `, [ownerId]);

    const row = countsRows[0] || {};
    const totalCorrect = parseInt(row.total_correct || '0', 10);
    const totalWrong = parseInt(row.total_wrong || '0', 10);
    const totalAnswers = totalCorrect + totalWrong;
    const percentage = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

    const [mostMissedRows]: any = await this.pool.query(`
      SELECT c.*, p.position as passage_position, s.title as source_title
      FROM cards c
      JOIN passages p ON c.passage_id = p.id
      JOIN sources s ON p.source_id = s.id
      WHERE c.owner_id = ? AND c.status = 'approved' AND c.times_wrong > 0
      ORDER BY c.times_wrong DESC
      LIMIT 5
    `, [ownerId]);

    return {
      counts: {
        approved: parseInt(row.approved || '0', 10),
        draft: parseInt(row.draft || '0', 10),
        discarded: parseInt(row.discarded || '0', 10),
        total: parseInt(row.total || '0', 10)
      },
      quizAccuracy: {
        totalAnswers,
        correctAnswers: totalCorrect,
        percentage
      },
      mostMissedCards: mostMissedRows.map((r: any) => ({
        ...r,
        edited: !!r.edited,
        created_at: new Date(r.created_at).toISOString(),
        approved_at: r.approved_at ? new Date(r.approved_at).toISOString() : null
      }))
    };
  }
}

// Database singleton factory
let dbInstance: DBInterface | null = null;

export async function getDatabase(): Promise<DBInterface> {
  if (dbInstance) return dbInstance;

  // 1. MySQL Priority
  if (process.env.MYSQL_DATABASE || process.env.MYSQL_USER) {
    try {
      console.log('[Database] Initializing MySQL connection (study_hard)...');
      const mySqlDb = new MySQLDB({
        host: process.env.MYSQL_HOST || 'localhost',
        port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT, 10) : 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'study_hard'
      });
      await mySqlDb.init();
      dbInstance = mySqlDb;
      return dbInstance;
    } catch (err) {
      console.warn('[Database] Failed to initialize MySQL, falling back:', err);
    }
  }

  // 2. PostgreSQL
  const dbUrl = process.env.DATABASE_URL || process.env.PGDATABASE;
  if (dbUrl) {
    try {
      console.log('[Database] Initializing PostgreSQL connection...');
      const pgDb = new PostgresDB(dbUrl);
      await pgDb.init();
      dbInstance = pgDb;
      return dbInstance;
    } catch (err) {
      console.warn('[Database] Failed to initialize PostgreSQL, falling back to local file storage:', err);
    }
  }

  // 3. Fallback to resilient local JSON store
  const storageDir = path.resolve(process.cwd(), 'server', 'data');
  const localDb = new LocalJsonDB(storageDir);
  await localDb.init();
  dbInstance = localDb;
  return dbInstance;
}

