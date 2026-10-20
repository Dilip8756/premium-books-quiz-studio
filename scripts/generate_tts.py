import asyncio, json, os, subprocess
from pathlib import Path
import edge_tts

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data"/"questions.json"
OUT=ROOT/"public"/"audio"
VOICE=os.environ.get("EDGE_TTS_VOICE","hi-IN-SwaraNeural")
RATE=os.environ.get("EDGE_TTS_RATE","+0%")
FPS=30
PAUSE_SECONDS=float(os.environ.get("QUIZ_THINK_SECONDS","3"))
TAIL_SECONDS=float(os.environ.get("QUIZ_TAIL_SECONDS","1.0"))
MIN_QUESTION_SECONDS=float(os.environ.get("QUIZ_MIN_QUESTION_SECONDS","5"))
MIN_EXPLANATION_SECONDS=float(os.environ.get("QUIZ_MIN_EXPLANATION_SECONDS","4"))

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
        # Add a small safety buffer after each clip so the final syllable is not cut.
        q_seconds=max(MIN_QUESTION_SECONDS,q_audio+0.45)
        a_seconds=max(MIN_EXPLANATION_SECONDS,a_audio+0.65)
        q_frames=frames(q_seconds)
        a_frames=frames(a_seconds)
        pause_frames=frames(PAUSE_SECONDS)
        scene_frames=q_frames+pause_frames+a_frames+frames(TAIL_SECONDS)
        timings.append({
            "questionAudioSeconds":round(q_audio,3),
            "explanationAudioSeconds":round(a_audio,3),
            "questionFrames":q_frames,
            "pauseFrames":pause_frames,
            "explanationFrames":a_frames,
            "tailFrames":frames(TAIL_SECONDS),
            "sceneFrames":scene_frames,
            "sceneSeconds":round(scene_frames/FPS,3)
        })
        print(f"   audio: question={q_audio:.2f}s, answer/explanation={a_audio:.2f}s; scene={scene_frames/FPS:.2f}s")
    timing_payload={"fps":FPS,"pauseSeconds":PAUSE_SECONDS,"tailSeconds":TAIL_SECONDS,"timings":timings}
    (ROOT/"data"/"timings.json").write_text(json.dumps(timing_payload,ensure_ascii=False,indent=2),encoding="utf-8")
    (ROOT/"data"/"render-props.json").write_text(json.dumps({"questions":questions,"timings":timings},ensure_ascii=False,indent=2),encoding="utf-8")
    total=sum(t["sceneFrames"] for t in timings)
    print(f"\\nDone: {len(questions)} questions. Dynamic total = {total/FPS/60:.2f} minutes.")
    print(f"Timing file: {ROOT/'data'/'timings.json'}")
asyncio.run(main())
