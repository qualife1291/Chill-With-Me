// Node >=22. Internal evaluation only. No dependencies or automatic retries.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; };
const live = args.includes('--live');
const base = process.env.NVIDIA_TTS_BASE_URL || 'https://877104f7-e885-42b9-8de8-f6e4c6303969.invocation.api.nvcf.nvidia.com';
const u = new URL(base);
if (u.protocol !== 'https:' || !u.hostname.endsWith('.invocation.api.nvcf.nvidia.com') || u.username || u.password || u.search || u.hash || u.pathname !== '/') throw Error('Use an NVIDIA NVCF HTTPS origin only');
const out = resolve(opt('--out', 'testing/nim/results'), new Date().toISOString().replaceAll(':', '-'));
await mkdir(out, { recursive: true });
const report = { timestamp: new Date().toISOString(), endpoint: base, mode: live ? 'live' : 'dry-run', results: [] };
const corpus = JSON.parse(await readFile('testing/nim/corpus.json', 'utf8'));
const limit = Number(opt('--limit', '3'));
if (!Number.isInteger(limit) || limit < 1 || limit > 12) throw Error('limit must be 1..12');
const selected = corpus.slice(0, limit);
const key = process.env.NVIDIA_API_KEY;
const voice = process.env.NVIDIA_TTS_VOICE;
const save = () => writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
if (!live) {
  report.status = 'DRY_RUN_ONLY'; report.caseIds = selected.map(x => x.id);
  report.credentialsPresent = Boolean(key); report.networkRequests = 0;
} else if (!key) {
  report.status = 'BLOCKED_MISSING_NVIDIA_API_KEY'; process.exitCode = 2;
} else {
  const request = async (path, init = {}) => {
    const response = await fetch(base.replace(/\/$/, '') + path, { ...init, redirect: 'error', headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(60000) });
    if (!response.ok) { const e = Error(`HTTP_${response.status}`); e.retryAfter = response.headers.get('retry-after'); await response.body?.cancel(); throw e; }
    return response;
  };
  try {
    const voices = await (await request('/v1/audio/list_voices')).json();
    await writeFile(`${out}/voices.json`, JSON.stringify(voices, null, 2));
    report.status = 'VOICES_DISCOVERED';
    if (!args.includes('--list-only')) {
      const names = Object.entries(voices).filter(([langs]) => langs.split(',').map(s => s.trim()).includes('vi-VN')).flatMap(([, v]) => v.voices || []);
      if (!voice || !names.includes(voice)) throw Error('SELECT_VERIFIED_VI_VN_VOICE_FROM_VOICES_JSON');
      const ref = opt('--reference');
      if (ref && !args.includes('--consented-reference')) throw Error('REFERENCE_REQUIRES_CONSENT_FLAG');
      for (const c of selected) {
        if (report.results.length) await new Promise(r => setTimeout(r, 3000));
        const body = new FormData();
        for (const [k, v] of Object.entries({text:c.text,language:'vi-VN',voice,encoding:'LINEAR_PCM',sample_rate_hz:'22050'})) body.set(k,v);
        if (ref) body.set('audio_prompt', new Blob([await readFile(ref)], {type:'audio/wav'}), 'reference.wav');
        const start = performance.now();
        const response = await request('/v1/audio/synthesize', {method:'POST',body});
        const headersMs = performance.now() - start;
        const audio = Buffer.from(await response.arrayBuffer());
        const completeMs = performance.now() - start;
        if (audio.toString('ascii',0,4)!=='RIFF' || audio.toString('ascii',8,12)!=='WAVE') throw Error('INVALID_WAV_RESPONSE');
        await writeFile(`${out}/${c.id}.wav`, audio);
        report.results.push({id:c.id,voice,headersMs,completeMs,bytes:audio.length,status:'AUDIO_RECEIVED_NOT_HUMAN_RATED'});
        await save();
      }
      report.status = 'SMOKE_COMPLETE_NOT_QUALITY_VERIFIED';
    }
  } catch (e) { report.status = 'STOPPED'; report.error = /^HTTP_|^SELECT_|^REFERENCE_|^INVALID_/.test(e.message) ? e.message : 'NETWORK_OR_LOCAL_ERROR'; report.retryAfter = e.retryAfter; process.exitCode = 1; }
}
await save();
console.log(JSON.stringify({status:report.status,output:out,completed:report.results.length}));
