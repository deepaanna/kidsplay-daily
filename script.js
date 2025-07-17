// Game state management
let gameStats = {
    totalGames: 0,
    completedToday: 0,
    totalPoints: 0,
    streak: 0,
    completedGames: new Set()
};

// Load saved stats
function loadStats() {
    const saved = localStorage.getItem('kidsplay_stats');
    if (saved) {
        gameStats = { ...gameStats, ...JSON.parse(saved) };
        updateStatsDisplay();
    }
}

function saveStats() {
    localStorage.setItem('kidsplay_stats', JSON.stringify(gameStats));
}

function updateStatsDisplay() {
    document.getElementById('totalGames').textContent = gameStats.totalGames;
    document.getElementById('completedToday').textContent = gameStats.completedToday;
    document.getElementById('totalPoints').textContent = gameStats.totalPoints;
    document.getElementById('streak').textContent = gameStats.streak;
}

function completeGame(gameId, points = 10) {
    if (!gameStats.completedGames.has(gameId)) {
        gameStats.completedGames.add(gameId);
        gameStats.totalGames++;
        gameStats.completedToday++;
        gameStats.totalPoints += points;
        gameStats.streak++;
        
        // Update button appearance
        const btn = document.getElementById(gameId.replace('Game', 'Btn'));
        const status = document.getElementById(gameId.replace('Game', 'Status'));
        
        btn.textContent = '✅ Completed!';
        btn.classList.add('completed');
        status.textContent = 'Completed';
        
        saveStats();
        updateStatsDisplay();
        
        // Show celebration
        showCelebration(points);
    }
}

