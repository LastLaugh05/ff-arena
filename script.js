import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- ⚡ ROBUST MOBILE LOADER FIX ---
function hideLoader() {
    const loader = document.getElementById("loader");
    if (loader) {
        loader.style.opacity = "0";
        setTimeout(() => {
            loader.style.display = "none";
        }, 500);
    }
}

// 1. Hide when the page finishes loading
window.addEventListener("load", hideLoader);

// 2. FAIL-SAFE: If the page takes > 3 seconds, hide it anyway (Fixes freezing)
setTimeout(hideLoader, 3000); 

// --- FIREBASE CONFIGURATION ---
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBssiNa1gmjuTtgnzYi0c0OfrR1Utr3its",
  authDomain: "ff-arena-2dcee.firebaseapp.com",
  projectId: "ff-arena-2dcee",
  storageBucket: "ff-arena-2dcee.firebasestorage.app",
  messagingSenderId: "310361620313",
  appId: "1:310361620313:web:4788fd55271c3b3209d648",
  measurementId: "G-V71Y6W7T3H"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginBox = document.getElementById('login-box');
const usernameBox = document.getElementById('username-box');

function showScreen(screen) {
    loginBox.classList.add('hidden');
    usernameBox.classList.add('hidden');
    screen.classList.remove('hidden');
}

async function checkUserProfile(user) {
    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            window.location.href = "dashboard.html"; // Go directly to dashboard
        } else {
            showScreen(usernameBox); // Ask for username
        }
    } catch (error) {
        console.error("Error checking profile:", error);
    }
}

document.getElementById('google-login-btn').addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then((result) => checkUserProfile(result.user))
        .catch(err => alert("Google Login Error: " + err.message));
});

document.getElementById('username-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('app-username').value;
    const user = auth.currentUser;

    if (user) {
        try {
            await setDoc(doc(db, "users", user.uid), {
                username: username,
                email: user.email,
                createdAt: new Date(),
                walletBalance: 0,
                matchesPlayed: 0
            });
            window.location.href = "dashboard.html";
        } catch (error) {
            alert("Error saving profile: " + error.message);
        }
    }
});

// ==========================================
// --- 📱 PWA APP REGISTRATION (NEW!) ---
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('App Engine Started Successfully!', reg))
            .catch(err => console.error('App Engine Failed...', err));
    });
}
