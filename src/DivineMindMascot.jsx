import React from "react";

const TALKING_SHAPES = ["wide", "round", "small", "round", "wide", "small"];
const wordShapeOffset = (text) => {
  let hash = 0;
  for (const character of String(text || "")) hash = (hash + character.codePointAt(0)) % 997;
  return hash;
};

export const DivineMindMascot = ({frame, speaking, portrait = false, idPrefix = "mind", speechFrame, speechWords}) => {
  const svgId = (name) => `${idPrefix}-${name}`;
  const orbitAngle = (frame / 540) * 360;
  const mouthFrame = Number.isFinite(speechFrame) ? speechFrame : frame;
  const activeWord = Array.isArray(speechWords) && speechWords.length
    ? speechWords.find((word) => mouthFrame >= word.from - 1 && mouthFrame <= word.to + 1)
    : null;
  const talking = Array.isArray(speechWords) && speechWords.length ? Boolean(activeWord) : speaking;
  const pulse = talking ? 1 + Math.sin(mouthFrame * 0.85) * 0.018 : 1;
  const blinking = !talking && frame % 150 < 5;
  const mouthShape = talking
    ? TALKING_SHAPES[(wordShapeOffset(activeWord?.text) + Math.floor((mouthFrame - (activeWord?.from || 0)) / 2.2)) % TALKING_SHAPES.length]
    : "closed";
  const showTeethLine = mouthShape === "wide" || mouthShape === "teeth";

  return (
    <svg
      viewBox="0 0 420 600"
      role="img"
      aria-label="Divine Premium Mind mascot"
      style={{
        position: "relative",
        zIndex: 1,
        width: portrait ? "auto" : "100%",
        height: portrait ? "100%" : "94%",
        maxWidth: portrait ? "100%" : undefined,
        overflow: "visible",
        filter: "drop-shadow(0 16px 15px rgba(0,0,0,.4))"
      }}
    >
      <defs>
        <radialGradient id={svgId("aura")} cx="50%" cy="42%" r="58%">
          <stop offset="0" stopColor="#fff7c8" stopOpacity=".95" />
          <stop offset=".35" stopColor="#f6c44b" stopOpacity=".38" />
          <stop offset="1" stopColor="#f6c44b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={svgId("brainGold")} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fff3a6" />
          <stop offset=".32" stopColor="#f8ce58" />
          <stop offset=".68" stopColor="#d99a24" />
          <stop offset="1" stopColor="#8e5616" />
        </linearGradient>
        <linearGradient id={svgId("brainEdge")} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#fff5b8" />
          <stop offset="1" stopColor="#9a641b" />
        </linearGradient>
        <filter id={svgId("glow")}>
          <feGaussianBlur stdDeviation="10" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle
        cx="210"
        cy="244"
        r="185"
        fill={`url(#${svgId("aura")})`}
        style={{filter: "blur(11px)", opacity: .72}}
      />
      <path id={svgId("orbitPath")} d="M 210,78 A 166,166 0 1,1 209.9,78" fill="none" />
      <g
        aria-label="Premium Books Quiz Study"
        style={{transform: `rotate(${orbitAngle}deg)`, transformOrigin: "210px 244px"}}
      >
        <text fill="#fff0a0" fontSize="15" fontWeight="900" letterSpacing="2.4">
          <textPath href={`#${svgId("orbitPath")}`} startOffset="0%">
            PREMIUM • BOOKS • QUIZ • STUDY • PREMIUM • BOOKS • QUIZ • STUDY •{" "}
          </textPath>
        </text>
      </g>

      <g opacity=".8" stroke="#ffe98c" strokeWidth="3" strokeLinecap="round">
        <path d="M210 30v25 M210 433v24 M48 244h25 M347 244h25 M94 113l18 18 M310 355l18 18 M326 113l-18 18 M112 355l-18 18" />
        <circle cx="210" cy="244" r="151" fill="none" strokeDasharray="3 15" />
      </g>

      <ellipse cx="210" cy="520" rx="132" ry="22" fill="#020915" opacity=".65" />
      <path d="M119 473 Q210 498 301 473 L322 514 Q210 545 98 514Z" fill="#132f50" stroke="#e8b747" strokeWidth="4" />
      <ellipse cx="210" cy="475" rx="92" ry="20" fill="#f5c64e" stroke="#fff0a0" strokeWidth="3" />
      <ellipse cx="210" cy="474" rx="72" ry="12" fill="#173b5b" />

      <g
        stroke={`url(#${svgId("brainEdge")})`}
        strokeWidth="5"
        strokeLinejoin="round"
        filter={`url(#${svgId("glow")})`}
        style={{transform: `scale(${pulse})`, transformBox: "fill-box", transformOrigin: "center"}}
      >
        <path d="M207 148 C188 113 145 116 129 145 C93 145 77 176 88 204 C60 231 75 266 98 279 C82 314 107 343 137 343 C146 375 181 387 207 364Z" fill={`url(#${svgId("brainGold")})`} />
        <path d="M213 148 C232 113 275 116 291 145 C327 145 343 176 332 204 C360 231 345 266 322 279 C338 314 313 343 283 343 C274 375 239 387 213 364Z" fill={`url(#${svgId("brainGold")})`} />
        <path d="M210 146 Q201 182 210 209 Q196 239 210 267 Q198 302 210 365" fill="none" stroke="#9a641b" strokeWidth="5" />
        <path d="M130 159 Q160 148 169 176 Q172 197 151 208 Q126 219 139 242 Q153 261 178 245 M100 214 Q122 201 134 224 Q141 244 119 257 M114 292 Q144 270 162 292 Q177 312 155 333 M170 139 Q188 161 178 184 M188 214 Q168 227 181 249 Q193 266 178 285 Q165 303 185 324" fill="none" stroke="#9d671d" strokeWidth="6" strokeLinecap="round" />
        <path d="M290 159 Q260 148 251 176 Q248 197 269 208 Q294 219 281 242 Q267 261 242 245 M320 214 Q298 201 286 224 Q279 244 301 257 M306 292 Q276 270 258 292 Q243 312 265 333 M250 139 Q232 161 242 184 M232 214 Q252 227 239 249 Q227 266 242 285 Q255 303 235 324" fill="none" stroke="#9d671d" strokeWidth="6" strokeLinecap="round" />
      </g>

      <g>
        <path d="M151 244 Q169 230 186 244 M234 244 Q251 230 269 244" fill="none" stroke="#5c3511" strokeWidth="7" strokeLinecap="round" />
        <g style={{opacity: blinking ? 0.2 : 1}}>
          <ellipse cx="169" cy="259" rx="10" ry="13" fill="#fff8dd" />
          <ellipse cx="251" cy="259" rx="10" ry="13" fill="#fff8dd" />
          <ellipse cx="171" cy="261" rx="5" ry="8" fill="#182b46" />
          <ellipse cx="249" cy="261" rx="5" ry="8" fill="#182b46" />
          <circle cx="173" cy="258" r="2.5" fill="#fff" />
          <circle cx="251" cy="258" r="2.5" fill="#fff" />
        </g>
        <g>
          <path d="M187 307 Q210 315 233 307" fill="none" stroke="#7d2f2c" strokeWidth="7" strokeLinecap="round" opacity={mouthShape === "closed" ? 1 : 0} />
          <path d="M192 302 Q210 325 228 302 Q210 337 192 302Z" fill="#7d2f2c" opacity={mouthShape === "small" ? 1 : 0} />
          <ellipse cx="210" cy="310" rx="24" ry="19" fill="#7d2f2c" opacity={mouthShape === "wide" ? 1 : 0} />
          <ellipse cx="210" cy="309" rx="13" ry="18" fill="#7d2f2c" opacity={mouthShape === "round" ? 1 : 0} />
          <path d="M191 302 Q210 312 229 302 Q210 326 191 302Z" fill="#7d2f2c" opacity={mouthShape === "teeth" ? 1 : 0} />
          <path d="M197 306 Q210 312 223 306" fill="none" stroke="#fff5d7" strokeWidth="4" strokeLinecap="round" opacity={showTeethLine ? 1 : 0} />
        </g>
      </g>

      <g fill="#fff2a0">
        <path d="M73 176l6 15 15 6-15 6-6 15-6-15-15-6 15-6Z" />
        <path d="M344 306l5 12 12 5-12 5-5 12-5-12-12-5 12-5Z" />
        <circle cx="116" cy="375" r="5" />
        <circle cx="307" cy="132" r="5" />
      </g>
    </svg>
  );
};
