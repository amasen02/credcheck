/**
 * Shannon entropy in bits per character. Used as a cheap randomness signal: a real generated
 * token ("k3F9x2Qm...") clusters around 4-6 bits/char, while low-entropy filler ("aaaaaaaa",
 * "your-key-here", "111111") sits well below 3.
 */
export function shannonEntropy(value: string): number {
  if (value.length === 0) {
    return 0;
  }

  const counts = new Map<string, number>();
  for (const char of value) {
    counts.set(char, (counts.get(char) ?? 0) + 1);
  }

  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}
