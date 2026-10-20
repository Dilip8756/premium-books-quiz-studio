import asyncio, json, os, subprocess
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "short.json"
OUT = ROOT / "public" / "audio"
REPORT = ROOT / "data" / "short-audio.json"
PROPS = ROOT / "data" / "short-props.json"
VOICE = os.environ.get("EDGE_TTS_VOICE", "hi-IN-SwaraNeural")
RATE = os.environ.get("EDGE_TTS_RATE", "+0%")
FPS = 30
LETTERS = ["A", "B", "C", "D"]
ORDINALS = ["पहला", "दूसरा", "तीसरा"]

OUT.mkdir(parents=True, exist_ok=True)

def rate_string(value):
    return value if value.endswith("%") else "+0%"

def question_text(q, i):
    parts = [f"प्रश्न {i + 1}. {q['question']}"]
    parts += [f"विकल्प {LETTERS[j]}. {q['options'][j]}." for j in range(4)]
    return " ".join(parts)

def answers_text(questions):
    parts = []
    for i, q in enumerate(questions):
        opts = q.get("options", [])
        idx = int(q.get("answer", 0))
        answer = opts[idx] if 0 <= idx < len(opts) else "उपलब्ध नहीं"
        parts.append(f"{ORDINALS[i]} जवाब — {answer}।")
    return " ".join(parts) + " याद रखें, यही सही उत्तर हैं।"

async def save_with_words(text, path):
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE, boundary="WordBoundary")
    audio = bytearray()
    words = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            start = chunk["offset"] / 10_000_000
            duration = chunk["duration"] / 10_000_000
            words.append({
                "text": chunk["text"],
                "start": round(start, 3),
                "end": round(start + duration, 3)
            })
    path.write_bytes(bytes(audio))
    return words

def audio_duration(path):
    cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
           "default=noprint_wrappers=1:nokey=1", str(path)]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return float(result.stdout.strip())

def make_tone(filename, frequency, seconds, volume):
    target = OUT / filename
    cmd = ["ffmpeg", "-y", "-f", "lavfi", "-i",
           f"sine=frequency={frequency}:duration={seconds}:sample_rate=44100",
           "-af", f"volume={volume},afade=t=out:st={max(0, seconds - 0.05):.2f}:d=0.05",
           "-c:a", "libmp3lame", "-b:a", "128k", str(target)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"   ! tone {filename} skipped")
        return
    print(f"   tone {filename} ready")

async def render_clip(label, text, stem, report):
    print(f"Short narration: {label}")
    words = await save_with_words(text, OUT / stem)
    seconds = audio_duration(OUT / stem)
    report["clips"][label] = {
        "file": stem,
        "seconds": round(seconds, 3),
        "words": words
    }
    print(f"   {label}: {seconds:.2f}s, {len(words)} word boundaries")

async def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    questions = data.get("questions", [])
    if len(questions) != 3:
        raise SystemExit("short.json में ठीक 3 प्रश्न होने चाहिए।")
    for i, q in enumerate(questions):
        if not q.get("question") or len(q.get("options", [])) != 4:
            raise SystemExit(f"Short प्रश्न {i + 1}: question और 4 options जरूरी हैं।")
        if not 0 <= int(q.get("answer", -1)) <= 3:
            raise SystemExit(f"Short प्रश्न {i + 1}: सही विकल्प चुनें।")

    print("Short narration: hook")
    report = {
        "voice": VOICE,
        "rate": rate_string(RATE),
        "fps": FPS,
        "clips": {}
    }
    await render_clip(
        "hook",
        data.get("hookVoice") or data.get("hook") or "3 सवाल, 3 सेकंड।",
        "short-hook.mp3",
        report
    )

    for i, q in enumerate(questions):
        await render_clip(f"q{i + 1}", question_text(q, i), f"short-q{i + 1}.mp3", report)

    await render_clip("answers", answers_text(questions), "short-answers.mp3", report)
    await render_clip(
        "cta",
        data.get("cta") or "Premium Books पर पूरा टेस्ट देखें।",
        "short-cta.mp3",
        report
    )

    print("Countdown tones")
    make_tone("short-tick.mp3", 1180, 0.12, 0.42)
    make_tone("short-tock.mp3", 820, 0.12, 0.36)
    make_tone("short-reveal.mp3", 1318.5, 0.34, 0.3)

    report["totalSpeechSeconds"] = round(sum(c["seconds"] for c in report["clips"].values()), 3)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    props = {key: value for key, value in data.items() if key != "audio"}
    props["audio"] = report
    PROPS.write_text(json.dumps(props, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nDone. Total narration = {report['totalSpeechSeconds']:.2f}s; timing is resolved at render time.")
    print(f"Report: {REPORT}")
    print(f"Render props: {PROPS}")

asyncio.run(main())
