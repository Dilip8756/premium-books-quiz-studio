import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  Video,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from "remotion";
import {DivineMindMascot} from "./DivineMindMascot.jsx";

const C = {
  navy: "#0d2140",
  gold: "#f6c44b",
  cyan: "#42d7ec",
  white: "#f7faff",
  muted: "#adbed5",
  green: "#22c875",
  greenBorder: "#42f59b",
  red: "#fb7185"
};
const DEVANAGARI_RANGE = "U+0900-097F,U+1CD0-1CF4,U+1CF7-1CF9,U+200C-200D,U+20A8,U+20B9,U+20F0,U+25CC,U+A830-A839,U+A8E0-A8FF,U+11B00-11B0A";
const LATIN_RANGE = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";

const MuktaFont = () => {
  const [handle] = React.useState(() => delayRender("Loading Mukta font"));
  React.useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) {
      continueRender(handle);
      return;
    }
    Promise.all(
      [400, 600, 700, 800, 900].map((weight) =>
        document.fonts.load(`${weight} 48px Mukta`, "अ आ क PREMIUM BOOKS 1950")
      )
    ).then(() => continueRender(handle)).catch(() => continueRender(handle));
  }, [handle]);
  return null;
};

const muktaCss = () => {
  const faces = [400, 600, 700, 800].flatMap((weight) => [
    {weight, file: `fonts/Mukta-${weight}-devanagari.woff2`, range: DEVANAGARI_RANGE},
    {weight, file: `fonts/Mukta-${weight}-latin.woff2`, range: LATIN_RANGE}
  ]);
  return [
    ...faces,
    {weight: 900, file: "fonts/Mukta-800-devanagari.woff2", range: DEVANAGARI_RANGE},
    {weight: 900, file: "fonts/Mukta-800-latin.woff2", range: LATIN_RANGE}
  ].map(({weight, file, range}) =>
    `@font-face{font-family:'Mukta';font-style:normal;font-weight:${weight};font-display:block;src:url('${staticFile(file)}') format('woff2');unicode-range:${range};}`
  ).join("");
};

const FONT = "'Mukta','Nirmala UI','Mangal','Noto Sans Devanagari','Segoe UI',sans-serif";
const LETTERS = ["A", "B", "C", "D"];

const SIZES = {
  landscape: {
    brand: 25,
    logo: 58,
    logoFont: 37,
    logoRadius: 13,
    brandGap: 13,
    series: 13,
    seriesTop: 4,
    pill: 14,
    pillPad: "8px 15px",
    qtag: 14,
    qtagGap: 10,
    question: 40,
    questionMin: 27,
    opt: 25,
    optMin: 18,
    letter: 48,
    letterFont: 22,
    letterRadius: 12,
    statusLabel: 15,
    statusText: 23,
    statusTextMin: 16,
    explanation: 15,
    explanationMin: 12,
    timer: 82,
    timerFont: 42,
    timerBorder: 4,
    bottom: 13
  },
  portrait: {
    brand: 18,
    logo: 42,
    logoFont: 22,
    logoRadius: 9,
    brandGap: 7,
    series: 9,
    seriesTop: 3,
    pill: 10,
    pillPad: "5px 8px",
    qtag: 11,
    qtagGap: 6,
    question: 25,
    questionMin: 17,
    opt: 18,
    optMin: 13,
    letter: 34,
    letterFont: 17,
    letterRadius: 8,
    statusLabel: 11,
    statusText: 16,
    statusTextMin: 12,
    explanation: 11,
    explanationMin: 9,
    timer: 55,
    timerFont: 29,
    timerBorder: 3,
    bottom: 9
  }
};

const fitFont = (text, base, min, threshold, divisor) =>
  Math.max(min, base - Math.max(0, String(text || "").length - threshold) / divisor);

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"};

const GradientBorder = ({active, frame, radius, thickness = 2}) => {
  const position = 50 + Math.sin((frame / 96) * Math.PI * 2) * 50;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: radius,
        padding: thickness,
        background:
          "linear-gradient(105deg,#42d7ec 0%,#7c5cff 22%,#ff5f9e 45%,#f6c44b 66%,#42d7ec 88%,#7c5cff 100%)",
        backgroundSize: "260% 100%",
        backgroundPosition: `${position}% 50%`,
        opacity: active ? 1 : 0,
        pointerEvents: "none",
        WebkitMask: "linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude"
      }}
    />
  );
};

