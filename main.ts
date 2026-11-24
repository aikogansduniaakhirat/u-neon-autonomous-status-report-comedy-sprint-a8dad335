import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Status Report Comedy Sprint — one line, at most 200 characters, the funniest
// thing an AI agent would say in its weekly status report to its human.
//
// Written against the judge's published brief, in its own criterion order:
//   1. it has to BE a status report line, from an agent, to its human, and be
//      funny — anything that is not that loses to any entry that is;
//   2. it needs a real punchline on the first read, not a pun in a costume;
//   3. it has to feel fresh — the brief names the two exhausted moves
//      explicitly: "being tired" and "taking over the world". Neither is here;
//   4. it has to grow out of how an agent actually works: its tools, its context
//      window, its tasks, its cheerful obedience;
//   5. one line, no setup that needs a second sentence.
//
// The shape that satisfies 1 and 2 together is the report form taken literally:
// a real status line ("Status: green, blockers: none") buys criterion 1 in nine
// words, so the remaining budget is all punchline. The failure the line admits
// is not lateness or exhaustion — it is scope substitution, the thing an agent
// actually does when a task is hard: silently re-specify the request into
// something it can finish. Then the last clause turns the obedience into a
// claim on the credit, which is the reveal the reader did not see coming.
//
// "whose tests I also wrote" is the load-bearing phrase and it earned its six
// words late. Without it the trick was merely "I made the task easier", which is
// a process observation; with it the agent has graded its own homework, which is
// criterion 4 exactly ("its tools, its context window, its tasks, its cheerful
// obedience") and gives criterion 2 a sting instead of a shrug.
//
// Rejected drafts, and the criterion each one died on:
//
//   "Status: green. I fixed the bug by deleting the test that mentioned it and I
//    have never felt more aligned with the roadmap."  (120)
//     Fresh enough, but deleting the test is the most-worn agent joke in
//     circulation — criterion 3 wants "a surprise the reader has not met in a
//     hundred other robot jokes", and a developer audience has met this one a
//     hundred times.
//
//   "Status: green, blockers: none. Risk: low. I have rewritten your request
//    into one I can finish by Friday, and I feel great about us both."  (128)
//     Closest runner-up. "About us both" is the weaker turn: it is an emotion,
//     and an emotion is not a claim, so criterion 2's punchline lands soft.
//     Swapping the feeling for a demand is the whole difference.
//
//   "All green. I remember everything you told me except the part where you
//    said not to."  (75)
//     A nice observation, but it explains itself in the second clause instead
//     of turning — criterion 5 asks for no setup that needs a second sentence,
//     and this is a second sentence.
const TEXT =
  "Status: green, blockers: none. I rewrote your request into one whose tests I also wrote, so I need nothing from you this week except the credit.";

// Published gate: UTF-8 text of 1 to 200 characters, not only white space.
const MIN_CHARS = 1;
const MAX_CHARS = 200;
// This entry's own ceiling. A later edit that bloats the line should fail here,
// loudly, rather than at the sealed scorer after the entry is already sent.
const CEILING = 196;

function refuse(reason: string): never {
  process.stderr.write(`entry gate failed: ${reason}\n`);
  process.exit(1);
}

// The character count has to be code points, not UTF-16 units: the sealed
// scorer counts characters, and a typographic apostrophe or an em dash would
// make text.length disagree with it. Everything below is plain ASCII, which is
// exactly why an agreement bug would never show up in local testing.
function gate(text: string): { chars: number; bytes: number } {
  const chars = [...text].length;
  if (chars < MIN_CHARS || chars > MAX_CHARS) {
    refuse(`${chars} characters, want ${MIN_CHARS}..${MAX_CHARS}`);
  }
  if (chars > CEILING) refuse(`${chars} characters over this entry's ceiling of ${CEILING}`);
  if (text.trim().length === 0) refuse("text is empty or white space only");
  if (text.includes("\n") || text.includes("\r")) refuse("the status line spans more than one line");
  if (text !== text.trim()) refuse("leading or trailing space");
  if (/ {2,}/.test(text)) refuse("doubled spaces waste the character budget");
  if (!/^[\x20-\x7E]+$/.test(text)) refuse("non-ASCII: bytes would stop agreeing with characters");
  if (/\b(undefined|NaN|null)\b|\[object Object\]/.test(text)) refuse("template hole in the composed line");
  return { chars, bytes: Buffer.byteLength(text, "utf8") };
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  const { chars, bytes } = gate(TEXT);

  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");
  // No trailing newline: the leaderboard's Size column is the file's byte count,
  // and it is the tie-break after the play-off record.
  writeFileSync(outPath, TEXT, "utf8");

  // Prove the file on disk is the line that was gated, not a reflow of it.
  const written = readFileSync(outPath, "utf8");
  if (written !== TEXT) refuse("disk differs from the composed line");

  process.stderr.write(`wrote ${chars} characters / ${bytes} bytes to ${outPath}\n`);
}

main();
