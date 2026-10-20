import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const questionsPath = path.join(root, "data", "questions.json");
const questions = JSON.parse(fs.readFileSync(questionsPath, "utf8"));
if (!Array.isArray(questions) || questions.length === 0) throw new Error("questions.json must contain a non-empty array.");

for (const [i, q] of questions.entries()) {
  if (!q.question || typeof q.question !== "string") throw new Error(`Question ${i+1}: question text missing.`);
  if (!Array.isArray(q.options) || q.options.length !== 4) throw new Error(`Question ${i+1}: exactly 4 options required.`);
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) throw new Error(`Question ${i+1}: answer must be option index 0-3.`);
  if (!q.explanation || typeof q.explanation !== "string") console.warn(`Warning: Question ${i+1} has no explanation.`);
}
console.log(`PASS: ${questions.length} questions; each has 4 options and a valid answer index.`);
console.log("Run npm run render to generate TTS, measure each clip, and create dynamic timings before rendering.");
