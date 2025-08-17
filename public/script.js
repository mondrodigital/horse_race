const socket = io();

const roomIdInput = document.getElementById('room-id');
const joinButton = document.getElementById('join-room');
const createButton = document.getElementById('create-room');
const playersDiv = document.getElementById('players-circle');
const raceTrack = document.getElementById('race-track');
const drawnCards = document.getElementById('drawn-cards');
const results = document.getElementById('results');
const playerNameInput = document.getElementById('player-name');
const avatarOptions = document.querySelectorAll('.avatar-option');
const cardDeck = document.getElementById('card-deck');
const currentCard = document.getElementById('current-card');
const addBotButton = document.getElementById('add-bot');
const resetGameButton = document.getElementById('reset-game');
const dragInstruction = document.getElementById('drag-instruction');

// Popup elements
const loginPopup = document.getElementById('login-popup');
const bettingPopup = document.getElementById('betting-popup');
const suitButtons = document.querySelectorAll('.suit-button');
const betAmountInput = document.getElementById('bet-amount');
const placeBetButton = document.getElementById('place-bet');
const betStatusList = document.getElementById('bet-status-list');
const startGameContainer = document.getElementById('start-game-container');
const startGameButton = document.getElementById('start-game');

// Leaderboard elements
const biggestLosers = document.getElementById('biggest-losers');
const topWinners = document.getElementById('top-winners');
const hotHorses = document.getElementById('hot-horses');
const horseStats = document.getElementById('horse-stats');

// Suits
const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
const suitSymbols = { hearts: '♥️', diamonds: '♦️', clubs: '♣️', spades: '♠️' };
const suitColors = { hearts: '#e53e3e', diamonds: '#e53e3e', clubs: '#000', spades: '#000' };

let currentRoomId = null;
let isHost = false;
let localPlayers = [];
let selectedAvatar = '🧑‍💼';
let selectedSuit = null;
let gameInProgress = false;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// Initialize page - show login popup and hide game area
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, showing login popup');
    const loginPopup = document.getElementById('login-popup');
    const mainGameArea = document.getElementById('main-game-area');
    
    if (loginPopup) {
        loginPopup.style.display = 'flex';
        console.log('Login popup displayed');
    }
    
    if (mainGameArea) {
        mainGameArea.style.display = 'none';
        console.log('Main game area hidden');
    }
});

// Game statistics
let gameStats = {
    players: {}, // playerId: { totalDrinks: 0, wins: 0, losses: 0 }
    horses: { 
        hearts: { wins: 0, streak: 0, lastWin: 0 },
        diamonds: { wins: 0, streak: 0, lastWin: 0 },
        clubs: { wins: 0, streak: 0, lastWin: 0 },
        spades: { wins: 0, streak: 0, lastWin: 0 }
    },
    totalGames: 0
};

// Bot names and avatars for variety
const botData = [
    { name: 'Bot Alice', avatar: '🤖' },
    { name: 'Bot Bob', avatar: '👾' },
    { name: 'Bot Charlie', avatar: '🎯' },
    { name: 'Bot Diana', avatar: '🎲' },
    { name: 'Bot Echo', avatar: '🎪' }
];

// Avatar selection
avatarOptions.forEach(option => {
    option.addEventListener('click', () => {
        avatarOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        selectedAvatar = option.dataset.avatar;
    });
});

// Set default avatar selection
avatarOptions[0].classList.add('selected');

// Join room
joinButton.addEventListener('click', () => {
    const roomId = roomIdInput.value;
    const playerName = playerNameInput.value || 'Anonymous';
    if (roomId && selectedAvatar) {
        socket.emit('joinRoom', { roomId, playerName, avatar: selectedAvatar });
    } else {
        alert('Please select an avatar and enter a room ID!');
    }
});

// Create room
createButton.addEventListener('click', () => {
    const playerName = playerNameInput.value || 'Anonymous';
    if (selectedAvatar) {
        socket.emit('createRoom', { playerName, avatar: selectedAvatar });
    } else {
        alert('Please select an avatar!');
    }
});

