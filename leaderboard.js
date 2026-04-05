import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export async function loadLeaderboard() {
    const leaderboardSection = document.getElementById('section-leaderboard');
    
    // 1. Build the Main Page HTML + The Hidden Score Modal
    leaderboardSection.innerHTML = `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="font-size: 3.5em; margin-bottom: 10px;">📊</div>
                <h2 style="color: #00f0ff; text-shadow: 0 0 15px rgba(0,240,255,0.4); font-size: 1.8em;">MATCH RESULTS</h2>
                <p class="sub-text">Completed matches available for 24 Hours</p>
            </div>
            <div id="completed-matches-list">
                <p style="color: #fff; text-align: center; padding: 30px;">⏳ Checking database...</p>
            </div>
        </div>

        <div id="match-score-modal" class="modal hidden">
            <div class="modal-overlay"></div>
            <div class="modal-content" style="max-width: 450px; border-color: #00f0ff; padding: 25px;">
                <span id="close-score-modal" class="close-modal">&times;</span>
                <h2 id="score-modal-title" style="color: #00f0ff; margin-bottom: 20px; font-size: 1.4em;">Match Rankings</h2>
                
                <div id="score-modal-list" style="max-height: 400px; overflow-y: auto; padding-right: 5px;">
                    </div>
            </div>
        </div>
    `;

    try {
        const q = query(collection(db, "tournaments"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const listContainer = document.getElementById('completed-matches-list');
        
        let listHTML = '';
        const now = Date.now();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

        querySnapshot.forEach((docSnap) => {
            const match = docSnap.data();
            
            // 2. Only check matches that are COMPLETED
            if (match.status === "completed" && match.completedAt) {
                const timeSinceCompletion = now - match.completedAt;
                
                // 3. The 24-Hour Auto-Remove Logic!
                if (timeSinceCompletion <= TWENTY_FOUR_HOURS) {
                    
                    // Encode the match data so we can pass it to the button
                    const matchString = encodeURIComponent(JSON.stringify(match));
                    
                    listHTML += `
                        <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(0,240,255,0.3); border-radius: 12px; padding: 15px 20px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
                            <div>
                                <h3 style="color: #fff; margin-bottom: 5px; font-size: 1.1em;">${match.title}</h3>
                                <p style="color: rgba(255,255,255,0.5); font-size: 0.85em; margin:0;">🗺️ ${match.map} | <span style="color: #ffd700;">${match.mode.toUpperCase()}</span></p>
                            </div>
                            <button class="cyan-glow-btn small-btn view-score-btn" data-match="${matchString}" style="margin: 0; padding: 8px 15px; font-size: 0.8em; box-shadow: none;">VIEW SCORE</button>
                        </div>
                    `;
                }
            }
        });

        // 4. Render the list
        if (listHTML === '') {
            listContainer.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 30px; border: 1px dashed rgba(255,255,255,0.1); border-radius: 10px;">No completed matches in the last 24 hours.</p>';
        } else {
            listContainer.innerHTML = listHTML;
            
            // 5. Attach Click Listeners to the new buttons
            document.querySelectorAll('.view-score-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const matchData = JSON.parse(decodeURIComponent(e.currentTarget.getAttribute('data-match')));
                    
                    document.getElementById('score-modal-title').innerText = `🏆 ${matchData.title}`;
                    const scoreList = document.getElementById('score-modal-list');
                    let scoreHTML = '';
                    
                    if (!matchData.matchResults || matchData.matchResults.length === 0) {
                        scoreHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center;">Scores are still calculating.</p>';
                    } else {
                        // Build the rows for the popup
                        matchData.matchResults.forEach((res, idx) => {
                            let rankIcon = `#${idx + 1}`;
                            let rowColor = 'rgba(255,255,255,0.05)';
                            let textColor = '#fff';

                            if(idx === 0) { rankIcon = '🥇'; rowColor = 'rgba(255, 215, 0, 0.15)'; textColor = '#ffd700'; }
                            if(idx === 1) { rankIcon = '🥈'; rowColor = 'rgba(192, 192, 192, 0.15)'; }
                            if(idx === 2) { rankIcon = '🥉'; rowColor = 'rgba(205, 127, 50, 0.15)'; }
                            
                            scoreHTML += `
                                <div style="display: flex; justify-content: space-between; align-items: center; background: ${rowColor}; padding: 12px 15px; margin-bottom: 8px; border-radius: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                    <div style="display: flex; align-items: center; gap: 15px;">
                                        <span style="font-size: 1.3em; font-weight: bold; width: 35px; text-align: center;">${rankIcon}</span>
                                        <span style="color: ${textColor}; font-weight: bold; font-size: 1.1em;">${res.name}</span>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="color: #00f0ff; font-weight: bold; font-size: 1.2em; text-shadow: 0 0 10px rgba(0,240,255,0.5);">${res.points} PTS</div>
                                        <div style="color: rgba(255,255,255,0.5); font-size: 0.75em; margin-top: 3px;">Pos: ${res.position} | Kills: ${res.kills}</div>
                                    </div>
                                </div>
                            `;
                        });
                    }
                    
                    scoreList.innerHTML = scoreHTML;
                    document.getElementById('match-score-modal').classList.remove('hidden');
                });
            });
            
            // Close the modal
            document.getElementById('close-score-modal').addEventListener('click', () => {
                document.getElementById('match-score-modal').classList.add('hidden');
            });
        }

    } catch (error) {
        document.getElementById('completed-matches-list').innerHTML = '<p style="color: red; text-align: center; padding: 30px;">Error loading matches.</p>';
    }
}
