function parseHex(hex: string): [number, number, number] {
  const s = hex.replace('#', '');
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

function channelToHex(value: number): string {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0');
}

/** Mix two hex colors; `weight` is the fraction of `withColor` (0–1). */
export function mixHex(color: string, withColor: string, weight: number): string {
  const [r1, g1, b1] = parseHex(color);
  const [r2, g2, b2] = parseHex(withColor);
  const w = Math.max(0, Math.min(1, weight));
  const r = Math.round(r1 * (1 - w) + r2 * w);
  const g = Math.round(g1 * (1 - w) + g2 * w);
  const b = Math.round(b1 * (1 - w) + b2 * w);
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
}