// Socket events
socket.on('roomJoined', (roomId, players, hostId) => {
    currentRoomId = roomId;
    localPlayers = players;
    isHost = socket.id === hostId;
    
    // Hide login popup and show game
    loginPopup.style.display = 'none';
    
    // Make sure main game area is visible
    const mainGameArea = document.getElementById('main-game-area');
    const gameTable = document.getElementById('game-table');
    mainGameArea.style.display = 'flex';
    gameTable.style.display = 'block';
    
    updatePlayers(players);
    setupTrack();
    setupCardDragging();
    
    // Initialize leaderboards
    updateLeaderboards();
    
    // Show betting popup to collect bets
    setTimeout(() => {
        showBettingPopup();
    }, 500); // Small delay to let game area render first
    
    if (isHost) {
        // Show host controls
        dragInstruction.style.display = 'block';
        addBotButton.style.display = 'inline-block';
        resetGameButton.style.display = 'inline-block';
    } else {
        dragInstruction.style.display = 'none';
        addBotButton.style.display = 'none';
        resetGameButton.style.display = 'none';
    }
});

socket.on('roomCreated', (roomId) => {
    roomIdInput.value = roomId;
    // Auto join
    const playerName = playerNameInput.value || 'Anonymous';
    socket.emit('joinRoom', { roomId, playerName, avatar: selectedAvatar });
});

socket.on('playerJoined', (players) => {
    localPlayers = players;
    updatePlayers(players);
});

socket.on('gameStart', () => {
    gameInProgress = true;
    results.innerHTML = '';
    drawnCards.innerHTML = '';
    bettingPopup.style.display = 'none';
    
    // Reset horse positions with animation
    suits.forEach(suit => {
        const horse = document.getElementById(`horse-${suit}`);
        gsap.set(horse, { left: '10px' });
    });
});

socket.on('cardDrawn', (cardData) => {
    animateCardDraw(cardData);
});

socket.on('gameEnd', (winner) => {
    gameInProgress = false;
    
    // Update game statistics
    updateGameStats(winner);
    
    // Animate results
    results.innerHTML = `<h2>🏆 ${suitSymbols[winner]} ${winner.toUpperCase()} WINS! 🏆</h2>`;
    const winners = localPlayers.filter(p => p.betSuit === winner);
    const losers = localPlayers.filter(p => p.betSuit !== winner && p.betSuit !== null);
    
    if (winners.length > 0) {
        results.innerHTML += `<p>🎉 Winners: ${winners.map(p => `${p.avatar} ${p.name}`).join(', ')}</p>`;
    }
    if (losers.length > 0) {
        results.innerHTML += `<p>🍺 Drink up: ${losers.map(p => `${p.avatar} ${p.name} (${p.betAmount} drinks)`).join(', ')}</p>`;
    }
    
    gsap.from(results, { scale: 0, duration: 0.8, ease: "back.out(1.7)" });
    
    // Update leaderboards
    updateLeaderboards();
    
    // Show betting popup for next round after delay
    setTimeout(() => {
        if (isHost) {
            // Reset all bets for next round
            localPlayers.forEach(p => {
                p.betSuit = null;
                p.betAmount = 0;
            });
            updatePlayers(localPlayers);
            showBettingPopup();
        }
    }, 5000);
});

// Add bot button handler
addBotButton.addEventListener('click', () => {
    if (isHost && localPlayers.length < 6) {
        socket.emit('addBot');
    }
});

// Reset game button handler
resetGameButton.addEventListener('click', () => {
    if (isHost) {
        // Reset game state
        gameInProgress = false;
        results.innerHTML = '';
        drawnCards.innerHTML = '';
        currentCard.innerHTML = '';
        
        // Reset horse positions
        suits.forEach(suit => {
            const horse = document.getElementById(`horse-${suit}`);
            if (horse) {
                gsap.set(horse, { left: '10px' });
            }
        });
        
        // Reset all player bets
        localPlayers.forEach(p => {
            p.betSuit = null;
            p.betAmount = 0;
        });
        updatePlayers(localPlayers);
        
        // Show betting popup
        showBettingPopup();
    }
});