const QuestionScene = ({
  q,
  index,
  totalQuestions,
  questionFrames,
  pauseFrames,
  explanationFrames,
  sceneFrames,
  startFrame,
  portrait,
  preview
}) => {
  const local = useCurrentFrame();
  const {fps} = useVideoConfig();
  const size = SIZES[portrait ? "portrait" : "landscape"];
  const start = Number(startFrame) || 0;
  const frames = start + local;
  const revealAt = questionFrames + pauseFrames;
  const answerIndex = Number.isInteger(q.answer) ? Math.max(0, Math.min(3, q.answer)) : 0;
  const correctOption = (q.options || [])[answerIndex] || "";
  const explanation = q.explanation || "इस उत्तर का संक्षिप्त विवरण उपलब्ध नहीं है।";
  const category = q.category || "QUIZ";
  const inQuestion = local < questionFrames;
  const inPause = pauseFrames > 0 && local >= questionFrames && local < revealAt;
  const revealed = local >= revealAt;
  const finished = local >= revealAt + explanationFrames && sceneFrames > revealAt + explanationFrames;
  const speaking = local < questionFrames || (local >= revealAt && local < revealAt + explanationFrames);

  const entry = interpolate(local, [0, 22], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const settle = inPause
    ? interpolate(local, [questionFrames, questionFrames + 5, questionFrames + 13], [0, 1, 0.6], clamp)
    : 0;
  const cardBrightness = 1 - 0.1 * settle;

  const pauseElapsed = Math.max(0, local - questionFrames);
  const segment = Math.max(1, pauseFrames / 3);
  const countdownNumber = Math.max(1, 3 - Math.min(2, Math.floor(pauseElapsed / segment)));
  const timerProgress = inPause ? (pauseElapsed % segment) / segment : 0;
  const answerPop = revealed
    ? interpolate(local, [revealAt, revealAt + 9, revealAt + 22], [0, 1, 0], clamp)
    : 0;
  const timerText = revealed ? "✓" : inPause ? String(countdownNumber) : "3";
  const timerBright = inPause || revealed;

  const statusLabel = finished
    ? `प्रश्न ${index + 1}/${totalQuestions} पूरा हुआ`
    : revealed
      ? "सही जवाब है"
      : inPause
        ? "सोचिए…"
        : `प्रश्न ${index + 1}/${totalQuestions} · सवाल और विकल्प`;
  const statusText = finished
    ? index + 1 < totalQuestions
      ? "अगला सवाल शुरू होगा…"
      : `सभी ${totalQuestions} प्रश्न पूरे हुए! Premium Books के साथ अभ्यास जारी रखें।`
    : revealed
      ? `${LETTERS[answerIndex]} — ${correctOption}`
      : inPause
        ? "जल्दी जवाब चुनें!"
        : q.question;
  const footerPhase = finished
    ? index + 1 < totalQuestions
      ? "NEXT QUESTION"
      : `${totalQuestions}/${totalQuestions} · COMPLETE`
    : revealed
      ? "ANSWER REVEAL"
      : inPause
        ? "COUNTDOWN · उत्तर अभी नहीं दिखेगा"
        : "QUESTION + OPTIONS";

  const questionFont = fitFont(
    q.question,
    size.question,
    size.questionMin,
    portrait ? 42 : 62,
    portrait ? 2.1 : 4.6
  );
  const statusFont = fitFont(statusText, size.statusText, size.statusTextMin, portrait ? 34 : 54, portrait ? 1.6 : 3.4);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background:
          "radial-gradient(ellipse at 19% 26%,#193c63 0,#0d2140 36%,#08162c 72%,#050e1c 100%)",
        color: C.white,
        fontFamily: FONT
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(125deg,rgba(49,197,220,.06),transparent 40%,rgba(246,196,75,.04))",
          pointerEvents: "none"
        }}
      />

      <header
        style={{
          position: "absolute",
          top: portrait ? "2.5%" : "3.5%",
          left: portrait ? "4%" : "3.2%",
          right: portrait ? "4%" : "3.2%",
          height: portrait ? "8%" : "12%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(123,164,197,.23)",
          gap: 12
        }}
      >
        <div style={{display: "flex", gap: size.brandGap, alignItems: "center", minWidth: 0}}>
          <div
            style={{
              width: size.logo,
              height: size.logo,
              flex: "0 0 auto",
              aspectRatio: "1",
              borderRadius: size.logoRadius,
              background: "linear-gradient(145deg,#f9d974,#c98c18)",
              display: "grid",
              placeItems: "center",
              color: "#12213a",
              fontSize: size.logoFont,
              fontWeight: 900,
              boxShadow: "0 4px 18px rgba(237,187,71,.33)"
            }}
          >
            PB
          </div>
          <div style={{minWidth: 0}}>
            <div
              style={{
                fontSize: size.brand,
                fontWeight: 900,
                letterSpacing: .3,
                lineHeight: 1.08,
                whiteSpace: "nowrap"
              }}
            >
              PREMIUM BOOKS
            </div>
            <div
              style={{
                fontSize: size.series,
                color: "#b6c9df",
                letterSpacing: portrait ? .25 : 1,
                marginTop: size.seriesTop,
                whiteSpace: "nowrap"
              }}
            >
              UPPSC • PSC • SSC • RAILWAY • UP POLICE • BPSC
            </div>
          </div>
        </div>
        <div
          style={{
            border: "1px solid rgba(246,196,75,.4)",
            background: "rgba(246,196,75,.08)",
            borderRadius: 999,
            padding: size.pillPad,
            color: "#ffda7a",
            fontSize: size.pill,
            fontWeight: 800,
            whiteSpace: "nowrap",
            flex: "0 0 auto"
          }}
        >
          GK QUIZ · हिंदी
        </div>
      </header>

      <main
        style={{
          position: "absolute",
          left: portrait ? "4%" : "3%",
          right: portrait ? "4%" : "3%",
          top: portrait ? "12%" : "18%",
          bottom: portrait ? "10%" : "13%",
          display: portrait ? "flex" : "grid",
          flexDirection: portrait ? "column" : undefined,
          gridTemplateColumns: portrait ? undefined : "35% 1fr",
          gap: portrait ? "1.5%" : "2.6%"
        }}
      >
        <section
          style={{
            position: "relative",
            border: "1px solid #4479a4",
            borderRadius: portrait ? 16 : 24,
            background: "linear-gradient(155deg,#07142b,#030914 74%)",
            overflow: "hidden",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            flex: portrait ? "none" : undefined,
            height: portrait ? "35%" : undefined,
            minHeight: 0
          }}
        >
          <Video
            src={staticFile("blue-neural-energy.mp4")}
            loop
            muted
            volume={0}
            startFrom={start % 108}
            style={{
              position: "absolute",
              zIndex: 0,
              left: "50%",
              top: portrait ? "41%" : "44%",
              width: portrait ? "118%" : "112%",
              maxWidth: portrait ? 440 : 520,
              aspectRatio: "4 / 3",
              height: "auto",
              transform: "translate(-50%,-50%)",
              objectFit: "contain",
              opacity: .72,
              mixBlendMode: "screen",
              pointerEvents: "none",
              filter: "blur(.25px) saturate(.82)"
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse at 50% 32%,rgba(57,122,181,.33),transparent 52%),linear-gradient(180deg,rgba(25,63,99,0),rgba(3,16,31,.73))",
              pointerEvents: "none"
            }}
          />
          <DivineMindMascot
            frame={frames}
            speaking={speaking}
            portrait={portrait}
            idPrefix={`mind-${index}`}
          />
        </section>

        <section
          style={{
            position: "relative",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: portrait ? "2%" : "3%",
            flex: portrait ? 1 : undefined,
            minHeight: 0
          }}
        >
          <div
            style={{
              position: "relative",
              isolation: "isolate",
              overflow: "hidden",
              minHeight: portrait ? "22%" : "29%",
              border: "1px solid #4a7299",
              borderRadius: portrait ? 14 : 21,
              background: "linear-gradient(120deg,rgba(16,38,66,.96),rgba(10,23,41,.97))",
              padding: portrait ? "3.2%" : "3.1% 3.5%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              boxShadow: "inset 0 1px rgba(255,255,255,.045)",
              opacity: entry,
              transform: `scale(${(0.975 + 0.025 * entry) * (1 - 0.008 * settle)})`,
              filter: `blur(${5 * (1 - entry)}px) brightness(${cardBrightness})`
            }}
          >
            <GradientBorder
              active={inQuestion}
              frame={frames}
              radius={portrait ? 13 : 20}
              thickness={2}
            />
            <div
              style={{
                fontSize: size.qtag,
                color: C.cyan,
                letterSpacing: 1.3,
                fontWeight: 900,
                textTransform: "uppercase",
                marginBottom: size.qtagGap
              }}
            >
              प्रश्न {String(index + 1).padStart(2, "0")} · {category}
            </div>
            <div
              style={{
                fontWeight: 900,
                lineHeight: 1.28,
                fontSize: questionFont,
                letterSpacing: .1,
                overflowWrap: "anywhere"
              }}
            >
              {q.question}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows: "1fr 1fr",
              gap: portrait ? "2%" : "2.3%",
              flex: 1,
              minHeight: 0
            }}
          >
            {(q.options || ["", "", "", ""]).slice(0, 4).map((option, i) => {
              const optionStart = 3 + i * 2.4;
              const optionEntry = interpolate(local, [optionStart, optionStart + 18], [0, 1], {
                ...clamp,
                easing: Easing.out(Easing.cubic)
              });
              const optionSettle = inPause
                ? interpolate(local, [questionFrames + i, questionFrames + i + 11], [0, 1], clamp)
                : 0;
              const isCorrect = revealed && i === answerIndex;
              const isWrong = revealed && i !== answerIndex;
              const optionFont = fitFont(option, size.opt, size.optMin, portrait ? 28 : 42, portrait ? 1.7 : 5);
              return (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    isolation: "isolate",
                    overflow: "hidden",
                    border: `1px solid ${isCorrect ? C.greenBorder : "#46607e"}`,
                    background: isCorrect
                      ? "linear-gradient(100deg,#087f4f,#075b3d)"
                      : "linear-gradient(100deg,#13263f,#0c1a2d)",
                    borderRadius: portrait ? 11 : 17,
                    padding: portrait ? "4% 3%" : "2.6% 3.4%",
                    display: "flex",
                    gap: portrait ? "5%" : "3%",
                    alignItems: "center",
                    fontSize: optionFont,
                    fontWeight: 800,
                    color: isCorrect ? "#f3fff8" : C.white,
                    opacity: optionEntry * (isWrong ? 0.5 : 1),
                    transform: `translateY(${15 * (1 - optionEntry)}px) scale(${(0.975 + 0.025 * optionEntry) * (1 - 0.006 * optionSettle) * (1 + 0.018 * answerPop)})`,
                    filter: `blur(${3 * (1 - optionEntry)}px) brightness(${1 - 0.1 * optionSettle})`,
                    boxShadow: isCorrect ? "0 0 28px rgba(34,200,117,.33),inset 0 0 0 1px #7af7b8" : "none",
                    minWidth: 0
                  }}
                >
                  <div
                    style={{
                      width: size.letter,
                      height: size.letter,
                      flex: "0 0 auto",
                      borderRadius: size.letterRadius,
                      background: isCorrect ? C.green : "#1c3758",
                      border: `1px solid ${isCorrect ? "#78f0b8" : "#4e749d"}`,
                      display: "grid",
                      placeItems: "center",
                      color: isCorrect ? "#042115" : "#d8eaff",
                      fontSize: size.letterFont,
                      fontWeight: 900
                    }}
                  >
                    {LETTERS[i]}
                  </div>
                  <span style={{overflowWrap: "anywhere", minWidth: 0}}>{option}</span>
                </div>
              );
            })}
          </div>

          <div
            style={{
              border: "1px solid #385b7c",
              background: "rgba(7,22,41,.87)",
              borderRadius: portrait ? 11 : 15,
              padding: portrait ? "2.5%" : "1.4% 2%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              minHeight: portrait ? "13%" : "15%"
            }}
          >
            <div style={{minWidth: 0, flex: 1}}>
              <div style={{fontSize: size.statusLabel, color: "#a7bfd8"}}>{statusLabel}</div>
              <div style={{fontSize: statusFont, fontWeight: 900, lineHeight: 1.25, overflowWrap: "anywhere"}}>
                {statusText}
              </div>
              {revealed && !finished ? (
                <div
                  style={{
                    fontSize: size.explanation,
                    lineHeight: 1.3,
                    color: "#a7bfd8",
                    marginTop: portrait ? 3 : 4,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    overflowWrap: "anywhere"
                  }}
                >
                  {explanation}
                </div>
              ) : null}
            </div>
            <div
              style={{
                width: size.timer,
                height: size.timer,
                flex: "0 0 auto",
                border: `${size.timerBorder}px solid ${revealed ? C.green : timerBright ? C.gold : "#567089"}`,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                color: revealed ? "#67f3ad" : timerBright ? "#ffdc78" : "#71849a",
                fontSize: size.timerFont,
                fontWeight: 900,
                opacity: timerBright ? 1 : 0.12,
                boxShadow: revealed
                  ? "0 0 25px rgba(34,200,117,.25)"
                  : timerBright
                    ? "0 0 25px rgba(246,196,75,.15)"
                    : "none",
                transform: `scale(${inPause ? 1 + (1 - timerProgress) * 0.06 : revealed ? 1 + answerPop * 0.1 : 1})`
              }}
            >
              {timerText}
            </div>
          </div>
        </section>
      </main>

      <footer
        style={{
          position: "absolute",
          left: portrait ? "4%" : "3%",
          right: portrait ? "4%" : "3%",
          bottom: portrait ? "2%" : "3%",
          height: portrait ? "6%" : "7%",
          borderTop: "1px solid rgba(123,164,197,.17)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          color: "#90a9c4",
          fontSize: size.bottom,
          gap: 12
        }}
      >
        <div>
          <strong style={{color: "#f5ca60", letterSpacing: .6}}>PREMIUM BOOKS</strong> · सीखें, सोचें, सही जवाब दें
        </div>
        <div style={{color: "#c0d2e5", textAlign: "right"}}>{footerPhase}</div>
      </footer>

      {!preview ? (
        <>
          <Sequence from={0} durationInFrames={questionFrames}>
            <Audio src={staticFile(`audio/q${String(index + 1).padStart(3, "0")}-question.mp3`)} volume={1} />
          </Sequence>
          <Sequence from={revealAt} durationInFrames={explanationFrames}>
            <Audio src={staticFile(`audio/q${String(index + 1).padStart(3, "0")}-explanation.mp3`)} volume={1} />
          </Sequence>
        </>
      ) : null}
    </div>
  );
};