function showCelebration(points) {
    const celebration = document.createElement('div');
    celebration.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; 
                padding: 20px; border-radius: 15px; font-size: 1.5rem; z-index: 10000;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3); animation: bounce 0.5s ease;">
            🎉 Great Job! +${points} points! 🎉
        </div>
    `;
    document.body.appendChild(celebration);
    setTimeout(() => celebration.remove(), 2000);
}

// Word Game
async function createWordGame() {
    const targetWord = await loadPuzzle('word');
    const isCompleted = isTodayCompleted('wordGame');

    return `
        <div class="word-game">
        <h2>🔤 Word Explorer</h2>
        <p>Guess the word! You have 6 tries.</p>
        
        <div class="word-grid" id="wordGrid">
            ${[...Array(6)].map(() => `
            ${[...Array(5)].map(() => `<div class="letter-box"></div>`).join('')}
            `).join('')}
        </div>

        ${isCompleted ? `<div class="result-message success">✅ Already completed today!</div>` : `
        <input type="text" id="wordGuess" maxlength="5" class="answer-input" placeholder="Type a 5-letter word">
        <br>
        <button class="submit-btn" onclick="submitWordGuess('${targetWord}')">Submit Guess</button>
        <div id="wordResult"></div>`}
        </div>
    `;
}
function submitWordGuess(correctWord) {
    const input = document.getElementById('wordGuess');
    const guess = input.value.trim().toUpperCase();
    const resultDiv = document.getElementById('wordResult');

    if (guess.length !== 5) {
        resultDiv.innerHTML = `<div class="result-message error">Enter a 5-letter word!</div>`;
        return;
    }

    const rowStart = currentAttempt * 5;
    const boxes = document.querySelectorAll('#wordGrid .letter-box');
    const letterCount = {};

    [...correctWord].forEach(letter => {
        letterCount[letter] = (letterCount[letter] || 0) + 1;
    });

    for (let i = 0; i < 5; i++) {
        const box = boxes[rowStart + i];
        box.textContent = guess[i];
        box.classList.remove('correct', 'present', 'absent');

        if (guess[i] === correctWord[i]) {
        box.classList.add('correct');
        letterCount[guess[i]]--;
        }
    }

    for (let i = 0; i < 5; i++) {
        const box = boxes[rowStart + i];
        if (box.classList.contains('correct')) continue;

        if (correctWord.includes(guess[i]) && letterCount[guess[i]] > 0) {
        box.classList.add('present');
        letterCount[guess[i]]--;
        } else {
        box.classList.add('absent');
        }
    }

    if (guess === correctWord) {
        resultDiv.innerHTML = `<div class="result-message success">🎉 You got it!</div>`;
        markTodayCompleted('wordGame');
        setTimeout(() => {
        completeGame('wordGame', 20);
        closeGame();
        }, 2000);
    } else {
        currentAttempt++;
        if (currentAttempt >= 6) {
        resultDiv.innerHTML = `<div class="result-message error">❌ Out of tries! The word was <b>${correctWord}</b>.</div>`;
        markTodayCompleted('wordGame');
        setTimeout(() => {
            closeGame();
        }, 3000);
        } else {
        resultDiv.innerHTML = `<div class="result-message">You have ${6 - currentAttempt} tries left.</div>`;
        }
    }

    input.value = '';
}

// Math Game
async function createMathGame() {
    const todayProblem = await loadPuzzle('math');
    const isCompleted = isTodayCompleted('mathGame');
    if (isCompleted) {
        return `<div class="result-message success">✅ Already completed today!</div>`;
    }
    return `
        <div class="math-problem">
            <h2>🔢 Math Adventure</h2>
            <div class="problem-text">${todayProblem.question}</div>
            <input type="number" class="answer-input" id="mathAnswer" placeholder="Your answer">
            <br>
            <button class="submit-btn" onclick="checkMathAnswer(${todayProblem.answer})">Submit Answer</button>
            <div id="mathResult"></div>
        </div>
    `;
}

function checkMathAnswer(correctAnswer) {
    const userAnswer = parseInt(document.getElementById('mathAnswer').value);
    const resultDiv = document.getElementById('mathResult');
    
    if (userAnswer === correctAnswer) {
        resultDiv.innerHTML = '<div class="result-message success">🎉 Correct! Great job!</div>';
        setTimeout(() => {
            localStorage.setItem(`mathGame_${today}`, 'completed');
            completeGame('mathGame', 15);
            closeGame();
        }, 2000);
    } else {
        resultDiv.innerHTML = '<div class="result-message error">❌ Try again! You can do it!</div>';
        setTimeout(() => {
            resultDiv.innerHTML = '';
        }, 2000);
    }
}

// Puzzle Game
async function createPuzzleGame() {
    const isCompleted = isTodayCompleted('puzzleGame');
    if (isCompleted) {
        return `<div class="result-message success">✅ Already completed today!</div>`;
    }

    // Get today's pattern based on index
    const currentPattern = await loadPuzzle('pattern');
    return `
        <div class="math-problem">
            <h2>🧩 Pattern Puzzle</h2>
            <p>What comes next in this pattern?</p>
            <div class="problem-text">${currentPattern.pattern.join(' → ')}</div>
            <input type="number" class="answer-input" id="puzzleAnswer" placeholder="Next number">
            <br>
            <button class="submit-btn" onclick="checkPuzzleAnswer(${currentPattern.answer})">Submit Answer</button>
            <div id="puzzleResult"></div>
        </div>
    `;
}

function checkPuzzleAnswer(correctAnswer) {
    const userAnswer = parseInt(document.getElementById('puzzleAnswer').value);
    const resultDiv = document.getElementById('puzzleResult');
    
    if (userAnswer === correctAnswer) {
        resultDiv.innerHTML = '<div class="result-message success">🎉 Perfect! You found the pattern!</div>';
        setTimeout(() => {
            completeGame('puzzleGame', 20);
            closeGame();
        }, 2000);
    } else {
        resultDiv.innerHTML = '<div class="result-message error">❌ Not quite right. Look at the pattern again!</div>';
        setTimeout(() => {
            resultDiv.innerHTML = '';
        }, 2000);
    }
}

// Memory Game
async function createMemoryGame() {
    const isCompleted = isTodayCompleted('memoryGame');
    if (isCompleted) {
        return `<div class="result-message success">✅ Already completed today!</div>`;
    }

    const gameColors = await loadPuzzle('memory');
    return `
        <div class="math-problem">
            <h2>🧠 Memory Match</h2>
            <p>Find all the matching pairs!</p>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; max-width: 300px; margin: 20px auto;">
                ${gameColors.map((color, index) => 
                    `<div class="memory-card" data-color="${color}" data-index="${index}" 
                            style="width: 60px; height: 60px; background: #ddd; border-radius: 10px; 
                            cursor: pointer; display: flex; align-items: center; justify-content: center;
                            font-size: 1.5rem; transition: all 0.3s ease;"
                            onclick="flipCard(this)">❓</div>`
                ).join('')}
            </div>
            <div id="memoryResult"></div>
        </div>
    `;
}

let flippedCards = [];
let matchedPairs = 0;

function flipCard(card) {
    if (flippedCards.length < 2 && !card.classList.contains('flipped')) {
        card.textContent = card.dataset.color;
        card.classList.add('flipped');
        flippedCards.push(card);
        
        if (flippedCards.length === 2) {
            setTimeout(checkMatch, 1000);
        }
    }
}

function checkMatch() {
    const [card1, card2] = flippedCards;
    
    if (card1.dataset.color === card2.dataset.color) {
        card1.style.opacity = '0.5';
        card2.style.opacity = '0.5';
        matchedPairs++;
        
        if (matchedPairs === 6) {
            document.getElementById('memoryResult').innerHTML = 
                '<div class="result-message success">🎉 You found all pairs! Amazing memory!</div>';
            setTimeout(() => {
                completeGame('memoryGame', 25);
                closeGame();
            }, 2000);
        }
    } else {
        card1.textContent = '❓';
        card2.textContent = '❓';
        card1.classList.remove('flipped');
        card2.classList.remove('flipped');
    }
    
    flippedCards = [];
}

function openGame(gameType) {
    const modal = document.getElementById('gameModal');
    const content = document.getElementById('gameContent');
    
    flippedCards = [];
    matchedPairs = 0;
    
    switch(gameType) {
        case 'wordGame':
            currentAttempt = 0;
            createWordGame().then(html => {
                content.innerHTML = html;
            });
            break;
        case 'mathGame':
            createMathGame().then(html => {
                content.innerHTML = html;
            });
            break;
        case 'puzzleGame':
            createPuzzleGame().then(html => {
                content.innerHTML = html;
            });
            break;
        case 'memoryGame':
            createMemoryGame().then(html => {
                content.innerHTML = html;
            });
            break;
        case 'drawingGame':
            createDrawingGame().then(html => {
                content.innerHTML = html;
            });
            setTimeout(setupCanvas, 100);
            break;
        case 'quizGame':
            createQuizGame().then(html => {
                content.innerHTML = html;
            });
            break;
    }
    
    modal.style.display = 'block';
}

function closeGame() {
    document.getElementById('gameModal').style.display = 'none';
}

// Drawing Game
async function createDrawingGame() {
    const currentPrompt = await loadPuzzle('drawing');
    
    return `
        <div class="math-problem">
            <h2>🎨 Drawing Challenge</h2>
            <p style="font-size: 1.2rem; color: #333; margin: 20px 0;">${currentPrompt}</p>
            
            <div class="drawing-tools">
                <div class="color-btn active" style="background: #000;" onclick="selectColor('#000')"></div>
                <div class="color-btn" style="background: #ff6b6b;" onclick="selectColor('#ff6b6b')"></div>
                <div class="color-btn" style="background: #4ecdc4;" onclick="selectColor('#4ecdc4')"></div>
                <div class="color-btn" style="background: #45b7d1;" onclick="selectColor('#45b7d1')"></div>
                <div class="color-btn" style="background: #96ceb4;" onclick="selectColor('#96ceb4')"></div>
                <div class="color-btn" style="background: #ffd700;" onclick="selectColor('#ffd700')"></div>
                <div class="color-btn" style="background: #9b59b6;" onclick="selectColor('#9b59b6')"></div>
                <button class="submit-btn" onclick="clearCanvas()" style="margin-left: 20px;">Clear</button>
            </div>
            
            <canvas class="drawing-canvas" id="drawingCanvas" width="400" height="300"></canvas>
            
            <button class="submit-btn" onclick="finishDrawing()">Finish Drawing!</button>
            <div id="drawingResult"></div>
        </div>
    `;
}

let currentColor = '#000';
let isDrawing = false;

function selectColor(color) {
    currentColor = color;
    document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function setupCanvas() {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) {
    isDrawing = true;
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
    if (!isDrawing) return;
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = currentColor;
    
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function stopDrawing() {
    isDrawing = false;
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                    e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    document.getElementById('drawingCanvas').dispatchEvent(mouseEvent);
}

function clearCanvas() {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function finishDrawing() {
    document.getElementById('drawingResult').innerHTML = 
        '<div class="result-message success">🎨 Beautiful artwork! You\'re a true artist!</div>';
    setTimeout(() => {
        completeGame('drawingGame', 20);
        closeGame();
    }, 2000);
}

// Quiz Game
async function createQuizGame() {
    const currentQuestion = await loadPuzzle('quiz');
    return `
        <div class="math-problem">
            <h2>🌟 Knowledge Quiz</h2>
            <div class="problem-text">${currentQuestion.question}</div>
            
            <div class="quiz-options">
                ${currentQuestion.options.map((option, index) => 
                    `<div class="quiz-option" onclick="selectQuizAnswer(${index}, ${currentQuestion.correct})">${option}</div>`
                ).join('')}
            </div>
            
            <div id="quizResult"></div>
        </div>
    `;
}

function selectQuizAnswer(selectedIndex, correctIndex) {
    const options = document.querySelectorAll('.quiz-option');
    const resultDiv = document.getElementById('quizResult');
    
    options.forEach((option, index) => {
        option.style.pointerEvents = 'none';
        if (index === correctIndex) {
            option.classList.add('correct');
        } else if (index === selectedIndex && index !== correctIndex) {
            option.classList.add('incorrect');
        }
    });
    
    if (selectedIndex === correctIndex) {
        resultDiv.innerHTML = '<div class="result-message success">🎉 Correct! You\'re so smart!</div>';
        setTimeout(() => {
            completeGame('quizGame', 15);
            closeGame();
        }, 2000);
    } else {
        resultDiv.innerHTML = '<div class="result-message error">❌ Not quite right, but great try!</div>';
    }
}

function showPremiumRequired() {
    const modal = document.getElementById('gameModal');
    const content = document.getElementById('gameContent');
    
    content.innerHTML = `
        <div class="math-problem">
            <h2>⭐ Premium Feature</h2>
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 4rem; margin: 20px 0;">🔒</div>
                <h3>Unlock Premium Games!</h3>
                <p style="margin: 20px 0; color: #666;">
                    Get access to exclusive games, remove ads, and unlock special features!
                </p>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 15px; margin: 20px 0;">
                    <h4>Premium Benefits:</h4>
                    <ul style="text-align: left; margin: 15px 0;">
                        <li>✅ All games unlocked</li>
                        <li>✅ No advertisements</li>
                        <li>✅ Progress tracking</li>
                        <li>✅ Achievement badges</li>
                        <li>✅ Parental dashboard</li>
                    </ul>
                </div>
                <button class="submit-btn" onclick="upgradeToPremium()">Upgrade for $2.99/month</button>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

