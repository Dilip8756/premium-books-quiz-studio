export const SHORT_FPS = 30;
export const SHORT_WIDTH = 1080;
export const SHORT_HEIGHT = 1920;
export const SHORT_COUNTDOWN_FRAMES = 90;

const HOOK_TAIL_FRAMES = 18;
const QUESTION_GAP_FRAMES = 6;
const QUESTION_TAIL_FRAMES = 12;
const ANSWERS_LEAD_FRAMES = 6;
const ANSWERS_TAIL_FRAMES = 24;
const CTA_TAIL_FRAMES = 24;

const FALLBACK_SECONDS = {
  hook: 3,
  question: 14,
  answers: 11,
  cta: 8
};

const framesForSeconds = (seconds) => Math.max(1, Math.ceil(seconds * SHORT_FPS));

const normalizeToken = (value) => String(value || "")
  .replace(/[।.,!?;:—–\-"'“”‘’()]/g, "")
  .replace(/\s+/g, " ")
  .trim();

const wordsToFrames = (words) => (Array.isArray(words) ? words : [])
  .map((word) => ({
    text: String(word.text || ""),
    from: Math.max(0, Math.round(Number(word.start || 0) * SHORT_FPS)),
    to: Math.max(1, Math.round(Number(word.end || word.start || 0) * SHORT_FPS))
  }))
  .filter((word) => word.to > word.from);

const optionFallbackFrame = (index, speechFrames) =>
  Math.max(6, Math.round(speechFrames * [0.32, 0.48, 0.64, 0.8][index]));

const findOptionStarts = (words, speechFrames) => {
  const markers = [];
  words.forEach((word, index) => {
    if (normalizeToken(word.text).includes("विकल्प")) markers.push(index);
  });
  const starts = [];
  for (let optionIndex = 0; optionIndex < 4; optionIndex += 1) {
    const markerIndex = markers[optionIndex];
    if (markerIndex === undefined) {
      starts.push(optionFallbackFrame(optionIndex, speechFrames));
      continue;
    }
    let cursor = markerIndex + 1;
    if (/^[abcd]$/i.test(normalizeToken(words[cursor]?.text))) cursor += 1;
    const startWord = words[cursor] || words[markerIndex];
    starts.push(Math.max(4, Math.round(startWord.start * SHORT_FPS)));
  }
  return starts;
};

const findAnswerStarts = (words, speechFrames) => {
  const markers = ["पहला", "दूसरा", "तीसरा"];
  let searchFrom = 0;
  return markers.map((marker, index) => {
    let found = -1;
    for (let i = searchFrom; i < words.length; i += 1) {
      if (normalizeToken(words[i].text).startsWith(marker)) {
        found = i;
        break;
      }
    }
    if (found < 0) return Math.round(speechFrames * [0.14, 0.44, 0.74][index]);
    let cursor = found + 1;
    if (normalizeToken(words[cursor]?.text) === "जवाब") cursor += 1;
    const startWord = words[cursor] || words[found];
    searchFrom = cursor + 1;
    return Math.max(2, Math.round(startWord.start * SHORT_FPS));
  });
};

const clipData = (clip, fallbackSeconds) => {
  const seconds = Number(clip?.seconds) > 0 ? Number(clip.seconds) : fallbackSeconds;
  return {
    clip: clip || null,
    seconds,
    speechFrames: framesForSeconds(seconds),
    words: Array.isArray(clip?.words) ? clip.words : []
  };
};

export const buildShortTimeline = (audio, ctaEnabled = true) => {
  const clips = audio?.clips || {};
  const hook = clipData(clips.hook, FALLBACK_SECONDS.hook);
  const questionClips = [0, 1, 2].map((index) =>
    clipData(clips[`q${index + 1}`], FALLBACK_SECONDS.question));
  const answers = clipData(clips.answers, FALLBACK_SECONDS.answers);
  const cta = clipData(clips.cta, FALLBACK_SECONDS.cta);

  let cursor = 0;

  const hookScene = {
    ...hook,
    from: 0,
    sceneFrames: hook.speechFrames + HOOK_TAIL_FRAMES,
    speechWords: wordsToFrames(hook.words)
  };
  cursor += hookScene.sceneFrames;

  const questionScenes = questionClips.map((entry, index) => {
    const countdownFrom = entry.speechFrames + QUESTION_GAP_FRAMES;
    const scene = {
      ...entry,
      index,
      from: cursor,
      countdownFrom,
      optionStarts: findOptionStarts(entry.words, entry.speechFrames),
      speechWords: wordsToFrames(entry.words),
      sceneFrames: countdownFrom + SHORT_COUNTDOWN_FRAMES + QUESTION_TAIL_FRAMES
    };
    cursor += scene.sceneFrames;
    return scene;
  });

  const answersScene = {
    ...answers,
    from: cursor,
    leadFrames: ANSWERS_LEAD_FRAMES,
    answerStarts: findAnswerStarts(answers.words, answers.speechFrames),
    speechWords: wordsToFrames(answers.words),
    sceneFrames: ANSWERS_LEAD_FRAMES + answers.speechFrames + ANSWERS_TAIL_FRAMES
  };
  cursor += answersScene.sceneFrames;

  const ctaScene = ctaEnabled === false ? null : {
    ...cta,
    from: cursor,
    speechWords: wordsToFrames(cta.words),
    sceneFrames: cta.speechFrames + CTA_TAIL_FRAMES
  };
  if (ctaScene) cursor += ctaScene.sceneFrames;

  return {
    fps: SHORT_FPS,
    hook: hookScene,
    questions: questionScenes,
    answers: answersScene,
    cta: ctaScene,
    totalFrames: cursor
  };
};

export const formatShortTime = (frames) => {
  const totalSeconds = Math.max(0, Math.round(frames / SHORT_FPS));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};