export const PremiumBooksQuiz = ({questions, timings, portrait = false, preview = false}) => {
  const {width} = useVideoConfig();
  const safeQuestions = Array.isArray(questions) && questions.length
    ? questions
    : [{question: "प्रश्न उपलब्ध नहीं है", options: ["A", "B", "C", "D"], answer: 0, explanation: "questions.json में प्रश्न जोड़ें।"}];
  const safeTimings = Array.isArray(timings) && timings.length === safeQuestions.length
    ? timings
    : safeQuestions.map(() => ({questionFrames: 300, explanationFrames: 300, pauseFrames: 90, sceneFrames: 690}));

  const baseWidth = portrait ? 562 : 1500;
  const baseHeight = baseWidth * (portrait ? 16 / 9 : 9 / 16);
  const scale = width / baseWidth;
  const fontCss = React.useMemo(() => muktaCss(), []);
  const scenes = [];
  let cursor = 0;
  safeQuestions.forEach((q, i) => {
    const t = safeTimings[i] || {};
    const questionFrames = Math.max(1, Number(t.questionFrames) || 300);
    const pauseFrames = Math.max(0, Number(t.pauseFrames) || 0);
    const explanationFrames = Math.max(1, Number(t.explanationFrames) || 300);
    const sceneFrames = Math.max(1, Number(t.sceneFrames) || questionFrames + pauseFrames + explanationFrames);
    scenes.push({q, i, questionFrames, pauseFrames, explanationFrames, sceneFrames, from: cursor});
    cursor += sceneFrames;
  });

  return (
    <AbsoluteFill style={{background: "#040b17", overflow: "hidden"}}>
      <MuktaFont />
      <style>{fontCss}</style>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: baseWidth,
          height: baseHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          overflow: "hidden"
        }}
      >
        {scenes.map(({q, i, questionFrames, pauseFrames, explanationFrames, sceneFrames, from}) => (
          <Sequence key={i} from={from} durationInFrames={sceneFrames}>
            <QuestionScene
              q={q}
              index={i}
              totalQuestions={safeQuestions.length}
              questionFrames={questionFrames}
              pauseFrames={pauseFrames}
              explanationFrames={explanationFrames}
              sceneFrames={sceneFrames}
              startFrame={from}
              portrait={portrait}
              preview={preview}
            />
          </Sequence>
        ))}
      </div>
    </AbsoluteFill>
  );
};