function showPremium() {
    showPremiumRequired();
}
// Check premium status
function isPremiumUser() {
    return localStorage.getItem('isPremium') === 'true';
}

// Show or hide ads based on premium
function updateAdDisplay() {
    if (isPremiumUser()) {
        document.body.classList.add('premium');
    } else {
        document.body.classList.remove('premium');
    }
}

// Simulate upgrade to Premium
function upgradeToPremium() {
    // In real life: integrate Stripe, PayPal, or Google Play payments
    localStorage.setItem('isPremium', 'true');
    updateAdDisplay();
    alert('🎉 You are now a Premium member! Ads are removed.');
}

// document.getElementById('premiumBtn').addEventListener('click', upgradeToPremium);

// ----------- DAILY PUZZLE LOGIC -----------
const PUZZLE_FILES = {
  word: 'wordPuzzles.json',
  math: 'mathPuzzles.json',
  drawing: 'drawingPrompts.json',
  quiz: 'quizPuzzles.json',
  pattern: 'patternPuzzles.json'
};
let puzzleCache = {};

async function loadPuzzle(gameKey) {
  if (puzzleCache[gameKey]) return puzzleCache[gameKey];

  const url = PUZZLE_FILES[gameKey];
  const response = await fetch(url);
  const data = await response.json();
  const index = getTodayIndex(data.length);
  puzzleCache[gameKey] = data[index];
  return puzzleCache[gameKey];
}


