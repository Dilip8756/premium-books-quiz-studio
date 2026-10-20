import React from "react";
import {Composition} from "remotion";
import questions from "../data/questions.json";
import timingData from "../data/timings.json";
import shortData from "../data/short.json";
import shortAudio from "../data/short-audio.json";
import {PremiumBooksQuiz} from "./QuizVideo.jsx";
import {PremiumBooksShort, SHORT_FPS, SHORT_WIDTH, SHORT_HEIGHT} from "./ShortVideo.jsx";
import {buildShortTimeline} from "./shortTimeline.js";

const timings = timingData.timings || [];
const durationInFrames = timings.length === questions.length
  ? timings.reduce((sum, t) => sum + t.sceneFrames, 0)
  : 30 * 20 * questions.length;

export const RemotionRoot = () => (
  <>
    <Composition
      id="PremiumBooksQuiz"
      component={PremiumBooksQuiz}
      durationInFrames={durationInFrames}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{questions, timings, portrait:false}}
    />
    <Composition
      id="PremiumBooksQuizPortrait"
      component={PremiumBooksQuiz}
      durationInFrames={durationInFrames}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{questions, timings, portrait:true}}
    />
    <Composition
      id="PremiumBooksShort"
      component={PremiumBooksShort}
      durationInFrames={buildShortTimeline(shortAudio, shortData.ctaEnabled).totalFrames}
      fps={SHORT_FPS}
      width={SHORT_WIDTH}
      height={SHORT_HEIGHT}
      defaultProps={{...shortData, audio:shortAudio, preview:false}}
      calculateMetadata={({props}) => ({
        durationInFrames: buildShortTimeline(props.audio ?? shortAudio, props.ctaEnabled).totalFrames
      })}
    />
  </>
);
