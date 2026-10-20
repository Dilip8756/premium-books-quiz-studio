import fs from "node:fs";
import path from "node:path";

const questions = JSON.parse(fs.readFileSync("data/questions.json", "utf8"));
const props = JSON.parse(fs.readFileSync("data/render-props.json", "utf8"));
if (!Array.isArray(props.timings) || props.timings.length !== questions.length) {
  throw new Error("render-props.json timings do not match questions.json. Run generate_tts.py locally.");
}

for (let i = 0; i < questions.length; i += 1) {
  const base = `q${String(i + 1).padStart(3, "0")}`;
  for (const suffix of ["question", "explanation"]) {
    const file = path.join("public", "audio", `${base}-${suffix}.mp3`);
    if (!fs.existsSync(file)) throw new Error(`Missing narration file: ${file}`);
  }
  const timing = props.timings[i];
  if (!(Number(timing.questionFrames) > 0) || !(Number(timing.explanationFrames) > 0) || !(Number(timing.sceneFrames) > 0)) {
    throw new Error(`Question ${i + 1}: invalid dynamic timing values.`);
  }
}

console.log(`PASS: ${questions.length} questions, dynamic timings and narration files are ready.`);
