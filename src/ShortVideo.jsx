import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  OffthreadVideo,
  Sequence,
  Video,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame
} from "remotion";
import {DivineMindMascot} from "./DivineMindMascot.jsx";
import {buildShortTimeline} from "./shortTimeline.js";

export {SHORT_FPS, SHORT_HEIGHT, SHORT_WIDTH} from "./shortTimeline.js";

const LETTERS = ["A", "B", "C", "D"];
const ENERGY_LOOP_FRAMES = 1680;
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

const C = {
  navy: "#0d2140",
  gold: "#f6c44b",
  goldDeep: "#d89d2b",
  cyan: "#42d7ec",
  white: "#f7faff",
  muted: "#a7bcd4",
  green: "#2ee08b",
  greenDeep: "#0b8a55",
  ink: "#050e1c",
  red: "#ff6b85"
};
const FONT = "'Mukta','Nirmala UI','Mangal','Noto Sans Devanagari','Segoe UI',sans-serif";
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"};

const fitFont = (text, base, min, threshold, divisor) =>
  Math.max(min, base - Math.max(0, String(text || "").length - threshold) / divisor);

const easeOut = Easing.out(Easing.cubic);

const normalizeQuestion = (q, i) => {
  const fallback = {
    question: "प्रश्न यहाँ जोड़ें",
    options: ["विकल्प A", "विकल्प B", "विकल्प C", "विकल्प D"],
    answer: 0,
    fact: "एक लाइन में याद रखने वाली बात यहाँ लिखें।"
  };
  const source = q && typeof q === "object" ? q : fallback;
  const options = Array.isArray(source.options) && source.options.length
    ? source.options.slice(0, 4).map((option, optionIndex) => String(option || `विकल्प ${LETTERS[optionIndex]}`))
    : fallback.options;
  while (options.length < 4) options.push(`विकल्प ${LETTERS[options.length]}`);
  const rawAnswer = Number(source.answer);
  return {
    question: String(source.question || fallback.question),
    options,
    answer: Number.isInteger(rawAnswer) && rawAnswer >= 0 && rawAnswer <= 3 ? rawAnswer : 0,
    fact: String(source.fact || fallback.fact)
  };
};

const EnergyVideo = ({preview, renderStartFrom = 0, previewStartFrom = 1, style}) => (
  preview ? (
    <Video
      src={staticFile("blue-neural-energy.mp4")}
      loop
      muted
      volume={0}
      startFrom={previewStartFrom}
      style={style}
    />
  ) : (
    <OffthreadVideo
      src={staticFile("blue-neural-energy-loop.mp4")}
      muted
      startFrom={renderStartFrom}
      style={style}
    />
  )
);

const EnergyBackdrop = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 140) * 0.014;
  return (
    <>
      <img
        src={staticFile("blue-neural-energy-poster.jpg")}
        alt=""
        style={{
          position: "absolute",
          left: "50%",
          top: "34%",
          width: "172%",
          aspectRatio: "4 / 3",
          transform: `translate(-50%,-50%) scale(${1.06 + drift}) rotate(-2deg)`,
          objectFit: "cover",
          opacity: .34,
          mixBlendMode: "screen",
          filter: "blur(1.4px) saturate(.92)"
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 24%,rgba(29,68,112,.42),transparent 46%),radial-gradient(ellipse at 50% 68%,rgba(9,83,108,.2),transparent 54%),linear-gradient(180deg,rgba(4,11,23,.62),rgba(3,9,19,.3) 46%,rgba(2,7,15,.9))"
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: .24,
          backgroundImage:
            "repeating-linear-gradient(0deg,rgba(126,187,232,.09) 0 1px,transparent 1px 74px),repeating-linear-gradient(90deg,rgba(126,187,232,.07) 0 1px,transparent 1px 74px)",
          maskImage: "radial-gradient(ellipse at 50% 40%,#000 10%,transparent 74%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 40%,#000 10%,transparent 74%)"
        }}
      />
    </>
  );
};

const GradientBorder = ({frame, radius, thickness = 3, opacity = 1}) => {
  const position = 50 + Math.sin((frame / 70) * Math.PI * 2) * 50;
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
        opacity,
        pointerEvents: "none",
        WebkitMask: "linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude"
      }}
    />
  );
};

const ShortHeader = ({rightLabel, rightTone = "gold"}) => (
  <div
    style={{
      position: "absolute",
      top: 58,
      left: 54,
      right: 54,
      height: 82,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      borderBottom: "1px solid rgba(140,184,222,.22)",
      paddingBottom: 18
    }}
  >
    <div style={{display: "flex", alignItems: "center", gap: 16}}>
      <div
        style={{
          width: 130,
          height: 130,
          borderRadius: 18,
          background: "linear-gradient(145deg,#fbe08a,#c88b18)",
          display: "grid",
          placeItems: "center",
          color: "#11203a",
          fontSize: 80,
          fontWeight: 950,
          letterSpacing: -1,
          boxShadow: "0 8px 30px rgba(246,196,75,.3)"
        }}
      >
        PB
      </div>
      <div>
        <div style={{fontSize: 30, fontWeight: 900, letterSpacing: .4, lineHeight: 1.05}}>PREMIUM BOOKS</div>
        <div style={{fontSize: 30, color: "#9eb6d1", letterSpacing: .6, marginTop: 6, fontWeight: 700}}>
          SHORTS · सीखें, सोचें, जवाब दें
        </div>
      </div>
    </div>
    <div
      style={{
        border: `1px solid ${rightTone === "green" ? "rgba(46,224,139,.55)" : "rgba(246,196,75,.48)"}`,
        background: rightTone === "green" ? "rgba(46,224,139,.11)" : "rgba(246,196,75,.1)",
        color: rightTone === "green" ? "#7cf5bc" : "#ffdc82",
        borderRadius: 999,
        padding: "10px 22px",
        fontSize: 30,
        fontWeight: 900,
        letterSpacing: 1,
        whiteSpace: "nowrap"
      }}
    >
      {rightLabel}
    </div>
  </div>
);