function updatePlayers(players) {
    playersDiv.innerHTML = '';
    players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.classList.add('player');
        if (player.isBot) {
            playerDiv.classList.add('bot');
        }
        
        // Add betting status classes
        if (player.betSuit) {
            playerDiv.classList.add('has-bet');
        } else {
            playerDiv.classList.add('no-bet');
        }
        
        const betDisplay = player.betSuit ? 
            `${suitSymbols[player.betSuit]} ${player.betSuit} - ${player.betAmount} drinks` : 
            'No bet';
        playerDiv.innerHTML = `
            <div class="avatar">${player.avatar}</div>
            <div>${player.name}</div>
            <div style="font-size: 0.7em; opacity: 0.8;">${betDisplay}</div>
        `;
        playersDiv.appendChild(playerDiv);
    });
    
    // Update betting status in popup if visible
    updateBetStatus();
}

// Popup functions
function showBettingPopup() {
    bettingPopup.style.display = 'flex';
    updateBetStatus();
    
    // Reset betting form
    suitButtons.forEach(btn => btn.classList.remove('selected'));
    betAmountInput.value = '';
    selectedSuit = null;
}

function updateBetStatus() {
    if (!betStatusList) return;
    
    betStatusList.innerHTML = '';
    let allPlayersHaveBet = true;
    
    localPlayers.forEach(player => {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'player-bet-status';
        
        if (player.betSuit) {
            statusDiv.classList.add('has-bet');
            statusDiv.innerHTML = `
                <span>${player.avatar} ${player.name}</span>
                <span>✅ ${suitSymbols[player.betSuit]} ${player.betAmount} drinks</span>
            `;
        } else {
            statusDiv.classList.add('no-bet');
            statusDiv.innerHTML = `
                <span>${player.avatar} ${player.name}</span>
                <span>❌ No bet</span>
            `;
            allPlayersHaveBet = false;
        }
        
        betStatusList.appendChild(statusDiv);
    });
    
    // Show start game button only if host and all players have bet
    if (isHost && allPlayersHaveBet && localPlayers.length > 0) {
        startGameContainer.style.display = 'block';
    } else {
        startGameContainer.style.display = 'none';
    }
}

// Suit button handlers
suitButtons.forEach(button => {
    button.addEventListener('click', () => {
        suitButtons.forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        selectedSuit = button.dataset.suit;
    });
});

// Place bet handler
placeBetButton.addEventListener('click', () => {
    const amount = betAmountInput.value;
    if (selectedSuit && amount && amount > 0) {
        socket.emit('placeBet', { suit: selectedSuit, amount: parseInt(amount) });
        
        // Close popup after placing bet
        bettingPopup.style.display = 'none';
        
        gsap.to(document.querySelector('.suit-button.selected'), { 
            scale: 1.1, duration: 0.2, yoyo: true, repeat: 1 
        });
    } else {
        alert('Please select a suit and enter a valid bet amount!');
    }
});

// Start game handler
startGameButton.addEventListener('click', () => {
    socket.emit('startGame');
});

function setupTrack() {
    raceTrack.innerHTML = '';
    
    // Create circular track with horses positioned around the perimeter
    suits.forEach((suit, index) => {
        const horse = document.createElement('div');
        horse.classList.add('horse', suit);
        horse.id = `horse-${suit}`;
        
        // Position horses around the circle (starting positions)
        const angle = (index * 90) - 90; // Start at top, go clockwise
        const radius = 120; // Distance from center
        const centerX = 200; // Half of track width
        const centerY = 150; // Half of track height
        
        const x = centerX + radius * Math.cos(angle * Math.PI / 180);
        const y = centerY + radius * Math.sin(angle * Math.PI / 180);
        
        horse.style.position = 'absolute';
        horse.style.left = `${x - 22.5}px`; // Center the horse (half width)
        horse.style.top = `${y - 32.5}px`; // Center the horse (half height)
        horse.dataset.angle = angle;
        horse.dataset.progress = 0;
        
        horse.innerHTML = `
            <div class="suit-symbol">${suitSymbols[suit]}</div>
            <div class="horse-icon">🐎</div>
        `;
        
        raceTrack.appendChild(horse);
    });
}

