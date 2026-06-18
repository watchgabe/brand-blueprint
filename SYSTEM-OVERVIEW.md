# Brand Blueprint — System Overview

This document explains how the Brand Blueprint tool is built, where everything lives, and how the pieces connect. Hand this to any AI or developer who needs to work on it.

---

## What This Tool Is

A hosted web app at **brand-blueprint-three.vercel.app** that guides FSCreative students through a 36-question brand discovery session. At the end, it produces a structured `.md` file they download and drop into their AI Brain. It is the mandatory first step before any student builds their AI Brain.

The tool is entirely self-contained — no framework, no build step, no npm install needed to run locally. It is a single HTML file served statically, plus three serverless API functions.

---

## How It's Deployed

| Layer | Service | Notes |
|---|---|---|
| Hosting | Vercel | Free Hobby plan |
| Domain | Auto-assigned by Vercel | `brand-blueprint-three.vercel.app` |
| Deployment | Auto-deploy on push to `main` | Connected to GitHub repo |
| Functions | Vercel Serverless (Node 18+) | Files in `/api/*.js`, max 60s timeout |

**To deploy a change:** Push to the `main` branch on GitHub. Vercel picks it up automatically and deploys within ~30 seconds.

---

## GitHub Repository

**URL:** https://github.com/watchgabe/brand-blueprint

**Branch:** `main` is production. Push directly to main — there is no staging branch.

**What's in the repo:**

```
brand-blueprint/
├── public/
│   └── index.html          ← The entire frontend (all CSS, JS, HTML in one file)
├── api/
│   ├── chat.js             ← Proxies messages to the Anthropic API
│   ├── save-blueprint.js   ← Saves session + document to Supabase
│   └── resume-session.js   ← Looks up a saved session by email
├── vercel.json             ← Vercel config (output dir, function timeout)
└── package.json            ← Minimal — just declares Node 18+ requirement
```

---

## Environment Variables

These are set in the Vercel dashboard under Project Settings > Environment Variables. They are never in the code or the repo.

| Variable | What It Is | Where to Get It |
|---|---|---|
| `ANTHROPIC_API_KEY` | API key for Claude | console.anthropic.com |
| `SUPABASE_URL` | REST endpoint for the Supabase project | Supabase dashboard > Project Settings > API |
| `SUPABASE_SERVICE_KEY` | Service role key (bypasses Row Level Security) | Supabase dashboard > Project Settings > API |

**To add or update an env var:** Vercel dashboard > Brand Blueprint project > Settings > Environment Variables. After saving, trigger a new deploy (push a commit or manually redeploy).

---

## API Functions

### `/api/chat.js`
Receives `{ system, messages }` from the frontend and forwards the request to Anthropic's Messages API. Returns Claude's response.

- Model: `claude-sonnet-4-6`
- Max tokens: `8000` (must stay high — the full 36-question document is long)
- The frontend sends the full conversation history on every message (stateless on the server side)

### `/api/save-blueprint.js`
Called when the Brand Blueprint document is generated. Upserts a row into Supabase's `blueprints` table with:
- `session_id` (UUID generated on the client)
- `client_name`
- `email`
- `blueprint_text` (the full .md document)
- `chat_history` (the full conversation as JSON)
- `created_at`, `updated_at`

### `/api/resume-session.js`
Looks up a session by email address. Called when a returning student enters their email — lets them pick up where they left off. Returns the saved `chat_history`, `blueprint_text`, and `question_count` if found.

---

## Supabase Database

**Project:** FSCreative Database (at supabase.com — log in with FSCreative account)

**Table:** `blueprints`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, auto-generated |
| `session_id` | text | UUID generated client-side |
| `client_name` | text | First name entered at start |
| `email` | text | Used for session resume lookup |
| `blueprint_text` | text | The full generated .md document |
| `chat_history` | jsonb | Full conversation history array |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto |

**Important:** The Supabase project pauses automatically after 7 days of inactivity on the free plan. If students get a "Failed to load" error, log into supabase.com and restore the project. Regular usage keeps it active.

---

## Frontend (`public/index.html`)

