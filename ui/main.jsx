import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Player} from '@remotion/player';
import {PremiumBooksQuiz} from '../src/QuizVideo.jsx';
import {PremiumBooksShort, SHORT_WIDTH, SHORT_HEIGHT} from '../src/ShortVideo.jsx';
import {SHORT_FPS, buildShortTimeline, formatShortTime} from '../src/shortTimeline.js';
import fallbackShort from '../data/short.json';
import './styles.css';

const LETTERS = ['A', 'B', 'C', 'D'];
const FALLBACK_TIMING = {questionFrames: 300, pauseFrames: 90, explanationFrames: 270, tailFrames: 0, sceneFrames: 660};

function durationFrom(timings, count) {
  if (Array.isArray(timings) && timings.length === count && timings.every(t => Number(t.sceneFrames) > 0)) {
    return timings.reduce((sum, t) => sum + Number(t.sceneFrames), 0);
  }
  return Math.max(1, count) * FALLBACK_TIMING.sceneFrames;
}
function App() {
  const [questions, setQuestions] = useState([]);
  const [timings, setTimings] = useState([]);
  const [index, setIndex] = useState(0);
  const [ratio, setRatio] = useState('landscape');
  const [voice, setVoice] = useState('hi-IN-SwaraNeural');
  const [rate, setRate] = useState('+0%');
  const [busySave, setBusySave] = useState(false);
  const [message, setMessage] = useState('Project load हो रहा है…');
  const [job, setJob] = useState(null);
  const [jobAction, setJobAction] = useState('');
  const [lastOutput, setLastOutput] = useState('');
  const [showLogs, setShowLogs] = useState(true);
  const [short, setShort] = useState(fallbackShort);
  const [showShort, setShowShort] = useState(false);
  const [shortMessage, setShortMessage] = useState('Short content load हो रहा है…');
  const [busyShortSave, setBusyShortSave] = useState(false);
  const [busyShortRender, setBusyShortRender] = useState(false);
  const jobRunning = Boolean(job && ['running', 'queued'].includes(job.status));
  const current = questions[index] || null;
  const portrait = ratio === 'portrait';
  const durationInFrames = useMemo(() => durationFrom(timings, questions.length), [timings, questions.length]);
  const previewTimings = useMemo(() => {
    if (timings.length === questions.length && timings.every(t => Number(t.sceneFrames) > 0)) return timings;
    return questions.map(() => ({...FALLBACK_TIMING}));
  }, [questions, timings]);

  const loadProject = useCallback(async () => {
    try {
      const res = await fetch('/api/questions');
      if (!res.ok) throw new Error('API ने project data नहीं दिया।');
      const data = await res.json();
      setQuestions(data.questions || []);
      setTimings(Array.isArray(data.timings) ? data.timings : []);
      setMessage(`${(data.questions || []).length} सवाल लोड हुए। Preview तैयार है।`);
    } catch (err) {
      setMessage(`Project load नहीं हुआ: ${err.message}`);
    }
  }, []);
  useEffect(() => { loadProject(); }, [loadProject]);

  const loadShort = useCallback(async () => {
    try {
      const res = await fetch('/api/short');
      if (!res.ok) throw new Error('Short content API से नहीं मिला।');
      const data = await res.json();
      setShort(data);
      setShortMessage('Short content तैयार है।');
    } catch (err) {
      setShortMessage(`Short content load नहीं हुआ: ${err.message}`);
    }
  }, []);
  useEffect(() => { loadShort(); }, [loadShort]);

  const updateShort = useCallback((updater) => {
    setShort(updater);
    setShortMessage('Unsaved changes — Save दबाएँ।');
  }, []);

  useEffect(() => {
    if (!job || !['running', 'queued'].includes(job.status)) return undefined;
    const timer = setInterval(async () => {
      try {
        const res = await fetch('/api/jobs/latest');
        if (!res.ok) return;
        const data = await res.json();
        if (data.job) {
          setJob(data.job);
          if (data.job.status === 'completed') {
            const doneMessage = data.job.type === 'short-render'
              ? 'Short video render पूरा हुआ। Output नीचे उपलब्ध है।'
              : data.job.type === 'render'
                ? 'Render पूरा हुआ। Output नीचे उपलब्ध है।'
                : 'Task सफलतापूर्वक पूरा हुआ।';
            setMessage(doneMessage);
            if (data.job.type === 'short-render') {
              setShortMessage('✅ Short render पूरा हुआ।');
              await loadShort();
            }
            if (data.job.outputUrl) setLastOutput(data.job.outputUrl);
            await loadProject();
          } else if (data.job.status === 'failed') {
            setMessage('Task failed. Logs देखें और error ठीक करें।');
            if (data.job.type === 'short-render') setShortMessage('❌ Short render failed — Task Log में error देखें।');
          }
        }
      } catch { /* next poll retries */ }
    }, 1200);
    return () => clearInterval(timer);
  }, [job, loadProject, loadShort]);

  const updateCurrent = (patch) => {
    setQuestions(old => old.map((q, i) => i === index ? {...q, ...patch} : q));
  };
  const updateOption = (optionIndex, value) => {
    if (!current) return;
    setQuestions(old => old.map((q, i) => i === index ? {...q, options: q.options.map((op, j) => j === optionIndex ? value : op)} : q));
  };
  const persistQuestions = async (quiet=false) => {
    setBusySave(true);
    try {
      const res = await fetch('/api/questions', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({questions})});
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Save असफल');
      setMessage(`Saved: ${questions.length} सवाल।`);
      if (!quiet) setMessage(`✅ ${questions.length} सवाल सुरक्षित किए गए।`);
      return true;
    } catch (err) {
      setMessage(`❌ Save नहीं हुआ: ${err.message}`);
      return false;
    } finally { setBusySave(false); }
  };

  const startJob = async (type) => {
    if (!questions.length) { setMessage('पहले सवाल जोड़ें।'); return; }
    if (job && ['running','queued'].includes(job.status)) { setMessage('एक task पहले से चल रहा है।'); return; }
    const saved = await persistQuestions(true);
    if (!saved) return;
    setJobAction(type);
    setLastOutput('');
    try {
      const res = await fetch('/api/jobs', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({type, ratio, voice, rate})});
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Task start नहीं हुआ');
      setJob(body.job);
      setMessage(type === 'render' ? 'Render शुरू हो गया है…' : type === 'audio' ? 'Hindi voice-over तैयार हो रहा है…' : 'Validation चल रही है…');
    } catch (err) { setMessage(`❌ ${err.message}`); }
  };

  const persistShort = async (quiet=false) => {
    setBusyShortSave(true);
    try {
      const res = await fetch('/api/short', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(short)});
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Short save असफल');
      if (!quiet) setShortMessage('✅ Short content saved — 3 सवाल तैयार हैं।');
      return true;
    } catch (err) {
      setShortMessage(`❌ ${err.message}`);
      return false;
    } finally { setBusyShortSave(false); }
  };

  const startShortRender = async () => {
    if (jobRunning) { setShortMessage('एक task पहले से चल रहा है। पहले उसे पूरा होने दें।'); return; }
    setBusyShortRender(true);
    try {
      const saved = await persistShort(true);
      if (!saved) return;
      setJobAction('short-render');
      setLastOutput('');
      const res = await fetch('/api/jobs', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({type:'short-render', voice, rate})});
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Short render start नहीं हुआ');
      setJob(body.job);
      setShortMessage('Short render शुरू हो गया…');
      setMessage('Short render शुरू हो गया — Task Log में progress देखें।');
      setShowShort(false);
    } catch (err) {
      setShortMessage(`❌ ${err.message}`);
    } finally {
      setBusyShortRender(false);
    }
  };

  const addQuestion = async () => {
    const q = {question:'नया प्रश्न यहाँ लिखें?', options:['विकल्प A','विकल्प B','विकल्प C','विकल्प D'], answer:0, explanation:'सही उत्तर की संक्षिप्त व्याख्या लिखें।', category:'सामान्य ज्ञान'};
    setQuestions(old => [...old, q]);
    setIndex(questions.length);
    setMessage('नया प्रश्न जोड़ा गया है। Save Changes दबाएँ।');
  };
  const removeQuestion = () => {
    if (questions.length <= 1) { setMessage('कम से कम एक प्रश्न रखना जरूरी है।'); return; }
    setQuestions(old => old.filter((_, i) => i !== index));
    setIndex(Math.max(0, index - 1));
    setMessage('प्रश्न हटाया गया। बदलाव सुरक्षित करने के लिए Save Changes दबाएँ।');
  };

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-lockup"><div className="pb-mark">PB</div><div><div className="brand-title">PREMIUM BOOKS <span>QUIZ STUDIO</span></div><div className="brand-subtitle">UPPSC • PSC • SSC • RAILWAY • UP Police • BPSC</div></div></div>
      <div className="topbar-right"><span className="local-pill"><i /> Local project</span><div className="question-count">{questions.length} Questions</div></div>
    </header>

    <main className="workspace">
      <section className="welcome-row">
        <div><div className="eyebrow">VIDEO WORKSPACE</div><h1>Quiz editor &amp; live preview</h1><p>सवाल edit करें, preview देखें और उसी project से MP4 render करें।</p></div>
        <div className="welcome-controls">
          <button className="button short-open-button" onClick={()=>setShowShort(true)}><span className="short-open-badge">9:16</span><span>Short video <small>auto timing</small></span></button>
          <div className="ratio-switch" role="group" aria-label="Video ratio"><span>Aspect ratio</span><button className={!portrait?'active':''} onClick={()=>setRatio('landscape')}>▰ 16:9 Landscape</button><button className={portrait?'active':''} onClick={()=>setRatio('portrait')}>▯ 9:16 Portrait</button></div>
        </div>
      </section>

      <div className="main-grid">
        <section className="panel preview-panel">
          <div className="panel-heading"><div><span className="section-index">01</span><h2>Live Preview</h2></div><span className="live-indicator"><i /> PLAYER READY</span></div>
          <div className={`player-stage ${portrait?'portrait-stage':''}`}>
            {questions.length ? <Player key={ratio} component={PremiumBooksQuiz} inputProps={{questions, timings:previewTimings, portrait, preview:true}} durationInFrames={durationInFrames} fps={30} compositionWidth={portrait?1080:1920} compositionHeight={portrait?1920:1080} controls loop clickToPlay style={{width:'100%',height:'100%'}} /> : <div className="empty-state">Questions load होने पर preview दिखाई देगा।</div>}
          </div>
          <div className="preview-note"><span>ⓘ Preview में audio muted है। Final render में generated Hindi narration इस्तेमाल होगी।</span><span>{portrait?'1080 × 1920':'1920 × 1080'} · 30 FPS</span></div>
          <div className="preview-actions"><button className="button secondary" onClick={()=>startJob('validate')} disabled={job?.status==='running'}>✓ Validate Questions</button><button className="button secondary" onClick={()=>startJob('audio')} disabled={job?.status==='running'}>♫ Generate Voice-over</button><button className="button primary" onClick={()=>startJob('render')} disabled={job?.status==='running'}>▶ Render MP4</button></div>
          <div className="status-line"><span className={`status-dot ${job?.status==='running'?'is-running':job?.status==='failed'?'is-failed':'is-ready'}`} />{message}</div>
          {lastOutput && <a className="output-link" href={lastOutput} target="_blank" rel="noreferrer">⬇ Open rendered MP4</a>}
        </section>

        <section className="panel editor-panel">
          <div className="panel-heading"><div><span className="section-index">02</span><h2>Question Editor</h2></div><span className="autosave-label">Manual save</span></div>
          <div className="question-nav"><button className="icon-button" onClick={()=>setIndex(Math.max(0,index-1))} disabled={index===0}>←</button><div className="current-question-label">QUESTION <strong>{questions.length?index+1:0}</strong><span>/ {questions.length}</span></div><button className="icon-button" onClick={()=>setIndex(Math.min(questions.length-1,index+1))} disabled={index>=questions.length-1}>→</button><button className="icon-button add" onClick={addQuestion} title="Add question">＋</button></div>
          {current ? <div className="form-scroll">
            <label className="field-label">Question</label><textarea className="text-input question-input" value={current.question||''} onChange={e=>updateCurrent({question:e.target.value})} rows={3} placeholder="हिंदी में सवाल लिखें…" />
            <div className="field-label options-label">Options <small>Exactly 4 options</small></div>
            <div className="options-editor">{(current.options||['','','','']).map((op,i)=><label className={`option-input-row ${Number(current.answer)===i?'correct-selected':''}`} key={i}><span className="option-letter">{LETTERS[i]}</span><input className="text-input" value={op} onChange={e=>updateOption(i,e.target.value)} placeholder={`विकल्प ${LETTERS[i]}`} /><button type="button" className={`answer-radio ${Number(current.answer)===i?'selected':''}`} title={Number(current.answer)===i?'Correct answer':'Mark as correct'} onClick={()=>updateCurrent({answer:i})}>{Number(current.answer)===i?'✓':''}</button></label>)}</div>
            <label className="field-label">Category</label><input className="text-input" value={current.category||''} onChange={e=>updateCurrent({category:e.target.value})} placeholder="जैसे सामान्य ज्ञान / विज्ञान / गणित" />
            <label className="field-label">Explanation (shown after answer)</label><textarea className="text-input" value={current.explanation||''} onChange={e=>updateCurrent({explanation:e.target.value})} rows={3} placeholder="उत्तर की छोटी व्याख्या…" />
            <div className="editor-bottom"><button className="text-button danger" onClick={removeQuestion}>Delete question</button><button className="button primary save-button" onClick={()=>persistQuestions(false)} disabled={busySave}>{busySave?'Saving…':'Save Changes'}</button></div>
          </div> : <div className="empty-state">कोई सवाल नहीं है। + बटन से जोड़ें।</div>}
        </section>
      </div>

      <section className="panel settings-panel">
        <div className="panel-heading"><div><span className="section-index">03</span><h2>Voice &amp; Render Settings</h2></div><span className="settings-tag">Render target: {portrait?'Shorts / Reels':'YouTube Landscape'}</span></div>
        <div className="settings-grid">
          <label className="settings-field"><span>Hindi voice</span><select value={voice} onChange={e=>setVoice(e.target.value)}><option value="hi-IN-SwaraNeural">Swara · Female Hindi</option><option value="hi-IN-MadhurNeural">Madhur · Male Hindi</option></select></label>
          <label className="settings-field"><span>Speech rate</span><select value={rate} onChange={e=>setRate(e.target.value)}><option value="-5%">−5% · Slower</option><option value="+0%">Normal</option><option value="+10%">+10% · Faster</option></select></label>
          <div className="settings-info"><span>Export size</span><strong>{portrait?'1080 × 1920':'1920 × 1080'}</strong><small>H.264 MP4 · 30 FPS</small></div>
          <div className="settings-info"><span>Output folder</span><strong>output/</strong><small>Saved in this project directory</small></div>
        </div>
      </section>

      <section className="panel job-panel">
        <div className="panel-heading"><div><span className="section-index">04</span><h2>Task Log</h2></div><button className="text-button" onClick={()=>setShowLogs(!showLogs)}>{showLogs?'Hide logs':'Show logs'}</button></div>
        <div className="job-summary"><div><span className="job-label">Current task</span><strong>{job ? `${job.type.toUpperCase()} · ${job.status}` : 'Ready'}</strong></div><div><span className="job-label">Progress</span><strong>{job?.status==='running'?'Running locally…':job?.status==='completed'?'Complete':job?.status==='failed'?'Needs attention':'Waiting for an action'}</strong></div>{job?.outputUrl && <a href={job.outputUrl} className="text-button" target="_blank" rel="noreferrer">Open output ↗</a>}</div>
        {showLogs && <pre className="log-box">{job?.logs?.length ? job.logs.slice(-120).join('\n') : 'No logs yet. Validate, generate voice-over or render to see activity here.'}</pre>}
      </section>
      <footer className="footer">PREMIUM BOOKS · सीखें, सोचें, सही जवाब दें <span>premiumbooks.store</span></footer>
    </main>
    {showShort ? (
      <ShortVideoModal
        data={short}
        onChange={updateShort}
        onClose={()=>setShowShort(false)}
        onSave={()=>persistShort(false)}
        onRender={startShortRender}
        saving={busyShortSave}
        rendering={busyShortRender}
        jobRunning={jobRunning}
        message={shortMessage}
        voice={voice}
        rate={rate}
        lastOutput={lastOutput}
      />
    ) : null}
  </div>;
}

