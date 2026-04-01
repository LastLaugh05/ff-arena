import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs, query, orderBy, updateDoc, increment, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Import the Leaderboard module
import { loadLeaderboard } from "./leaderboard.js";

const firebaseConfig = {
    apiKey: "AIzaSyDTcQiJ1fbg9VUhT_cWLELE7yKbiZYkBe4",
    authDomain: "ff-arena-fc8c6.firebaseapp.com",
    projectId: "ff-arena-fc8c6",
    storageBucket: "ff-arena-fc8c6.firebasestorage.app",
    messagingSenderId: "1021839486155",
    appId: "1:1021839486155:web:c2c2050a0716b35f0f7f4e",
    measurementId: "G-X4LDXY9TME"
};

// Safely initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// --- SETTINGS & VARIABLES ---
const ADMIN_EMAILS = ["utsharudra@gmail.com", "dibyendunath84@gmail.com"]; 
 
const ADMIN_UPI_ID = "9832972438@ibl"; 
const ADMIN_WHATSAPP_NUMBER = "919832972438"; 

let currentMatchId = "";
let currentMatchTitle = "";
let currentMatchFee = 0;
let globalWhatsappDetails = ""; 

// =====================================
// 1. INITIALIZATION & LOGIN
// =====================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (user.email === ADMIN_EMAIL) {
            document.getElementById('go-to-admin-btn').classList.remove('hidden');
        }
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                document.getElementById('player-name').innerText = userDoc.data().username;
            }
            loadTournaments();
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    } else {
        window.location.href = "index.html"; 
    }
});

