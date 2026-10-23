/** "chest" -> "Chest". Library names for muscles, equipment and levels are stored lowercase. */
export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
