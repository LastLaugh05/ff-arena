// ─── Loader (in case dashboard is loaded fresh) ──────────────────────────────
function hideLoader() {
  const el = document.getElementById('loader');
  if (el) { el.style.opacity = '0'; setTimeout(() => el.style.display = 'none', 500); }
}
window.addEventListener('load', hideLoader);
setTimeout(hideLoader, 3000);

// ─── Firebase ─────────────────────────────────────────────────────────────────
import { initializeApp, getApps, getApp }                   from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut }             from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs,
         query, orderBy, updateDoc, increment, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { loadLeaderboard }                                  from './leaderboard.js';

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

// ─── Constants ────────────────────────────────────────────────────────────────
const ADMIN_EMAILS = ["utsharudra@gmail.com", "dibyendunath84@gmail.com"];
const ADMIN_UPI_ID = "9832972438@ibl";
const ADMIN_WA_NUM = "919832972438";

// ─── State ────────────────────────────────────────────────────────────────────
let currentMatchId    = "";
let currentMatchTitle = "";
let currentMatchFee   = 0;
let waDetails         = "";
let currentUserId     = "";

// ─── Auth Guard ──────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "index.html"; return; }
  currentUserId = user.uid;

  if (ADMIN_EMAILS.includes(user.email)) {
    document.getElementById('go-to-admin-btn').classList.remove('hidden');
  }

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      document.getElementById('player-name').textContent = snap.data().username || "Player";
    }
  } catch (e) { console.error(e); }

  await loadTournaments();
});

// ─── Build Input Fields per Mode ─────────────────────────────────────────────
function buildFields(mode) {
  const f = (label, type = 'text', placeholder = '') =>
    `<div class="input-group">
      <label>${label}</label>
      <input type="${type}" data-label="${label}" required placeholder="${placeholder}" autocomplete="off">
    </div>`;

  if (mode === 'solo') return f('In-Game Name','text','Your FF username') + f('Game UID','number','Your Free Fire UID');

  if (mode === 'duo') return [
    f('Team Name','text','Team name'),
    f('Player 1 In-Game Name','text','FF username'), f('Player 1 UID','number','UID'),
    f('Player 2 In-Game Name','text','FF username'), f('Player 2 UID','number','UID'),
  ].join('');

  if (mode === 'squad') return [
    f('Squad Name','text','Squad name'),
    f('Leader In-Game Name','text','Leader username'), f('Leader UID','number','Leader UID'),
    f('Player 2 In-Game Name','text','FF username'), f('Player 2 UID','number','UID'),
    f('Player 3 In-Game Name','text','FF username'), f('Player 3 UID','number','UID'),
    f('Player 4 In-Game Name','text','FF username'), f('Player 4 UID','number','UID'),
  ].join('');

  return '';
}