const START_DATE = new Date('2025-07-16'); // Set your start date here
let currentAttempt = 0;
function getTodayIndex(arrayLength) {
    const today = new Date();
    const diffDays = Math.floor((today - START_DATE) / (1000 * 60 * 60 * 24));
    return diffDays % arrayLength;
}
function getTodayKey(gameId) {
    const today = new Date().toISOString().slice(0, 10);
    return `${gameId}_${today}`;
}

function isTodayCompleted(gameId) {
    return localStorage.getItem(getTodayKey(gameId)) === 'completed';
}

function markTodayCompleted(gameId) {
    localStorage.setItem(getTodayKey(gameId), 'completed');
}

function resetButtonsDaily() {
    const gameIds = ['wordGame', 'mathGame'];
    gameIds.forEach(gameId => {
        const todayKey = getTodayKey(gameId);
        const isDone = localStorage.getItem(todayKey) === 'completed';

        const btn = document.getElementById(gameId.replace('Game', 'Btn'));
        const status = document.getElementById(gameId.replace('Game', 'Status'));

        if (isDone) {
        btn.textContent = '✅ Completed!';
        btn.classList.add('completed');
        status.textContent = 'Completed';
        } else {
        btn.textContent = 'Play Now!';
        btn.classList.remove('completed');
        status.textContent = 'Not played';
        }
    });
}

// On load, update display
updateAdDisplay();


// Initialize
loadStats();
resetButtonsDaily();
updateStatsDisplay();

async function testAllPuzzles() {
  const keys = ["word", "math", "drawing", "quiz", "pattern"];
  for (const key of keys) {
    try {
      const res = await fetch(key + "Puzzles.json");
      const data = await res.json();
      console.log(`${key}: ✅ loaded (${data.length} items)`);
    } catch (e) {
      console.error(`${key}: ❌ failed to load`, e);
    }
  }
}
testAllPuzzles();


// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('gameModal');
    if (event.target === modal) {
        closeGame();
    }
}