// =====================================
// 2. FETCH AND DISPLAY MATCHES
// =====================================
async function loadTournaments() {
    const grid = document.getElementById('matches-grid');
    const myGrid = document.getElementById('my-matches-grid'); 
    const currentUserUid = auth.currentUser.uid; 
    
    try {
        const q = query(collection(db, "tournaments"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            grid.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center; width: 100%; grid-column: 1 / -1;">No upcoming tournaments right now. Check back later!</p>';
            myGrid.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center; width: 100%; grid-column: 1 / -1;">You haven\'t joined any matches yet.</p>';
            return;
        }

        grid.innerHTML = ''; 
        myGrid.innerHTML = ''; 
        
        let myMatchesCount = 0; 
        let upcomingMatchesCount = 0;

        querySnapshot.forEach((docSnap) => {
            const match = docSnap.data();
            const matchId = docSnap.id;

            // 🔥 THE FIX: If the match is already completed, completely skip it!
            if (match.status === "completed") {
                return; 
            }

            const matchDate = new Date(match.time).toLocaleString('en-IN', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: 'numeric', minute: 'numeric', hour12: true
            });

            let badgeClass = match.mode === 'duo' ? 'duo' : (match.mode === 'squad' ? 'squad' : 'solo');
            const fillPercentage = (match.currentSlots / match.maxSlots) * 100;

            let userRegistration = match.registeredPlayers ? match.registeredPlayers.find(p => p.userId === currentUserUid) : null;
            let actionButtonHTML = '';

            if (userRegistration) {
                if (userRegistration.paymentStatus === 'verified') {
                    const rId = match.roomId ? match.roomId : "Wait for Admin...";
                    const rPass = match.roomPass ? match.roomPass : "Wait for Admin...";
                    
                    // --- NEW: Dynamic WhatsApp Proof Message ---
                    const teamName = userRegistration.details["Team Name"] || userRegistration.details["Squad Name"] || userRegistration.details["In-Game Name"] || "Player";
                    const waMessage = encodeURIComponent(`Hello Admin! Match Finished: *${match.title}*%0AMy Team: *${teamName}*%0A%0AHere is my screenshot proof for Position and Kills! 📸`);
                    const waLink = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${waMessage}`;

                    actionButtonHTML = `
                        <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
                            <button class="cyan-glow-btn small-btn view-room-btn" style="border-color: #00f0ff; color: #00f0ff;" data-room="${rId}" data-pass="${rPass}">🟢 VIEW DETAILS</button>
                            <a href="${waLink}" target="_blank" class="cyan-glow-btn small-btn" style="border-color: #25D366; color: #25D366; text-decoration: none; text-align: center; line-height: 1.4; display: flex; align-items: center; justify-content: center; height: 32px; font-size: 0.8em;">📸 SUBMIT SCORE</a>
                        </div>
                    `;
                } else {
                    actionButtonHTML = `<button class="cyan-glow-btn small-btn disabled" disabled style="border-color: #ffd700; color: #ffd700;">🟡 PENDING APPROVAL</button>`;
                }
            } else {
                if (match.currentSlots >= match.maxSlots) {
                    actionButtonHTML = `<button class="cyan-glow-btn small-btn disabled" disabled style="border-color: #ff0040; color: #ff0040;">ROOM FULL</button>`;
                } else {
                    actionButtonHTML = `<button class="cyan-glow-btn small-btn join-match-btn" data-id="${matchId}" data-fee="${match.entryFee}" data-mode="${match.mode}" data-title="${match.title}">JOIN MATCH</button>`;
                }
            }

            const cardHTML = `
                <div class="match-card">
                    <div class="match-header">
                        <span class="badge ${badgeClass}">${match.mode.toUpperCase()}</span>
                        <span class="map-name">🗺️ ${match.map}</span>
                    </div>
                    <h3 class="match-title">${match.title}</h3>
                    <div class="match-stats">
                        <div class="stat-box"><span class="stat-label">PRIZE</span><span class="stat-value">₹${match.prizePool}</span></div>
                        <div class="stat-box"><span class="stat-label">ENTRY</span><span class="stat-value text-cyan">₹${match.entryFee}</span></div>
                    </div>
                    <div class="progress-bar">
                        <div class="fill" style="width: ${fillPercentage}%;"></div>
                        <span class="slots-text">${match.currentSlots}/${match.maxSlots} Slots Filled</span>
                    </div>
                    <div class="match-footer">
                        <span class="match-time">🕒 ${matchDate}</span>
                        ${actionButtonHTML}
                    </div>
                </div>
            `;
            
            if (userRegistration) {
                myGrid.innerHTML += cardHTML;
                myMatchesCount++;
            } else {
                grid.innerHTML += cardHTML;
                upcomingMatchesCount++;
            }
        });

        if (upcomingMatchesCount === 0) {
            grid.innerHTML = '<div style="text-align: center; width: 100%; grid-column: 1 / -1; padding-top: 40px;"><p style="color: rgba(255,255,255,0.6); font-size: 1.1em;">You\'ve joined all available matches! Check your "My Matches" tab.</p></div>';
        }

        if (myMatchesCount === 0) {
            myGrid.innerHTML = `
                <div style="text-align: center; width: 100%; grid-column: 1 / -1; padding-top: 40px;">
                    <p style="color: rgba(255,255,255,0.6); font-size: 1.1em; margin-bottom: 15px;">You haven't joined any tournaments yet!</p>
                    <button class="orange-glow-btn small-btn" onclick="document.querySelector('.tab-btn[data-target=\\'section-upcoming\\']').click();">Browse Upcoming Matches</button>
                </div>
            `;
        }

        attachJoinListeners();
        attachRoomDetailsListeners(); 

    } catch (error) {
        grid.innerHTML = '<p style="color: red; text-align: center; width: 100%;">Error loading tournaments.</p>';
    }
}

// =====================================
// 3. JOIN MATCH UI LOGIC
// =====================================
function attachJoinListeners() {
    const joinBtns = document.querySelectorAll('.join-match-btn');
    const modal = document.getElementById('join-modal');
    const step1 = document.getElementById('step-1-details');
    const step2 = document.getElementById('step-2-payment');
    const dynamicFields = document.getElementById('dynamic-fields');
    
    joinBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentMatchId = e.target.getAttribute('data-id'); 
            currentMatchFee = e.target.getAttribute('data-fee');
            currentMatchTitle = e.target.getAttribute('data-title');
            const mode = e.target.getAttribute('data-mode');

            document.getElementById('modal-match-title').innerText = currentMatchTitle;
            document.getElementById('modal-fee-display').innerText = `₹${currentMatchFee}`;
            
            let inputsHTML = '';
            if (mode === 'solo') {
                inputsHTML = `
                    <div class="input-group"><label>In-Game Name</label><input type="text" required></div>
                    <div class="input-group"><label>Game UID</label><input type="number" required></div>
                `;
            } else if (mode === 'duo') {
                inputsHTML = `
                    <div class="input-group"><label>Team Name</label><input type="text" required></div>
                    <div class="input-group"><label>Player 1 In-Game Name</label><input type="text" required></div>
                    <div class="input-group"><label>Player 1 UID</label><input type="number" required></div>
                    <div class="input-group"><label>Player 2 In-Game Name</label><input type="text" required></div>
                    <div class="input-group"><label>Player 2 UID</label><input type="number" required></div>
                `;
            } else if (mode === 'squad') {
                inputsHTML = `
                    <div class="input-group"><label>Squad Name</label><input type="text" required></div>
                    <div class="input-group"><label>Leader In-Game Name</label><input type="text" required></div>
                    <div class="input-group"><label>Leader UID</label><input type="number" required></div>
                    <div class="input-group"><label>Player 2 In-Game Name</label><input type="text" required></div>
                    <div class="input-group"><label>Player 2 UID</label><input type="number" required></div>
                    <div class="input-group"><label>Player 3 In-Game Name</label><input type="text" required></div>
                    <div class="input-group"><label>Player 3 UID</label><input type="number" required></div>
                    <div class="input-group"><label>Player 4 In-Game Name</label><input type="text" required></div>
                    <div class="input-group"><label>Player 4 UID</label><input type="number" required></div>
                `;
            }
            dynamicFields.innerHTML = inputsHTML;

            step1.classList.remove('hidden');
            step2.classList.add('hidden');
            modal.classList.remove('hidden');
        });
    });
}

function attachRoomDetailsListeners() {
    const viewRoomBtns = document.querySelectorAll('.view-room-btn');
    viewRoomBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.getElementById('player-room-id').innerText = e.currentTarget.getAttribute('data-room');
            document.getElementById('player-room-password').innerText = e.currentTarget.getAttribute('data-pass');
            document.getElementById('verified-slot-modal').classList.remove('hidden');
        });
    });

    const verifiedModal = document.getElementById('verified-slot-modal');
    document.getElementById('verified-match-great-btn')?.addEventListener('click', () => verifiedModal.classList.add('hidden'));
    document.getElementById('close-verified-modal')?.addEventListener('click', () => verifiedModal.classList.add('hidden'));
}

// =====================================
// 4. MODALS & SUBMISSIONS
// =====================================
const modal = document.getElementById('join-modal');
if (modal) {
    document.getElementById('close-modal').addEventListener('click', () => modal.classList.add('hidden'));

    document.getElementById('join-details-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        globalWhatsappDetails = "";
        let playerObj = {};
        
        document.querySelectorAll('#dynamic-fields input').forEach(input => {
            const label = input.previousElementSibling.innerText;
            const val = input.value;
            playerObj[label] = val;
            globalWhatsappDetails += `%0A- ${label}: ${val}`; 
        });

        try {
            await updateDoc(doc(db, "tournaments", currentMatchId), {
                currentSlots: increment(1), 
                registeredPlayers: arrayUnion({
                    userId: auth.currentUser.uid,
                    details: playerObj,
                    paymentStatus: "pending", 
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.error("Error updating slots: ", error);
        }

        const upiLink = `upi://pay?pa=${ADMIN_UPI_ID}&pn=FFArena&am=${currentMatchFee}&cu=INR`;
        document.getElementById('upi-qr-img').src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;
        document.getElementById('admin-upi-text').innerText = ADMIN_UPI_ID;

        document.getElementById('step-1-details').classList.add('hidden');
        document.getElementById('step-2-payment').classList.remove('hidden');
    });

    document.getElementById('whatsapp-btn').addEventListener('click', () => {
        const message = `Hello Admin! I want to join the tournament: *"${currentMatchTitle}"*.%0A%0A*My Team Details:*${globalWhatsappDetails}%0A%0AEntry Fee: ₹${currentMatchFee}. Here is my payment screenshot for verification!`;
        window.open(`https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${message}`, '_blank');
        modal.classList.add('hidden');
        window.location.reload(); 
    });
}

// =====================================
// 5. NAVIGATION (TABS & LOGOUT)
// =====================================
document.getElementById('logout-btn').addEventListener('click', () => { signOut(auth).then(() => window.location.href = "index.html"); });
document.getElementById('go-to-admin-btn').addEventListener('click', () => window.location.href = "admin.html");

const tabs = document.querySelectorAll('.tab-btn');
const sections = document.querySelectorAll('.dashboard-section');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        sections.forEach(s => s.classList.add('hidden'));

        tab.classList.add('active');
        const targetId = tab.getAttribute('data-target');
        document.getElementById(targetId).classList.remove('hidden');

        if (targetId === 'section-leaderboard') {
            loadLeaderboard();
        }
    });
});