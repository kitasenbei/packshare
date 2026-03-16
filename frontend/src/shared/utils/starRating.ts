/** Returns a bg + text color class pair for osu!-style star rating coloring */
export function getStarRatingColor(sr: number): { bg: string; text: string } {
  if (sr < 2) return { bg: 'bg-[#88b300]', text: 'text-white' };       // Easy — green
  if (sr < 2.7) return { bg: 'bg-[#66ccff]', text: 'text-black' };     // Normal — cyan
  if (sr < 4) return { bg: 'bg-[#ffcc22]', text: 'text-black' };       // Hard — yellow
  if (sr < 5.3) return { bg: 'bg-[#ff66aa]', text: 'text-white' };     // Insane — pink
  if (sr < 6.5) return { bg: 'bg-[#8866ee]', text: 'text-white' };     // Expert — purple
  return { bg: 'bg-[#1a1a1a]', text: 'text-white' };                   // Expert+ — black
}