const PhaseFooter = ({left, right}) => (
  <div
    style={{
      position: "absolute",
      left: 54,
      right: 54,
      bottom: 66,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      color: "#829bb6",
      fontSize: 30,
      letterSpacing: .5,
      borderTop: "1px solid rgba(140,184,222,.16)",
      paddingTop: 20
    }}
  >
    <div><strong style={{color: "#eecb6c", letterSpacing: .8}}>PREMIUM BOOKS</strong> · {left}</div>
    <div style={{color: "#b7c9dd", fontWeight: 800}}>{right}</div>
  </div>
);

const HookScene = ({hook = "", preview = false, scene}) => {
  const local = useCurrentFrame();
  const flash = interpolate(local, [0, 20], [1, 0], clamp);
  const intro = interpolate(local, [1, 18], [0, 1], {...clamp, easing: easeOut});
  const numberMatch = String(hook).match(/(\d+)\s*%/);
  const bigNumber = numberMatch ? `${numberMatch[1]}%` : null;
  const restText = numberMatch ? String(hook).replace(numberMatch[0], "").trim() : String(hook);
  const countTarget = numberMatch ? Number(numberMatch[1]) : 0;
  const count = Math.round(interpolate(local, [4, 30], [0, countTarget], {...clamp, easing: easeOut}));
  const counterText = numberMatch ? `${count}%` : null;
  const chipIn = interpolate(local, [18, 36], [0, 1], {...clamp, easing: easeOut});
  const mascotIn = interpolate(local, [10, 30], [0, 1], {...clamp, easing: easeOut});
  const breathe = 1 + Math.sin(local / 8) * .012;
  const restFont = fitFont(restText, 62, 42, 46, 2.4);

  return (
    <div style={{position: "absolute", inset: 0}}>
      <ShortHeader rightLabel="3 SECOND CHALLENGE" />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 24% 28%,rgba(66,215,236,.14),transparent 42%),radial-gradient(ellipse at 82% 70%,rgba(246,196,75,.13),transparent 40%)"
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 54,
          right: 54,
          top: 210,
          bottom: 150,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-start"
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            border: "1px solid rgba(66,215,236,.42)",
            background: "rgba(66,215,236,.1)",
            color: "#9ceefa",
            borderRadius: 999,
            padding: "13px 22px",
            fontSize: 19,
            letterSpacing: 2.4,
            fontWeight: 900,
            opacity: intro,
            transform: `translateY(${14 * (1 - intro)}px)`
          }}
        >
          <span style={{width: 10, height: 10, borderRadius: "50%", background: C.cyan, boxShadow: `0 0 16px ${C.cyan}`}} />
          PATTERN BREAK
        </div>

        {bigNumber ? (
          <div
            style={{
              position: "relative",
              marginTop: 34,
              fontSize: 320,
              lineHeight: .82,
              fontWeight: 950,
              letterSpacing: -18,
              background: "linear-gradient(160deg,#fff5be 0%,#f8cd58 38%,#e29a1e 72%,#ffe49a 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 18px 38px rgba(231,169,38,.22))",
              transform: `scale(${intro * breathe})`,
              transformOrigin: "left center",
              opacity: intro
            }}
          >
            {counterText}
          </div>
        ) : null}

        <div
          style={{
            position: "relative",
            marginTop: bigNumber ? 34 : 44,
            maxWidth: bigNumber ? 780 : 920,
            fontSize: bigNumber ? restFont : 78,
            lineHeight: 1.22,
            fontWeight: 900,
            letterSpacing: -.8,
            textShadow: "0 10px 28px rgba(0,0,0,.45)",
            opacity: intro,
            transform: `translateY(${26 * (1 - intro)}px)`
          }}
        >
          {restText}
          <div
            style={{
              width: `${Math.min(100, 62 + local * 1.1)}%`,
              height: 8,
              borderRadius: 99,
              marginTop: 26,
              background: "linear-gradient(90deg,#42d7ec,#f6c44b 62%,transparent)",
              boxShadow: "0 0 22px rgba(66,215,236,.24)"
            }}
          />
        </div>

        <div
          style={{
            marginTop: 44,
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            opacity: chipIn,
            transform: `translateY(${18 * (1 - chipIn)}px)`
          }}
        >
          {[
            {mark: "01", label: "3 सवाल"},
            {mark: "02", label: "3 सेकंड प्रति सवाल"},
            {mark: "03", label: "बिना रुके जवाब"}
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "1px solid rgba(246,196,75,.34)",
                background: "rgba(246,196,75,.08)",
                borderRadius: 999,
                padding: "10px 18px 10px 10px",
                color: "#ffe4a0",
                fontSize: 20,
                fontWeight: 800
              }}
            >
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "rgba(246,196,75,.18)",
                  border: "1px solid rgba(246,196,75,.35)",
                  fontSize: 12,
                  fontWeight: 950,
                  color: "#ffe6a3"
                }}
              >
                {item.mark}
              </span>
              {item.label}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 54,
          right: 54,
          bottom: 150,
          height: 520,
          display: "flex",
          gap: 24,
          opacity: mascotIn,
          transform: `translateY(${36 * (1 - mascotIn)}px)`
        }}
      >
        <div
          style={{
            position: "relative",
            flex: 1,
            minWidth: 0,
            borderRadius: 30,
            border: "1px solid rgba(90,144,190,.4)",
            background: "linear-gradient(145deg,rgba(12,33,56,.94),rgba(5,15,28,.96))",
            padding: "26px 30px 24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflow: "hidden",
            boxShadow: "0 24px 70px rgba(0,0,0,.32)"
          }}
        >
          <GradientBorder frame={local} radius={29} thickness={2.5} opacity={.75} />
          <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12}}>
            <div style={{fontSize: 16, letterSpacing: 2, color: "#9ceefa", fontWeight: 900}}>आपका 3-सेकंड चैलेंज</div>
            <div
              style={{
                border: "1px solid rgba(246,196,75,.4)",
                background: "rgba(246,196,75,.08)",
                borderRadius: 999,
                padding: "6px 12px",
                color: "#ffdc83",
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: 1
              }}
            >
              READY
            </div>
          </div>
          <div style={{display: "flex", alignItems: "center", gap: 26}}>
            <div
              style={{
                fontSize: 168,
                lineHeight: .8,
                fontWeight: 950,
                letterSpacing: -6,
                background: "linear-gradient(160deg,#fff5be,#f8cd58 48%,#e29a1e)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 12px 28px rgba(231,169,38,.18))"
              }}
            >
              3
            </div>
            <div style={{minWidth: 0}}>
              <div style={{fontSize: 42, fontWeight: 950, lineHeight: 1.08}}>सवाल</div>
              <div style={{fontSize: 23, color: "#a7bcd4", marginTop: 9, lineHeight: 1.35}}>हर सवाल पर सिर्फ 3 सेकंड</div>
            </div>
          </div>
          <div>
            <div style={{display: "flex", gap: 8}}>
              {[0, 1, 2].map((segment) => (
                <div
                  key={segment}
                  style={{
                    height: 8,
                    flex: 1,
                    borderRadius: 99,
                    background: "linear-gradient(90deg,#42d7ec,#f6c44b)",
                    opacity: .4 + .55 * Math.max(0, Math.sin((local - segment * 7) / 12))
                  }}
                />
              ))}
            </div>
            <div style={{fontSize: 18, color: "#9fb6ce", marginTop: 14}}>देखते रहिए — पहला सवाल अभी आने वाला है</div>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            width: 330,
            flex: "0 0 auto",
            borderRadius: 30,
            border: "1px solid rgba(90,144,190,.4)",
            background: "linear-gradient(160deg,rgba(8,26,48,.8),rgba(3,10,20,.65))",
            overflow: "hidden",
            boxShadow: "0 24px 70px rgba(0,0,0,.38)"
          }}
        >
          <EnergyVideo
            preview={preview}
            renderStartFrom={0}
            previewStartFrom={1}
            style={{
              position: "absolute",
              left: "50%",
              top: "42%",
              width: "165%",
              aspectRatio: "4 / 3",
              transform: "translate(-50%,-50%)",
              opacity: .62,
              mixBlendMode: "screen",
              filter: "blur(.4px) saturate(.92)"
            }}
          />
          <div style={{position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 46%,rgba(246,196,75,.16),transparent 62%),linear-gradient(180deg,transparent,rgba(3,10,20,.55))"}} />
          <DivineMindMascot
            frame={local + 30}
            speaking={local < scene.speechFrames}
            speechFrame={local}
            speechWords={scene.speechWords}
            portrait={false}
            idPrefix="mind-hook"
          />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#f8fbff",
          opacity: flash * .9,
          pointerEvents: "none"
        }}
      />
      {!preview ? (
        <Sequence from={0} durationInFrames={scene.speechFrames}>
          <Audio src={staticFile("audio/short-hook.mp3")} volume={1} />
        </Sequence>
      ) : null}
    </div>
  );
};

