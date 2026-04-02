import { initializeApp }                                                   from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut }                           from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, query,
         orderBy, deleteDoc, doc, updateDoc, arrayRemove, increment }     from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDTcQiJ1fbg9VUhT_cWLELE7yKbiZYkBe4",
  authDomain:        "ff-arena-fc8c6.firebaseapp.com",
  projectId:         "ff-arena-fc8c6",
  storageBucket:     "ff-arena-fc8c6.firebasestorage.app",
  messagingSenderId: "1021839486155",
  appId:             "1:1021839486155:web:c2c2050a0716b35f0f7f4e",
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ─── BUG FIX: was using undefined ADMIN_EMAIL, now uses array ────────────────
const ADMIN_EMAILS    = ["utsharudra@gmail.com", "dibyendunath84@gmail.com"];
const POSITION_PTS    = { 1:12, 2:10, 3:8, 4:6, 5:5, 6:3, 7:2, 8:1 };

// ─── Auth Guard ───────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "index.html"; return; }

  // BUG FIX: was comparing user.email !== ADMIN_EMAIL (undefined) — always failed
  if (!ADMIN_EMAILS.includes(user.email)) {
    alert("Access Denied: You are not an Admin.");
    window.location.href = "dashboard.html";
    return;
  }

  // Show admin name
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      document.getElementById('admin-name').textContent = snap.data().username || 'Admin';
    }
  } catch (_) {}

  loadAdminMatches();
});

// ─── Tab Switching ────────────────────────────────────────────────────────────
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-content-section').forEach(s => s.classList.add('hidden'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.target).classList.remove('hidden');
    if (tab.dataset.target === 'manage-matches') loadAdminMatches();
  });
});

// ─── Create Tournament ────────────────────────────────────────────────────────
document.getElementById('create-match-form').addEventListener('submit', async e => {
  e.preventDefault();

  const mode     = document.getElementById('match-mode').value;
  const maxSlots = mode === 'duo' ? 24 : mode === 'squad' ? 12 : 48;
  const btn      = document.getElementById('publish-btn');

  btn.textContent = '⏳ Publishing…';
  btn.disabled    = true;

  const newMatch = {
    title:             document.getElementById('match-title').value.trim(),
    mode,
    map:               document.getElementById('match-map').value,
    time:              document.getElementById('match-time').value,
    prizePool:         Number(document.getElementById('prize-pool').value),
    entryFee:          Number(document.getElementById('entry-fee').value),
    maxSlots,
    currentSlots:      0,
    registeredPlayers: [],
    status:            "open",
    roomId:            "",
    roomPass:          "",
    createdAt:         new Date(),
  };

  try {
    await addDoc(collection(db, "tournaments"), newMatch);
    alert("✅ Tournament Published!");
    document.getElementById('create-match-form').reset();
    // Switch to manage tab
    document.querySelector('.admin-tab[data-target="manage-matches"]').click();
  } catch (err) {
    alert("Error creating tournament: " + err.message);
  } finally {
    btn.textContent = '🚀 PUBLISH TOURNAMENT';
    btn.disabled    = false;
  }
});

