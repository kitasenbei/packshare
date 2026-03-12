// Run in browser console — seeds everything into localStorage, no API needed

const ABBREV = "PMC";

// ── Players ──
const players = [
  { id: "pmc_1", name: "josiaxarg", seed: 1 },
  { id: "pmc_2", name: "Itz_cuy", seed: 2 },
  { id: "pmc_3", name: "Renzo241004", seed: 3 },
  { id: "pmc_4", name: "Momichi", seed: 4 },
  { id: "pmc_5", name: "zinkotripas", seed: 5 },
  { id: "pmc_6", name: "[Crz]RafaelPC", seed: 6 },
  { id: "pmc_7", name: "realninja234", seed: 7 },
  { id: "pmc_8", name: "- Croketa -", seed: 8 },
  { id: "pmc_9", name: "cSamu", seed: 9 },
  { id: "pmc_10", name: "Ma_thias", seed: 10 },
  { id: "pmc_11", name: "Sp3ctro", seed: 11 },
  { id: "pmc_12", name: "Blu26", seed: 12 },
  { id: "pmc_13", name: "Jxxx333", seed: 13 },
  { id: "pmc_14", name: "SaturnoXD", seed: 14 },
  { id: "pmc_15", name: "eduOvr4", seed: 15 },
  { id: "pmc_16", name: "[ Defuu- ]", seed: 16 },
  { id: "pmc_17", name: "aduxce2", seed: 17 },
  { id: "pmc_18", name: "leblack12123", seed: 18 },
  { id: "pmc_19", name: "ERA Kaeseorin", seed: 19 },
  { id: "pmc_20", name: "Fenixpro980", seed: 20 },
  { id: "pmc_21", name: "Mati2312_OsuXD", seed: 21 },
  { id: "pmc_22", name: "zikashi", seed: 22 },
  { id: "pmc_23", name: "m4ton789", seed: 23 },
  { id: "pmc_24", name: "sannkc", seed: 24 },
  { id: "pmc_25", name: "GMbenjamin", seed: 25 },
  { id: "pmc_26", name: "Ratainm45", seed: 26 },
  { id: "pmc_27", name: "VircTux", seed: 27 },
  { id: "pmc_28", name: "capybaraxd", seed: 28 },
  { id: "pmc_29", name: "Desinias", seed: 29 },
  { id: "pmc_30", name: "kiloymedio", seed: 30 },
  { id: "pmc_31", name: "Maloenlosjuegos", seed: 31 },
  { id: "pmc_32", name: "mat 126", seed: 32 },
];

localStorage.setItem(`packshare_bracket_${ABBREV}`, JSON.stringify({
  players, matches: [], bestOf: 7, generated: false,
}));
console.log(`Seeded ${players.length} players. Refresh the page.`);
