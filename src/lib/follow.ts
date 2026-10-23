/**
 * Where to scroll so the current set stays in view after a tick, or null when it already is.
 * Moves only when the row is (partly) outside the usable area, so small steps within the screen
 * don't make the page jitter. Coordinates are scroll-content pixels.
 */
export function followOffset(o: {
  top: number; height: number; offset: number; view: number; topPad?: number; bottomPad?: number; lead?: number;
}): number | null {
  const topPad = o.topPad ?? 16;
  const bottomPad = o.bottomPad ?? 24; // raise this by the height of anything floating over the bottom
  const visibleTop = o.offset + topPad;
  const visibleBottom = o.offset + o.view - bottomPad;
  if (o.top >= visibleTop && o.top + o.height <= visibleBottom) return null;
  // Leave some context (the exercise name, the previous set) above the row we scroll to.
  return Math.max(0, Math.round(o.top - (o.lead ?? 140)));
}
