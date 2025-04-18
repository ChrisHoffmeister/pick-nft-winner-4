// api/pick-winner.js
export function pickWinners(allTokenIds, numberOfWinners) {
  if (allTokenIds.length < numberOfWinners) {
    throw new Error('Nicht genug Token zum Auswählen!');
  }

  const shuffled = [...allTokenIds].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, numberOfWinners);
}