// ─── Load Admin Matches ───────────────────────────────────────────────────────
async function loadAdminMatches() {
  const grid = document.getElementById('admin-matches-grid');
  if (!grid) return;
  grid.innerHTML = '<p style="color:var(--muted);text-align:center;grid-column:1/-1;padding:40px;">⏳ Loading…</p>';

  try {
    const q    = query(collection(db, "tournaments"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    if (snap.empty) {
      grid.innerHTML = '<p style="color:var(--muted);text-align:center;grid-column:1/-1;padding:40px;">No tournaments found. Create one!</p>';
      return;
    }

    grid.innerHTML = '';

    snap.forEach(docSnap => {
      const match   = docSnap.data();
      const matchId = docSnap.id;

      const date = new Date(match.time).toLocaleString('en-IN', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true,
      });

      const players      = match.registeredPlayers || [];
      const pendingCount = players.filter(p => p.paymentStatus === "pending").length;
      const fillPct      = Math.min(100, Math.round((match.currentSlots / match.maxSlots) * 100));
      const isCompleted  = match.status === "completed";
      const modeClass    = match.mode === 'duo' ? 'duo' : match.mode === 'squad' ? 'squad' : 'solo';

      const notifHTML = pendingCount > 0
        ? `<div class="notif-banner">🔔 ${pendingCount} PENDING APPROVAL${pendingCount > 1 ? 'S' : ''}!</div>` : '';

      const scoreBtn = isCompleted
        ? `<button class="cyan-glow-btn small-btn" disabled style="border-color:#444;color:#444;">✅ SCORED</button>`
        : `<button class="orange-glow-btn small-btn update-scores-btn" data-id="${matchId}"
             style="border-color:var(--gold);color:var(--gold);">🏆 SCORES</button>`;

      grid.innerHTML += `
      <div class="match-card" style="border-color:${pendingCount>0?'rgba(255,36,85,0.5)':'rgba(255,94,0,0.3)'};">
        ${notifHTML}
        <div class="match-header">
          <span class="badge ${modeClass}">${match.mode.toUpperCase()}</span>
          <span class="map-name">${match.currentSlots}/${match.maxSlots} Slots</span>
        </div>
        <h3 class="match-title">${match.title}</h3>
        <p style="color:var(--muted);font-size:0.8em;margin:-6px 0 12px;">🕒 ${date}</p>

        <div class="match-stats">
          <div class="stat-box">
            <span class="stat-label">Prize</span>
            <span class="stat-value text-gold">₹${match.prizePool}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Fee</span>
            <span class="stat-value text-cyan">₹${match.entryFee}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Status</span>
            <span class="stat-value" style="color:${isCompleted?'#555':'var(--green)'};font-size:0.9em;">
              ${isCompleted ? 'DONE' : 'OPEN'}
            </span>
          </div>
        </div>

        <div class="progress-bar" style="margin-bottom:12px;">
          <div class="fill" style="width:${fillPct}%;background:linear-gradient(90deg,var(--orange),#ff8c00);"></div>
          <span class="slots-text">${fillPct}% filled</span>
        </div>

        <div class="admin-room-panel">
          <input type="text" id="room-id-${matchId}" placeholder="Room ID" class="small-input" value="${match.roomId || ''}">
          <input type="text" id="room-pass-${matchId}" placeholder="Room Password" class="small-input" value="${match.roomPass || ''}">
          <button class="orange-glow-btn small-btn release-room-btn" data-id="${matchId}"
            style="width:100%;margin-top:4px;">🔓 RELEASE ROOM TO PLAYERS</button>
        </div>

        <div class="match-footer" style="flex-wrap:wrap;gap:8px;margin-top:12px;">
          <button class="cyan-glow-btn small-btn view-players-btn" data-id="${matchId}">
            👥 PLAYERS (${players.length})
          </button>
          ${scoreBtn}
          <button class="cyan-glow-btn small-btn delete-match-btn" data-id="${matchId}"
            style="border-color:var(--red);color:var(--red);box-shadow:none;" title="Delete">🗑</button>
        </div>
      </div>`;
    });

    attachAdminListeners();

  } catch (err) {
    grid.innerHTML = `<p style="color:var(--red);text-align:center;grid-column:1/-1;padding:40px;">Error: ${err.message}</p>`;
  }
}

// ─── Admin Listeners ──────────────────────────────────────────────────────────
function attachAdminListeners() {

  // DELETE
  document.querySelectorAll('.delete-match-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      const matchId = e.currentTarget.dataset.id;
      if (!confirm("⚠️ Permanently delete this tournament? This cannot be undone.")) return;
      try {
        await deleteDoc(doc(db, "tournaments", matchId));
        loadAdminMatches();
      } catch (err) { alert("Delete failed: " + err.message); }
    });
  });

  // RELEASE ROOM
  document.querySelectorAll('.release-room-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      const matchId  = e.currentTarget.dataset.id;
      const roomId   = document.getElementById(`room-id-${matchId}`).value.trim();
      const roomPass = document.getElementById(`room-pass-${matchId}`).value.trim();

      if (!roomId || !roomPass) {
        alert("Please enter both Room ID and Password.");
        return;
      }

      e.currentTarget.textContent = '⏳ Saving…';
      e.currentTarget.disabled    = true;

      try {
        await updateDoc(doc(db, "tournaments", matchId), { roomId, roomPass });
        alert("✅ Room details released to all verified players!");
        e.currentTarget.textContent = '✅ UPDATE ROOM';
      } catch (err) {
        alert("Error: " + err.message);
        e.currentTarget.textContent = '🔓 RELEASE ROOM TO PLAYERS';
      } finally {
        e.currentTarget.disabled = false;
      }
    });
  });

  // VIEW PLAYERS
  document.querySelectorAll('.view-players-btn').forEach(btn => {
    btn.addEventListener('click', e => openPlayersModal(e.currentTarget.dataset.id));
  });

  // UPDATE SCORES
  document.querySelectorAll('.update-scores-btn').forEach(btn => {
    btn.addEventListener('click', e => openScoresModal(e.currentTarget.dataset.id));
  });
}

