# Video brief — gate G5

> Covers G5 and the brief half of R37. Read it the moment a video is requested — often with nothing but a
> client URL: *"crie um video edit para meu cliente https://site.com.br"*. **Not one scene before the
> answers and the approved plan** (`video-plan.md`). The orchestrator is `video-production.md`.

---

## 1. The order

1. **URL first** — research before asking (section 2).
2. **The type question** — narration or music edit, and for an edit, which kind (section 3).
3. **What is still open** — one numbered list, each item with a suggested default (sections 4 to 6).
4. **The Angatu mark** — asked every time (section 7).
5. **Assets and permissions** — the inventory (sections 8 and 9).
6. **`docs/BRIEFING.md`** — written, summarised in chat, confirmed by the user (section 10).

`paint.md` asks one question at a time because each answer reshapes the next. Here only the type question
does that; the rest are facts the user can answer in one go. So: the type question alone, then one list.
Never ask what the URL or the platform already answered.

---

## 2. URL first

```bash
node tools/site-research.mjs https://site.com.br
```

It opens the site with real device emulation (phone 390×844 at 3x, desktop 1440×900 at 2x — the plain
`--screenshot` of headless Chrome cuts phone layouts) and writes:

- `out/site/<slug>.json` — title, description, logo candidates (the official file, SVG preferred), the
  computed colours of body, header, button and link, the fonts, the `:root` custom properties, the
  headings (the client's own words), WhatsApp, phone, Instagram and e-mail links, and whether the footer
  credits Angatu;
- `public/screens/<slug>-mobile.png`, `-desktop.png` and `-full` versions of each — the whole page,
  for scroll shots.

Before running it, tell the user what it will save inside the video folder. Then read the JSON, look at
the captures, and summarise in five to eight lines: who they are, what they sell, where, the tone of their
words, palette, fonts, contact, and what Angatu built for them. **If the site is Angatu's work, the site is
also footage**: the product demo of a "+1 cliente" video is often the very thing that was delivered.

- **Login wall or CAPTCHA page** → the script says so; stop and ask the user for the material. Never log
  in with anyone's credentials. A Turnstile widget on a contact form is normal and is not a wall.
- **A system that is not public** (the client's back office Angatu built) → ask for screenshots or a
  screen recording the user makes. Real customer data never appears on screen: names, CPF, phones, orders
  and values are fictitious — **LGPD**, and the client's trust.
- Every fact goes into `BRIEFING.md` with its source.

---

## 3. The type question

Exact wording:

> **"Que vídeo é este: (A) narrado — explicativo, anúncio, institucional, demonstração —, ou (B) uma
> edição na música?"**

If B:

> **"É uma edição PHONK normal ou é um vídeo para um novo cliente da Angatu Sistemas?"**

- **A** — narration drives the time axis (`video-audio.md`).
- **B1, PHONK normal** — the music drives; the intensity (1 clean to 3 aggressive) is asked below
  (`video-phonk.md`). A promo cut to music that is not PHONK is B1 at intensity 1.
- **B2, novo cliente da Angatu** — the house series with two reference reels, analysed before producing
  (`video-phonk.md`).

"Video edit" in the request points to B — confirm it, do not assume it.

---

## 4. The platform decides the format — derive it

| Where | Format | Resolution | fps | Safe zone (keep text and logos inside) | Typical length |
|---|---|---|---|---|---|
| Reels, TikTok, Shorts | 9:16 | 1080×1920 (1440×2560 optional) | 30 | top 14% (269 px), bottom 35% (672 px), sides 6% (65 px) — Meta's Reels spec | 15–30 s; the B2 references run ~19 s |
| Instagram feed | 4:5 | 1080×1350 | 30 | 6% all round | 15–60 s |
| Stories, WhatsApp status | 9:16 | 1080×1920 | 30 | top and bottom 14% | up to 15 s per card |
| YouTube | 16:9 | 1920×1080 | 30 | 5% all round | by the brief |

**One composition per format, planned, never a crop of another** — text that fits at 16:9 is illegible at
9:16, and a crop cuts the faces (`landing-motion.md`, section 3).

---

## 5. Questions any video may need — only those still open

Ask in PT-BR, as one numbered list, each with the suggested default in brackets:

1. Objetivo do vídeo (o que quem assiste deve entender ou fazer)
2. Onde será usado (decide formato, duração e zona segura — seção 4)
3. Duração
4. Público
5. Sensação (três palavras)
6. CTA: texto e destino — o WhatsApp é confirmado **sempre**, mesmo quando veio da URL
7. Textos obrigatórios (grafia exata)
8. O que não pode aparecer
9. Ordem obrigatória das informações
10. Referências visuais (links ou arquivos)
11. Identidade, se o site não resolveu (logo em arquivo, cores, fontes)
12. Marca d'água do cliente

---

## 6. Questions by type

**A — narrado**
- Onde está a narração gravada? (arquivo; a skill não gera voz — R26)
- O roteiro aprovado, com a grafia exata (é dele que vem o texto da tela)
- A trilha de fundo: onde está o arquivo e qual a licença
- Imagens e vídeos disponíveis; cenas obrigatórias
- Legenda embutida [sim — rede social toca sem som]

**B1 — PHONK normal**
- Onde está a música (arquivo) e qual trecho usar
- Imagens e vídeos disponíveis; tema; personagem ou produto
- Estilo visual; intensidade [1 limpa · 2 média · 3 agressiva]
- Duração; formato; referências; texto, se houver

**B2 — novo cliente da Angatu**
- O que a Angatu entregou (sistema, site, aplicativo) e a principal dor que resolveu
- Como era antes (o processo antigo do cliente: à mão, planilha, papel — é o bloco "problema")
- Telas reais (capturas da URL ou do sistema, com dado fictício)
- Equipe a creditar: nome, função e foto com permissão (`_marca/` na raiz do estúdio)
- Onde está a música (arquivo) e a licença
- O WhatsApp do CTA — confirmar
- Duração [~19 s, como as referências]

---

## 7. The Angatu mark

Asked every time, suggesting yes:

> **"O vídeo leva a marca da Angatu Sistemas?"** — sugestão: sim.

In B2 the answer is expected to be yes (it is Angatu's own post) — still confirmed, not assumed.

- **Yes** → the official Angatu logo from `_marca/` (never redrawn), as a discreet watermark — the
  reference reels use a co-branded chip, *cliente | Angatu* — plus the signature on the final card.
- **No** → no Angatu mark in the frames. The client's own watermark follows `landing-motion.md`,
  section 6.

The answer goes into `BRIEFING.md`. R17 governs pages and e-mails; this question governs videos.

---

## 8. Asset inventory

A table in `BRIEFING.md`:

| Item | Cena | Status | Arquivo | Origem | Licença ou permissão | Qualidade |
|---|---|---|---|---|---|---|
| logo do cliente | 4, 8 | tem | public/brand/cliente.svg | site do cliente | do cliente | vetor |
| narração | todas | falta | — | cliente | — | — |

Status is one of: **tem · falta · precisa de permissão · a baixar**.

Quality floor: an image is at least as wide as the space it fills on screen (full-frame on 1080 wide →
1080 px); footage at least the output resolution, constant frame rate preferred; audio at 44.1 kHz or
more, no clipping.

**A missing asset is never invented.** No placeholder logo, no stock photo passed off as the client's, no
made-up number, testimonial or review, no fake screen of a system. Name what is missing and stop — or
propose a substitute for the user to approve, labelled as a substitute.

**People**: image permission for every recognisable person. Team portraits come from `_marca/` only
with permission recorded there.

---

## 9. Downloads and licences

**Nothing is downloaded unasked.** One batch list per request — file, URL, licence, size — and a clear
yes before anything is fetched.

Sources for sound effects, in order:

1. the studio's local library, each file verified by its Openverse id — `GET
   https://api.openverse.org/v1/audio/<id>/` returns licence, creator and source page, no key needed;
2. `@remotion/sfx` — 32 hosted sounds usable without attribution (licence per sound on its page);
3. Openverse search filtered to CC0 — `https://api.openverse.org/v1/audio/?q=whoosh&license=cc0`;
4. Freesound or Pixabay by hand (Pixabay's own licence is not CC0 — read it).

Forbidden: ripping music or video from a platform; non-commercial (NC) licences in commercial work; music
without a licence for the platform where the video will run — in that case, deliver an extra version
without music, with the start offset noted for whoever adds a licensed track in the app.

Every third-party file gets a row in **`docs/LICENCAS.md`**: arquivo · tipo · fonte (URL) · licença ·
autor · data · onde é usado.

---

## 10. `docs/BRIEFING.md`

```markdown
---
tags:
  - video
  - briefing
client: <cliente>
status: aguardando respostas
---
# Briefing — <cliente> · <peça>

Data: <aaaa-mm-dd> · Pedido original: "<frase do usuário>"

## O cliente (pesquisa da URL)
- Quem é, o que vende, onde: ... (fonte: out/site/<slug>.json)
- Tom e palavras dele: ...
- Paleta: ... · Fontes: ... · Logo: public/brand/...
- Contato: WhatsApp ... (confirmado em <data>) · Instagram ...
- O que a Angatu entregou: ...

## O vídeo
- Tipo: A | B1 (intensidade n) | B2
- Plataforma: ... · Formato: ... · Duração: ...
- Marca da Angatu: sim | não
- Objetivo · Público · Sensação · CTA
- Textos obrigatórios (grafia exata) · Proibido · Ordem

## Material
| Item | Cena | Status | Arquivo | Origem | Licença ou permissão | Qualidade |

## Pendências
- ...

## Aprovação
- Resumo confirmado pelo usuário em <data>.
```

The summary shown in chat is short — the file is the record. Only after "confirmado" does
`video-plan.md` begin.

---
*Original source: the Remotion Motion Graphics brief of Angatu Sistemas · written and audited by Angatu Sistemas*
