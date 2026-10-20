import asyncio, json, os, re, subprocess
from pathlib import Path
import edge_tts

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data"/"questions.json"
OUT=ROOT/"public"/"audio"
VOICE=os.environ.get("EDGE_TTS_VOICE","hi-IN-SwaraNeural")
RATE=os.environ.get("EDGE_TTS_RATE","+0%")
FPS=30
# No fixed scene length: real narration duration drives the scene, while the
# thinking pause and ending hold scale with the number of spoken words.
PAUSE_BASE_SECONDS=float(os.environ.get("QUIZ_PAUSE_BASE_SECONDS","0.9"))
PAUSE_SECONDS_PER_WORD=float(os.environ.get("QUIZ_PAUSE_SECONDS_PER_WORD","0.045"))
PAUSE_MAX_SECONDS=float(os.environ.get("QUIZ_PAUSE_MAX_SECONDS","4.0"))
TAIL_BASE_SECONDS=float(os.environ.get("QUIZ_TAIL_BASE_SECONDS","0.5"))
TAIL_SECONDS_PER_WORD=float(os.environ.get("QUIZ_TAIL_SECONDS_PER_WORD","0.03"))
TAIL_MAX_SECONDS=float(os.environ.get("QUIZ_TAIL_MAX_SECONDS","2.0"))
QUESTION_AUDIO_BUFFER=float(os.environ.get("QUIZ_QUESTION_AUDIO_BUFFER","0.35"))
EXPLANATION_AUDIO_BUFFER=float(os.environ.get("QUIZ_EXPLANATION_AUDIO_BUFFER","0.55"))

OUT.mkdir(parents=True,exist_ok=True)

def question_text(q,i):
    opts=q.get("options",[])
    letters=["A","B","C","D"]
    parts=[f"प्रश्न संख्या {i+1}. {q['question']}"]
    parts += [f"विकल्प {letters[j]}. {opts[j]}." for j in range(min(4,len(opts)))]
    return " ".join(parts)

def answer_text(q):
    opts=q.get("options",[])
    ans=int(q.get("answer",0))
    answer=opts[ans] if 0 <= ans < len(opts) else "उपलब्ध नहीं"
    return f"सही उत्तर है, {answer}। {q.get('explanation','')}"

async def save(text,path):
    await edge_tts.Communicate(text,VOICE,rate=RATE).save(str(path))

def audio_duration(path):
    # FFprobe is included with FFmpeg. It measures the actual generated audio duration.
    cmd=["ffprobe","-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",str(path)]
    result=subprocess.run(cmd,capture_output=True,text=True,check=True)
    return float(result.stdout.strip())

def frames(seconds):
    return max(1, round(seconds*FPS))

def word_count(text):
    return len(re.findall(r"\S+", text or ""))

def question_words(q):
    return word_count(q.get("question","")) + sum(word_count(option) for option in q.get("options",[]))

def thinking_pause_seconds(q):
    seconds=PAUSE_BASE_SECONDS+question_words(q)*PAUSE_SECONDS_PER_WORD
    return min(PAUSE_MAX_SECONDS,max(PAUSE_BASE_SECONDS,seconds))

def ending_tail_seconds(q):
    seconds=TAIL_BASE_SECONDS+word_count(q.get("explanation",""))*TAIL_SECONDS_PER_WORD
    return min(TAIL_MAX_SECONDS,max(TAIL_BASE_SECONDS,seconds))

async def main():
    questions=json.loads(DATA.read_text(encoding="utf-8"))
    if not questions: raise SystemExit("questions.json खाली है")
    props_path=ROOT/"data"/"render-props.json"
    props_path.write_text(json.dumps({"questions":questions},ensure_ascii=False,indent=2),encoding="utf-8")
    timings=[]
    for i,q in enumerate(questions):
        stem=OUT/f"q{i+1:03}-question.mp3"
        reveal=OUT/f"q{i+1:03}-explanation.mp3"
        print(f"[{i+1}/{len(questions)}] Hindi narration")
        await save(question_text(q,i),stem)
        await save(answer_text(q),reveal)
        q_audio=audio_duration(stem)
        a_audio=audio_duration(reveal)
        # Small per-clip safety buffer only; no fixed minimum scene duration.
        q_seconds=q_audio+QUESTION_AUDIO_BUFFER
        a_seconds=a_audio+EXPLANATION_AUDIO_BUFFER
        q_frames=frames(q_seconds)
        a_frames=frames(a_seconds)
        pause_seconds=thinking_pause_seconds(q)
        tail_seconds=ending_tail_seconds(q)
        pause_frames=frames(pause_seconds)
        tail_frames=frames(tail_seconds)
        scene_frames=q_frames+pause_frames+a_frames+tail_frames
        q_words=question_words(q)
        explanation_words=word_count(q.get("explanation",""))
        timings.append({
            "questionAudioSeconds":round(q_audio,3),
            "explanationAudioSeconds":round(a_audio,3),
            "narrationSeconds":round(q_audio+a_audio,3),
            "questionWords":q_words,
            "explanationWords":explanation_words,
            "pauseSeconds":round(pause_seconds,3),
            "tailSeconds":round(tail_seconds,3),
            "questionFrames":q_frames,
            "pauseFrames":pause_frames,
            "explanationFrames":a_frames,
            "tailFrames":tail_frames,
            "sceneFrames":scene_frames,
            "sceneSeconds":round(scene_frames/FPS,3)
        })
        print(f"   words: question+options={q_words}, explanation={explanation_words}; audio={q_audio+a_audio:.2f}s; pause={pause_seconds:.2f}s; scene={scene_frames/FPS:.2f}s")
    timing_payload={"fps":FPS,"timingMode":"narration-audio + word-scaled pause/tail","timings":timings}
    (ROOT/"data"/"timings.json").write_text(json.dumps(timing_payload,ensure_ascii=False,indent=2),encoding="utf-8")
    (ROOT/"data"/"render-props.json").write_text(json.dumps({"questions":questions,"timings":timings},ensure_ascii=False,indent=2),encoding="utf-8")
    total=sum(t["sceneFrames"] for t in timings)
    print(f"\\nDone: {len(questions)} questions. Dynamic total = {total/FPS/60:.2f} minutes.")
    print(f"Timing file: {ROOT/'data'/'timings.json'}")
asyncio.run(main())
