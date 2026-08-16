# Going Live — Your Playbook

This is for **you** (not for her). It covers the three things you said you'd
need: deploying properly, moving to a machine you can leave on permanently,
and supporting her for the first 30 days.

Pick ONE of the two paths below. **Path A (Render) is strongly recommended**
— it's less work, more reliable, and free to start.

---

## Path A — Deploy to Render (recommended, ~15 minutes)

No machine of yours stays on. Render runs the app and the database 24/7 and
gives you a permanent `https://...onrender.com` address.

1. Go to **render.com** → sign up (the "Sign in with GitHub" button is
   easiest).
2. **New → Blueprint** → connect your GitHub → pick the
   `Raider2001/courier-service` repo. Render reads `render.yaml` and shows
   one web service + one Postgres database.
3. When prompted for environment variables, set:
   - `ADMIN_EMAIL` — **her real email address**
   - `ADMIN_PASSWORD` — a strong password (share it with her privately)
   - `ADMIN_NAME` — her name
4. Click **Apply** and wait for the first deploy (~5 min).
5. Open the service URL it gives you (e.g. `https://courier.onrender.com`),
   sign in with her email/password — you're live.

Because `NODE_ENV=production`, the database starts **clean**: her admin
account only, no demo customers, no demo jobs. She adds real customers and
drivers herself (or customers self-register).

Making changes during the 30 days: edit code locally → `git push` →
Render redeploys automatically in a few minutes. That's the whole loop.

Free-tier note: the service sleeps after 15 idle minutes and takes ~30s to
wake on the first visit. If that annoys her, the Starter plan (~$7/month)
keeps it always-on. The free Postgres expires after 90 days — upgrade it or
migrate before then if she's committed.

---

## Path B — Your own always-on machine

Only pick this if you specifically want the app in the house. You become
responsible for power cuts, Windows updates, and reboots.

### 1. Set the machine up

```bash
# Install Node 20+ (nodejs.org), and git, then:
git clone https://github.com/Raider2001/courier-service.git
cd courier-service
npm install
```

### 2. Recreate the database

Edit `server/.env` first:

```
NODE_ENV=production
JWT_SECRET=<paste something long and random>
ADMIN_EMAIL=her-real-email@example.com
ADMIN_PASSWORD=<a strong password>
ADMIN_NAME=Her Name
```

Then:

```bash
npm run db:setup    # creates a CLEAN database with just her admin login
npm run build       # builds the app
npm start           # serves app + API together on port 4000
```

The database lives in `server/.data/`. **That folder IS her business data**
— to move machines later, stop the app and copy that folder; to back up,
copy that folder somewhere safe (do this weekly at minimum).

### 3. Give it a permanent web address

The demo used a "quick tunnel" — the URL changes on every restart, which is
useless for real use. Set up a **named** Cloudflare tunnel (free, stable):

1. Sign up at cloudflare.com and add a domain (buy one, ~£10/yr — e.g.
   `herbusiness.co.uk`).
2. On the machine:
   ```bash
   .tools/cloudflared.exe tunnel login
   .tools/cloudflared.exe tunnel create courier
   .tools/cloudflared.exe tunnel route dns courier app.herbusiness.co.uk
   .tools/cloudflared.exe tunnel run --url http://localhost:4000 courier
   ```
3. Now `https://app.herbusiness.co.uk` reaches the app — same address
   forever, even after reboots.

### 4. Keep it alive without you

- **Never sleep:** Settings → System → Power → "When plugged in, put my
  device to sleep" → **Never**.
- **Start on boot:** Task Scheduler → Create Task → trigger *At startup* →
  two actions, both "Start a program":
  - `npm start` in the project folder (program: `cmd.exe`, arguments:
    `/c cd /d C:\path\to\courier-service && npm start`)
  - the `cloudflared tunnel run` command above, same pattern
- **Auto-restart on crash:** in the task's Settings tab, tick "If the task
  fails, restart every 1 minute".

---

## Her access + your monitoring (both paths)

- **She manages everything from the app itself** — customers, drivers,
  pricing, invoicing all live behind her admin login, from any phone or
  laptop. She never needs to touch the machine, the code, or the database.
- **You monitor locally:** keep your dev copy on your own machine. To ship
  a change during the 30 days:
  ```bash
  # on your machine
  git pull            # in case anything changed
  # ...make the change, test with npm run dev...
  git add -A && git commit -m "what changed" && git push
  ```
  Then: **Path A** — Render redeploys itself. **Path B** — on her machine:
  `git pull && npm install && npm run build`, restart the app.
- **Health check:** `https://<the-app-address>/api/health` returns
  `{"ok":true}` when everything is up — bookmark it on your phone.
- The database schema/seed (`server/db/`) is idempotent — running
  `npm run db:setup` on an existing database never wipes data. Only
  `npm run db:reset` wipes (never run that in production).

---

## 30-day punch list (copy into your notes)

- [ ] Path chosen and app live on a permanent address
- [ ] Her real admin email + strong password set; demo logins gone
- [ ] She's signed in from her phone and added it to her home screen
- [ ] First real customer + driver created
- [ ] Backup arranged (Render: database backups on by default; own
      machine: weekly copy of `server/.data/`)
- [ ] Her feedback list collected and triaged
- [ ] Week 4: review what to change, agree what happens after the 30 days