function moveHorse(suit) {
    const horse = document.getElementById(`horse-${suit}`);
    if (horse) {
        const currentProgress = parseInt(horse.dataset.progress) || 0;
        const newProgress = currentProgress + 1;
        horse.dataset.progress = newProgress;
        
        // Calculate new position around the circle
        const totalSteps = 13; // 13 cards to complete the circle
        const currentAngle = parseFloat(horse.dataset.angle) || 0;
        const newAngle = currentAngle + (360 / totalSteps);
        
        const radius = 120;
        const centerX = 200;
        const centerY = 150;
        
        const x = centerX + radius * Math.cos(newAngle * Math.PI / 180);
        const y = centerY + radius * Math.sin(newAngle * Math.PI / 180);
        
        horse.dataset.angle = newAngle;
        
        gsap.to(horse, {
            left: `${x - 22.5}px`,
            top: `${y - 32.5}px`,
            rotation: newAngle + 90, // Rotate horse to face direction of travel
            duration: 0.8,
            ease: "power2.out"
        });
        
        // Check if horse completed the circle (13 moves)
        if (newProgress >= totalSteps) {
            setTimeout(() => {
                results.innerHTML = `<h2>🏆 ${suit.toUpperCase()} WINS! 🏆</h2>`;
                gameInProgress = false;
                updateGameStats(suit);
                updateLeaderboards();
            }, 1000);
        }
    }
}

function setupCardDragging() {
    if (!isHost) return;
    
    let startX, startY;
    
    // Mouse events
    cardDeck.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    
    // Touch events for mobile
    cardDeck.addEventListener('touchstart', startDragTouch);
    document.addEventListener('touchmove', dragTouch);
    document.addEventListener('touchend', endDrag);
    
    function startDrag(e) {
        if (!isHost || !gameInProgress) return;
        isDragging = true;
        const rect = cardDeck.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        cardDeck.classList.add('dragging');
        e.preventDefault();
    }
    
    function startDragTouch(e) {
        if (!isHost || !gameInProgress) return;
        isDragging = true;
        const touch = e.touches[0];
        const rect = cardDeck.getBoundingClientRect();
        dragOffsetX = touch.clientX - rect.left;
        dragOffsetY = touch.clientY - rect.top;
        cardDeck.classList.add('dragging');
        e.preventDefault();
    }
    
    function drag(e) {
        if (!isDragging) return;
        cardDeck.style.position = 'fixed';
        cardDeck.style.left = (e.clientX - dragOffsetX) + 'px';
        cardDeck.style.top = (e.clientY - dragOffsetY) + 'px';
        cardDeck.style.zIndex = '1000';
        e.preventDefault();
    }
    
    function dragTouch(e) {
        if (!isDragging) return;
        const touch = e.touches[0];
        cardDeck.style.position = 'fixed';
        cardDeck.style.left = (touch.clientX - dragOffsetX) + 'px';
        cardDeck.style.top = (touch.clientY - dragOffsetY) + 'px';
        cardDeck.style.zIndex = '1000';
        e.preventDefault();
    }
    
    function endDrag(e) {
        if (!isDragging) return;
        isDragging = false;
        cardDeck.classList.remove('dragging');
        
        // Animate card back to original position, then deal
        gsap.to(cardDeck, {
            position: 'relative',
            left: '0px',
            top: '0px',
            zIndex: 'auto',
            duration: 0.5,
            ease: "back.out(1.7)",
            onComplete: () => {
                // Trigger card deal
                if (gameInProgress) {
                    socket.emit('dealCard');
                }
            }
        });
    }
}

function animateCardDraw(cardData) {
    // Show current card with flip animation
    currentCard.innerHTML = `<div style="color: ${suitColors[cardData.suit]}; font-size: 1.2em;">${cardData.rank}${suitSymbols[cardData.suit]}</div>`;
    gsap.fromTo(currentCard, 
        { rotationY: 90, scale: 0.8 }, 
        { rotationY: 0, scale: 1, duration: 0.5, ease: "back.out(1.7)" }
    );
    
    // Move the horse
    moveHorse(cardData.suit);
    
    // Add card to drawn cards pile
    setTimeout(() => {
        const drawnCard = document.createElement('div');
        drawnCard.className = 'drawn-card';
        drawnCard.innerHTML = `<div style="color: ${suitColors[cardData.suit]}; font-size: 0.6em;">${cardData.rank}${suitSymbols[cardData.suit]}</div>`;
        drawnCards.appendChild(drawnCard);
        gsap.from(drawnCard, { scale: 0, duration: 0.3 });
        
        // Clear current card after a moment
        setTimeout(() => {
            currentCard.innerHTML = '';
        }, 1000);
    }, 500);
}

