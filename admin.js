import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, query, orderBy, deleteDoc, doc, updateDoc, arrayRemove, increment } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDTcQiJ1fbg9VUhT_cWLELE7yKbiZYkBe4",
    authDomain: "ff-arena-fc8c6.firebaseapp.com",
    projectId: "ff-arena-fc8c6",
    storageBucket: "ff-arena-fc8c6.firebasestorage.app",
    messagingSenderId: "1021839486155",
    appId: "1:1021839486155:web:c2c2050a0716b35f0f7f4e",
    measurementId: "G-X4LDXY9TME"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAILS = ["utsharudra@gmail.com", "dibyendunath84@gmail.com"]; 

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else if (user.email !== ADMIN_EMAIL) {
        alert("Access Denied: You are not the Admin.");
        window.location.href = "dashboard.html";
    } else {
        loadAdminMatches();
    }
});

// Admin Tab Switching Logic
const tabs = document.querySelectorAll('.admin-tab');
const sections = document.querySelectorAll('.admin-content-section');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        sections.forEach(s => s.classList.add('hidden'));
        
        tab.classList.add('active');
        const targetId = tab.getAttribute('data-target');
        document.getElementById(targetId).classList.remove('hidden');

        if(targetId === 'manage-matches') {
            loadAdminMatches(); 
        }
    });
});

// Create Tournament Submission
document.getElementById('create-match-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const mode = document.getElementById('match-mode').value;
    let maxSlots = 48; 
    if(mode === 'duo') maxSlots = 24;
    if(mode === 'squad') maxSlots = 12;

    const newMatch = {
        title: document.getElementById('match-title').value,
        mode: mode,
        map: document.getElementById('match-map').value,
        time: document.getElementById('match-time').value,
        prizePool: document.getElementById('prize-pool').value,
        entryFee: document.getElementById('entry-fee').value,
        maxSlots: maxSlots,
        currentSlots: 0,
        registeredPlayers: [], 
        status: "open",
        roomId: "",
        roomPass: "",
        createdAt: new Date()
    };

    try {
        await addDoc(collection(db, "tournaments"), newMatch);
        alert(`Success! Tournament Created.`);
        document.getElementById('create-match-form').reset();
        loadAdminMatches(); 
    } catch (error) {
        alert("Error creating match: " + error.message);
    }
});

