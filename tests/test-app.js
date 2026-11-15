// Logic tests for the Lucas Golf Day app. Runs the real index.html in a simulated
// browser (jsdom) in demo mode, with the Firebase scripts and network stubbed out.
//
// Usage:  npm install && npm test            (tests ../index.html)
//         node test-app.js path/to/index.html
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const file = path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
const html0 = fs.readFileSync(file, 'utf8');
const html = html0.replace(/<script src="https:[^>]*><\/script>/g, '');

let pass = 0, fail = 0;
const check = (cond, msg) => { if (cond) { pass++; console.log('  PASS ' + msg); } else { fail++; console.log('  FAIL ' + msg); } };
const section = (t) => console.log('\n' + t);

function boot(me, opts) {
  opts = opts || {};
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'https://test.local/', pretendToBeVisual: true,
    beforeParse(w) {
      if (me) w.localStorage.setItem('golf.me', me);
      if (opts.storage) Object.keys(opts.storage).forEach((k) => w.localStorage.setItem(k, opts.storage[k]));
      w.fetch = (u) => {
        if (opts.build && /build\.json/.test(u)) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(opts.build) });
        if (opts.wttr && /wttr\.in/.test(u)) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(opts.wttr) });
        if (opts.wxStatus) return Promise.resolve({ ok: false, status: opts.wxStatus, json: () => Promise.resolve({}) });
        if (opts.wxReject) return Promise.reject(new Error(opts.wxReject));
        return opts.wx ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(opts.wx) }) : new Promise(() => {});
      };
    }
  });
  const w = dom.window, d = w.document;
  const click = (sel) => { const e = d.querySelector(sel); if (!e) throw new Error('missing ' + sel); e.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); };
  const change = (sel) => { d.querySelector(sel).dispatchEvent(new w.Event('change', { bubbles: true })); };
  const has = (sel) => !!d.querySelector(sel);
  const text = (sel) => (d.querySelector(sel) ? d.querySelector(sel).textContent.replace(/\s+/g, ' ').trim() : '');
  return { dom, w, d, click, change, has, text };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  // ---------- 1. Start-up ----------
  section('1. Start-up');
  {
    check(!/apiKey: "YOUR_/.test(html0), 'Firebase config is filled in (no YOUR_ placeholders), otherwise the live site shows Demo mode');
    check(/projectId: "lucas-golf-day"/.test(html0), 'Firebase projectId is lucas-golf-day');
    const a = boot('Jacob'); await wait(50);
    check(a.text('h1') === 'Lucas Golf Day 2026', 'title is Lucas Golf Day 2026');
    check(/Demo mode/.test(a.text('#statusText')), 'demo mode shown when the Firebase scripts are unavailable (' + a.text('#statusText') + ')');
    check(a.d.querySelectorAll('.brow').length === 3, 'leaderboard lists 3 teams');
    check(/Course.*To be confirmed/.test(a.text('.info')), 'course shows To be confirmed');
    check(a.has('.dateline'), 'date line present');
    const n = boot(null); await wait(50);
    check(n.has('.scrim'), 'new visitor is asked to pick a name');
  }

  // ---------- 2. Weather ----------
  section('2. Weather line');
  {
    const a = boot('Jacob', { wx: { current: { temperature_2m: 27.4, weather_code: 1, wind_speed_10m: 14.2 } } }); await wait(100);
    const t = a.text('#wx');
    check(/Perth WA/.test(t) && /27/.test(t) && /14 km\/h/.test(t) && /Partly cloudy/.test(t), 'shows Perth WA conditions: ' + t);
    const b = boot('Jacob'); await wait(50);
    check(/Perth WA weather loading/.test(b.text('#wx')), 'shows loading text while waiting: ' + b.text('#wx'));
    const e1 = boot('Jacob', { wxStatus: 429 }); await wait(100);
    check(/unavailable \(HTTP 429/.test(e1.text('#wx')) && /Tap to retry/.test(e1.text('#wx')), 'HTTP error is shown with a reason: ' + e1.text('#wx'));
    const e2 = boot('Jacob', { wxReject: 'Load failed' }); await wait(100);
    check(/unavailable \(Load failed/.test(e2.text('#wx')), 'network failure is shown with a reason: ' + e2.text('#wx'));
    const e3 = boot('Jacob', { wx: { error: true, reason: 'Too many requests' } }); await wait(100);
    check(/Too many requests/.test(e3.text('#wx')), 'API error reason is shown: ' + e3.text('#wx'));
    const e4 = boot('Jacob', { wxReject: 'Load failed', wttr: { current_condition: [{ temp_C: '31', weatherCode: '113', windspeedKmph: '12' }] } }); await wait(100);
    check(/31/.test(e4.text('#wx')) && /Clear/.test(e4.text('#wx')), 'falls back to wttr.in when Open-Meteo fails: ' + e4.text('#wx'));
    const bi = boot('Jacob', { build: { commit: 'abcdef1234567890', time: '2026-11-15T05:30:00Z' } }); await wait(100);
    const bl = bi.d.querySelector('#buildinfo a');
    check(bl && /commit\/abcdef1234567890$/.test(bl.href) && /abcdef1/.test(bl.textContent), 'Leaderboard footer links to the build commit: ' + (bl && bl.href));
    check(/1:30 pm|1:30 PM/i.test(bi.text('#buildinfo')), 'build time shown in Perth time: ' + bi.text('#buildinfo'));
    const cr = boot('Ken'); await wait(50);
    const lb = cr.text('#main');
    check(/Michael \(c\), Matt, Lachie/.test(lb) && /Jacob \(c\), Stu, Jett/.test(lb) && /Ken \(c\), Adam, Ron/.test(lb), 'leaderboard marks each captain with (c): ' + lb.slice(0, 0));
    check((lb.match(/\(c\)/g) || []).length === 3, 'exactly three captains marked');
    check(!cr.has('[data-act=hcpinfo]'), 'leaderboard hcp is no longer a link');
    check(cr.has('[data-act=hcpboardtoggle]') && !/Lowest/.test(cr.text('.hcpboard')), 'leaderboard has a collapsed handicap block');
    cr.click('[data-act=hcpboardtoggle]');
    const hbd = cr.text('.hcpboard');
    check(/Team A: 6 shots/.test(hbd) && /Team B: 6 shots/.test(hbd) && /Team C: 8 shots/.test(hbd) && /11\.4/.test(hbd), 'tapping it shows the workings for all three teams');
    cr.click('[data-act=hcpboardtoggle]');
    check(!/Lowest/.test(cr.text('.hcpboard')), 'tapping again collapses it');
    check(cr.text('.foot') === 'Net is gross minus the team handicap, spread over the holes played. Tap a team to see its scorecard.', 'leaderboard footer is the short version: ' + cr.text('.foot').slice(0, 0));
    cr.click('#tabCards'); cr.click('[data-act=cardteam][data-team=A]');
    check(!/Lowest/.test(cr.text('.hcpbox')) && /Team handicap: 6 shots/.test(cr.text('.hcpbox')), 'handicap block starts collapsed');
    check(cr.d.querySelector('.hcphead').getAttribute('aria-expanded') === 'false', 'toggle reports collapsed');
    cr.click('.hcphead');
    check(cr.d.querySelector('.hcphead').getAttribute('aria-expanded') === 'true', 'tap expands the handicap block');
    const hb = cr.text('.hcpbox');
    check(/Team handicap: 6 shots/.test(hb) && /Michael/.test(hb) && /11\.4/.test(hb) && /5\.7/.test(hb), 'team card shows the handicap workings: ' + hb.slice(0, 0));
    const kids = Array.from(cr.d.querySelector('.card').children).map((e) => e.className || e.tagName);
    check(!cr.has('[data-act=editname]'), 'non-captain sees no edit icon on a team card');
    check(/Michael \(c, 6\), Matt \(30\), Lachie \(54\)/.test(cr.text('.card .sub')), 'card player list marks the captain as (c, hcp): ' + cr.text('.card .sub').slice(0, 0));
    {
      const kc = boot('Ken'); await wait(50);
      kc.click('#tabCards'); kc.click('[data-act=cardteam][data-team=C]');
      check(kc.has('[data-act=editname]'), 'captain sees an edit icon next to the team name');
      kc.click('[data-act=editname]');
      check(kc.has('#fTeamName'), 'edit icon opens the name modal');
      kc.d.querySelector('#fTeamName').value = 'Albatross';
      kc.click('[data-act=savename]'); await wait(30);
      check(!kc.has('#fTeamName'), 'saving closes the modal');
      check(/Albatross/.test(kc.text('.card h2')) && /Albatross/.test(kc.text('.seg')), 'new name shown on the card and tabs');
      kc.click('#tabBoard'); check(/Albatross/.test(kc.text('#main')), 'new name shown on the leaderboard');
      kc.click('#tabCards'); kc.click('[data-act=editname]');
      kc.d.querySelector('#fTeamName').value = 'team a';
      kc.click('[data-act=savename]');
      check(kc.has('#fTeamName'), 'name already used by another team is rejected');
      kc.d.querySelector('#fTeamName').value = '';
      kc.click('[data-act=savename]'); await wait(30);
      check(/Team C/.test(kc.text('.card h2')), 'blank name goes back to the default');
    }
    cr.click('.hcphead');
    check(!/Lowest/.test(cr.text('.hcpbox')), 'second tap collapses it again');
    cr.click('.hcphead');
    check(kids.indexOf('hcpbox') > kids.indexOf('sub') && kids.indexOf('hcpbox') < kids.indexOf('TABLE'), 'workings sit between the player list and the scorecard');
    check(/Lachie Team hcp 6/.test(lb) && /Jett Team hcp 6/.test(lb) && /Ron Team hcp 8/.test(lb.replace(' \u00b7',''))|| /Team hcp 6.*Team hcp 6.*Team hcp 8/.test(lb), 'leaderboard shows each team handicap: ' + lb.slice(0, 0));
    cr.click('.crest'); await wait(20);
    check(cr.has('.lbox img') && cr.has('.lbx'), 'tapping the crest opens a larger image with an X');
    cr.click('.lbx'); await wait(20);
    check(!cr.has('.lbox'), 'X closes the crest image');
    check(/\.scrim\.lightbox\{align-items:center\}/.test(cr.d.querySelector('style').textContent), 'crest image is vertically centred');
    check(e3.has('#wx[data-act=wxretry]'), 'weather line is tappable to retry');
  }

  // ---------- 3. Access control ----------
  section('3. Access control');
  {
    const k = boot('Ken'); await wait(50);
    check(k.d.querySelector('#btnSettings').classList.contains('hidden'), 'Setup button hidden for Ken');
    k.d.querySelector('#btnSettings').dispatchEvent(new k.w.MouseEvent('click', { bubbles: true }));
    check(!k.has('#fCourse'), 'Setup does not open for Ken');
    const j = boot('Jacob'); await wait(50);
    check(!j.d.querySelector('#btnSettings').classList.contains('hidden'), 'Setup button visible for Jacob');
  }

  // ---------- 4. Captain and read-only scorecards ----------
  section('4. Captains and read-only cards');
  {
    const j = boot('Jacob'); await wait(50);
    j.click('#tabCards');
    j.click('[data-act=cardteam][data-team=A]');
    check(j.d.querySelectorAll('tr.edit').length === 0, 'Jacob cannot edit Team A');
    check(/View only/.test(j.text('.who-line')), 'Team A shows View only');
    j.click('[data-act=cardteam][data-team=B]');
    check(j.d.querySelectorAll('tr.edit').length === 9, 'Jacob can edit all 9 holes of Team B');
    const k = boot('Ken'); await wait(50);
    k.click('#tabCards'); k.click('[data-act=cardteam][data-team=C]');
    check(k.d.querySelectorAll('tr.edit').length === 9, 'Ken can edit Team C');
    k.click('[data-act=cardteam][data-team=B]');
    check(k.d.querySelectorAll('tr.edit').length === 0, 'Ken cannot edit Team B');
    const a = boot('Adam'); await wait(50);
    a.click('#tabCards');
    check(['A', 'B', 'C'].every((t) => { a.click('[data-act=cardteam][data-team=' + t + ']'); return a.d.querySelectorAll('tr.edit').length === 0; }), 'Adam is view only on every team');
  }

  // ---------- 5. Entering scores, tee choice, drives, mulligans ----------
  section('5. Scoring');
  {
    const j = boot('Jacob'); await wait(50);
    j.click('#tabCards'); j.click('[data-act=cardteam][data-team=B]');
    j.click('tr[data-hole="1"]');
    check(j.text('.sheet h2') === 'Team B, hole 1', 'hole editor opens for hole 1');
    j.click('[data-act=sinc]'); j.click('[data-act=sinc]');
    check(j.text('#sval') === '6', 'stepper moves par 4 up to 6');
    j.click('[data-act=settee][data-v=b]');
    j.click('[data-act=setdrive][data-name=Stu]');
    j.click('[data-act=minc]'); j.click('[data-act=minc]');
    check(j.text('#mval') === '2', 'two mulligans recorded');
    j.click('[data-act=savehole]');
    const row = j.d.querySelector('tr[data-hole="1"]');
    check(/6/.test(row.querySelector('.sc').textContent), 'hole 1 score saved as 6');
    check(/Back -1/.test(row.textContent) && /Stu/.test(row.textContent), 'tee choice and drive shown on the card');
    check(/used on hole 1/.test(j.text('.tally')), 'tally shows tee choice used on hole 1');
    check(/Stu 1\/3/.test(j.text('.tally')), 'tally shows Stu 1/3 drives');
    check(/Mulligans left: 1 of 3/.test(j.text('.tally')), 'tally shows 1 of 3 mulligans left (' + j.text('.tally') + ')');

    j.click('tr[data-hole="2"]');
    check(j.d.querySelector('[data-act=settee][data-v=f]').disabled && j.d.querySelector('[data-act=settee][data-v=b]').disabled, 'tee choice locked on hole 2 after use');
    check(!j.d.querySelector('[data-act=settee][data-v=w]').disabled, 'white tees still selectable');
    j.click('[data-act=minc]');
    check(j.text('#mval') === '1', 'one more mulligan allowed');
    j.click('[data-act=minc]');
    check(j.text('#mval') === '1', 'mulligans stop at the team limit');
    j.click('[data-act=close]');

    // Leaderboard: adjusted 5 vs par 4 = +1 gross; allowance 6 x 1/9 rounds to 1; net 0 = E
    j.click('#tabBoard');
    const b = j.d.querySelector('.brow[data-team=B]');
    const nums = b.querySelectorAll('.num');
    check(nums[0].textContent === 'E' && nums[1].textContent === '+1', 'leaderboard Team B net E, gross +1 (' + nums[0].textContent + ', ' + nums[1].textContent + ')');
    check(b.querySelector('.thru').textContent === '1', 'thru shows 1');
    check(j.d.querySelector('.brow').getAttribute('data-team') === 'B', 'Team B leads the board');

    // Clear hole
    j.click('#tabCards'); j.click('tr[data-hole="1"]'); j.click('[data-act=clearhole]');
    check(!/6/.test(j.d.querySelector('tr[data-hole="1"] .sc').textContent), 'clearing a hole removes the score');
  }

  // ---------- 5b. Drive limit ----------
  section('5b. Drive limit');
  {
    const j = boot('Jacob'); await wait(50);
    j.click('#tabCards'); j.click('[data-act=cardteam][data-team=B]');
    for (let h = 1; h <= 3; h++) {
      j.click('tr[data-hole="' + h + '"]');
      check(!/cannot be selected again/.test(j.text('.sheet')) , 'no cannot-select note before anyone has 3 drives (hole ' + h + ')');
      j.click('[data-act=setdrive][data-name=Stu]');
      check(h === 3 ? /Stu's last drive/.test(j.text('.sheet')) : !/last drive/.test(j.text('.sheet')), 'last-drive note appears only when Stu takes his 3rd (hole ' + h + ')');
      j.click('[data-act=savehole]');
    }
    check(/Stu 3\/3/.test(j.text('.tally')), 'Stu has 3 drives recorded');
    j.click('tr[data-hole="4"]');
    const st = j.d.querySelector('[data-act=setdrive][data-name=Stu]');
    check(st.disabled, 'Stu is greyed out on hole 4 after 3 drives');
    check(/Players with all 3 drives already used cannot be selected again\./.test(j.text('.sheet')), 'cannot-be-selected note shown with new wording');
    check(!/last drive/.test(j.text('.sheet')), 'no last-drive note when nobody is selected');
    check(!j.d.querySelector('[data-act=setdrive][data-name=Jacob]').disabled && !j.d.querySelector('[data-act=setdrive][data-name=Jett]').disabled, 'other players still selectable');
    st.dispatchEvent(new j.w.MouseEvent('click', { bubbles: true }));
    check(j.d.querySelector('[data-act=setdrive][data-name=Stu]').getAttribute('aria-pressed') === 'false', 'greyed player cannot be chosen');
    j.click('[data-act=close]');
    j.click('tr[data-hole="2"]');
    const st2 = j.d.querySelector('[data-act=setdrive][data-name=Stu]');
    check(!st2.disabled && st2.getAttribute('aria-pressed') === 'true', 'on a hole where Stu was used he stays selected and editable');
    j.click('[data-act=close]');
  }

  // ---------- 5c. Reset scores ----------
  section('5c. Reset scores');
  {
    const j = boot('Jacob'); await wait(50);
    j.click('#tabCards'); j.click('[data-act=cardteam][data-team=B]');
    j.click('tr[data-hole="1"]'); j.click('[data-act=savehole]');
    j.click('[data-act=cardteam][data-team=A]'); j.click('[data-act=cardteam][data-team=B]');
    check(/6|4/.test(j.d.querySelector('tr[data-hole="1"] .sc').textContent) && j.d.querySelector('tr[data-hole="1"] .sc').textContent !== '', 'hole 1 has a score before reset');
    j.click('#btnSettings');
    check(j.has('[data-act=resetask]') && /Reset Scores/.test(j.text('[data-act=resetask]')), 'Setup has a Reset Scores button');
    const order = Array.from(Array.from(j.d.querySelectorAll('.sheet .actions')).pop().querySelectorAll('button')).map((b) => b.textContent);
    check(order.join('|') === 'Save setup|Cancel|Reset Scores', 'Reset Scores sits after Cancel: ' + order.join('|'));
    j.d.querySelector('#fCourse').value = 'Keep Me Golf Club'; j.change('#fCourse');
    j.click('[data-act=resetask]');
    check(/Are you sure/.test(j.text('.sheet h2')) && j.has('[data-act=resetyes]') && j.has('[data-act=resetno]'), 'confirm modal asks Are you sure with Yes and No');
    j.click('[data-act=resetno]');
    check(j.has('#fCourse') && j.d.querySelector('#fCourse').value === 'Keep Me Golf Club', 'No returns to Setup with edits kept');
    j.click('[data-act=close]');
    check(j.d.querySelector('tr[data-hole="1"] .sc').textContent !== '', 'No leaves the scores untouched');
    j.click('#btnSettings'); j.click('[data-act=resetask]'); j.click('[data-act=resetyes]'); await wait(30);
    check(j.has('#fCourse'), 'Yes returns to Setup');
    j.click('[data-act=close]');
    check(j.d.querySelector('tr[data-hole="1"] .sc').textContent === '', 'Yes erases the scorecard data');
    j.click('#tabBoard');
    check(j.d.querySelector('.brow[data-team=B] .thru').textContent === '-', 'leaderboard back to no holes played');
    j.click('#btnSettings');
    check(!/Scores have already been entered/.test(j.text('.sheet')), 'no scores-entered warning after reset');
    check(j.d.querySelector('#pN0').value === 'Michael', 'players and teams are kept');
  }

  // ---------- 6. Setup: course, balance, overrides, validation ----------
  section('6. Setup');
  {
    const j = boot('Jacob'); await wait(50);
    j.click('#btnSettings');
    check(j.has('#fCourse'), 'Setup opens for Jacob');
    check(j.d.querySelectorAll('.prow:not(.phead)').length === 9, 'nine player rows');
    check(/6 shots/.test(j.text('#tmAA')) && /6 shots/.test(j.text('#tmAB')) && /8 shots/.test(j.text('#tmAC')), 'automatic allowances are 6, 6 and 8');

    j.d.querySelector('#fCourse').value = 'Test Golf Club';
    ['A', 'B', 'C'].forEach((t, i) => { j.d.querySelector('#fTee' + t).value = (8 + i) + ':00 am'; });
    [4, 4, 3, 5, 4, 4, 3, 4, 5].forEach((p, i) => { j.d.querySelector('#fPar' + i).value = String(p); });

    // Balance from an unfair split, nothing locked
    const hs = [6, 15, 25, 25, 30, 54, 54, 54, 25];
    const tm = ['A', 'A', 'A', 'B', 'B', 'B', 'C', 'C', 'C'];
    for (let i = 0; i < 9; i++) { j.d.querySelector('#pH' + i).value = String(hs[i]); j.d.querySelector('#pT' + i).value = tm[i]; j.d.querySelector('#pL' + i).checked = false; }
    j.change('#pT0');
    const rangeOf = () => { const v = ['A', 'B', 'C'].map((t) => parseInt((j.text('#tmA' + t).match(/(\d+) shots/) || [0, 0])[1], 10)); return Math.max.apply(null, v) - Math.min.apply(null, v); };
    const before = rangeOf();
    j.click('[data-act=balance]');
    const after = rangeOf();
    const sizes = { A: 0, B: 0, C: 0 };
    for (let i = 0; i < 9; i++) sizes[j.d.querySelector('#pT' + i).value]++;
    check(sizes.A === 3 && sizes.B === 3 && sizes.C === 3, 'balance gives 3 players per team');
    check(after < before, 'balance narrows the allowance gap (' + before + ' shots to ' + after + ')');

    // Lock Matt+Lachie and Stu+Jett back to the real line-up, then balance
    const names = ['Michael', 'Matt', 'Lachie', 'Jacob', 'Stu', 'Jett', 'Ken', 'Adam', 'Ron'];
    const real = [6, 30, 54, 15, 25, 54, 25, 25, 54], realT = ['A', 'A', 'A', 'B', 'B', 'B', 'C', 'C', 'C'];
    for (let i = 0; i < 9; i++) { j.d.querySelector('#pN' + i).value = names[i]; j.d.querySelector('#pH' + i).value = String(real[i]); j.d.querySelector('#pT' + i).value = realT[i]; j.d.querySelector('#pL' + i).checked = false; }
    ['Matt', 'Lachie', 'Stu', 'Jett'].forEach((n) => { j.d.querySelector('#pL' + names.indexOf(n)).checked = true; });
    j.change('#pT0');
    j.d.querySelector('#pT' + names.indexOf('Michael')).value = 'C';  // push Michael away from his pair, balance should handle it
    j.click('[data-act=balance]');
    const tOf = (n) => j.d.querySelector('#pT' + names.indexOf(n)).value;
    check(tOf('Matt') === tOf('Lachie'), 'locked pair Matt and Lachie stay together');
    check(tOf('Stu') === tOf('Jett'), 'locked pair Stu and Jett stay together');

    // Manual override and save
    j.d.querySelector('#fAllowC').value = '10'; j.change('#fAllowC');
    // Duplicate team names are rejected
    j.d.querySelector('#fNameA').value = 'Eagles'; j.change('#fNameA');
    j.d.querySelector('#fNameB').value = ' eagles '; j.change('#fNameB');
    j.click('[data-act=savesetup]');
    check(j.has('#fCourse'), 'duplicate team names block saving');
    // Rename teams (C keeps its default name)
    j.d.querySelector('#fNameB').value = 'Birdies'; j.change('#fNameB');
    check(/Birdies/.test(j.text('#tmTB')), 'tee time label follows the team name: ' + j.text('#tmTB'));
    j.click('[data-act=savesetup]');
    check(!j.has('#fCourse'), 'valid setup saves and closes');
    check(/Eagles/.test(j.text('#main')) && /Birdies/.test(j.text('#main')) && /Team C/.test(j.text('#main')), 'leaderboard shows the new team names');
    check(/Test Golf Club/.test(j.text('.info')) && /8:00 am/.test(j.text('.info')), 'details card shows saved course and tee times');
    j.click('[data-act=rules]');
    check(/C: 10/.test(j.text('.rules')), 'rules show overridden Team C allowance of 10');
    check(/Eagles: \d+, Birdies: \d+, Team C: 10/.test(j.text('.rules')), 'rules list allowances by team name: ' + j.text('.rules').slice(0,0));
    j.click('[data-act=close]');

    // Validation
    j.click('#btnSettings');
    j.d.querySelector('#pT0').value = 'B'; j.change('#pT0');
    j.click('[data-act=savesetup]');
    check(j.has('#fCourse') && /exactly 3/.test(j.text('#toast')), 'save blocked when a team has the wrong size');
    j.click('[data-act=close]');
    j.click('#btnSettings');
    j.d.querySelector('#pN3').value = 'Someone'; j.d.querySelector('#pN3').dispatchEvent(new j.w.Event('change', { bubbles: true }));
    const jacobRow = names.indexOf('Jacob');
    j.d.querySelector('#pN' + jacobRow).value = 'Jake';
    j.click('[data-act=savesetup]');
    check(j.has('#fCourse') && /Keep Jacob/.test(j.text('#toast')), 'cannot remove Jacob from the player list (' + j.text('#toast') + ')');
    j.click('[data-act=close]');
    j.click('#btnSettings');
    j.d.querySelector('#pH1').value = '99';
    j.click('[data-act=savesetup]');
    check(j.has('#fCourse') && /0 to 54/.test(j.text('#toast')), 'handicap above 54 is rejected');
  }

  // ---------- 7. Rules sheet ----------
  section('7. Rules sheet');
  {
    const a = boot('Adam'); await wait(50);
    a.click('[data-act=rules]');
    const r = a.text('.rules');
    check(/Lachie and Jett get 3 free do-overs each/.test(r), 'mulligan rule names Lachie and Jett');
    check(/Team A: 6, Team B: 6, Team C: 8/.test(r), 'allowances listed as Team A: 6, Team B: 6, Team C: 8');
    check(/white tees/i.test(r) && /Tiebreaker/.test(r), 'tees and tiebreaker rules present');
    check(!/side prize/i.test(r), 'no side prizes');
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
run().catch((e) => { console.error('Test run crashed:', e); process.exit(2); });
