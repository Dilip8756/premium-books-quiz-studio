import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3001);
const QUESTIONS_PATH = path.join(ROOT, 'data', 'questions.json');
const TIMINGS_PATH = path.join(ROOT, 'data', 'timings.json');
const SHORT_PATH = path.join(ROOT, 'data', 'short.json');
const SHORT_AUDIO_PATH = path.join(ROOT, 'data', 'short-audio.json');
const DIST_PATH = path.join(ROOT, 'dist');
const OUTPUT_PATH = path.join(ROOT, 'output');
app.use(express.json({limit:'5mb'}));
let latestJob = null;

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function normalizeQuestion(q, i) {
  if (!q || typeof q !== 'object') throw new Error(`Question ${i+1}: invalid item.`);
  if (typeof q.question !== 'string' || !q.question.trim()) throw new Error(`Question ${i+1}: question text is required.`);
  if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some(o => typeof o !== 'string' || !o.trim())) throw new Error(`Question ${i+1}: exactly four non-empty options are required.`);
  if (!Number.isInteger(Number(q.answer)) || Number(q.answer) < 0 || Number(q.answer) > 3) throw new Error(`Question ${i+1}: select correct option A, B, C or D.`);
  return {
    question:q.question.trim(), options:q.options.map(o=>o.trim()), answer:Number(q.answer),
    explanation:typeof q.explanation === 'string' && q.explanation.trim() ? q.explanation.trim() : 'इस उत्तर की व्याख्या उपलब्ध नहीं है।',
    category:typeof q.category === 'string' && q.category.trim() ? q.category.trim() : 'सामान्य ज्ञान'
  };
}
function normalizeShort(data) {
  if (!data || typeof data !== 'object') throw new Error('Short video data invalid है।');
  const hook = typeof data.hook === 'string' ? data.hook.trim() : '';
  if (!hook) throw new Error('Hook text जरूरी है।');
  const hookVoice = typeof data.hookVoice === 'string' ? data.hookVoice.trim() : '';
  const ctaEnabled = data.ctaEnabled !== false;
  const cta = typeof data.cta === 'string' ? data.cta.trim() : '';
  if (ctaEnabled && !cta) throw new Error('CTA text जरूरी है।');
  if (!Array.isArray(data.questions) || data.questions.length !== 3) throw new Error('Short video के लिए ठीक 3 प्रश्न जरूरी हैं।');
  const questions = data.questions.map((q, i) => {
    if (!q || typeof q !== 'object') throw new Error(`Short प्रश्न ${i+1}: invalid item.`);
    if (typeof q.question !== 'string' || !q.question.trim()) throw new Error(`Short प्रश्न ${i+1}: question text जरूरी है।`);
    if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some(o => typeof o !== 'string' || !o.trim())) throw new Error(`Short प्रश्न ${i+1}: ठीक चार options जरूरी हैं।`);
    if (!Number.isInteger(Number(q.answer)) || Number(q.answer) < 0 || Number(q.answer) > 3) throw new Error(`Short प्रश्न ${i+1}: सही option A, B, C या D चुनें।`);
    if (typeof q.fact !== 'string' || !q.fact.trim()) throw new Error(`Short प्रश्न ${i+1}: one-line fact जरूरी है।`);
    return {
      question: q.question.trim(),
      options: q.options.map(o => o.trim()),
      answer: Number(q.answer),
      fact: q.fact.trim()
    };
  });
  return {hook, hookVoice, questions, cta, ctaEnabled};
}
function jobSnapshot(job) {
  if (!job) return null;
  return {id:job.id,type:job.type,status:job.status,startedAt:job.startedAt,finishedAt:job.finishedAt,exitCode:job.exitCode,logs:job.logs.slice(-500),outputUrl:job.outputUrl || null};
}
function addLog(job, text) {
  for (const line of String(text).split(/\r?\n/)) {
    if (line.trim()) job.logs.push(`[${new Date().toLocaleTimeString()}] ${line}`);
  }
  if (job.logs.length > 1200) job.logs.splice(0, job.logs.length - 1200);
}
function command(program, args, job, label, envExtra={}) {
  return new Promise((resolve, reject) => {
    addLog(job, `▶ ${label}`);
    const isWin = process.platform === 'win32';
    const needsShell = isWin && /\.(cmd|bat)$/i.test(program);
    const child = spawn(program, args, {cwd:ROOT, env:{...process.env,...envExtra}, shell:needsShell, windowsHide:true});
    child.stdout.on('data', data => addLog(job, data.toString()));
    child.stderr.on('data', data => addLog(job, data.toString()));
    child.on('error', err => { addLog(job, `ERROR: ${err.message}`); reject(err); });
    child.on('close', code => {
      if (code === 0) { addLog(job, `✓ ${label} पूरा हुआ`); resolve(); }
      else { const error = new Error(`${label} failed with exit code ${code}`); addLog(job, `✕ ${error.message}`); reject(error); }
    });
  });
}
async function executeJob(job, opts) {
  try {
    if (job.type === 'validate') {
      await command(process.execPath, ['scripts/validate.mjs'], job, 'Question validation');
    } else if (job.type === 'short-render') {
      const python = process.env.PYTHON_CMD || 'python';
      const envExtra = {EDGE_TTS_VOICE:opts.voice || 'hi-IN-SwaraNeural', EDGE_TTS_RATE:opts.rate || '+0%'};
      await command(python, ['scripts/generate_short_tts.py'], job, 'Short Hindi TTS (3 questions + hook + answers + CTA)', envExtra);
      const cli = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      const shortOutput = 'output/premium-books-quiz-short.mp4';
      await command(cli, ['remotion','render','src/index.jsx','PremiumBooksShort',shortOutput,'--props=./data/short-props.json','--concurrency=4','--gl=angle','--timeout=120000'], job, 'Remotion Short render (1080×1920, audio-driven duration)');
      await command(process.execPath, ['scripts/validate-output.mjs', shortOutput, '1080', '1920'], job, 'Short MP4 validation');
      job.outputUrl = `/${shortOutput}`;
    } else if (job.type === 'audio' || job.type === 'render') {
      const python = process.env.PYTHON_CMD || 'python';
      const envExtra = {EDGE_TTS_VOICE:opts.voice || 'hi-IN-SwaraNeural', EDGE_TTS_RATE:opts.rate || '+0%'};
      await command(python, ['scripts/generate_tts.py'], job, 'Hindi TTS and dynamic timing', envExtra);
      await command(process.execPath, ['scripts/validate.mjs'], job, 'Question validation');
      if (job.type === 'render') {
        const portrait = opts.ratio === 'portrait';
        const composition = portrait ? 'PremiumBooksQuizPortrait' : 'PremiumBooksQuiz';
        const output = portrait ? 'output/premium-books-quiz-portrait.mp4' : 'output/premium-books-quiz.mp4';
        const cli = process.platform === 'win32' ? 'npx.cmd' : 'npx';
        await command(cli, ['remotion','render','src/index.jsx',composition,output,'--props=./data/render-props.json'], job, `Remotion MP4 render (${portrait?'9:16':'16:9'})`);
        await command(process.execPath, ['scripts/validate-output.mjs', output, portrait?'1080':'1920', portrait?'1920':'1080'], job, 'MP4 validation');
        job.outputUrl = `/${output.replaceAll('\\','/')}`;
      }
    }
    job.status = 'completed';
    addLog(job, '✅ All steps completed successfully.');
  } catch (err) {
    job.status = 'failed';
    job.error = err.message;
    addLog(job, `TASK FAILED: ${err.message}`);
  } finally {
    job.finishedAt = new Date().toISOString();
    job.exitCode = job.status === 'completed' ? 0 : 1;
  }
}

