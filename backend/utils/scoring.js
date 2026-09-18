/**
 * Standard competitive typing calculations
 */

function calculateWPM(correctChars, elapsedSeconds) {
  if (!elapsedSeconds || elapsedSeconds <= 0) return 0;
  const minutes = elapsedSeconds / 60;
  const words = correctChars / 5;
  return Math.max(0, Math.round(words / minutes));
}

function calculateAccuracy(correctChars, wrongChars) {
  const total = correctChars + wrongChars;
  if (total === 0) return 100;
  const acc = (correctChars / total) * 100;
  return Math.max(0, Math.min(100, Math.round(acc * 10) / 10));
}

function calculateScore({ correctChars = 0, wrongChars = 0, wpm = 0, accuracy = 100, progressPct = 0, isCompleted = false }) {
  // Speed component
  const speedPoints = wpm * 6;
  // Raw correct character volume
  const volumePoints = correctChars * 2;
  // Accuracy factor: (acc / 100)^2 gives exponential reward for high accuracy
  const accFactor = Math.pow(Math.max(0, Math.min(100, accuracy)) / 100, 1.8);
  // Penalty for excessive typos
  const typoPenalty = wrongChars * 8;
  // Bonus for reaching finish line
  const completionBonus = isCompleted ? 200 : Math.round(progressPct * 1.5);

  const rawScore = ((speedPoints + volumePoints) * accFactor) - typoPenalty + completionBonus;
  return Math.max(0, Math.round(rawScore));
}

/**
 * Determine winner between two players considering completion, accuracy, and score
 */
function determineWinner(p1, p2) {
  // If one completed and the other didn't
  if (p1.finished && !p2.finished) return 'player1';
  if (p2.finished && !p1.finished) return 'player2';

  // If both finished, the one with faster finishTime or higher score
  if (p1.finished && p2.finished) {
    if (p1.finishTime && p2.finishTime && Math.abs(p1.finishTime - p2.finishTime) > 0.5) {
      return p1.finishTime < p2.finishTime ? 'player1' : 'player2';
    }
    return p1.score >= p2.score ? 'player1' : 'player2';
  }

  // If neither finished, compare score then progress then accuracy
  if (p1.score !== p2.score) {
    return p1.score > p2.score ? 'player1' : 'player2';
  }
  if (p1.progress !== p2.progress) {
    return p1.progress > p2.progress ? 'player1' : 'player2';
  }
  return p1.accuracy >= p2.accuracy ? 'player1' : 'player2';
}

module.exports = {
  calculateWPM,
  calculateAccuracy,
  calculateScore,
  determineWinner
};