// ─── Build Match Card ─────────────────────────────────────────────────────────
function buildCard(match, matchId, userReg) {
  const date = new Date(match.time).toLocaleString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: 'numeric', hour12: true,
  });

  const modeClass = match.mode === 'duo' ? 'duo' : match.mode === 'squad' ? 'squad' : 'solo';
  const fillPct   = Math.min(100, Math.round((match.currentSlots / match.maxSlots) * 100));

  let statusHTML = '';
  let actionHTML = '';

  if (userReg) {
    if (userReg.paymentStatus === 'verified') {
      const rId   = match.roomId   || 'Wait for Admin…';
      const rPass = match.roomPass || 'Wait for Admin…';

      // Safe data attributes — avoid putting full strings in HTML attrs
      const safeRoom = rId.replace(/"/g, '&quot;');
      const safePass = rPass.replace(/"/g, '&quot;');

      // WhatsApp proof link after match
      const teamName = userReg.details["Squad Name"] || userReg.details["Team Name"] || userReg.details["In-Game Name"] || "Player";
      const waMsg    = encodeURIComponent(`Hello Admin! Match: *${match.title}*\nMy Team: *${teamName}*\n\nHere is my screenshot for Position & Kills! 📸`);

      statusHTML = `<div class="status-banner ready">✅ Payment Verified — You're Registered!</div>`;
      actionHTML = `
        <div style="display:flex;flex-direction:column;gap:8px;width:100%;">
          <button class="cyan-glow-btn small-btn view-room-btn"
            style="border-color:#00f0ff;color:#00f0ff;"
            data-room="${safeRoom}" data-pass="${safePass}">
            🟢 VIEW ROOM DETAILS
          </button>
          <a href="https://wa.me/${ADMIN_WA_NUM}?text=${waMsg}" target="_blank" rel="noopener"
            class="cyan-glow-btn small-btn"
            style="border-color:#25D366;color:#25D366;font-size:0.78em;">
            📸 SUBMIT SCORE PROOF
          </a>
        </div>`;
    } else {
      statusHTML = `<div class="status-banner waiting">🟡 Payment Pending — Awaiting Admin Verification</div>`;
      actionHTML = `<button class="cyan-glow-btn small-btn" disabled style="border-color:#ffd700;color:#ffd700;">PENDING</button>`;
    }
  } else if (match.currentSlots >= match.maxSlots) {
    statusHTML = `<div class="status-banner" style="background:rgba(255,36,85,0.08);color:var(--red);border:1px solid rgba(255,36,85,0.3);">🔒 Room Full</div>`;
    actionHTML = `<button class="cyan-glow-btn small-btn" disabled style="border-color:#ff2455;color:#ff2455;">ROOM FULL</button>`;
  } else {
    actionHTML = `
      <button class="cyan-glow-btn small-btn join-match-btn"
        data-id="${matchId}"
        data-fee="${match.entryFee}"
        data-mode="${match.mode}"
        data-title="${match.title.replace(/"/g,'&quot;')}">
        JOIN — ₹${match.entryFee}
      </button>`;
  }

  return `
  <div class="match-card">
    <div class="match-header">
      <span class="badge ${modeClass}">${match.mode.toUpperCase()}</span>
      <span class="map-name">🗺 ${match.map}</span>
    </div>
    <h3 class="match-title">${match.title}</h3>
    <div class="match-stats">
      <div class="stat-box">
        <span class="stat-label">Prize Pool</span>
        <span class="stat-value text-gold">₹${match.prizePool}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">Entry Fee</span>
        <span class="stat-value text-cyan">₹${match.entryFee}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">Slots</span>
        <span class="stat-value">${match.currentSlots}/${match.maxSlots}</span>
      </div>
    </div>
    <div class="progress-bar">
      <div class="fill" style="width:${fillPct}%;"></div>
      <span class="slots-text">${fillPct}% filled</span>
    </div>
    ${statusHTML}
    <div class="match-footer">
      <span class="match-time">🕒 ${date}</span>
      ${actionHTML}
    </div>
  </div>`;
}

// ─── Load Tournaments ─────────────────────────────────────────────────────────
async function loadTournaments() {
  const grid   = document.getElementById('matches-grid');
  const myGrid = document.getElementById('my-matches-grid');

  try {
    const q    = query(collection(db, "tournaments"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    if (snap.empty) {
      grid.innerHTML   = emptyMsg("No upcoming tournaments right now. Check back soon!");
      myGrid.innerHTML = emptyMsg("You haven't joined any tournaments yet.");
      return;
    }

    let upcomingHTML = '';
    let myHTML       = '';
    let upcomingCnt  = 0;
    let myCnt        = 0;

    snap.forEach(docSnap => {
      const match   = docSnap.data();
      const matchId = docSnap.id;

      // Skip completed matches from player view
      if (match.status === "completed") return;

      const userReg  = (match.registeredPlayers || []).find(p => p.userId === currentUserId) || null;
      const cardHTML = buildCard(match, matchId, userReg);

      if (userReg) {
        myHTML += cardHTML;
        myCnt++;
      } else {
        upcomingHTML += cardHTML;
        upcomingCnt++;
      }
    });

    grid.innerHTML   = upcomingCnt  ? upcomingHTML  : emptyMsg("All matches joined! Check your 'My Matches' tab.");
    myGrid.innerHTML = myCnt ? myHTML : emptyMsg("You haven't joined any tournaments yet!", true);

    attachJoinListeners();
    attachRoomListeners();

  } catch (err) {
    console.error(err);
    grid.innerHTML = '<p style="color:var(--red);text-align:center;grid-column:1/-1;">Failed to load. Check your internet connection.</p>';
  }
}

function emptyMsg(msg, showBrowse = false) {
  return `<div style="text-align:center;grid-column:1/-1;padding:60px 20px;">
    <p style="color:var(--muted);font-size:0.95em;margin-bottom:${showBrowse?'16px':'0'}">${msg}</p>
    ${showBrowse ? `<button class="orange-glow-btn small-btn" style="display:inline-flex;"
      onclick="document.querySelector('.tab-btn[data-target=section-upcoming]').click()">
      Browse Upcoming Matches
    </button>` : ''}
  </div>`;
}

// ─── Join Listeners ───────────────────────────────────────────────────────────
function attachJoinListeners() {
  document.querySelectorAll('.join-match-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const b = e.currentTarget;
      currentMatchId    = b.dataset.id;
      currentMatchFee   = b.dataset.fee;
      currentMatchTitle = b.dataset.title;
      const mode        = b.dataset.mode;

      document.getElementById('modal-match-title').textContent = currentMatchTitle;
      document.getElementById('modal-fee-display').textContent = `₹${currentMatchFee}`;
      document.getElementById('dynamic-fields').innerHTML       = buildFields(mode);

      document.getElementById('step-1-details').classList.remove('hidden');
      document.getElementById('step-2-payment').classList.add('hidden');
      document.getElementById('join-modal').classList.remove('hidden');
    });
  });
}

