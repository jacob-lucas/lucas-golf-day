# Lucas Golf Day 2026 app

An installable web app (PWA) for the Monday 28 December Texas Scramble.

- Live leaderboard with score to par, net and gross, and holes played
- One scorecard per team, visible to everyone
- Only a team's captain can edit that team's card (honor system, see below)
- Rules behind the Rules button
- Works offline: scores entered without signal sync when the phone reconnects

## Files

| File | What it does |
|---|---|
| index.html | The whole app |
| manifest.webmanifest | Makes it installable (name, icons, colours) |
| sw.js | Service worker for offline use |
| icon-192.png, icon-512.png, icon-maskable-512.png | Home screen icons (the Lucas crest) |

## Step 1: Try it in demo mode

Open index.html through any web server, or skip ahead and deploy it (step 4). Until Firebase is connected, the app shows "Demo mode" and keeps scores on that one phone. This is fine for checking the layout.

## Step 2: Create the Firebase database (about 10 minutes)

1. Go to https://console.firebase.google.com and sign in with a Google account.
2. Click **Add project**, name it `family-golf-day`, and turn Google Analytics off.
3. In the left menu choose **Build, then Firestore Database**, and click **Create database**.
   - Location: `australia-southeast1` (Sydney) is the closest.
   - Start in **production mode**.
4. Open the **Rules** tab, replace everything with the text below, and click **Publish**.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rounds/dec28 {
      allow read, write: if request.time < timestamp.date(2027, 1, 3);
    }
  }
}
```

This only allows access to the one scoring document, and the database locks itself on 3 January 2027.

5. Click the gear icon, then **Project settings**. Under **Your apps**, click the web icon `</>`, register an app called `golf-day`, and skip hosting.
6. Copy the `firebaseConfig` values it shows (apiKey, authDomain, projectId, appId).
7. In index.html, find `FIREBASE_CONFIG` near the top of the script and paste your values over the placeholders.

## Step 3: Host it on GitHub Pages

1. Create a new GitHub repository, for example `golf-day`.
2. Upload all five files to the top level of the repo.
3. Go to **Settings, then Pages**. Under Build and deployment choose **Deploy from a branch**, pick `main` and `/ (root)`, and save.
4. After a minute your app is live at `https://YOUR-USERNAME.github.io/golf-day/`.

## Step 4: Install on every phone

- **iPhone (Safari):** open the link, tap Share, then **Add to Home Screen**.
- **Android (Chrome):** open the link, tap the menu, then **Install app**.

Open it once with signal before you head to the course so the app is saved for offline use.

## Step 5: Setup (organiser only)

When you open the app as Jacob, a **Setup** button appears at the top. Nobody else sees it. Use it to set:

- Course name, tee times for each team, and the par for holes 1 to 9. Until pars are set, every hole counts as par 4.
- Players: name, handicap (0 to 54), team (A, B or C), and mulligans. Mulligans are shared within a team.
- **Balance teams:** spreads the nine players across three teams of three so the team allowances are as close as possible. It moves as few players as it can. Tick **Lock** on a player to keep them on their team, which is how you keep pairs together (for example Matt with Lachie).
- Captains: each team's captain is the only person who can edit that team's scorecard.
- Allowance override: leave blank to use the standard formula, or type a number to set a team's allowance yourself.

Each team must have exactly three players, and Jacob must stay in the player list to keep Setup access. If scores have already been entered, Setup shows a warning, because changing teams or allowances changes the leaderboard.

## How the honor system works

Each person picks their name the first time they open the app (tap "You: name" at the top to switch). The app only lets that person edit the team they captain. Nothing stops someone choosing another name, so this relies on everyone playing fair. The database rules above also mean anyone who has the link could technically change scores, so keep the link within the family.

## How scoring is calculated

- Score with tee choice: team score on the hole, plus 1 if they moved forward a tee box, minus 1 if they moved back.
- Gross: that score against par.
- Net: gross minus the team's allowance. During play the allowance is spread evenly over holes played (6 shots is 0.67 per hole, rounded), so the live net is an estimate. After hole 9 the full allowance applies.
- Allowances: set automatically from the handicaps (25% lowest, 15% middle, 10% highest, halved for 9 holes) unless overridden in Setup.

## Changing things later

- Players, handicaps, teams, allowances and mulligans are all changed in Setup. The starting line-up is `DEFAULT_PLAYERS` at the top of the script in index.html.
- After editing any file, change `CACHE = 'golf-day-v1'` in sw.js to `golf-day-v2` so phones pick up the update.

## Before the day

1. Do a test round with two or three phones: score a hole as a captain, and check it appears on the other phones.
2. Switch one phone to airplane mode, score a hole, then switch it back and confirm it syncs.
3. Once you book the course, enter the pars in Setup.

## Testing

- `tests/test-app.js` runs 50 automatic checks on the app logic (scoring, captains, Setup, balance, rules). From the `tests` folder run `npm install` then `npm test`. It needs Node.js.
- `tests/LIVE-TEST-PLAN.md` is a step by step checklist for testing the hosted app on real phones.
