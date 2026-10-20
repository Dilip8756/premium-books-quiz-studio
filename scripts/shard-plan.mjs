import {appendFileSync, readFileSync} from "node:fs";
import {buildShortTimeline} from "../src/shortTimeline.js";

const requested = Number(process.argv[2] || 8);
if (!Number.isInteger(requested)) {
  throw new Error("Shard count must be an integer.");
}
const shardCount = Math.min(16, Math.max(2, requested));
const props = JSON.parse(readFileSync(new URL("../data/short-props.json", import.meta.url), "utf8"));
const timeline = buildShortTimeline(props.audio, props.ctaEnabled);
const totalFrames = timeline.totalFrames;
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

const plan = {fps: timeline.fps, totalFrames, shardCount: shards.length, shards};
if (process.env.GITHUB_OUTPUT) {
  const output = `matrix=${JSON.stringify(shards)}\ntotal_frames=${totalFrames}\nfps=${timeline.fps}\n`;
  appendFileSync(process.env.GITHUB_OUTPUT, output);
}
console.log(JSON.stringify(plan));