const ProgressSegments = ({index, progress}) => (
  <div style={{position: "absolute", top: 162, left: 54, right: 54, display: "flex", gap: 10}}>
    {[0, 1, 2].map((segment) => {
      const fill = segment < index ? 1 : segment === index ? progress : 0;
      return (
        <div key={segment} style={{flex: 1, height: 11, borderRadius: 99, background: "rgba(123,164,197,.19)", overflow: "hidden"}}>
          <div
            style={{
              width: `${fill * 100}%`,
              height: "100%",
              borderRadius: 99,
              background: "linear-gradient(90deg,#42d7ec,#f6c44b)",
              boxShadow: fill > 0 ? "0 0 16px rgba(246,196,75,.34)" : "none"
            }}
          />
        </div>
      );
    })}
  </div>
);

const CountdownRing = ({active, seconds, progress, size = 196}) => {
  const remaining = Math.max(0, 1 - progress);
  return (
    <div
      style={{
        width: size,
        height: size,
        flex: "0 0 auto",
        borderRadius: "50%",
        padding: Math.round(size * .046),
        background: active
          ? `conic-gradient(#f6c44b ${remaining * 360}deg,rgba(246,196,75,.12) 0)`
          : "conic-gradient(rgba(128,164,199,.35) 360deg,rgba(128,164,199,.08) 0)",
        boxShadow: active ? "0 0 46px rgba(246,196,75,.2)" : "none",
        transform: `scale(${active ? 1 + remaining * .035 : 1})`
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: "radial-gradient(circle at 50% 38%,#122d4b,#071426 68%)",
          border: "1px solid rgba(115,159,200,.25)",
          display: "grid",
          placeItems: "center",
          color: active ? "#ffde87" : "rgba(129,158,188,.4)",
          fontSize: Math.round(size * .49),
          fontWeight: 950,
          lineHeight: 1
        }}
      >
        {seconds}
      </div>
    </div>
  );
};

