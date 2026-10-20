import {appendFileSync, readFileSync} from "node:fs";

const requested = Number(process.argv[2] || 16);
if (!Number.isInteger(requested)) {
  throw new Error("Shard count must be an integer.");
}
const props = JSON.parse(readFileSync(new URL("../data/render-props.json", import.meta.url), "utf8"));
if (!Array.isArray(props.timings) || props.timings.length === 0) {
  throw new Error("render-props.json has no timings. Run generate_tts.py first.");
}
const totalFrames = props.timings.reduce((sum, timing) => sum + Number(timing.sceneFrames || 0), 0);
if (!Number.isInteger(totalFrames) || totalFrames <= 0) {
  throw new Error(`Invalid total frame count: ${totalFrames}`);
}
const fps = 30;
const shardCount = Math.min(16, Math.max(2, requested));
const framesPerShard = Math.ceil(totalFrames / shardCount);
const shards = [];

for (let index = 0; index < shardCount; index += 1) {
  const start = index * framesPerShard;
  if (start >= totalFrames) break;
  shards.push({
    index,
    start,
    end: Math.min(totalFrames - 1, start + framesPerShard - 1)
  });
}

const plan = {
  fps,
  totalFrames,
  durationSeconds: Number((totalFrames / fps).toFixed(3)),
  shardCount: shards.length,
  shards
};
if (process.env.GITHUB_OUTPUT) {
  const output = `matrix=${JSON.stringify(shards)}\ntotal_frames=${totalFrames}\nfps=${fps}\nduration_seconds=${plan.durationSeconds}\n`;
  appendFileSync(process.env.GITHUB_OUTPUT, output);
}
console.log(JSON.stringify(plan, null, 2));
