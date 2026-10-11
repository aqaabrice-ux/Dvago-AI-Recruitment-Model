# DVAGO v2.8 — Option A: What's New & Where to Find It

**Important: Before you test, you MUST do these 3 things:**

1. **Fully stop the old server** — in the terminal where `node server.js` is running, press **Ctrl+C**
2. **Delete the old folder** and extract the fresh zip in its place (don't just copy over)
3. **Hard-refresh your browser** — press **Ctrl+Shift+R** (Chrome/Edge/Firefox) on both:
   - `http://localhost:3000/` (candidate portal)
   - `http://localhost:3000/admin.html` (admin dashboard)
   
Browser caches the old JS files aggressively; without hard-refresh you'll see v2.7 or older behavior.

---

## 1. 🎙 Audio recording of voice answers (always on)

**Where candidate sees it:** nowhere — recording happens silently in the background during voice interview, alongside speech-to-text.

**Where admin sees it:**
1. Open admin dashboard → **Candidates** tab
2. Click any candidate who has done a voice interview
3. In the detail view, click the **"Voice"** tab (sec-tabs row above the answers)
4. Each voice answer that has audio now shows an **`<audio controls>` player** with ▶ play button
5. The question header shows **"🔊 Audio"** label if audio exists

**What to look for in the UI:**
```
Q1 · Voice · 🔊 Audio                                           [85/100]
Tell me about yourself...
I am Hafeez, I have been working as a cashier...
[▶ ━━━━━━━━━ 00:00 / 00:45 🔊 ⚙]   ← this is the new audio player
```

**If you don't see audio players:**
- You might be looking at a candidate who did their interview on the OLD version (before v2.8). Only NEW submissions after v2.8 install will have audio.
- Try doing a fresh test interview yourself with the new build.

---

## 2. 🤖 Groq dynamic follow-ups

**Groq is OFF by default.** You need to add a free API key.

### Step-by-step to turn it ON:

1. Go to **https://console.groq.com/keys** (free, no credit card)
2. Sign up / log in
3. Click **"Create API Key"** → copy the `gsk_...` key
4. In the DVAGO folder, create a file named `.env` (copy `.env.example` and uncomment the GROQ line):
   ```
   GROQ_API_KEY=gsk_your_actual_key_here
   ```
5. **Restart the server**: Ctrl+C, then `node server.js`
6. Server startup should now show:
   ```
   Groq follow-ups  : ON (llama-3.3-70b-versatile)
   ```

### Where admin sees Groq status:

1. Admin dashboard → **Settings** tab (sidebar, bottom)
2. Scroll down to find the **"SARAH voice follow-ups"** panel
3. The subtitle under the panel title tells you:
   - **● Groq connected (llama-3.3-70b-versatile)** (green dot) = working
   - **Not connected** (gray) = GROQ_API_KEY not set
4. 4 controls here:
   - Enable/disable toggle
   - Max follow-ups per question (0-2 slider, default 1)
   - Max total follow-ups per interview (0-5 slider, default 3)
   - Skip when answer is longer than X words (20-200 slider, default 80)

### What candidate sees when Groq is on:

After each voice answer, SARAH may ask ONE short follow-up question like "Can you give a specific example?" or "What was the hardest part?" — based on their actual answer. Hard caps enforced: never more than 1 per question or 3 total.

---

## 3. 🗣 Smart TTS voice selection (natural voices)

**This is ON by default**, no setup needed. SARAH's voice is now chosen in this priority:

1. **Microsoft Natural voices** (Aria, Jenny, Guy — best on Windows 10/11 with Edge)
2. **Apple Enhanced voices** (Samantha, Ava — on Mac)
3. **Google Cloud voices** (streamed in Chrome when online)
4. Legacy Microsoft (Zira, Hazel)
5. Fallback: any English voice

**If SARAH still sounds robotic on your machine:**
- You might be on **Linux** or **old Windows** without natural voices installed
- On Windows 10/11: Settings → Time & Language → Speech → Add more voices → pick "English (US) — Jenny Online (Natural)"
- Use **Microsoft Edge browser** — it has better voice access than Firefox

**To check which voice SARAH is using:** open browser DevTools (F12) → Console → paste:
```js
Voice.currentVoice
```
Returns something like `{name: "Microsoft Aria Online (Natural) - English (US)", lang: "en-US"}`

---

## 4. 🎯 Silero VAD (natural turn-taking)

**ON by default.** When candidate stops talking for ~1.5 seconds during voice interview, SARAH automatically moves on (no need to click "Stop" manually).

- Loads from CDN first time (~2MB download)
- Falls back silently to manual Stop button if VAD fails to load
- Noisy environments may trigger false stops — manual Stop button always available

---

## 📋 Quick verification checklist

Open the fresh folder → run `node server.js` → startup log should show:

```
DVAGO AI Assessment Platform
---------------------------------------------
Candidate portal : http://localhost:3000/
Admin dashboard  : http://localhost:3000/admin.html
Admin login      : admin@dvago.com / dvago@123
Claude AI review : off — ...
Email delivery   : off — ...
Groq follow-ups  : OFF  (or ON if you set GROQ_API_KEY)
```

Then hit `http://localhost:3000/api/health` in a browser — should return:
```json
{"ok":true,"app":"dvago","version":"2.8","ai":false,"model":null,"mail":false,"groq":false,"groqModel":null}
```

**Version MUST be "2.8"**. If it says "2.1" or anything older, you're running the old server — kill it and restart from the new folder.

---

## 🐛 Still not seeing the features?

Email me a screenshot of:
1. The server terminal (startup log)
2. `http://localhost:3000/api/health` output
3. Admin Settings tab scrolled all the way down
4. Admin Candidates → click one → Voice tab

I can diagnose from those exactly.