// ─── Room Listeners ───────────────────────────────────────────────────────────
function attachRoomListeners() {
  document.querySelectorAll('.view-room-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const b = e.currentTarget;
      document.getElementById('player-room-id').textContent       = b.dataset.room;
      document.getElementById('player-room-password').textContent = b.dataset.pass;
      document.getElementById('verified-slot-modal').classList.remove('hidden');
    });
  });
}

// ─── Join Form Submit ─────────────────────────────────────────────────────────
const joinModal = document.getElementById('join-modal');

document.getElementById('close-modal').addEventListener('click', () =>
  joinModal.classList.add('hidden'));

joinModal.addEventListener('click', e => {
  if (e.target === joinModal) joinModal.classList.add('hidden');
});

document.getElementById('join-details-form').addEventListener('submit', async e => {
  e.preventDefault();

  const inputs  = document.querySelectorAll('#dynamic-fields input');
  const details = {};
  waDetails     = '';

  inputs.forEach(input => {
    const label   = input.dataset.label;
    const val     = input.value.trim();
    details[label] = val;
    waDetails     += `\n- ${label}: ${val}`;
  });

  const submitBtn = e.target.querySelector('button[type=submit]');
  submitBtn.textContent = 'Registering…';
  submitBtn.disabled    = true;

  try {
    await updateDoc(doc(db, "tournaments", currentMatchId), {
      currentSlots:      increment(1),
      registeredPlayers: arrayUnion({
        userId:        currentUserId,
        details,
        paymentStatus: "pending",
        timestamp:     new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error("Firestore error:", err);
    // Don't block UX — still show QR
  } finally {
    submitBtn.textContent = 'PROCEED TO PAYMENT →';
    submitBtn.disabled    = false;
  }

  // Show QR code
  const upiData = `upi://pay?pa=${ADMIN_UPI_ID}&pn=FFArena&am=${currentMatchFee}&cu=INR`;
  document.getElementById('upi-qr-img').src          = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiData)}`;
  document.getElementById('admin-upi-text').textContent = ADMIN_UPI_ID;

  document.getElementById('step-1-details').classList.add('hidden');
  document.getElementById('step-2-payment').classList.remove('hidden');
});

document.getElementById('whatsapp-btn').addEventListener('click', () => {
  const msg  = `Hello Admin! I want to join: *"${currentMatchTitle}"*\n\n*My Details:*${waDetails}\n\nEntry Fee: ₹${currentMatchFee}\nHere is my payment screenshot!`;
  const link = `https://wa.me/${ADMIN_WA_NUM}?text=${encodeURIComponent(msg)}`;
  window.open(link, '_blank', 'noopener');
  joinModal.classList.add('hidden');
  // Reload after a short delay to show updated status
  setTimeout(() => window.location.reload(), 1200);
});

// ─── Room Modal ───────────────────────────────────────────────────────────────
const verifiedModal = document.getElementById('verified-slot-modal');
document.getElementById('close-verified-modal').addEventListener('click', () => verifiedModal.classList.add('hidden'));
document.getElementById('verified-match-great-btn').addEventListener('click', () => verifiedModal.classList.add('hidden'));
verifiedModal.addEventListener('click', e => { if (e.target === verifiedModal) verifiedModal.classList.add('hidden'); });

// ─── Tab Switching ────────────────────────────────────────────────────────────
let leaderboardLoaded = false;

document.querySelectorAll('.tab-btn').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.dashboard-section').forEach(s => s.classList.add('hidden'));

    tab.classList.add('active');
    const target = document.getElementById(tab.dataset.target);
    target.classList.remove('hidden');

    // Load leaderboard only once (or reload each time — your choice)
    if (tab.dataset.target === 'section-leaderboard') {
      loadLeaderboard();
    }
  });
});

// ─── Nav Actions ─────────────────────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', () =>
  signOut(auth).then(() => window.location.href = "index.html"));

document.getElementById('go-to-admin-btn').addEventListener('click', () =>
  window.location.href = "admin.html");
