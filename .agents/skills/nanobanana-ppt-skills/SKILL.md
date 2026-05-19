---
name: nanobanana-ppt-skills
description: "AI-powered PPT generation with document analysis and styled images (Gemini / Nano Banana Pro)"
risk: safe
source: "https://github.com/op7418/NanoBanana-PPT-Skills"
date_added: "2026-02-27"
---

# NanoBanana PPT Skills (Studio install)

## Overview

Generates **16:9 PPT slide images** (2K/4K) via Google Gemini (Nano Banana Pro), with optional Kling AI transition videos. Installed at:

`tools/NanoBanana-PPT-Skills/`

## Prerequisites

1. **Python venv** (already created): `tools/NanoBanana-PPT-Skills/venv/`
2. **API key** in `tools/NanoBanana-PPT-Skills/.env`:
   - `GEMINI_API_KEY` — required ([Google AI Studio](https://aistudio.google.com/apikey))
   - `KLING_ACCESS_KEY` / `KLING_SECRET_KEY` — optional (transition videos; needs FFmpeg)

Replace placeholder values in `.env` before generating slides.

## When to Use

- User wants AI-generated **presentation slides** from a document or outline
- User mentions Nano Banana, nanobanana, or Gemini slide images
- Marketing/education decks in **gradient glass** or **vector illustration** styles

## Workflow (Cursor / agents)

### 1. Gather input

- Document path (read with Read tool) or pasted outline
- Style: `styles/gradient-glass.md` or `styles/vector-illustration.md`
- Page count and resolution (`2K` or `4K`)

### 2. Create `slides_plan.json`

Save under `tools/NanoBanana-PPT-Skills/` (or pass full path to `--plan`):

```json
{
  "title": "Deck title",
  "total_slides": 3,
  "slides": [
    {
      "slide_number": 1,
      "page_type": "cover",
      "content": "Title: School Arcade Rewards\nSubtitle: Student motivation made simple"
    },
    {
      "slide_number": 2,
      "page_type": "content",
      "content": "Key features\n- Points and prizes\n- Teacher dashboard\n- School portal"
    },
    {
      "slide_number": 3,
      "page_type": "content",
      "content": "Summary\nOne platform for rewards, recognition, and engagement"
    }
  ]
}
```

`page_type`: `cover` | `content` | `data`

### 3. Generate images

From repo root (Windows):

```powershell
cd tools/NanoBanana-PPT-Skills
.\venv\Scripts\python.exe generate_ppt.py --plan slides_plan.json --style styles/gradient-glass.md --resolution 2K
```

Or from studio root:

```bash
npm run nanobanana:ppt -- --plan slides_plan.json --style styles/gradient-glass.md --resolution 2K
```

Output: `tools/NanoBanana-PPT-Skills/outputs/<timestamp>/` with PNGs and `index.html` viewer.

### 4. Optional video

Requires Kling keys + FFmpeg. See `tools/NanoBanana-PPT-Skills/README.md` and `generate_ppt_video.py`.

## Paths reference

| Item | Path |
|------|------|
| Install root | `tools/NanoBanana-PPT-Skills/` |
| CLI | `generate_ppt.py` |
| Styles | `styles/gradient-glass.md`, `styles/vector-illustration.md` |
| Env | `tools/NanoBanana-PPT-Skills/.env` |
| Upstream docs | `tools/NanoBanana-PPT-Skills/SKILL.md`, `QUICKSTART.md` |

## Limitations

- Requires valid `GEMINI_API_KEY`; free tier has daily limits (~15 requests).
- Optimized for **slides**, not arbitrary one-off images.
- Do not commit `.env` or API keys.
- Video features need FFmpeg and Kling credentials.

## Troubleshooting

- `GEMINI_API_KEY` missing → edit `.env` in `tools/NanoBanana-PPT-Skills/`
- Regenerate venv: `py -3.10 -m venv venv` then `.\venv\Scripts\pip install google-genai pillow python-dotenv`