const ShortQuestionScene = ({q, index, preview, scene}) => {
  const local = useCurrentFrame();
  const entry = interpolate(local, [0, 14], [0, 1], {...clamp, easing: easeOut});
  const inCountdown = local >= scene.countdownFrom;
  const countdownElapsed = Math.max(0, local - scene.countdownFrom);
  const countdownSeconds = Math.max(1, 3 - Math.min(2, Math.floor(countdownElapsed / 30)));
  const countdownProgress = (countdownElapsed % 30) / 30;
  const speechProgress = Math.min(1, local / scene.speechFrames);
  const timeUp = local >= scene.countdownFrom + 90;
  const questionFont = fitFont(q.question, 60, 38, 34, 1.7);
  const optionFonts = q.options.map((option) => fitFont(option, 40, 24, 18, 1.3));

  return (
    <div style={{position: "absolute", inset: 0}}>
      <ShortHeader rightLabel={`Q${index + 1} / 3`} />
      <ProgressSegments index={index} progress={local / scene.sceneFrames} />
      <div
        style={{
          position: "absolute",
          left: 54,
          right: 54,
          top: 204,
          bottom: 150,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          opacity: .4 + .6 * entry,
          transform: `translateY(${18 * (1 - entry)}px)`
        }}
      >
        <div
          style={{
            position: "relative",
            flex: "0 0 auto",
            minHeight: 300,
            borderRadius: 30,
            border: `1px solid ${inCountdown ? "rgba(246,196,75,.7)" : "#4a7299"}`,
            background: "linear-gradient(120deg,rgba(17,40,69,.97),rgba(9,21,38,.98))",
            padding: "26px 30px 30px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 14,
            overflow: "hidden",
            boxShadow: inCountdown ? "0 0 42px rgba(246,196,75,.12),inset 0 0 40px rgba(246,196,75,.045)" : "none"
          }}
        >
          <GradientBorder
            frame={local + index * 30}
            radius={29}
            thickness={3}
          />
          <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10}}>
            <div style={{fontSize: 30, letterSpacing: 1, fontWeight: 900, color: C.cyan}}>
              QUESTION {String(index + 1).padStart(2, "0")}
            </div>
            <div
              style={{
                borderRadius: 999,
                border: `1px solid ${inCountdown ? "rgba(246,196,75,.62)" : "rgba(66,215,236,.4)"}`,
                background: inCountdown ? "rgba(246,196,75,.12)" : "rgba(66,215,236,.08)",
                color: inCountdown ? "#ffdc83" : "#9aeaf5",
                padding: "6px 18px",
                fontSize: 30,
                fontWeight: 900,
                letterSpacing: 1.1
              }}
            >
              {inCountdown ? "जवाब दें" : "RAPID FIRE"}
            </div>
          </div>
          <div
            style={{
              fontSize: questionFont,
              fontWeight: 900,
              lineHeight: 1.25,
              letterSpacing: .2,
              overflowWrap: "anywhere"
            }}
          >
            {q.question}
          </div>
          <div style={{display: "flex", alignItems: "center", gap: 12, color: "#8ca9c5", fontSize: 30, fontWeight: 700}}>
            <span style={{width: 10, height: 10, borderRadius: "50%", background: inCountdown ? C.gold : C.cyan, boxShadow: `0 0 12px ${inCountdown ? C.gold : C.cyan}`}} />
            {inCountdown ? "जल्दी! अगला सवाल आने वाला है" : "4 विकल्प · सही उत्तर अंत में बताया जाएगा"}
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              height: 5,
              width: `${Math.min(100, speechProgress * 100)}%`,
              background: "linear-gradient(90deg,#42d7ec,#f6c44b)",
              opacity: inCountdown ? 0 : .8
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: 16,
            height: 280,
            flex: "0 0 auto"
          }}
        >
          {q.options.map((option, optionIndex) => {
            const optionStart = scene.optionStarts[optionIndex];
            const spoken = local >= optionStart - 2;
            const optionIn = interpolate(local, [5 + optionIndex * 3, 20 + optionIndex * 3], [0, 1], {...clamp, easing: easeOut});
            return (
              <div
                key={optionIndex}
                style={{
                  position: "relative",
                  minWidth: 0,
                  minHeight: 0,
                  border: `1px solid ${inCountdown ? "rgba(246,196,75,.45)" : spoken ? "rgba(246,196,75,.85)" : "#46607e"}`,
                  background: spoken ? "linear-gradient(100deg,#3d3119,#1d1710)" : "linear-gradient(100deg,#142943,#0a1729)",
                  borderRadius: 22,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  opacity: optionIn * (inCountdown ? .72 : spoken ? 1 : .55),
                  transform: `translateY(${12 * (1 - optionIn)}px) scale(${.97 + .03 * optionIn + (spoken && !inCountdown ? .02 : 0)})`,
                  filter: `blur(${3 * (1 - optionIn)}px)`,
                  overflow: "hidden",
                  boxShadow: spoken && !inCountdown ? "0 0 34px rgba(246,196,75,.2),inset 0 0 30px rgba(246,196,75,.07)" : "inset 0 1px rgba(255,255,255,.04)"
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    flex: "0 0 auto",
                    borderRadius: 16,
                    background: spoken ? "linear-gradient(145deg,#b8892a,#7c5a14)" : "linear-gradient(145deg,#24476c,#16314d)",
                    border: `1px solid ${spoken ? "rgba(246,196,75,.85)" : "#5785b1"}`,
                    display: "grid",
                    placeItems: "center",
                    color: spoken ? "#fff7e0" : "#c5d8eb",
                    fontSize: 26,
                    fontWeight: 900
                  }}
                >
                  {LETTERS[optionIndex]}
                </div>
                <span style={{fontSize: optionFonts[optionIndex], fontWeight: 800, lineHeight: 1.22, overflowWrap: "anywhere", minWidth: 0, color: spoken ? "#f7faff" : "#b6c9dc"}}>
                  {option}
                </span>
              </div>
            );
          })}
        </div>

        <div
          style={{
            flex: "0 0 auto",
            minHeight: 170,
            border: `1px solid ${inCountdown ? "rgba(246,196,75,.7)" : "#385b7c"}`,
            background: "linear-gradient(120deg,rgba(8,25,46,.92),rgba(5,15,29,.94))",
            borderRadius: 26,
            padding: "14px 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            position: "relative",
            overflow: "hidden",
            boxShadow: inCountdown ? "0 0 42px rgba(246,196,75,.14),inset 0 0 40px rgba(246,196,75,.05)" : "none"
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              height: 4,
              width: `${Math.min(100, speechProgress * 100)}%`,
              background: "linear-gradient(90deg,#42d7ec,#f6c44b)",
              opacity: inCountdown ? 0 : .8
            }}
          />
          <CountdownRing size={128} active={inCountdown} seconds={inCountdown ? countdownSeconds : 3} progress={inCountdown ? countdownProgress : 0} />
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{fontSize: 30, color: inCountdown ? "#ffdb82" : "#8fa8c2", fontWeight: 800, letterSpacing: .4}}>
              {inCountdown ? `सेकंड ${4 - countdownSeconds} / 3` : "जवाब याद है?"}
            </div>
            <div style={{fontSize: 34, fontWeight: 950, lineHeight: 1.15, marginTop: 6}}>
              {inCountdown ? "3… 2… 1… जवाब दें!" : "तीन सेकंड में सोचिए"}
            </div>
            <div style={{fontSize: 30, color: "#9bb2c9", marginTop: 6, lineHeight: 1.25}}>
              {inCountdown ? "सही उत्तर आगे मिलेगा" : "टाइमर खत्म होने से पहले विकल्प चुनें"}
            </div>
          </div>
          <div
            style={{
              flex: "0 0 auto",
              borderRadius: 26,
              padding: "14px 26px",
              border: `1px solid ${inCountdown ? "rgba(246,196,75,.5)" : "rgba(66,215,236,.32)"}`,
              background: inCountdown ? "rgba(246,196,75,.09)" : "rgba(66,215,236,.06)",
              display: "grid",
              placeItems: "center",
              alignContent: "center",
              gap: 2
            }}
          >
            <div style={{fontSize: 34, fontWeight: 950, color: inCountdown ? C.gold : C.cyan}}>{index + 1}/3</div>
            <div style={{fontSize: 30, letterSpacing: 1, color: "#8ba3bb", fontWeight: 800}}>QUESTION</div>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            flex: "1 1 auto",
            minHeight: 0,
            width: "100%",
            borderRadius: 36,
            border: "1px solid #4479a4",
            background: "linear-gradient(155deg,#07142b,#030914 74%)",
            overflow: "hidden",
            boxShadow: "inset 0 0 50px rgba(35,94,145,.18),0 24px 60px rgba(0,0,0,.32)"
          }}
        >
          <EnergyVideo
            preview={preview}
            renderStartFrom={scene.from % ENERGY_LOOP_FRAMES}
            previewStartFrom={index * 36 + 1}
            style={{
              position: "absolute",
              left: "50%",
              top: "42%",
              width: "120%",
              aspectRatio: "4 / 3",
              transform: "translate(-50%,-50%)",
              opacity: .7,
              mixBlendMode: "screen",
              filter: "blur(.4px) saturate(.9)"
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse at 50% 32%,rgba(57,122,181,.3),transparent 52%),linear-gradient(180deg,rgba(25,63,99,0),rgba(3,16,31,.75))"
            }}
          />
          <DivineMindMascot
            frame={local + index * 90}
            speaking={!inCountdown}
            speechFrame={local}
            speechWords={scene.speechWords}
            portrait={false}
            idPrefix={`mind-short-q${index}`}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 20,
              transform: "translateX(-50%)",
              zIndex: 2,
              borderRadius: 999,
              border: "1px solid rgba(246,196,75,.32)",
              background: "rgba(5,17,33,.86)",
              padding: "12px 30px",
              color: "#ffdc83",
              fontSize: 30,
              fontWeight: 800,
              textAlign: "center",
              whiteSpace: "nowrap",
              letterSpacing: .6
            }}
          >
            {inCountdown ? "अब जवाब दें!" : "सवाल सुनिए…"}
          </div>
        </div>
      </div>

      {timeUp ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(246,196,75,.09)",
            pointerEvents: "none"
          }}
        />
      ) : null}

      <PhaseFooter left="3 सेकंड रैपिड क्विज़" right="RAPID FIRE" />

      {!preview ? (
        <>
          <Sequence from={0} durationInFrames={scene.speechFrames}>
            <Audio src={staticFile(`audio/short-q${index + 1}.mp3`)} volume={1} />
          </Sequence>
          <Sequence from={scene.countdownFrom} durationInFrames={90}>
            <Audio src={staticFile("audio/short-countdown.mp3")} volume={.7} />
          </Sequence>
        </>
      ) : null}
    </div>
  );
};

