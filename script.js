// ─── Loader ────────────────────────────────────────────────────────────────────
function hideLoader() {
  const loader = document.getElementById('loader');
  if (!loader) return;
  loader.style.opacity = '0';
  setTimeout(() => loader.style.display = 'none', 500);
}
window.addEventListener('load', hideLoader);
setTimeout(hideLoader, 3000); // Fail-safe

// ─── Firebase ─────────────────────────────────────────────────────────────────
import { initializeApp }                                    from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup }     from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc }                from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

// ─── DOM ──────────────────────────────────────────────────────────────────────
const loginBox    = document.getElementById('login-box');
const usernameBox = document.getElementById('username-box');
const usernameBtn = document.getElementById('username-btn');

function show(el) {
  loginBox.classList.add('hidden');
  usernameBox.classList.add('hidden');
  el.classList.remove('hidden');
}

// ─── Check existing profile ───────────────────────────────────────────────────
async function checkUserProfile(user) {
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      window.location.href = 'dashboard.html';
    } else {
      show(usernameBox);
    }
  } catch (err) {
    console.error('Profile check failed:', err);
    alert('Connection error. Please refresh and try again.');
  }
}

// ─── Google Sign-In ───────────────────────────────────────────────────────────
document.getElementById('google-login-btn').addEventListener('click', async () => {
  try {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    await checkUserProfile(result.user);
  } catch (err) {
    // Ignore user-dismissed popup
    if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
      alert('Login failed: ' + err.message);
    }
  }
});

// ─── Username Setup ───────────────────────────────────────────────────────────
document.getElementById('username-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('app-username').value.trim();
  const user     = auth.currentUser;
  if (!user) { alert('Session expired. Please log in again.'); return; }

  // Validation
  if (username.length < 3) return alert('Username must be at least 3 characters.');
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return alert('Only letters, numbers, and underscores allowed.');

  usernameBtn.textContent = 'Saving…';
  usernameBtn.disabled    = true;

  try {
    await setDoc(doc(db, 'users', user.uid), {
      username,
      email:         user.email,
      createdAt:     new Date(),
      totalPoints:   0,
      matchesPlayed: 0,
    });
    window.location.href = 'dashboard.html';
  } catch (err) {
    alert('Error saving profile: ' + err.message);
    usernameBtn.textContent = 'ENTER ARENA';
    usernameBtn.disabled    = false;
  }
});

// ─── PWA Service Worker ───────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
