import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth }                         from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, getDocs,
         query, orderBy }                  from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDTcQiJ1fbg9VUhT_cWLELE7yKbiZYkBe4",
  authDomain:        "ff-arena-fc8c6.firebaseapp.com",
  projectId:         "ff-arena-fc8c6",
  storageBucket:     "ff-arena-fc8c6.firebasestorage.app",
  messagingSenderId: "1021839486155",
  appId:             "1:1021839486155:web:c2c2050a0716b35f0f7f4e",
};

const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

export async function loadLeaderboard() {
  const section = document.getElementById('section-leaderboard');

  // Build the two-panel layout: Results | Global Rankings
  section.innerHTML = `
    <div style="display:flex;height:100%;overflow:hidden;">

      <!-- LEFT: Match Results (24-hour window) -->
      <div style="flex:1;overflow-y:auto;border-right:1px solid var(--border);padding:0;">
        <div style="padding:clamp(12px,4vw,22px);">
          <div style="text-align:center;margin-bottom:20px;">
            <span style="font-size:2.5em;">📋</span>
            <h3 style="color:var(--cyan);margin:6px 0 4px;font-family:'Rajdhani',sans-serif;letter-spacing:1px;">MATCH RESULTS</h3>
            <p style="color:var(--muted);font-size:0.78em;">Completed matches (last 24 hours)</p>
          </div>
          <div id="completed-matches-list">
            <p style="color:var(--muted);text-align:center;padding:30px;">⏳ Checking…</p>
          </div>
        </div>
      </div>

      <!-- RIGHT: Global Rankings -->
      <div style="flex:1;overflow-y:auto;padding:0;">
        <div class="lb-page-wrap">
          <div class="lb-inner">
            <div class="lb-header">
              <span class="lb-icon">🏆</span>
              <h2>GLOBAL RANKINGS</h2>
              <p>Lifetime esports points</p>
            </div>
            <div class="lb-list" id="lb-global-list">
              <p style="color:var(--muted);text-align:center;padding:30px;">⏳ Loading…</p>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Score Detail Modal (inside section so z-index works) -->
    <div id="match-score-modal" class="modal hidden">
      <div class="modal-content">
        <button id="close-score-modal" class="close-modal">&times;</button>
        <h2 id="score-modal-title" style="color:var(--cyan);font-size:1.15em;margin-bottom:18px;">Match Rankings</h2>
        <div id="score-modal-list" style="max-height:55dvh;overflow-y:auto;padding-right:2px;"></div>
      </div>
    </div>
  `;

  const TWENTY_FOUR_H = 24 * 60 * 60 * 1000;
  const now           = Date.now();
  const currentUid    = auth.currentUser?.uid;

  // ── Match Results (left panel) ───────────────────────────────────────────
  try {
    const q    = query(collection(db, "tournaments"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const listContainer = document.getElementById('completed-matches-list');
    let   listHTML      = '';

    snap.forEach(docSnap => {
      const match = docSnap.data();
      if (match.status !== "completed" || !match.completedAt) return;
      if (now - match.completedAt > TWENTY_FOUR_H) return;

      // Safely encode match data to pass to button
      const matchString = encodeURIComponent(JSON.stringify(match));
      const modeClass   = match.mode === 'duo' ? 'duo' : match.mode === 'squad' ? 'squad' : 'solo';

      listHTML += `
        <div class="result-entry-card">
          <div>
            <div class="result-title">${match.title}</div>
            <div class="result-meta">
              <span class="badge ${modeClass}" style="font-size:0.7em;">${match.mode.toUpperCase()}</span>
              &nbsp;${match.map}
            </div>
          </div>
          <button class="cyan-glow-btn small-btn view-score-btn" data-match="${matchString}"
            style="margin:0;flex-shrink:0;">
            VIEW SCORES
          </button>
        </div>`;
    });

    listContainer.innerHTML = listHTML || `
      <p style="color:var(--muted);text-align:center;padding:30px;border:1px dashed var(--border);border-radius:12px;">
        No completed matches in the last 24 hours.
      </p>`;

    // Attach score modal listeners
    document.querySelectorAll('.view-score-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const matchData = JSON.parse(decodeURIComponent(e.currentTarget.dataset.match));
        document.getElementById('score-modal-title').textContent = `🏆 ${matchData.title}`;

        const scoreList = document.getElementById('score-modal-list');
        const results   = matchData.matchResults;

        if (!results || results.length === 0) {
          scoreList.innerHTML = '<p style="color:var(--muted);text-align:center;padding:24px;">Scores still being calculated.</p>';
        } else {
          const medals = ['🥇','🥈','🥉'];
          const rowBgs = ['rgba(255,215,0,0.1)','rgba(192,192,192,0.08)','rgba(205,127,50,0.08)'];

          scoreList.innerHTML = results.map((res, i) => {
            const rank = medals[i] ?? `#${i+1}`;
            const bg   = rowBgs[i] ?? 'rgba(255,255,255,0.03)';
            const nameColor = i === 0 ? 'var(--gold)' : '#fff';
            return `
            <div style="display:flex;justify-content:space-between;align-items:center;
              background:${bg};padding:12px 16px;margin-bottom:8px;border-radius:10px;gap:10px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-size:1.2em;width:32px;text-align:center;">${rank}</span>
                <span style="color:${nameColor};font-weight:700;font-size:0.95em;">${res.name}</span>
              </div>
              <div style="text-align:right;flex-shrink:0;">
                <div style="color:var(--cyan);font-family:'Rajdhani',sans-serif;font-size:1.2em;font-weight:700;">${res.points} PTS</div>
                <div style="color:var(--muted);font-size:0.72em;margin-top:2px;">Pos: ${res.position} · Kills: ${res.kills}</div>
              </div>
            </div>`;
          }).join('');
        }

        document.getElementById('match-score-modal').classList.remove('hidden');
      });
    });

    // Close score modal
    document.getElementById('close-score-modal').addEventListener('click', () =>
      document.getElementById('match-score-modal').classList.add('hidden'));

    document.getElementById('match-score-modal').addEventListener('click', e => {
      if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
    });

  } catch (err) {
    console.error(err);
    document.getElementById('completed-matches-list').innerHTML =
      '<p style="color:var(--red);text-align:center;padding:24px;">Failed to load results.</p>';
  }

  // ── Global Rankings (right panel) ────────────────────────────────────────
  try {
    const q    = query(collection(db, "users"), orderBy("totalPoints", "desc"));
    const snap = await getDocs(q);
    const list = document.getElementById('lb-global-list');

    const players = [];
    snap.forEach(d => {
      const data = d.data();
      if ((data.totalPoints || 0) > 0)
        players.push({ id: d.id, username: data.username || 'Unknown', pts: data.totalPoints });
    });

    if (players.length === 0) {
      list.innerHTML = '<p style="color:var(--muted);text-align:center;padding:30px;">No points yet. Play to rank up!</p>';
      return;
    }

    const medals   = { 0: '🥇', 1: '🥈', 2: '🥉' };
    const rowClass = { 0: 'gold-row', 1: 'silver-row', 2: 'bronze-row' };

    list.innerHTML = players.map((p, i) => {
      const isMe  = p.id === currentUid;
      const rank  = medals[i] ?? `#${i+1}`;
      const cls   = isMe ? 'my-row' : (rowClass[i] ?? '');
      const meTag = isMe ? ' <span style="font-size:0.72em;color:var(--cyan);">(You)</span>' : '';
      return `
      <div class="lb-row ${cls}">
        <div class="lb-row-left">
          <span class="lb-rank">${rank}</span>
          <span class="lb-name">${p.username}${meTag}</span>
        </div>
        <span class="lb-pts">${p.pts} PTS</span>
      </div>`;
    }).join('');

  } catch (err) {
    console.error(err);
    document.getElementById('lb-global-list').innerHTML =
      '<p style="color:var(--red);text-align:center;padding:24px;">Failed to load rankings.</p>';
  }
}