const ShortAnswersScene = ({questions, preview, scene}) => {
  const local = useCurrentFrame();
  const titleIn = interpolate(local, [0, 14], [0, 1], {...clamp, easing: easeOut});
  const footerAt = scene.leadFrames + scene.speechFrames + 4;
  const footerIn = interpolate(local, [footerAt, footerAt + 16], [0, 1], {...clamp, easing: easeOut});

  return (
    <div style={{position: "absolute", inset: 0}}>
      <ShortHeader rightLabel="ANSWER KEY" rightTone="green" />
      <div
        style={{
          position: "absolute",
          left: 54,
          right: 54,
          top: 196,
          bottom: 166,
          display: "flex",
          flexDirection: "column",
          gap: 22
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 20,
            opacity: titleIn,
            transform: `translateY(${18 * (1 - titleIn)}px)`
          }}
        >
          <div>
            <div style={{fontSize: 30, letterSpacing: 1, color: "#7cf5bc", fontWeight: 900}}>एक नज़र में जवाब</div>
            <div style={{fontSize: 64, fontWeight: 950, letterSpacing: -1.2, lineHeight: 1.1, marginTop: 8}}>
              सही जवाब <span style={{color: C.gold}}>+ फैक्ट</span>
            </div>
            <div style={{fontSize: 30, color: "#9bb2ca", marginTop: 10, fontWeight: 700}}>तीनों उत्तर एक नज़र में — याद रखने के लिए।</div>
          </div>
          <div
            style={{
              width: 96,
              height: 96,
              flex: "0 0 auto",
              borderRadius: 26,
              border: "1px solid rgba(46,224,139,.46)",
              background: "rgba(46,224,139,.11)",
              display: "grid",
              placeItems: "center",
              color: "#85f7c4",
              fontSize: 48,
              fontWeight: 900,
              boxShadow: "0 0 36px rgba(46,224,139,.12)"
            }}
          >
            ✓
          </div>
        </div>

        <div style={{display: "flex", flexDirection: "column", justifyContent: "center", gap: 26, flex: 1, minHeight: 0}}>
          {questions.map((q, index) => {
            const spokenAt = Math.max(6, scene.leadFrames + scene.answerStarts[index] - 2);
            const spoken = local >= spokenAt;
            const cardIn = interpolate(local, [6 + index * 4, 22 + index * 4], [0, 1], {...clamp, easing: easeOut});
            const correct = q.options[q.answer];
            const answerFont = fitFont(correct, 52, 34, 18, 2.1);
            const factFont = fitFont(q.fact, 30, 24, 62, 6);
            const accents = [C.cyan, C.gold, C.green];
            return (
              <div
                key={index}
                style={{
                  position: "relative",
                  flex: "0 0 auto",
                  border: `1px solid ${spoken ? "rgba(246,196,75,.85)" : "#2c4a6b"}`,
                  borderLeft: `7px solid ${spoken ? C.gold : accents[index]}`,
                  borderRadius: 26,
                  background: spoken
                    ? "linear-gradient(120deg,rgba(58,45,16,.99),rgba(26,20,8,.99))"
                    : "linear-gradient(120deg,rgba(13,30,51,.97),rgba(6,16,30,.98))",
                  padding: "20px 26px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  opacity: cardIn * (spoken ? 1 : .55),
                  transform: `translateX(${32 * (1 - cardIn)}px) scale(${.975 + .025 * cardIn + (spoken ? .012 : 0)})`,
                  filter: `blur(${3 * (1 - cardIn)}px)`,
                  boxShadow: spoken ? "0 0 36px rgba(246,196,75,.2),inset 0 0 30px rgba(246,196,75,.07)" : "inset 0 1px rgba(255,255,255,.03)",
                  overflow: "hidden"
                }}
              >
                <div style={{display: "flex", alignItems: "center", gap: 14, minWidth: 0}}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      flex: "0 0 auto",
                      borderRadius: 14,
                      background: `${accents[index]}1f`,
                      border: `1px solid ${accents[index]}66`,
                      display: "grid",
                      placeItems: "center",
                      color: accents[index],
                      fontSize: 26,
                      fontWeight: 950
                    }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div style={{fontSize: 30, color: "#b9cde1", fontWeight: 700, lineHeight: 1.25, overflowWrap: "anywhere"}}>
                    {q.question}
                  </div>
                </div>

                <div style={{display: "flex", alignItems: "center", gap: 14, minWidth: 0}}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      flex: "0 0 auto",
                      borderRadius: "50%",
                      background: C.greenDeep,
                      border: "1px solid #74f0b8",
                      display: "grid",
                      placeItems: "center",
                      color: "#f1fff8",
                      fontSize: 26,
                      fontWeight: 900,
                      boxShadow: "0 0 22px rgba(46,224,139,.28)"
                    }}
                  >
                    ✓
                  </div>
                  <div
                    style={{
                      fontSize: answerFont,
                      color: "#74f2b7",
                      fontWeight: 950,
                      lineHeight: 1.15,
                      overflowWrap: "anywhere",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical"
                    }}
                  >
                    {correct}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    borderTop: "1px solid rgba(123,164,197,.16)",
                    paddingTop: 10,
                    color: "#a6bdd4",
                    fontSize: factFont,
                    lineHeight: 1.35
                  }}
                >
                  <span
                    style={{
                      flex: "0 0 auto",
                      borderRadius: 7,
                      background: "rgba(246,196,75,.13)",
                      border: "1px solid rgba(246,196,75,.3)",
                      color: "#ffdc83",
                      fontSize: 26,
                      fontWeight: 900,
                      letterSpacing: 1,
                      padding: "4px 12px",
                      marginTop: 1
                    }}
                  >
                    FACT
                  </span>
                  <span style={{overflowWrap: "anywhere"}}>{q.fact}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            flex: "0 0 auto",
            minHeight: 76,
            borderRadius: 20,
            border: "1px solid rgba(246,196,75,.3)",
            background: "rgba(246,196,75,.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "16px 22px",
            opacity: footerIn,
            transform: `translateY(${14 * (1 - footerIn)}px)`
          }}
        >
          <div style={{display: "flex", alignItems: "center", gap: 12, fontSize: 30, fontWeight: 800, color: "#ffe4a3"}}>
            <span style={{fontSize: 34}}>▸</span> अगला: आपकी तैयारी का पूरा टेस्ट
          </div>
          <div style={{fontSize: 30, color: "#b6c8da", fontWeight: 800}}>प्रीमियम बुक्स</div>
        </div>
      </div>
      <PhaseFooter left="हर सवाल का सही जवाब" right="याद रखें!" />
      {!preview ? (
        <>
          <Sequence from={0} durationInFrames={12}>
            <Audio src={staticFile("audio/short-reveal.mp3")} volume={.55} />
          </Sequence>
          <Sequence from={scene.leadFrames} durationInFrames={scene.speechFrames}>
            <Audio src={staticFile("audio/short-answers.mp3")} volume={1} />
          </Sequence>
        </>
      ) : null}
    </div>
  );
};