Everything — all CSS, all JavaScript, all HTML — is in this one file. There is no build process.

**Key sections:**

**`SYSTEM_PROMPT` (const at top of script)**
The full instructions Claude uses to run the 36-question session. It defines all 5 phases, all 36 questions in order, the push-back rules, and the exact document format with `---BRAND_BLUEPRINT_START---` / `---BRAND_BLUEPRINT_END---` markers.

**`sendMessage(text)`**
The core function. Sends the user's message to `/api/chat`, receives Claude's reply, checks whether it contains the document markers, and either renders it as a chat message or extracts and displays the document.

**`extractDoc(text)`**
Looks for `---BRAND_BLUEPRINT_START---` and `---BRAND_BLUEPRINT_END---` in the API response. If found, splits the text into before/doc/after. This is what triggers the document panel to appear on the right side.

**`renderDoc(doc)`**
Displays the document in the right panel. Shows the copy and download buttons.

**`saveToSupabase(chatHistory, doc)`**
Called after every message exchange. Upserts the current session state so resume works.

**Session persistence:**
- `localStorage` stores the session on the current device
- Supabase stores it by email for cross-device resume
- On page load, if a saved session exists for the entered email, a "continue session" banner appears

**Progress tracking:**
- `questionCount` increments on every user message
- Phase thresholds: Phase 1 ends at Q7, Phase 2 at Q18, Phase 3 at Q28, Phase 4 at Q33, Phase 5 at Q36
- After Q36 Claude generates the document; `questionCount` is set to 37 to show "Complete"

**Logo behavior:**
- Dark mode: white wordmark (`Asset_1_4x_kwj8bj.png`)
- Light mode: dark green wordmark (`Asset_2_4x_fs8lwl.png`)
- Both hosted on Cloudinary

---

## The Document Output

When Claude finishes Q36, it generates the Brand Blueprint wrapped in markers:

```
---BRAND_BLUEPRINT_START---
[full Q&A transcript across all 5 phases]
---BRAND_BLUEPRINT_END---
```

The document is a verbatim Q&A transcript — every question followed by the student's exact answer. No synthesis, no interpretation. The AI Brain builder handles extraction in the next step.

**Download filename format:** `firstname-brand-blueprint.md`

After download, `clearSession()` wipes localStorage so the next person who opens the tool starts fresh.

---

## How It All Connects

```
Student opens brand-blueprint-three.vercel.app
        ↓
Enters name + email (stored in localStorage + passed to Supabase)
        ↓
Frontend sends messages to /api/chat (Vercel serverless)
        ↓
/api/chat forwards to Anthropic API (Claude runs the 36-question session)
        ↓
After each message: /api/save-blueprint upserts to Supabase (session saved)
        ↓
After Q36: Claude generates document with markers
        ↓
Frontend detects markers, displays document in right panel
        ↓
Student downloads .md file → drops into AI Brain /Other/ folder
        ↓
AI Brain builder processes it using the Brand Blueprint Question Map in CLAUDE.md
```

---

## How to Make Changes

1. Open `/Volumes/SSD 2026/000 Claude/Brand Blueprint/` in Claude Code
2. Edit `public/index.html` (frontend) or `api/*.js` (backend functions)
3. Test locally if needed — just open `public/index.html` in a browser (note: API calls won't work locally without a local server, but layout/CSS changes are visible)
4. Commit and push to `main`:
   ```
   git add public/index.html
   git commit -m "Your change description"
   git push
   ```
5. Vercel deploys automatically. Check vercel.com dashboard for deploy status.

**Never add a `Co-Authored-By: claude` trailer to commits.** It breaks Vercel Hobby plan deployments.

---

## To Give Another AI Access

Share this document plus the GitHub repo URL: **https://github.com/watchgabe/brand-blueprint**

The AI can read all source files directly from GitHub. For it to make changes that deploy, it needs:
- GitHub access (to push to `main`)
- The env vars listed above (do not share these publicly — send separately)

Do not share the `ANTHROPIC_API_KEY` or `SUPABASE_SERVICE_KEY` in any public document or chat.