// --- LOAD MATCHES INTO ADMIN PANEL ---
async function loadAdminMatches() {
    const grid = document.getElementById('admin-matches-grid');
    if (!grid) return;

    try {
        const q = query(collection(db, "tournaments"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            grid.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center; width: 100%;">No tournaments found.</p>';
            return;
        }

        grid.innerHTML = ''; 

        querySnapshot.forEach((document) => {
            const match = document.data();
            const matchId = document.id;

            const matchDate = new Date(match.time).toLocaleString('en-IN', {
                month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true
            });

            let pendingCount = 0;
            const playersList = match.registeredPlayers || [];
            playersList.forEach(p => {
                if (p.paymentStatus === "pending") pendingCount++;
            });

            let notificationBanner = '';
            if (pendingCount > 0) {
                notificationBanner = `
                    <div style="background: rgba(255, 0, 64, 0.2); border: 1px solid #ff0040; color: #ff0040; padding: 8px; border-radius: 5px; text-align: center; margin-bottom: 15px; font-weight: bold; font-size: 0.9em;">
                        🔔 ${pendingCount} PENDING APPROVALS!
                    </div>
                `;
            }

            // Lock the score button if it's already completed to prevent double-scoring
            const isCompleted = match.status === "completed";
            const scoreBtnHtml = isCompleted 
                ? `<button class="cyan-glow-btn small-btn disabled" disabled style="border-color: #555; color: #555;">✅ SCORED</button>`
                : `<button class="orange-glow-btn small-btn update-scores-btn" data-id="${matchId}" style="border-color: #ffd700; color: #ffd700; box-shadow: none;">🏆 SCORES</button>`;

            const cardHTML = `
                <div class="match-card" style="border-color: ${pendingCount > 0 ? '#ff0040' : '#ff5e00'};">
                    ${notificationBanner}
                    <div class="match-header">
                        <span class="badge ${match.mode === 'solo' ? 'solo' : match.mode === 'duo' ? 'duo' : 'squad'}">${match.mode.toUpperCase()}</span>
                        <span class="map-name">${match.currentSlots}/${match.maxSlots} Slots Filled</span>
                    </div>
                    <h3 class="match-title">${match.title}</h3>
                    <p style="color: rgba(255,255,255,0.6); font-size: 0.85em; margin-bottom: 10px;">🕒 ${matchDate}</p>
                    
                    <div class="admin-room-panel">
                        <input type="text" id="room-id-${matchId}" placeholder="Room ID" class="small-input" value="${match.roomId || ''}">
                        <input type="text" id="room-pass-${matchId}" placeholder="Password" class="small-input" value="${match.roomPass || ''}">
                        <button class="orange-glow-btn small-btn release-room-btn" data-id="${matchId}" style="margin-top: 10px;">RELEASE ROOM ID</button>
                    </div>

                    <div class="match-footer" style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="cyan-glow-btn small-btn view-players-btn" data-id="${matchId}">👥 PLAYERS</button>
                        ${scoreBtnHtml}
                        <button class="cyan-glow-btn small-btn delete-match-btn" data-id="${matchId}" style="border-color: #ff0040; color: #ff0040; box-shadow: none;">🗑️</button>
                    </div>
                </div>
            `;
            grid.innerHTML += cardHTML;
        });

        attachAdminListeners();

    } catch (error) {
        grid.innerHTML = '<p style="color: red; text-align: center; width: 100%;">Error loading matches.</p>';
    }
}

// --- ADMIN PANEL LISTENERS ---
function attachAdminListeners() {
    
    // 1. DELETE BUTTON
    document.querySelectorAll('.delete-match-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const matchId = e.currentTarget.getAttribute('data-id');
            const confirmDelete = confirm("⚠️ Are you sure you want to completely DELETE this tournament?");
            if (confirmDelete) {
                try {
                    await deleteDoc(doc(db, "tournaments", matchId));
                    loadAdminMatches();
                } catch (error) { alert("Error deleting match."); }
            }
        });
    });

    // 2. RELEASE ROOM DETAILS LOGIC
    document.querySelectorAll('.release-room-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const matchId = e.currentTarget.getAttribute('data-id');
            const roomIdVal = document.getElementById(`room-id-${matchId}`).value;
            const roomPassVal = document.getElementById(`room-pass-${matchId}`).value;

            if (!roomIdVal || !roomPassVal) return alert("Please type both the Room ID and Password!");
            e.currentTarget.innerText = "⏳ SAVING...";
            try {
                await updateDoc(doc(db, "tournaments", matchId), { roomId: roomIdVal, roomPass: roomPassVal });
                alert("✅ Room Details released!");
                e.currentTarget.innerText = "UPDATE ROOM ID"; 
            } catch (error) { alert("Error saving room details."); }
        });
    });

    // 3. VIEW PLAYERS
    const pModal = document.getElementById('players-modal');
    const pContainer = document.getElementById('players-list-container');
    
    document.querySelectorAll('.view-players-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const matchId = e.currentTarget.getAttribute('data-id');
            pModal.classList.remove('hidden');
            pContainer.innerHTML = '<p style="color: #fff; text-align: center;">⏳ Loading...</p>';
            
            try {
                const docSnap = await getDoc(doc(db, "tournaments", matchId));
                if (docSnap.exists()) {
                    const players = docSnap.data().registeredPlayers || []; 
                    if (players.length === 0) return pContainer.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center;">No players yet.</p>';

                    let listHTML = '';
                    
                    // --- THE FIX FOR THE SCRAMBLED LIST ---
                    const properOrder = [
                        "Squad Name", "Team Name", 
                        "Leader In-Game Name", "Leader UID",
                        "Player 1 In-Game Name", "Player 1 UID",
                        "In-Game Name", "Game UID",
                        "Player 2 In-Game Name", "Player 2 UID",
                        "Player 3 In-Game Name", "Player 3 UID",
                        "Player 4 In-Game Name", "Player 4 UID"
                    ];

                    players.forEach((player, index) => {
                        const isVerified = player.paymentStatus === "verified";
                        const statusBadge = isVerified ? `🟢 VERIFIED` : `🟡 PENDING`;
                        const pString = encodeURIComponent(JSON.stringify(player));

                        let detailsText = '';
                        
                        // Force the output to follow the proper order!
                        properOrder.forEach(key => {
                            if (player.details[key] !== undefined) {
                                detailsText += `<div style="color: #fff; font-size: 0.85em; margin-bottom: 2px;"><span style="color: rgba(255,255,255,0.5); font-weight: bold;">${key}:</span> ${player.details[key]}</div>`;
                            }
                        });

                        const verifyBtn = isVerified ? "" : `<button class="cyan-glow-btn small-btn v-btn" style="flex:1; border-color:#25D366; color:#25D366; padding:5px;" data-match="${matchId}" data-index="${index}">✅ VERIFY</button>`;

                        listHTML += `
                            <div style="background: rgba(0,0,0,0.4); border: 1px solid ${isVerified ? '#25D366' : '#ffd700'}; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
                                <div style="color: ${isVerified ? '#25D366' : '#ffd700'}; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">🎯 SLOT ${index + 1} - ${statusBadge}</div>
                                ${detailsText}
                                <div style="display: flex; gap: 10px; margin-top: 10px;">
                                    ${verifyBtn}
                                    <button class="orange-glow-btn small-btn k-btn" style="flex:1; border-color:#ff0040; color:#ff0040; padding:5px;" data-match="${matchId}" data-player="${pString}">🥾 KICK</button>
                                </div>
                            </div>
                        `;
                    });
                    pContainer.innerHTML = listHTML;

                    document.querySelectorAll('.v-btn').forEach(b => b.addEventListener('click', async (ev) => {
                        const mId = ev.currentTarget.getAttribute('data-match');
                        const idx = parseInt(ev.currentTarget.getAttribute('data-index'));
                        try {
                            const mRef = doc(db, "tournaments", mId);
                            const cPlayers = (await getDoc(mRef)).data().registeredPlayers;
                            cPlayers[idx].paymentStatus = "verified";
                            await updateDoc(mRef, { registeredPlayers: cPlayers });
                            document.querySelector(`.view-players-btn[data-id="${mId}"]`).click(); 
                            loadAdminMatches();
                        } catch(err) { alert("Error verifying."); }
                    }));

                    document.querySelectorAll('.k-btn').forEach(b => b.addEventListener('click', async (ev) => {
                        if(confirm("Kick this player?")) {
                            const mId = ev.currentTarget.getAttribute('data-match');
                            const pObj = JSON.parse(decodeURIComponent(ev.currentTarget.getAttribute('data-player')));
                            try {
                                await updateDoc(doc(db, "tournaments", mId), { registeredPlayers: arrayRemove(pObj), currentSlots: increment(-1) });
                                pModal.classList.add('hidden'); loadAdminMatches();
                            } catch(err) { alert("Error kicking."); }
                        }
                    }));
                }
            } catch(e) { pContainer.innerHTML = '<p style="color: red;">Error.</p>'; }
        });
    });

    // 4. THE ESPORTS SCORING SYSTEM LOGIC
    const sModal = document.getElementById('scores-modal');
    const sContainer = document.getElementById('scores-list-container');
    let currentScoringMatchId = null;

    document.querySelectorAll('.update-scores-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            currentScoringMatchId = e.currentTarget.getAttribute('data-id');
            sModal.classList.remove('hidden');
            sContainer.innerHTML = '<p style="color: #fff; text-align: center;">⏳ Loading verified players...</p>';

            try {
                const docSnap = await getDoc(doc(db, "tournaments", currentScoringMatchId));
                if (docSnap.exists()) {
                    // Only get players who actually played (Verified)
                    const players = docSnap.data().registeredPlayers?.filter(p => p.paymentStatus === 'verified') || [];
                    
                    if (players.length === 0) return sContainer.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center;">No verified players to score.</p>';

                    let listHTML = '';
                    players.forEach((player, index) => {
                        // Find their main name (works for Solo, Duo, Squad inputs)
                        const name = player.details["In-Game Name"] || player.details["Team Name"] || player.details["Squad Name"] || "Player " + (index+1);
                        
                        listHTML += `
                            <div style="background: rgba(0,0,0,0.4); border: 1px solid #ffd700; padding: 15px; margin-bottom: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                                <div style="color: #fff; font-weight: bold; flex: 1; min-width: 120px;">🎮 ${name}</div>
                                <div style="display: flex; gap: 10px;">
                                    <input type="number" id="pos-${player.userId}" placeholder="Position (e.g. 1)" class="small-input" style="width: 120px; margin: 0; border-color: #ffd700;">
                                    <input type="number" id="kills-${player.userId}" placeholder="Total Kills" class="small-input" style="width: 100px; margin: 0; border-color: #ff0040;">
                                </div>
                            </div>
                        `;
                    });
                    sContainer.innerHTML = listHTML;
                }
            } catch (err) { sContainer.innerHTML = '<p style="color: red;">Error loading players.</p>'; }
        });
    });

    // Save All Scores Logic
    document.getElementById('save-all-scores-btn')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        if (!confirm("Are you sure? This will add points to player profiles and mark this match as COMPLETED.")) return;
        
        btn.innerText = "⏳ SAVING TO DATABASE...";
        
        try {
            const docSnap = await getDoc(doc(db, "tournaments", currentScoringMatchId));
            const players = docSnap.data().registeredPlayers?.filter(p => p.paymentStatus === 'verified') || [];

            const positionPointsMap = { 1: 12, 2: 10, 3: 8, 4: 6, 5: 5, 6: 3, 7: 2, 8: 1 };
            
            let matchResults = []; // 🔥 NEW: Array to hold the match receipt!

            for (const player of players) {
                const posInput = document.getElementById(`pos-${player.userId}`).value;
                const killsInput = document.getElementById(`kills-${player.userId}`).value;
                
                const position = parseInt(posInput) || 0; 
                const kills = parseInt(killsInput) || 0; 

                const posPoints = positionPointsMap[position] || 0; 
                const totalPoints = posPoints + kills;
                
                const name = player.details["In-Game Name"] || player.details["Team Name"] || player.details["Squad Name"] || "Player";

                // Add to our match receipt
                matchResults.push({
                    name: name,
                    position: position,
                    kills: kills,
                    points: totalPoints
                });

                if (totalPoints > 0) {
                    const userRef = doc(db, "users", player.userId);
                    await updateDoc(userRef, {
                        totalPoints: increment(totalPoints)
                    });
                }
            }

            // Sort the receipt from 1st place to last place
            matchResults.sort((a, b) => b.points - a.points);

            // 🔥 NEW: Save the status, the exact time, and the results receipt!
            await updateDoc(doc(db, "tournaments", currentScoringMatchId), {
                status: "completed",
                completedAt: Date.now(),
                matchResults: matchResults 
            });

            alert("✅ ALL SCORES SAVED! The Leaderboard has been updated.");
            sModal.classList.add('hidden');
            btn.innerText = "💾 SAVE ALL SCORES";
            loadAdminMatches(); 

        } catch (error) {
            alert("Error saving scores: " + error.message);
            btn.innerText = "💾 SAVE ALL SCORES";
        }
    });

}

// Close Modals
const closePlayersBtn = document.getElementById('close-players-modal');
if(closePlayersBtn) closePlayersBtn.addEventListener('click', () => { document.getElementById('players-modal').classList.add('hidden'); });

const closeScoresBtn = document.getElementById('close-scores-modal');
if(closeScoresBtn) closeScoresBtn.addEventListener('click', () => { document.getElementById('scores-modal').classList.add('hidden'); });

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    });
});