const ShortCtaScene = ({cta, preview, scene}) => {
  const local = useCurrentFrame();
  const entry = interpolate(local, [0, 18], [0, 1], {...clamp, easing: easeOut});
  const pop = interpolate(local, [12, 34], [0, 1], {...clamp, easing: easeOut});
  const ctaFont = fitFont(cta, 43, 30, 66, 3.6);
  const ringAngle = (local / 3) % 360;

  return (
    <div style={{position: "absolute", inset: 0}}>
      <ShortHeader rightLabel="LINK BIO" />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 24%,rgba(246,196,75,.16),transparent 38%),radial-gradient(ellipse at 22% 68%,rgba(66,215,236,.11),transparent 40%)"
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 54,
          right: 54,
          top: 196,
          bottom: 150,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          justifyContent: "space-between",
          gap: 24,
          opacity: entry,
          transform: `translateY(${20 * (1 - entry)}px)`
        }}
      >
        <div
          style={{
            position: "relative",
            width: 360,
            height: 400,
            flex: "0 0 auto",
            borderRadius: 40,
            overflow: "visible",
            transform: `scale(${.9 + .1 * pop})`
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: -8,
              borderRadius: 46,
              background: `conic-gradient(from ${ringAngle}deg,#42d7ec,#f6c44b,#ff5f9e,#42d7ec)`,
              filter: "blur(16px)",
              opacity: .32
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 40,
              border: "1px solid rgba(246,196,75,.42)",
              background: "linear-gradient(155deg,rgba(9,30,56,.9),rgba(3,10,20,.92))",
              overflow: "hidden",
              boxShadow: "0 30px 90px rgba(0,0,0,.45)"
            }}
          >
            <EnergyVideo
              preview={preview}
              renderStartFrom={scene.from % ENERGY_LOOP_FRAMES}
              previewStartFrom={1}
              style={{
                position: "absolute",
                left: "50%",
                top: "42%",
                width: "150%",
                aspectRatio: "4 / 3",
                transform: "translate(-50%,-50%)",
                opacity: .75,
                mixBlendMode: "screen",
                filter: "blur(.3px) saturate(.9)"
              }}
            />
            <div style={{position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 36%,rgba(246,196,75,.14),transparent 58%),linear-gradient(180deg,transparent,rgba(3,12,24,.78))"}} />
            <DivineMindMascot
              frame={local + 120}
              speaking={local < scene.speechFrames}
              speechFrame={local}
              speechWords={scene.speechWords}
              portrait={false}
              idPrefix="mind-cta"
            />
          </div>
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: -20,
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
              borderRadius: 999,
              background: "linear-gradient(140deg,#fbe08a,#d99b27)",
              color: "#11203a",
              padding: "11px 24px",
              fontSize: 17,
              fontWeight: 950,
              letterSpacing: 1.1,
              boxShadow: "0 12px 30px rgba(222,163,43,.3)"
            }}
          >
            आपका स्टडी पार्टनर
          </div>
        </div>

        <div style={{marginTop: 22}}>
          <div style={{fontSize: 19, letterSpacing: 3.2, color: "#8fdce8", fontWeight: 900}}>अब आगे क्या?</div>
          <div
            style={{
              marginTop: 12,
              fontSize: 82,
              lineHeight: 1.02,
              fontWeight: 950,
              letterSpacing: -2.2,
              background: "linear-gradient(100deg,#fff6c8 0%,#f6c44b 46%,#d69424 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 14px 30px rgba(220,165,50,.2))"
            }}
          >
            PREMIUM BOOKS
          </div>
          <div style={{fontSize: 25, color: "#a8bfd6", marginTop: 6, fontWeight: 700}}>30 सवाल · पूरा टेस्ट · हिंदी में</div>
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            border: "1px solid rgba(246,196,75,.4)",
            borderRadius: 30,
            background: "linear-gradient(125deg,rgba(21,44,72,.96),rgba(8,20,36,.97))",
            padding: "30px 32px",
            boxShadow: "inset 0 1px rgba(255,255,255,.05),0 24px 70px rgba(0,0,0,.3)",
            overflow: "hidden"
          }}
        >
          <GradientBorder frame={local} radius={29} thickness={3} opacity={.9} />
          <div style={{fontSize: ctaFont, fontWeight: 900, lineHeight: 1.38, color: "#f4f8ff", overflowWrap: "anywhere"}}>
            {cta}
          </div>
        </div>

        <div style={{display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12}}>
          {["ई-बुक", "Test Series", "Explanations"].map((label) => (
            <div
              key={label}
              style={{
                borderRadius: 999,
                border: "1px solid rgba(66,215,236,.34)",
                background: "rgba(66,215,236,.08)",
                color: "#a7edf7",
                padding: "12px 20px",
                fontSize: 18,
                fontWeight: 800
              }}
            >
              ✓ {label}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            borderRadius: 999,
            padding: "20px 34px",
            background: "linear-gradient(140deg,#ffe28d,#dba032)",
            color: "#10203a",
            fontSize: 30,
            fontWeight: 950,
            letterSpacing: .3,
            boxShadow: "0 18px 44px rgba(219,158,45,.28)"
          }}
        >
          <span>Link bio में जाएँ</span>
          <span style={{fontSize: 32}}>↗</span>
        </div>

        <div style={{fontSize: 22, color: "#91a9c2", fontWeight: 800, letterSpacing: 1.2}}>
          premiumbooks.store
        </div>
      </div>
      <PhaseFooter left="आपका अगला कदम" right="कल फिर मिलेंगे" />
      {!preview ? (
        <Sequence from={0} durationInFrames={scene.speechFrames}>
          <Audio src={staticFile("audio/short-cta.mp3")} volume={1} />
        </Sequence>
      ) : null}
    </div>
  );
};