function ShortVideoModal({data, onChange, onClose, onSave, onRender, saving, rendering, jobRunning, message, voice, rate, lastOutput}) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const updateQuestion = (questionIndex, patch) => {
    onChange(prev => ({...prev, questions: prev.questions.map((q, i) => i === questionIndex ? {...q, ...patch} : q)}));
  };
  const updateOption = (questionIndex, optionIndex, value) => {
    onChange(prev => ({...prev, questions: prev.questions.map((q, i) => i === questionIndex ? {...q, options: q.options.map((option, j) => j === optionIndex ? value : option) } : q)}));
  };
  const voiceLabel = voice === 'hi-IN-MadhurNeural' ? 'Madhur · male' : 'Swara · female';
  const timeline = useMemo(() => buildShortTimeline(data.audio, data.ctaEnabled), [data.audio, data.ctaEnabled]);
  const totalLabel = formatShortTime(timeline.totalFrames);

  return <div className="short-modal-overlay" onMouseDown={(event)=>{ if (event.target === event.currentTarget) onClose(); }}>
    <div className="short-modal" role="dialog" aria-modal="true" aria-labelledby="short-modal-title">
      <header className="short-modal-head">
        <div>
          <div className="eyebrow">SHORT VIDEO · {totalLabel}</div>
          <h2 id="short-modal-title">Rapid-fire quiz short</h2>
          <p>Audio-driven timing · question + options narration · हर सवाल पर 3 सेकंड timer</p>
        </div>
        <button className="short-modal-close" type="button" onClick={onClose} aria-label="Close short video editor">✕</button>
      </header>

      <div className="short-modal-body">
        <div className="short-form">
          <section className="short-form-block">
            <div className="short-block-head">
              <span className="short-step">0:00–{formatShortTime(timeline.hook.sceneFrames)}</span>
              <div><h3>Pattern-break hook</h3><p>Hook की लंबाई narration से अपने आप तय होती है।</p></div>
            </div>
            <label className="field-label">Hook text <small>{String(data.hook || '').length}/160</small></label>
            <textarea className="text-input" rows={3} maxLength={160} value={data.hook || ''} onChange={(event)=>onChange(prev=>({...prev, hook:event.target.value}))} placeholder="जैसे: 97% अभ्यर्थी ये 3 सवाल गलत करते हैं।" />
            <label className="field-label">Hook voice-over <small>auto length</small></label>
            <input className="text-input" maxLength={90} value={data.hookVoice || ''} onChange={(event)=>onChange(prev=>({...prev, hookVoice:event.target.value}))} placeholder="छोटी voice line: 97% यहाँ गलती करते हैं।" />
            <div className="short-help">Narration पूरी बोली जाएगी — timing audio की असली length से बनती है, कुछ कटता नहीं।</div>
          </section>

          {data.questions.map((q, questionIndex) => <section className="short-form-block short-question-block" key={questionIndex}>
            <div className="short-block-head">
              <span className="short-step">Q{questionIndex + 1}</span>
              <div><h3>Rapid question {questionIndex + 1}</h3><p>{Math.round(timeline.questions[questionIndex].sceneFrames / SHORT_FPS)} sec · question + options narration</p></div>
              <span className="short-timer-chip">3 sec timer</span>
            </div>
            <label className="field-label">Question</label>
            <textarea className="text-input" rows={2} value={q.question || ''} onChange={(event)=>updateQuestion(questionIndex, {question:event.target.value})} placeholder="हिंदी में छोटा सवाल लिखें…" />
            <div className="field-label options-label">Options <small>सही उत्तर पर ✓ दबाएँ</small></div>
            <div className="short-options-editor">
              {(q.options || ['', '', '', '']).map((option, optionIndex) => <label className={`option-input-row ${Number(q.answer) === optionIndex ? 'correct-selected' : ''}`} key={optionIndex}>
                <span className="option-letter">{LETTERS[optionIndex]}</span>
                <input className="text-input" value={option || ''} onChange={(event)=>updateOption(questionIndex, optionIndex, event.target.value)} placeholder={`विकल्प ${LETTERS[optionIndex]}`} />
                <button type="button" className={`answer-radio ${Number(q.answer) === optionIndex ? 'selected' : ''}`} title={Number(q.answer) === optionIndex ? 'Correct answer' : 'Mark as correct'} onClick={()=>updateQuestion(questionIndex, {answer:optionIndex})}>{Number(q.answer) === optionIndex ? '✓' : ''}</button>
              </label>)}
            </div>
            <div className="short-help">Options भी narration में बोले जाएँगे और उनके बोलने के साथ screen पर आएँगे।</div>
            <label className="field-label">One-line fact <small>answers screen</small></label>
            <input className="text-input" maxLength={140} value={q.fact || ''} onChange={(event)=>updateQuestion(questionIndex, {fact:event.target.value})} placeholder="जवाब के साथ दिखने वाली एक लाइन की बात…" />
          </section>)}

          <section className="short-form-block">
            <div className="short-block-head">
              <span className="short-step">{timeline.cta ? `${formatShortTime(timeline.cta.from)}–${totalLabel}` : 'बंद'}</span>
              <div><h3>Call to action</h3><p>ई-बुक या पूरे test के लिए साफ अगला कदम।</p></div>
            </div>
            <label className="field-label" style={{display:'flex', alignItems:'center', gap:10, cursor:'pointer'}}>
              <input type="checkbox" checked={data.ctaEnabled !== false} onChange={(event)=>onChange(prev=>({...prev, ctaEnabled:event.target.checked}))} style={{width:20, height:20, accentColor:'#f6c44b'}} />
              CTA दिखाएँ (video के अंत में)
            </label>
            <label className="field-label">CTA text <small>{String(data.cta || '').length}/200</small></label>
            <textarea className="text-input" rows={3} maxLength={200} value={data.cta || ''} onChange={(event)=>onChange(prev=>({...prev, cta:event.target.value}))} placeholder="ऐसे 30 सवालों का पूरा टेस्ट Premium Books ई-बुक में।" disabled={data.ctaEnabled === false} />
          </section>
        </div>

        <aside className="short-preview-column">
          <div className="short-preview-title"><span>Live 9:16 preview</span><span>Audio muted</span></div>
          <div className="short-preview-frame">
            <Player
              component={PremiumBooksShort}
              inputProps={{...data, preview:true}}
              durationInFrames={timeline.totalFrames}
              fps={SHORT_FPS}
              compositionWidth={SHORT_WIDTH}
              compositionHeight={SHORT_HEIGHT}
              initialFrame={Math.min(18, Math.max(0, timeline.totalFrames - 2))}
              controls
              loop
              clickToPlay
              style={{width:'100%', height:'100%'}}
            />
          </div>
          <div className="short-preview-meta"><span>1080 × 1920 · 30 FPS</span><span>{totalLabel}</span></div>
          <div className="short-phase-list">
            <div><span className="short-phase-time">0:00–{formatShortTime(timeline.hook.sceneFrames)}</span><span>Pattern-break hook</span></div>
            <div><span className="short-phase-time">{formatShortTime(timeline.questions[0].from)}–{formatShortTime(timeline.questions[2].from + timeline.questions[2].sceneFrames)}</span><span>3 rapid questions</span></div>
            <div><span className="short-phase-time">{formatShortTime(timeline.answers.from)}–{formatShortTime(timeline.answers.from + timeline.answers.sceneFrames)}</span><span>Answers + one-line fact</span></div>
            {timeline.cta ? <div><span className="short-phase-time">{formatShortTime(timeline.cta.from)}–{totalLabel}</span><span>CTA + e-book offer</span></div> : null}
          </div>
          <div className="short-voice-note">Narration: {voiceLabel} · {rate} · Mukta font · word-synced mouth</div>
          {lastOutput.includes('short') ? <a className="output-link" href={lastOutput} target="_blank" rel="noreferrer">Open last short MP4 ↗</a> : null}
        </aside>
      </div>

      <footer className="short-modal-footer">
        <div className={`short-save-state ${message.startsWith('❌') ? 'is-error' : message.startsWith('✅') ? 'is-success' : ''}`}>{message}</div>
        <div className="short-modal-actions">
          <button className="button secondary" onClick={onClose}>Close</button>
          <button className="button secondary" onClick={onSave} disabled={saving || rendering}>{saving ? 'Saving…' : 'Save short'}</button>
          <button className="button primary" onClick={onRender} disabled={saving || rendering || jobRunning}>{rendering ? 'Starting…' : jobRunning ? 'Another task is running' : 'Save & render short'}</button>
        </div>
      </footer>
    </div>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
