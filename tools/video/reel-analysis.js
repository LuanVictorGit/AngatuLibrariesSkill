/**
 * Analise de reel de referencia DENTRO da aba do Chrome logado -- sem baixar
 * arquivo, sem interagir com o post, sem sair da pagina.
 *
 * Como funciona: o player do Instagram ja carregou as representacoes DASH do
 * video e do audio (entradas de `performance`, dominio fbcdn). O parametro
 * `efg` de cada URL e um JSON em base64 com resolucao, duracao e o id do video.
 * O script busca a melhor versao de imagem e o audio NA MEMORIA da aba, varre
 * quadro a quadro (1/30 s) medindo diferenca de luminancia -> cortes, monta
 * folhas de contato num canvas por cima da pagina (para fotografar) e
 * decodifica o audio (OfflineAudioContext + filtros) -> ataques, BPM, energia.
 *
 * Tempo: o <video> respeita a lista de edicao (elst) do MP4; o decodeAudioData
 * NAO -- o audio decodificado chega atrasado pelo priming do AAC (no Instagram,
 * HE-AAC: ~105 ms). O script le o elst e desconta, e desconta tambem o atraso
 * do proprio detector (19 ms, calibrado). Com isso, um video conhecido com
 * corte 1 quadro antes da batida mede -33 ms. Ataque de musica real e menos
 * nitido que o do teste: tratar a relacao corte x batida como +-1 quadro.
 *
 * Uso (ferramenta javascript do Claude in Chrome, na pagina do reel; cada
 * chamada da ferramenta tem limite de ~45 s, por isso o trabalho roda solto):
 *   1. colar este arquivo inteiro; ele define window.__reel
 *   2. __reel.start()        -> comeca load + scan + audio em segundo plano
 *   3. __reel.status()       -> repetir ate done: true (ou error)
 *   4. __reel.report()       -> cortes, pausas, BPM, energia, corte x ataque
 *   5. await __reel.sheet(0.25, 8.25, 0.5, 8) -> folha de contato; fotografar; __reel.clear()
 * load() parado em readyState 0: o Chrome adia midia em aba que nunca ficou
 * visivel. Pedir ao usuario para trazer a aba para frente uma vez.
 *
 * @author Angatu Sistemas
 */