const GlobalProgress = ({totalFrames}) => {
  const frame = useCurrentFrame();
  const width = (frame / Math.max(1, totalFrames - 1)) * 100;
  return (
    <div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: 6, background: "rgba(255,255,255,.07)"}}>
      <div
        style={{
          width: `${width}%`,
          height: "100%",
          background: "linear-gradient(90deg,#42d7ec,#f6c44b 55%,#ff8b5f)",
          boxShadow: "0 0 18px rgba(246,196,75,.3)"
        }}
      />
    </div>
  );
};

export const PremiumBooksShort = ({hook = "", hookVoice = "", questions, cta = "", ctaEnabled = true, audio = null, preview = false}) => {
  const safeQuestions = Array.isArray(questions) ? questions.slice(0, 3).map(normalizeQuestion) : [];
  while (safeQuestions.length < 3) {
    safeQuestions.push(normalizeQuestion(null, safeQuestions.length));
  }
  const safeHook = hook || "सिर्फ 5% स्टूडेंट ही सही उत्तर दे पाते हैं।";
  const safeCta = cta || "ऐसे 30 सवालों का पूरा टेस्ट Premium Books ई-बुक में। Link bio में।";
  const timeline = React.useMemo(() => buildShortTimeline(audio, ctaEnabled), [audio, ctaEnabled]);
  const fontCss = React.useMemo(() => muktaCss(), []);

  return (
    <AbsoluteFill style={{background: C.ink, overflow: "hidden", fontFamily: FONT, color: C.white}}>
      <MuktaFont />
      <style>{fontCss}</style>
      <EnergyBackdrop />

      <Sequence from={timeline.hook.from} durationInFrames={timeline.hook.sceneFrames}>
        <HookScene hook={safeHook} preview={preview} scene={timeline.hook} />
      </Sequence>

      {safeQuestions.map((q, index) => {
        const scene = timeline.questions[index];
        return (
          <Sequence key={index} from={scene.from} durationInFrames={scene.sceneFrames}>
            <ShortQuestionScene q={q} index={index} preview={preview} scene={scene} />
          </Sequence>
        );
      })}

      <Sequence from={timeline.answers.from} durationInFrames={timeline.answers.sceneFrames}>
        <ShortAnswersScene questions={safeQuestions} preview={preview} scene={timeline.answers} />
      </Sequence>

      {timeline.cta ? (
        <Sequence from={timeline.cta.from} durationInFrames={timeline.cta.sceneFrames}>
          <ShortCtaScene cta={safeCta} preview={preview} scene={timeline.cta} />
        </Sequence>
      ) : null}

      <GlobalProgress totalFrames={timeline.totalFrames} />
    </AbsoluteFill>
  );
};
