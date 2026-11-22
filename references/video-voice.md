# Video voice — generated narration through OpenRouter

> **Since R47, this is the exception, not the default.** A generated narration is produced in **Mirli**,
> locally (`audio-mirli.md`, `video-audio.md` section 3). This file applies only when the owner asks by
> name, in the briefing, for the OpenRouter voice Leda — and its output still passes the audio-analyzer
> checks of `audio-mirli.md` section 5 before it is placed. Where the text below says "nothing else
> generates a voice", read it as "nothing else generates *this* voice".

> Covers the generated half of the narration in R37. The briefing asks whether a video has narration
> and where it comes from (`video-briefing.md`, section 3a); this file is what happens when the answer is
> **"gerar a voz do zero"**. A recorded file the user sends skips straight to `video-audio.md`, section 3.

---

## 1. The one way to generate a voice

| | |
|---|---|
| Service | OpenRouter — `POST https://openrouter.ai/api/v1/audio/speech` |
| Model | **`google/gemini-3.8-flash-lite-tts`** (<https://openrouter.ai/google/gemini-3.8-flash-lite-tts>) |
| Voice | **`Leda`** — the fixed house voice, female, for every video |
| Price | read it on the model page before the first take and record it in section 4 (the lite model replaced `gemini-3.8-flash-tts`, priced at US$ 0.50 / 9 per million input / output tokens) |
| Tool | `tools/tts.py` (copied into the video's `tools/` at creation) |

**Nothing else generates a voice**: no local model, no Ollama, no other service, no other model, no other
voice. The voice is never switched per video and never "tried" with another name — every Angatu video
that is not recorded sounds the same. A change of model or voice is the owner's decision and changes this
file.

### Why it is allowed outside AngatuCRM (R26)

R26 sends AI through AngatuCRM so that no provider, key or bill sits inside an Angatu project, and
AngatuCRM does not generate audio. Video narration is a production step on this workstation, not a
feature of any application, so the owner allowed this one exception, for it only: `tools/tts.py` calls
OpenRouter from the video folder with the owner's key, kept in `~/.angatu/openrouter.key` — never in a
project, a repository, a Dockerfile or a client's server. A feature that speaks to end users still goes
through AngatuCRM.

---

## 2. The key — asked once, kept for every later video

1. Before the first take, `tools/tts.py` looks for `OPENROUTER_API_KEY` and then
   `~/.angatu/openrouter.key`. If neither exists, **ask the user for the key**:
   *"Me passa a sua chave da API do OpenRouter (começa com sk-or-). Ela fica guardada só neste
   computador, em `~/.angatu/openrouter.key`, e é usada toda vez que a voz for gerada."*
   Better still, the user saves it without pasting it in the chat, typing it hidden in their terminal:
   `python tools/tts.py key`.
2. When the user pastes it in the chat, save it with `tools/tts.py key` reading it from stdin, and never
   repeat it in a reply, a project file, a commit or a log.
3. The file is readable by this Windows user only (`icacls`). From then on every video reuses it without
   asking. A 401 means the key was revoked: ask for a new one and save it the same way. A 402 means no
   credits: tell the user, do not retry.

---

## 3. Generating

```bash
python tools/tts.py speak docs/narracao.txt public/voice/narracao.wav
```

`docs/narracao.txt` is the spoken text of the **approved** script (`docs/ROTEIRO.md`), plain, one
paragraph per blank-line block. Each paragraph is one take (a long text does not drift), the takes are
joined with 350 ms of silence by FFmpeg, and one WAV is written. Then the narration follows the same path
as a recorded one: `tools/transcribe.py` measures every word (`video-audio.md`, section 3) and the plan
cuts on those words.

- **Spelled for the ear**: numbers, prices, acronyms and the client's name written as they should be
  said ("R$ 49,90" → "quarenta e nove reais e noventa centavos"; "CRM" → "cê erre eme"). The screen keeps
  the written form.
- **The user hears it at the first draft**, with specific questions ("a pronúncia de <nome> ficou
  certa?", "o ritmo do segundo parágrafo está bom?"). A word that comes out wrong is respelled in the
  text and only that paragraph is generated again — each generation costs, so never the whole script
  for one word.
- **Only the request body the endpoint documents** (`model`, `input`, `voice`, `response_format`): no
  style instructions written into the text — they would be read aloud.
- `docs/LICENCAS.md` gets: `public/voice/narracao.wav · voz · gerada via OpenRouter
  (google/gemini-3.8-flash-lite-tts, voz Leda) · uso comercial conforme os termos do OpenRouter e do Google`.

---

## 4. Status of this module

`tools/tts.py` follows OpenRouter's `/audio/speech` reference but **has not run on this workstation
yet**. On the first video that generates a voice: confirm with the user that Leda's Portuguese sounds
natural, record here the time and cost per minute of narration, and mark the module *testado*. If the
Portuguese does not sound natural, stop and tell the user — never swap the model or the voice on your own.

---

*Original source: the OpenRouter documentation and Angatu Sistemas' own video practice · written and audited by Angatu Sistemas*
