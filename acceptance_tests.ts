import dotenv from 'dotenv';
dotenv.config();

import { splitIntoPassages } from './server/services/passageSplitter.js';
import { verifyQuoteInPassage, isNearDuplicate, normalizeText } from './server/services/verifier.js';
import { generateCardsForPassage } from './server/services/aiGenerator.js';
import { getDatabase } from './server/db/index.js';

async function runAcceptanceTests() {
  console.log('========================================================');
  console.log('   QUIET STUDY - FORMAL ACCEPTANCE VERIFICATION SUITE   ');
  console.log('========================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`[PASS] Test ${total}: ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] Test ${total}: ${testName}`);
      throw new Error(`Assertion failed for: ${testName}`);
    }
  }

  // Acceptance Test 1: A card whose quote is not found in its passage can NEVER be saved
  console.log('--- Acceptance Test 1: Quote Verification & Tamper Protection ---');
  const passageA = 'The Roman arch is an engineering triumph that diverts gravitational compressive loads downward into solid abutments.';
  const validQuote = 'The Roman arch is an engineering triumph that diverts gravitational compressive loads';
  const inventedQuote = 'The Roman arch was invented by Leonardo da Vinci in 1502';
  
  assert(verifyQuoteInPassage(validQuote, passageA) === true, 'Exact quote in passage is verified');
  assert(verifyQuoteInPassage(inventedQuote, passageA) === false, 'Invented/hallucinated quote is rejected');
  assert(verifyQuoteInPassage('“The Roman arch is an engineering triumph”', passageA) === true, 'Curly quotes vs straight quotes normalized');

  // Acceptance Test 2: Very short or irrelevant passage produces no cards
  console.log('\n--- Acceptance Test 2: Short / Irrelevant Passage Handling ---');
  const emptyPassage = '   ';
  const tinyPassage = 'Hello world.';
  const cardsFromEmpty = await generateCardsForPassage(emptyPassage);
  const cardsFromTiny = await generateCardsForPassage(tinyPassage);
  assert(cardsFromEmpty.length === 0, 'Empty passage produces 0 cards');
  assert(cardsFromTiny.length === 0, 'Passage under 25 chars produces 0 cards (no hallucinated cards)');

  // Acceptance Test 3 & 6: Data scoping by anonymous browser ID
  console.log('\n--- Acceptance Test 3 & 6: Private by Design & Session Persistence ---');
  const db = await getDatabase();
  const browserUser1 = 'browser_session_alpha_' + Date.now();
  const browserUser2 = 'browser_session_beta_incognito_' + Date.now();

  const src1 = await db.createSource(browserUser1, 'Alpha Notes', 'Active recall strengthens synapses.');
  const psg1 = await db.createPassages([{ id: '', source_id: src1.id, position: 1, text: 'Active recall strengthens synapses.' }]);
  const createdCard = (await db.createCards([{
    owner_id: browserUser1,
    passage_id: psg1[0].id,
    type: 'concept',
    front: 'What does active recall strengthen?',
    back: 'It strengthens synapses.',
    quote: 'Active recall strengthens synapses.',
    status: 'draft',
    edited: false,
    times_correct: 0,
    times_wrong: 0
  }]))[0];

  // User 2 sees an empty library
  const user2Cards = await db.getCards(browserUser2);
  assert(user2Cards.length === 0, 'Different browser / incognito window sees completely empty separate library');

  // Acceptance Test 4: Discarded cards never appear in approved library or quizzes
  console.log('\n--- Acceptance Test 4 & 5: Approval Gatekeeper & Discard Isolation ---');
  const approvedCardsInitial = await db.getCards(browserUser1, 'approved');
  assert(approvedCardsInitial.length === 0, 'Draft card is NOT in approved library before human approval');

  // Approve card
  await db.updateCardStatus(browserUser1, createdCard.id, 'approved');
  const approvedCardsAfter = await db.getCards(browserUser1, 'approved');
  assert(approvedCardsAfter.length === 1, 'Approved card enters library');
  assert(approvedCardsAfter[0].id === createdCard.id, 'Approved card ID matches exactly');

  // Discard card
  await db.updateCardStatus(browserUser1, createdCard.id, 'discarded');
  const approvedCardsAfterDiscard = await db.getCards(browserUser1, 'approved');
  assert(approvedCardsAfterDiscard.length === 0, 'Discarded card is removed from approved library');

  // Near duplicate prevention
  console.log('\n--- Acceptance Test Extra: Near-Duplicate Prevention ---');
  const existingFronts = ['What is Active Recall?'];
  assert(isNearDuplicate('What is active recall?', existingFronts) === true, 'Near-duplicate question is detected and suppressed');
  assert(isNearDuplicate('What is the citric acid cycle?', existingFronts) === false, 'Distinct question is permitted');

  // Acceptance Test 7: User Authentication & Seamless Anonymous Data Migration
  console.log('\n--- Acceptance Test 7: User Authentication & Anonymous Data Migration ---');
  const guestOwnerId = 'guest_temp_' + Date.now();
  const guestSource = await db.createSource(guestOwnerId, 'Guest Physics Note', 'Quantum entanglement occurs when pairs of particles interact.');
  const guestPassages = await db.createPassages([{ id: '', source_id: guestSource.id, position: 1, text: 'Quantum entanglement occurs when pairs of particles interact.' }]);
  await db.createCards([{
    owner_id: guestOwnerId,
    passage_id: guestPassages[0].id,
    type: 'concept',
    front: 'What is quantum entanglement?',
    back: 'It occurs when pairs of particles interact.',
    quote: 'Quantum entanglement occurs when pairs of particles interact.',
    status: 'draft',
    edited: false,
    times_correct: 0,
    times_wrong: 0
  }]);

  const guestInitialCards = await db.getCards(guestOwnerId);
  assert(guestInitialCards.length === 1, 'Guest created 1 card before signing up');

  // Create a user account
  const testEmail = `student_${Date.now()}@quietstudy.internal`;
  const newUser = await db.createUser(testEmail, 'hashed_secret_test_pw', 'Marie Curie');
  assert(newUser.email === testEmail, 'User created with correct email');
  assert(newUser.name === 'Marie Curie', 'User created with correct name');

  // Migrate guest data to registered user account
  const migrationResult = await db.migrateOwnerData(guestOwnerId, newUser.id);
  assert(migrationResult.sourcesCount === 1, 'Migrated 1 source from guest to user');
  assert(migrationResult.cardsCount === 1, 'Migrated 1 card from guest to user');

  // Verify user now owns the card, and guest has none
  const userCards = await db.getCards(newUser.id);
  const guestCardsAfter = await db.getCards(guestOwnerId);
  assert(userCards.length === 1, 'Registered user now owns the migrated card');
  assert(guestCardsAfter.length === 0, 'Guest owner ID has 0 cards left');
  assert(userCards[0].front === 'What is quantum entanglement?', 'Card content preserved exactly during migration');

  console.log('\n========================================================');
  console.log(`   ALL ${passed} / ${total} ACCEPTANCE TESTS VERIFIED & PASSED!   `);
  console.log('========================================================\n');
}

runAcceptanceTests().catch(e => {
  console.error('Acceptance tests encountered error:', e);
  process.exit(1);
});
