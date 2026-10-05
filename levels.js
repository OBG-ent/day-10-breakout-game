/* =========================================================================
 * LEVELS — each level is a grid of characters.
 *   .  = empty space
 *   B  = blue brick    (1 hit, 10 pts)
 *   G  = green brick   (1 hit, 10 pts)
 *   Y  = yellow brick  (1 hit, 20 pts)
 *   P  = pink brick    (1 hit, 20 pts)
 *   O  = orange brick  (2 hits, 40 pts — cracks after the first hit)
 *   R  = red brick     (2 hits, 60 pts)
 * Some brick types can drop power-ups when destroyed (see POWERUP_CHANCE).
 * ========================================================================= */

const LEVELS = [
  {
    name: "Warm-up",
    rows: [
      "............",
      ".BBBBBBBBBB.",
      ".GGGGGGGGGG.",
      ".YYYYYYYYYY.",
      ".PPPPPPPPPP.",
    ],
  },
  {
    name: "The Diamond",
    rows: [
      ".....BB.....",
      "....BGGB....",
      "...BGYYGB...",
      "..BGYPPPYGB.",
      "...BGYYGB...",
      "....BGGB....",
      ".....BB.....",
    ],
  },
  {
    name: "Fortress",
    rows: [
      "OOOOOOOOOOOO",
      "ORRRRRRRRRRO",
      "ORY......YRO",
      "ORY.BBBB.YRO",
      "ORY.BPPB.YRO",
      "ORY.BBBB.YRO",
      "ORY......YRO",
      "ORRRRRRRRRRO",
    ],
  },
];

/* Which brick types can drop a power-up, and how likely it is (0–1). */
const POWERUP_CHANCE = { P: 0.5, Y: 0.3, O: 0.4, R: 0.5 };
