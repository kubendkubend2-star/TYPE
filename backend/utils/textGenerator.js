const PASSAGES = [
  "In the arena of competitive typing, speed is a weapon, but absolute precision is the shield that guards against defeat. Every keystroke must be deliberate, measured, and swift.",
  "The cybernetic terminal flared with neon cyan telemetry as millions of data packets surged through optical fiber highways. The grid stood ready for the next challenger to enter the battle.",
  "True mastery is achieved when fingers move effortlessly across the mechanical switches, translating thought directly into machine code without hesitation, error, or doubt.",
  "Across the infinite expanse of the digital cosmos, digital gladiators test their reflexes against human rivals and synthetic intelligences. Only the focused mind perseveres under pressure.",
  "Algorithms execute with relentless cadence, measuring each microsecond delay and every corrected typo. Under the blinding stadium lights, two combatants race toward the finish line.",
  "The quick brown fox jumps over the lazy dog while quantum computers simulate parallel universes where typing contests decide the destiny of empires and interstellar federations.",
  "Velocity without control yields chaos, whereas rhythm combined with discipline guarantees victory. Breathe steadily, lock your eyes onto the target text, and unleash pure velocity.",
  "Deep in the silicon sanctum, electric circuits pulse with relentless energy. Words ignite the screen as keystrokes echo across the empty gaming arena under starry skies."
];

function getRandomPassage() {
  const index = Math.floor(Math.random() * PASSAGES.length);
  return PASSAGES[index];
}

function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Unambiguous alphanumeric
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = {
  PASSAGES,
  getRandomPassage,
  generateRoomId
};