// ─── Players Modal ────────────────────────────────────────────────────────────
async function openPlayersModal(matchId) {
  const modal     = document.getElementById('players-modal');
  const container = document.getElementById('players-list-container');
  modal.classList.remove('hidden');
  container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:24px;">⏳ Loading…</p>';

  try {
    const snap = await getDoc(doc(db, "tournaments", matchId));
    if (!snap.exists()) { container.innerHTML = '<p style="color:var(--red);">Tournament not found.</p>'; return; }

    const players = snap.data().registeredPlayers || [];

    if (players.length === 0) {
      container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:24px;">No players registered yet.</p>';
      return;
    }

    // Ordered keys for clean display
    const KEY_ORDER = [
      "Squad Name","Team Name",
      "Leader In-Game Name","Leader UID",
      "Player 1 In-Game Name","Player 1 UID",
      "In-Game Name","Game UID",
      "Player 2 In-Game Name","Player 2 UID",
      "Player 3 In-Game Name","Player 3 UID",
      "Player 4 In-Game Name","Player 4 UID",
    ];

    container.innerHTML = players.map((player, i) => {
      const isVerified = player.paymentStatus === "verified";
      const details    = player.details || {};

      let detailHTML = '';
      KEY_ORDER.forEach(key => {
        if (details[key] !== undefined) {
          detailHTML += `<div class="slot-detail-item"><span>${key}:</span> ${details[key]}</div>`;
        }
      });
      // Catch any extra keys
      Object.keys(details).forEach(key => {
        if (!KEY_ORDER.includes(key)) {
          detailHTML += `<div class="slot-detail-item"><span>${key}:</span> ${details[key]}</div>`;
        }
      });

      const playerEncoded = encodeURIComponent(JSON.stringify(player));
      const verifyBtn     = isVerified ? '' : `
        <button class="cyan-glow-btn small-btn v-btn"
          style="flex:1;border-color:var(--green);color:var(--green);min-height:36px;"
          data-match="${matchId}" data-index="${i}">✅ VERIFY</button>`;

      return `
      <div class="slot-card ${isVerified ? 'is-verified' : ''}">
        <div class="slot-header">
          🎯 Slot ${i + 1} &mdash;
          ${isVerified
            ? '<span style="color:var(--green);">✅ VERIFIED</span>'
            : '<span style="color:var(--gold);">🟡 PENDING</span>'}
        </div>
        ${detailHTML}
        <div class="slot-actions">
          ${verifyBtn}
          <button class="orange-glow-btn small-btn k-btn"
            style="flex:1;border-color:var(--red);color:var(--red);min-height:36px;"
            data-match="${matchId}" data-player="${playerEncoded}">🥾 KICK</button>
        </div>
      </div>`;
    }).join('');

    // VERIFY LOGIC
    container.querySelectorAll('.v-btn').forEach(b => {
      b.addEventListener('click', async e => {
        const vMatchId = e.currentTarget.dataset.match;
        const idx      = parseInt(e.currentTarget.dataset.index);
        e.currentTarget.textContent = '⏳…';
        e.currentTarget.disabled    = true;

        try {
          const mSnap   = await getDoc(doc(db, "tournaments", vMatchId));
          const updated = [...mSnap.data().registeredPlayers];
          updated[idx].paymentStatus = "verified";
          await updateDoc(doc(db, "tournaments", vMatchId), { registeredPlayers: updated });
          openPlayersModal(vMatchId);
          loadAdminMatches();
        } catch (err) {
          alert("Verify failed: " + err.message);
          e.currentTarget.textContent = '✅ VERIFY';
          e.currentTarget.disabled    = false;
        }
      });
    });

    // KICK LOGIC
    container.querySelectorAll('.k-btn').forEach(b => {
      b.addEventListener('click', async e => {
        const kMatchId = e.currentTarget.dataset.match;
        const player   = JSON.parse(decodeURIComponent(e.currentTarget.dataset.player));
        if (!confirm("Kick this player? Their slot will be freed.")) return;

        e.currentTarget.textContent = '⏳…';
        e.currentTarget.disabled    = true;

        try {
          await updateDoc(doc(db, "tournaments", kMatchId), {
            registeredPlayers: arrayRemove(player),
            currentSlots:      increment(-1),
          });
          modal.classList.add('hidden');
          loadAdminMatches();
        } catch (err) {
          alert("Kick failed: " + err.message);
          e.currentTarget.textContent = '🥾 KICK';
          e.currentTarget.disabled    = false;
        }
      });
    });

  } catch (err) {
    container.innerHTML = `<p style="color:var(--red);text-align:center;">${err.message}</p>`;
  }
}

