# Audio — produced in Mirli, verified by the audio analyzer (R47)

> Covers R47. Every piece of audio an Angatu agent **produces** — music, a soundtrack, sound effects,
> ambience, loops, interface sounds, notifications, voices, character sounds, anything audible — is
> generated in **Mirli** (<https://github.com/HamSanders/soundbox>, formerly Soundbox) and then
> **verified by the audio-analyzer MCP** (<https://github.com/JuzzyDee/audio-analyzer-rs>) before it
> enters a project. This holds in every project that uses this skill, the motion videos of R37 included
> (`video-audio.md`). An audio task is never done without both.

---

## 1. What the rule forbids

- Generating audio any other way: oscillators or noise written in code (Web Audio, `numpy`, FFmpeg
  `sine`/`anoisesrc`), a generic TTS, a paid API, a hosted generator (ElevenLabs, Suno, OpenRouter TTS…),
  a downloaded library sound used in place of a take. **Paid services, metered APIs and external credits
  are not used while Mirli can do the job locally.**
- Calling an audio task done because the file exists. Done is: produced in Mirli, measured by the
  analyzer, inside the targets of section 5, integrated in the project's format.
- Skipping the setup because "it is a docs task". Installing and wiring Mirli and the analyzer on the
  machine is part of the rule (section 2), not a future step written down.

**A file the user sends** (a recorded narration, a licensed track) is not production: it is used as it
comes, but it still passes the verification of section 4 before it is used.

**When Mirli genuinely cannot do it** (no model for the job, the GPU cannot hold the model, the weights
cannot be downloaded), the agent writes down exactly what failed, with the command and the error, tells
the user, and **does not declare the task done**. It does not fall back to another generator on its own.

---

## 2. Setup — checked at the start of every audio task, done when missing

Mirli runs locally: a Node server on `http://127.0.0.1:17494` that drives native models through
audio.cpp (CUDA on NVIDIA). On this workstation it lives in `~/tools/mirli` (source checkout, tag
`v0.6.2` or newer), its data in `~/.mirli`, and it starts hidden at logon through
`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Mirli.vbs`.

1. **Is it answering?**

   ```bash
   curl -s http://127.0.0.1:17494/api/health
   ```

   Expect `"status":"ok"` and `"device":"cuda"` on an NVIDIA machine. Not answering → start it
   (`wscript "%USERPROFILE%\tools\mirli\start-mirli-hidden.vbs"`, or `node server/dist/cli.js` from the
   checkout). `device: cpu` on an NVIDIA machine → `node server/dist/cli.js model status audiocpp`.

2. **Not installed** → follow the project's own agent guide,
   <https://github.com/HamSanders/soundbox/blob/main/docs/INSTALL-AGENT.md>. From source on Windows:

   ```bash
   git clone --depth 1 --branch <latest tag> https://github.com/HamSanders/soundbox ~/tools/mirli
   cd ~/tools/mirli && npm install
   npm install-scripts approve better-sqlite3 esbuild && npm rebuild better-sqlite3 esbuild   # npm 12 blocks them
   npm run build
   node server/dist/cli.js model install audiocpp      # the native runtime, ~0.6 GB
   node server/dist/cli.js skills install              # soundbox-sfx, -sound-pass, -voice-story -> ~/.claude/skills
   ```

   Without the approve/rebuild line `better-sqlite3` has no native binary and the server dies at start.

3. **MCP, user scope, both servers:**

   ```bash
   claude mcp add --scope user --transport http soundbox http://127.0.0.1:17494/mcp
   claude mcp add --scope user audio-analyzer -- "%USERPROFILE%\tools\audio-analyzer\mcp-server.exe"
   claude mcp get soundbox && claude mcp get audio-analyzer     # both "Connected"
   ```

   The analyzer is the `x86_64-pc-windows-msvc` binary of the latest GitHub release, unzipped into
   `~/tools/audio-analyzer` (`mcp-server.exe` plus `cli.exe`). HTTP is the Mirli transport — the stdio
   bridge only carries 6 of the 24 tools. A server added during a session reaches the agent in the
   **next** session; in the current one, call the endpoint directly (section 6).

4. **A model for the job.** `GET /api/models` gives every model's `vram_estimate_mb`, `license.name`
   and `license.commercial`. Rules from Mirli's own guide, kept here:
   - state name, size and licence before downloading, and reuse what is already `installed`;
   - **never accept a licence for the user**: `conditional` or `no` (Stable Audio 3 SFX and Small Music —
     Stability AI Community, free under US$ 1M revenue; MiniMax Music 3) is the owner's decision;
   - `audiocpp-ace-step` (ACE-Step 1.5 Turbo, MIT, ~4 GB VRAM) needs no acceptance and is the default
     for music and songs; voices come from the TTS catalogue on the Models page (several clone a
     reference clip — the clip is the user's, never invented);
   - a download that fails with `hf_unreachable` near the end is retried — finished files are kept.
   On this machine (GTX 1660 SUPER, 6 GB) models up to ~4 GB fit; MiniMax Music 3 (10 GB) does not.

---

## 3. Producing

Tools (MCP, prefix `soundbox.`): `generate`, `enhance_prompt`, `list_models`, `list_sounds`,
`get_sound`, `delete_sound`, `separate`, `list_voices`, `speak`, the story tools (`create_story`,
`add_lines`, `speak_story`, `export_story`…) and the arrangement tools (`open_in_studio`, `mix_track`…).
The bundled skills carry the prompting craft — load them: `soundbox-sfx` (effects, ambience, UI),
`soundbox-sound-pass` (inventory of a whole project before generating), `soundbox-voice-story`
(narration and dialogue).

- **Inventory before generation.** List every sound the task needs (id, trigger, prompt, duration,
  kind: one-shot, set, loop) and keep one material vocabulary and one acoustic space per piece.
- **Prompt the material, the action and the space** ("heavy wooden door slamming in a stone corridor"),
  never a mood alone. `enhance_prompt` rewrites a vague one.
- **Takes, not a take.** `variations: 2–4` per sound that matters; fix the `seed` of the chosen one in
  the project's manifest so it can be regenerated.
- **Reuse** what the library already has (`list_sounds`) before rendering again.
- Every take lands in `~/.mirli` with an absolute path; the project gets a **copy**, named by the
  project's convention, never a path into `~/.mirli`.

## 4. Verifying — the audio-analyzer MCP

The agent cannot hear. Every file — generated or sent by the user — is measured before it is chosen:

| Tool (MCP `audio-analyzer`) | Used for |
|---|---|
| `audio_info` | first, always: duration, sample rate, sample count — a take cut short fails here |
| `full_analysis` | LUFS integrated, true peak, LRA, crest factor, band energy, stereo correlation, section boundaries |
| `spectral_features` (with `start_time`/`end_time`) | zooming on a click, a hole, a tail that never ends, a hiss band, a loop seam |
| `compare` (`path_a`, `path_b`) | choosing between takes, and checking a set or a family stays consistent |
| `rhythm_analysis` / `harmonic_analysis` | tempo and key of a music take before it becomes a video clock (half/double time is common) |

`cli.exe <file>` (and `cli.exe compare a b`) gives the same report in a shell when the MCP is not loaded
yet. Paths are absolute; forward slashes work on Windows.

Measured on this machine, the first real test: two ACE-Step takes asked at 10 s came out at 4.3 s and
6.6 s (Mirli trims trailing silence, `trim_silence`, so a model that ends early yields a short file) —
loudness −16 LUFS, true peak −1.8 and −3.1 dBTP, mono compatibility 0.92 and 0.88. Both failed on
duration and were regenerated: exactly the defect this step exists to catch. A prompt asking for a
continuous groove ("no intro, no fade, no ending"), `lyrics: "[instrumental]"` and `duration_s` a little
above the target (14 for 10) gave 10.0 s and 10.5 s at −15.9 LUFS, true peak −3.9 and −3.0 dBTP, phase
correlation 0.56 and 0.58 — both passed, and `compare` chose the first. The tempo came out at 119.7 BPM for
110 asked: the prompt's BPM is a hint, so the video clock always comes from `rhythm_analysis` /
`analyze-music.py`, never from the prompt. On the GTX 1660 SUPER, ACE-Step Turbo takes ~100–160 s per
10 s take.

Stable Audio 3 SFX (licence accepted by the owner on 2026-11-22): two 1.5 s whoosh takes in 17 s, exact
length, but at **44.1 kHz** — ACE-Step writes 48 kHz, so a mixed set always goes through the conversion of
section 5. One take passed (−16.0 LUFS, true peak −6.3 dBTP, correlation 0.45); the other **failed** at
−0.1 dBTP and was discarded — a near-full-scale peak is common on SFX takes, so true peak is checked on every
one.

The agent reads the numbers critically: a take that misses section 5 is regenerated (new seed, a
corrected prompt), not normalised into shape. Among the takes that pass, the A/B comparison and the
brief decide; taste questions go to the user's ears at the checkpoints, as in `video-audio.md`.

## 5. Targets — a take passes when

| Check | Target |
|---|---|
| Exists and is not silent | file > 0 bytes, duration within 10 % of what was asked, integrated loudness above −50 LUFS |
| No clipping | true peak ≤ −1.0 dBTP on the delivered file |
| Loudness per use | delivered video master −14 LUFS (`video-audio.md`, section 7) · SFX and UI one-shots matched to each other within ±2 LU · music beds and ambience matched within ±1 LU across the set |
| Mono safety | stereo correlation ≥ 0 (no phase cancellation on a phone speaker) |
| Loops | the end joins the start without a click (onset at the seam checked) |
| Consistency | one sample rate and one format per project; takes of one family compared A/B |

**Format and sample rate follow the runtime**: video and Remotion → WAV 48 kHz stereo; web → the
project's existing format (OGG/MP3/WAV) at 48 kHz unless it already uses 44.1; games → what the engine
imports. The conversion is one FFmpeg step after the choice, and the converted file is measured again.

## 6. Proof of setup, without the MCP loaded

```bash
# Mirli MCP answers and lists its tools
curl -s -X POST http://127.0.0.1:17494/mcp -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
# the analyzer measures a file (its MCP is stdio: initialize, then tools/call)
"%USERPROFILE%\tools\audio-analyzer\cli.exe" <file.wav>
```

## 7. Recording it

Every audio file in a project gets a row in the project's licence table (`docs/LICENCAS.md` for videos):
file · Mirli model id · the model's licence and commercial status · seed · prompt · date · where it is used.
The model's licence is the licence of the output — a `conditional` model in a client's commercial piece is
confirmed with the owner first.

---
*Sources: Mirli's README, INSTALL-AGENT.md and MCP.md; audio-analyzer-rs README · written and audited by Angatu Sistemas*
