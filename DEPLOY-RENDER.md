# DVAGO ko Render par free deploy karna (presentation / demo ke liye)

Yeh sirf demo ke liye hai. Free Render par server so jata hai aur restart par `data/` (candidates, video, audio) mit jata hai.
Asli hiring ke liye IT team ka paid server use karein.

## Pehle se chahiye
- GitHub account (free): https://github.com
- Render account (free): https://render.com  ("Sign up with GitHub" sabse aasan hai)

## Step 1: Code GitHub par daalein
1. GitHub par naya repository banayein, naam: `dvago-ai-recruiter`, **Private** rakhein.
2. Is folder (`DVAGO Assessment Platform`) mein terminal kholein aur yeh commands chalayein
   (apni GitHub id `YOUR-ID` ki jagah likhein):

   git init
   git add .
   git commit -m "DVAGO platform"
   git branch -M main
   git remote add origin https://github.com/YOUR-ID/dvago-ai-recruiter.git
   git push -u origin main

3. Check karein ke GitHub par `.env` aur `data` folder **nahi** dikh rahe. (`.gitignore` unhein rok deta hai.)
   Agar `.env` dikhe to foran repository delete karein aur apni keys badal lein.

## Step 2: Render par chalayein
1. Render dashboard mein **New +** dabayein, phir **Blueprint** chunein.
2. Apna GitHub repository chunein. Render `render.yaml` khud padh lega.
3. Woh aap se secret values maangega. Yeh bharein:
   - `ADMIN_EMAIL`    = admin@dvago.com  (ya jo aap chahein)
   - `ADMIN_PASSWORD` = ek **naya mazboot password** (default `dvago@123` hargiz na rakhein)
   - `GROQ_API_KEY`   = aap ki Groq key (SARAH ke follow-ups aur AI voice ke liye)
   - SMTP wali values khali chor sakte hain (emails sirf file mein save hongi).
4. **Apply / Deploy** dabayein. 3 se 5 minute lagte hain.
5. Dashboard par ek link milega: `https://dvago-ai-recruiter.onrender.com`

## Step 3: Presentation se pehle
- Link bhejne se **5 minute pehle** khud kholein, taake server jag jaye (so kar jagne mein ~1 minute lagta hai).
- Candidate portal:  `https://<aap-ka-link>/`
- Admin portal:      `https://<aap-ka-link>/admin.html`
- Pehli baar SARAH ki AI voice ke liye Groq console mein terms ek baar accept karni hoti hain.
- Chrome ya Edge use karein (voice recognition sirf wahan chalta hai).
- Admin mein demo candidates daal lein taake dashboard khali na dikhe.

## Code update karna ho to
   git add .
   git commit -m "update"
   git push
Render khud naya version deploy kar dega. (Dhyan rahe: deploy par `data/` phir mit jata hai.)
