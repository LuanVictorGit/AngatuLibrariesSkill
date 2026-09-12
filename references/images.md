# Images — ask for the compression strategy first

> Covers R28 and gate **G2**. The moment a project starts **saving images** (user upload, product
> photo, avatar, attachment, generated art), **stop and ask the developer which compression and
> optimisation strategy to use**, before writing any storage code. Storage is expensive and the choice
> changes how the result looks — it is not the agent's decision.

---

## 1. The question (G2)

Present the options with their effect, and recommend the first when there is no context:

| Option | Strategy | Typical effect | When it fits |
|---|---|---|---|
| **A** (recommended default) | JPEG quality 0.8, longest side 1600 px | 80–90% fewer bytes, no perceptible difference on screen | product photos, galleries, banners, avatars |
| **B** | Original preserved + derivatives (`thumb` 400 px, `web` 1200 px) | more space, full flexibility | when the original matters — documents, receipts, print artwork |
| **C** | Aggressive: JPEG quality 0.6, longest side 1024 px | biggest saving, visible loss in fine detail | large catalogues, many images per record, tight budget |
| **D** | No compression | no space saving at all | a legal or fidelity requirement — ask for the justification and record it |

Also ask, when it makes a difference: **maximum accepted upload size**, **accepted formats**, and
whether a **thumbnail** is needed for listings.

> **WebP is not free.** The `imageio-webp` dependency in the pom only **reads** WebP; to **write** it,
> the project needs an additional write dependency. Offer it as an extra option ("~30% smaller than
> JPEG at the same quality, needs a new dependency") instead of assuming it is available.

Record the choice in the project's `CLAUDE.md` (R2), in the `Decisões registradas` block. It applies to
every screen that follows, and the agent does not reopen the question for each new image.

## 2. How to implement it — the library already has this

```java
// redimensiona mantendo proporção e grava com qualidade controlada
BufferedImage original = ImageAPI.bytesToImage(uploadBytes);
BufferedImage resized  = ImageAPI.resizeMaintainAspect(original, 1600, 1600);
ImageAPI.saveImageWithQuality(resized, "/data/uploads/" + id + ".jpg", 0.8f);

// miniatura para listagem
ImageAPI.createThumbnail(origem, destino, 400, 400);
```

> **Careful:** `saveImageWithQuality` always writes **JPEG**, whatever the file extension says — use
> `.jpg` in the name. For PNG (transparency), use `ImageAPI.saveImage(...)`, which respects the
> extension but takes no quality parameter.

## 3. Where to store it

- **File on the volume, path in the database.** Write to `/data/uploads/...` (persistent on Coolify,
  `deploy-coolify.md`) and persist only the path or name on the `Saveable` entity.
- **Do not put image bytes inside SQLite.** `Saveable` serialises the whole object to JSON: a `byte[]`
  becomes Base64 inside the `data` column, bloating the database and every read of that entity. The
  library's `Image` entity exists for small, occasional cases (an icon, a QR code) — not for a gallery.
- **Validate before writing:** `ImageAPI.isValidImage(...)`, maximum size, and extension. Validation is
  by real content, never by the extension the client claims (`security.md`).
- **Name by a generated ID**, never by the name the user sent.

## 4. Memory

Any path whose memory use grows with the input needs a ceiling. If the operation accepts N concurrent
requests of up to M bytes, the worst case is N×M and it has to fit in the heap. Refusing with a clear
message is the good outcome; accepting and running out of memory takes down everyone connected
(`deploy-coolify.md`).

## 5. Generated art is still an image

Open Graph covers, canvas exports and themed backgrounds follow the same storage rules: generated
locally, saved under `public/assets/`, never hotlinked from a stock photo site. The design side of that
lives in `paint.md` and `landing-seo-og.md`; the file handling lives here.