// ─── Scores Modal ─────────────────────────────────────────────────────────────
let activeScoringMatchId = null;

async function openScoresModal(matchId) {
  activeScoringMatchId   = matchId;
  const modal            = document.getElementById('scores-modal');
  const container        = document.getElementById('scores-list-container');
  modal.classList.remove('hidden');
  container.innerHTML    = '<p style="color:var(--muted);text-align:center;padding:20px;">⏳ Loading verified players…</p>';

  try {
    const snap    = await getDoc(doc(db, "tournaments", matchId));
    if (!snap.exists()) return;
    const verified = (snap.data().registeredPlayers || []).filter(p => p.paymentStatus === 'verified');

    if (verified.length === 0) {
      container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px;">No verified players to score yet.</p>';
      return;
    }

    container.innerHTML = verified.map((p, i) => {
      const name = p.details["In-Game Name"] || p.details["Team Name"] || p.details["Squad Name"] || `Player ${i+1}`;
      return `
      <div class="score-row">
        <span class="score-name">🎮 ${name}</span>
        <div class="score-inputs">
          <input type="number" class="score-input" id="pos-${p.userId}"
            placeholder="Position" min="1" max="50"
            style="border-color:rgba(255,215,0,0.4);">
          <input type="number" class="score-input" id="kills-${p.userId}"
            placeholder="Kills" min="0"
            style="border-color:rgba(255,36,85,0.4);">
        </div>
      </div>`;
    }).join('');

  } catch (err) {
    container.innerHTML = `<p style="color:var(--red);text-align:center;">${err.message}</p>`;
  }
}

// ─── Save All Scores ──────────────────────────────────────────────────────────
document.getElementById('save-all-scores-btn').addEventListener('click', async e => {
  if (!activeScoringMatchId) return;
  if (!confirm("Save scores? This marks the match as COMPLETED and updates the global leaderboard.")) return;

  const btn       = e.currentTarget;
  btn.textContent = '⏳ Saving to database…';
  btn.disabled    = true;

  try {
    const snap    = await getDoc(doc(db, "tournaments", activeScoringMatchId));
    const players = (snap.data().registeredPlayers || []).filter(p => p.paymentStatus === 'verified');

    let matchResults = [];

    for (const player of players) {
      const pos   = parseInt(document.getElementById(`pos-${player.userId}`)?.value)   || 0;
      const kills = parseInt(document.getElementById(`kills-${player.userId}`)?.value) || 0;
      const pts   = (POSITION_PTS[pos] || 0) + kills;
      const name  = player.details["In-Game Name"] || player.details["Team Name"] || player.details["Squad Name"] || "Player";

      matchResults.push({ name, position: pos, kills, points: pts });

      if (pts > 0) {
        await updateDoc(doc(db, "users", player.userId), {
          totalPoints:   increment(pts),
          matchesPlayed: increment(1),
        });
      }
    }

    // Sort by points descending for receipt
    matchResults.sort((a, b) => b.points - a.points);

    await updateDoc(doc(db, "tournaments", activeScoringMatchId), {
      status:       "completed",
      completedAt:  Date.now(),
      matchResults,
    });

    alert("✅ Scores saved! Leaderboard updated.");
    document.getElementById('scores-modal').classList.add('hidden');
    loadAdminMatches();

  } catch (err) {
    alert("Error saving scores: " + err.message);
  } finally {
    btn.textContent = '💾 SAVE ALL SCORES & COMPLETE MATCH';
    btn.disabled    = false;
  }
});

// ─── Close Modals ────────────────────────────────────────────────────────────
document.getElementById('close-players-modal').addEventListener('click', () =>
  document.getElementById('players-modal').classList.add('hidden'));
document.getElementById('close-scores-modal').addEventListener('click', () =>
  document.getElementById('scores-modal').classList.add('hidden'));

['players-modal','scores-modal'].forEach(id => {
  document.getElementById(id).addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', () =>
  signOut(auth).then(() => window.location.href = "index.html"));