app.get('/api/health', (_req,res)=>res.json({ok:true,version:'1.1.0'}));
app.get('/api/questions', (_req,res)=>{
  const questions=readJson(QUESTIONS_PATH,[]);
  const timingsData=readJson(TIMINGS_PATH,{timings:[]});
  res.json({questions,timings:Array.isArray(timingsData.timings)?timingsData.timings:[]});
});
app.put('/api/questions', (req,res)=>{
  try {
    const source=req.body?.questions;
    if (!Array.isArray(source) || source.length < 1) return res.status(400).json({error:'कम से कम एक प्रश्न आवश्यक है।'});
    const questions=source.map(normalizeQuestion);
    fs.writeFileSync(QUESTIONS_PATH,JSON.stringify(questions,null,2)+'\n','utf8');
    // Drop stale timings because any text edit can change narration duration.
    fs.writeFileSync(TIMINGS_PATH,JSON.stringify({fps:30,timings:[]},null,2)+'\n','utf8');
    fs.writeFileSync(path.join(ROOT,'data','render-props.json'),JSON.stringify({questions},null,2)+'\n','utf8');
    res.json({ok:true,count:questions.length});
  } catch(err) { res.status(400).json({error:err.message}); }
});
app.get('/api/short', (_req,res)=>{
  const data=readJson(SHORT_PATH,null);
  if (!data) return res.status(404).json({error:'short.json नहीं मिला।'});
  res.json({...data, audio:readJson(SHORT_AUDIO_PATH,null)});
});
app.put('/api/short', (req,res)=>{
  try {
    const short=normalizeShort(req.body);
    fs.writeFileSync(SHORT_PATH,JSON.stringify(short,null,2)+'\n','utf8');
    res.json({ok:true,questions:short.questions.length});
  } catch(err) { res.status(400).json({error:err.message}); }
});
app.get('/api/jobs/latest', (_req,res)=>res.json({job:jobSnapshot(latestJob)}));
app.post('/api/jobs', (req,res)=>{
  const {type,ratio='landscape',voice='hi-IN-SwaraNeural',rate='+0%'}=req.body||{};
  if (!['validate','audio','render','short-render'].includes(type)) return res.status(400).json({error:'Unknown task type.'});
  if (latestJob && ['queued','running'].includes(latestJob.status)) return res.status(409).json({error:'एक task पहले से चल रहा है।'});
  const job={id:randomUUID(),type,status:'running',startedAt:new Date().toISOString(),finishedAt:null,exitCode:null,logs:[],outputUrl:null};
  latestJob=job;
  addLog(job,`Task started: ${type}${type==='render'?` (${ratio})`:type==='short-render'?' (1080×1920 · auto duration)':''}`);
  executeJob(job,{ratio,voice,rate});
  res.status(202).json({job:jobSnapshot(job)});
});

// Downloads are available from the same local UI origin after a successful render.
app.use('/output', express.static(OUTPUT_PATH, {fallthrough:true,setHeaders(res){res.setHeader('X-Content-Type-Options','nosniff');}}));
if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  app.get('*',(req,res)=>res.sendFile(path.join(DIST_PATH,'index.html')));
} else {
  app.get('/',(_req,res)=>res.status(503).send('UI files are not built yet. Run: npm run build:ui'));
}
app.listen(PORT,'127.0.0.1',()=>{
  console.log(`\nPremium Books Quiz Studio is ready: http://127.0.0.1:${PORT}`);
  console.log('Keep this terminal open while using the browser UI.');
  console.log('Press Ctrl+C to stop.\n');
});