// Statistics and leaderboard functions
function updateGameStats(winner) {
    gameStats.totalGames++;
    
    // Update horse stats
    gameStats.horses[winner].wins++;
    gameStats.horses[winner].lastWin = gameStats.totalGames;
    
    // Update streaks
    suits.forEach(suit => {
        if (suit === winner) {
            gameStats.horses[suit].streak++;
        } else {
            gameStats.horses[suit].streak = 0;
        }
    });
    
    // Update player stats
    localPlayers.forEach(player => {
        if (!gameStats.players[player.id]) {
            gameStats.players[player.id] = { 
                name: player.name, 
                avatar: player.avatar,
                totalDrinks: 0, 
                wins: 0, 
                losses: 0 
            };
        }
        
        if (player.betSuit === winner) {
            gameStats.players[player.id].wins++;
        } else if (player.betSuit) {
            gameStats.players[player.id].losses++;
            gameStats.players[player.id].totalDrinks += player.betAmount;
        }
    });
}

function updateLeaderboards() {
    updateBiggestLosers();
    updateTopWinners();
    updateHotHorses();
    updateHorseStats();
}

function updateBiggestLosers() {
    const sortedLosers = Object.values(gameStats.players)
        .filter(p => p.totalDrinks > 0)
        .sort((a, b) => b.totalDrinks - a.totalDrinks)
        .slice(0, 5);
    
    biggestLosers.innerHTML = '';
    sortedLosers.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        item.innerHTML = `
            <div class="player-info">
                <span>${player.avatar}</span>
                <span>${player.name}</span>
            </div>
            <span class="stat">${player.totalDrinks} 🍺</span>
        `;
        biggestLosers.appendChild(item);
    });
    
    if (sortedLosers.length === 0) {
        biggestLosers.innerHTML = '<div style="opacity: 0.6; font-style: italic;">No losers yet!</div>';
    }
}

function updateTopWinners() {
    const sortedWinners = Object.values(gameStats.players)
        .filter(p => p.wins > 0)
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 5);
    
    topWinners.innerHTML = '';
    sortedWinners.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        item.innerHTML = `
            <div class="player-info">
                <span>${player.avatar}</span>
                <span>${player.name}</span>
            </div>
            <span class="stat">${player.wins} 🏆</span>
        `;
        topWinners.appendChild(item);
    });
    
    if (sortedWinners.length === 0) {
        topWinners.innerHTML = '<div style="opacity: 0.6; font-style: italic;">No winners yet!</div>';
    }
}

function updateHotHorses() {
    const sortedHorses = Object.entries(gameStats.horses)
        .sort((a, b) => b[1].streak - a[1].streak)
        .slice(0, 4);
    
    hotHorses.innerHTML = '';
    sortedHorses.forEach(([suit, stats]) => {
        const item = document.createElement('div');
        item.className = 'hot-horse';
        item.innerHTML = `
            <div class="horse-name">
                <span style="color: ${suitColors[suit]}">${suitSymbols[suit]}</span>
                <span>${suit.toUpperCase()}</span>
                ${stats.streak > 2 ? '<span class="streak-indicator">HOT!</span>' : ''}
            </div>
            <span class="wins">${stats.streak} 🔥</span>
        `;
        hotHorses.appendChild(item);
    });
}

function updateHorseStats() {
    const sortedStats = Object.entries(gameStats.horses)
        .sort((a, b) => b[1].wins - a[1].wins);
    
    horseStats.innerHTML = '';
    sortedStats.forEach(([suit, stats]) => {
        const winPercentage = gameStats.totalGames > 0 ? 
            ((stats.wins / gameStats.totalGames) * 100).toFixed(1) : '0.0';
        
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        item.innerHTML = `
            <div class="player-info">
                <span style="color: ${suitColors[suit]}">${suitSymbols[suit]}</span>
                <span>${suit.charAt(0).toUpperCase() + suit.slice(1)}</span>
            </div>
            <span class="stat">${stats.wins}W (${winPercentage}%)</span>
        `;
        horseStats.appendChild(item);
    });
}