window.__reel = (() => {
  const state = { video: null, sheetVideo: null, audioBuffer: null, audioOffset: 0, diffs: [], cuts: [],
    onsets: [], info: null, scanResult: null, audioResult: null, done: false, error: null, phase: 'parado' };
  const STEP = 1 / 30;
  // Atraso do detector de ataque, calibrado no teste de resposta conhecida
  // (pulso de ataque instantaneo): descontado para o tempo sair verdadeiro.
  const DETECTOR_LAG_S = 0.019;

  const decodeEfg = (u) => {
    try {
      const raw = decodeURIComponent(new URL(u).searchParams.get('efg') || '');
      return JSON.parse(atob(raw.replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
      return {};
    }
  };

  /** Deslocamento da lista de edicao (elst) do primeiro trak, em segundos. */
  function editOffset(arrayBuffer) {
    const b = new DataView(arrayBuffer);
    let timescale = null;
    let mediaTime = null;
    const walk = (start, end) => {
      let p = start;
      while (p + 8 <= end && (timescale === null || mediaTime === null)) {
        let size = b.getUint32(p);
        const type = String.fromCharCode(b.getUint8(p + 4), b.getUint8(p + 5), b.getUint8(p + 6), b.getUint8(p + 7));
        let header = 8;
        if (size === 1) { size = Number(b.getBigUint64(p + 8)); header = 16; }
        if (size === 0) size = end - p;
        if (['moov', 'trak', 'mdia', 'edts'].includes(type)) walk(p + header, p + size);
        if (type === 'mdhd' && timescale === null) timescale = b.getUint8(p + 8) ? b.getUint32(p + 28) : b.getUint32(p + 20);
        if (type === 'elst' && mediaTime === null) mediaTime = b.getUint8(p + 8) ? Number(b.getBigInt64(p + 24)) : b.getInt32(p + 20);
        if (type === 'moof') return;
        p += size;
      }
    };
    walk(0, b.byteLength);
    return timescale && mediaTime > 0 ? mediaTime / timescale : 0;
  }

  function media() {
    const urls = [...new Set(performance.getEntriesByType('resource').map((e) => e.name)
      .filter((n) => /fbcdn\.net\/o1\/v\/t2\/f2\//.test(n))
      .map((n) => {
        const u = new URL(n);
        u.searchParams.delete('bytestart');
        u.searchParams.delete('byteend');
        return u.toString();
      }))];
    return urls.map((u) => {
      const m = decodeEfg(u);
      return { url: u, asset: String(m.xpv_asset_id), tag: m.vencode_tag || '', duration: m.duration_s,
        bitrate: m.bitrate || 0, audio: /audio/.test(m.vencode_tag || '') };
    });
  }

  async function load() {
    const all = media();
    if (!all.length) throw new Error('nenhuma midia carregada: de play no reel e tente de novo');
    // O reel da pagina e o asset com mais representacoes; os outros sao pre-carga.
    const count = {};
    all.forEach((m) => { count[m.asset] = (count[m.asset] || 0) + 1; });
    const asset = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
    const mine = all.filter((m) => m.asset === asset);
    const video = mine.filter((m) => !m.audio).sort((a, b) => b.bitrate - a.bitrate)[0];
    const audio = mine.find((m) => m.audio);
    const vb = await fetch(video.url).then((r) => r.blob());
    const mk = () => Object.assign(document.createElement('video'), { muted: true, preload: 'auto', src: URL.createObjectURL(vb) });
    state.video = mk();
    state.sheetVideo = mk();
    await new Promise((res, rej) => {
      state.video.onloadedmetadata = res;
      state.video.onerror = () => rej(new Error('o video nao decodificou'));
    });
    if (audio) {
      const ab = await fetch(audio.url).then((r) => r.arrayBuffer());
      state.audioOffset = editOffset(ab);
      state.audioBuffer = await new OfflineAudioContext(1, 44100, 44100).decodeAudioData(ab);
    }
    return { asset, tag: video.tag, duration: state.video.duration, width: state.video.videoWidth,
      height: state.video.videoHeight, audio: !!audio, audioPrimingMs: Math.round(state.audioOffset * 1000) };
  }

  const seek = (v, t) => new Promise((r) => { v.onseeked = r; v.currentTime = Math.min(t, v.duration - 0.001); });
  const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };

  async function scan() {
    const v = state.video;
    if (!v) throw new Error('rode load() antes');
    const c = Object.assign(document.createElement('canvas'), { width: 36, height: 64 });
    const ctx = c.getContext('2d', { willReadFrequently: true });
    let prev = null;
    state.diffs = [];
    for (let t = STEP / 2; t < v.duration; t += STEP) {
      await seek(v, t);
      ctx.drawImage(v, 0, 0, 36, 64);
      const d = ctx.getImageData(0, 0, 36, 64).data;
      const g = new Float32Array(36 * 64);
      for (let p = 0; p < g.length; p++) g[p] = 0.299 * d[p * 4] + 0.587 * d[p * 4 + 1] + 0.114 * d[p * 4 + 2];
      let diff = 0;
      if (prev) {
        for (let p = 0; p < g.length; p++) diff += Math.abs(g[p] - prev[p]);
        diff /= g.length;
      }
      state.diffs.push([t, diff]);
      prev = g;
    }
    // Corte = pico 3x acima da mediana da vizinhanca (limiar local: um flash
    // forte nao esconde as trocas de cena comuns, como faria um limiar global).
    const d = state.diffs.map((x) => x[1]);
    state.cuts = [];
    for (let i = 1; i < d.length - 1; i++) {
      const around = [...d.slice(Math.max(1, i - 10), Math.max(1, i - 2)), ...d.slice(i + 3, i + 11)];
      if (d[i] >= Math.max(2, 3 * median(around)) && d[i] >= d[i - 1] && d[i] >= d[i + 1]) {
        // A troca acontece na fronteira entre o quadro anterior e este.
        state.cuts.push({ t: +(state.diffs[i][0] - STEP / 2).toFixed(3), strength: +d[i].toFixed(1) });
      }
    }
    const holds = [];
    let run = 0;
    for (let i = 1; i <= d.length; i++) {
      if (i < d.length && d[i] < 0.05) run++;
      else {
        if (run >= 8) holds.push({ from: +(state.diffs[i - run][0]).toFixed(2), frames: run });
        run = 0;
      }
    }
    return { frames: d.length, meanDiff: +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(2), cuts: state.cuts, holds };
  }

  async function band(buffer, type, freq) {
    const oc = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
    const src = oc.createBufferSource();
    src.buffer = buffer;
    const f = oc.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = 0.7;
    src.connect(f);
    f.connect(oc.destination);
    src.start();
    return (await oc.startRendering()).getChannelData(0);
  }

  async function audio() {
    const a = state.audioBuffer;
    if (!a) throw new Error('sem audio: rode load() antes');
    const hop = Math.round(a.sampleRate / 100); // 10 ms
    const hs = hop / a.sampleRate;
    const env = (x) => {
      const n = Math.floor(x.length / hop);
      const e = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        let s = 0;
        for (let j = 0; j < hop; j++) s += x[i * hop + j] ** 2;
        e[i] = Math.sqrt(s / hop);
      }
      return e;
    };
    const flux = (e) => {
      const o = new Float32Array(e.length);
      for (let i = 1; i < e.length; i++) o[i] = Math.max(0, Math.log(1e-4 + e[i]) - Math.log(1e-4 + e[i - 1]));
      return o;
    };
    const peaks = (o, gap) => {
      const out = [];
      let last = -1e9;
      for (let i = 1; i < o.length - 1; i++) {
        const around = [...o.slice(Math.max(0, i - 50), Math.max(0, i - 3)), ...o.slice(i + 4, i + 51)];
        if (o[i] >= Math.max(0.05, 3 * median(around)) && o[i] >= o[i - 1] && o[i] >= o[i + 1] && (i - last) * hs >= gap) {
          out.push(+(i * hs - state.audioOffset - DETECTOR_LAG_S).toFixed(3)); // tempo de apresentacao
          last = i;
        }
      }
      return out;
    };
    const eF = env(a.getChannelData(0));
    const oL = flux(env(await band(a, 'lowpass', 150)));
    const oH = flux(env(await band(a, 'highpass', 2500)));
    const on = flux(eF).map((v, i) => v + oL[i] + oH[i]);
    state.onsets = peaks(on, 0.1);
    const mean = on.reduce((x, y) => x + y, 0) / on.length;
    const x = on.map((v) => v - mean);
    const scores = [];
    for (let bpm = 70; bpm <= 180; bpm += 0.5) {
      const lag = 60 / bpm / hs;
      const L = Math.floor(lag);
      const fr = lag - L;
      let s = 0;
      for (let i = 0; i + L + 1 < x.length; i++) s += x[i] * (x[i + L] * (1 - fr) + x[i + L + 1] * fr);
      scores.push([bpm, s]);
    }
    const bpmCandidates = scores.sort((p, q) => q[1] - p[1]).slice(0, 4).map((r) => r[0]);
    const energyDbEvery500ms = [];
    const shift = Math.round(state.audioOffset / hs);
    for (let t = 0; t < a.duration - state.audioOffset; t += 0.5) {
      const i0 = Math.floor(t / hs) + shift;
      const i1 = Math.min(eF.length, Math.floor((t + 0.5) / hs) + shift);
      let s = 0;
      for (let i = i0; i < i1; i++) s += eF[i];
      energyDbEvery500ms.push(+(20 * Math.log10(1e-6 + s / Math.max(1, i1 - i0))).toFixed(1));
    }
    return { duration: +(a.duration - state.audioOffset).toFixed(2), bpmCandidates, onsets: state.onsets.length,
      kicks: peaks(oL, 0.12).length, energyDbEvery500ms };
  }

  function sync() {
    if (!state.onsets.length) throw new Error('rode audio() antes');
    const near = (t) => state.onsets.reduce((b, o) => (Math.abs(o - t) < Math.abs(b - t) ? o : b), Infinity);
    return state.cuts.map((c) => ({ t: c.t, strength: c.strength, fromOnsetMs: Math.round((c.t - near(c.t)) * 1000) }));
  }

  function start() {
    Object.assign(state, { done: false, error: null, phase: 'carregando' });
    (async () => {
      state.info = await load();
      state.phase = 'varrendo quadros';
      state.scanResult = await scan();
      state.phase = 'analisando audio';
      state.audioResult = state.audioBuffer ? await audio() : null;
      state.phase = 'pronto';
      state.done = true;
    })().catch((e) => { state.error = e.message; state.phase = 'erro'; });
    return 'iniciado: consulte __reel.status()';
  }

  function status() {
    return { phase: state.phase, done: state.done, error: state.error, frames: state.diffs.length,
      videoReady: state.video ? state.video.readyState : null };
  }

  function report() {
    if (!state.done) return status();
    return { info: state.info, cuts: state.scanResult.cuts, holds: state.scanResult.holds, audio: state.audioResult,
      cutsVsOnsets: state.onsets.length ? sync() : [] };
  }

  async function sheet(from, to, step = 0.5, cols = 8) {
    const v = state.sheetVideo;
    if (!v) throw new Error('rode load() antes');
    if (v.readyState < 1) await new Promise((r) => { v.onloadedmetadata = r; });
    const times = [];
    for (let t = from; t < Math.min(to, v.duration); t += step) times.push(+t.toFixed(2));
    const tw = Math.floor(1560 / cols);
    const th = Math.floor((tw * v.videoHeight) / v.videoWidth);
    const c = Object.assign(document.createElement('canvas'), { width: tw * cols, height: th * Math.ceil(times.length / cols) });
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < times.length; i++) {
      await seek(v, times[i]);
      const x = (i % cols) * tw;
      const y = Math.floor(i / cols) * th;
      ctx.drawImage(v, x, y, tw - 2, th - 2);
      ctx.fillStyle = 'rgba(255,0,80,0.9)';
      ctx.fillRect(x, y, 58, 18);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`${times[i].toFixed(2)}s`, x + 3, y + 14);
    }
    clear();
    const overlay = document.createElement('div');
    overlay.id = '__reel_sheet';
    Object.assign(overlay.style, { position: 'fixed', inset: '0', zIndex: '2147483647', background: '#111',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center' });
    Object.assign(c.style, { maxWidth: '100vw', maxHeight: '100vh' });
    overlay.appendChild(c);
    document.body.appendChild(overlay);
    return { frames: times.length, cols };
  }

  function clear() {
    document.getElementById('__reel_sheet')?.remove();
  }

  return { media, editOffset, load, scan, audio, sync, start, status, report, sheet, clear, state };
})();
'__reel pronto: start(), status(), report(), sheet(), clear()';
