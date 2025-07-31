// api/pick-winner.js

export function pickOneWinner(allTokenIds) {
  if (allTokenIds.length < 1) {
    throw new Error('Keine Token verfügbar!');
  }

  const randomIndex = Math.floor(Math.random() * allTokenIds.length);
  return allTokenIds[randomIndex];
}
