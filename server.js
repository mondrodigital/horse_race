const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Socket.io logic will go here

const rooms = {}; // { roomId: { players: [], positions: {hearts:0, diamonds:0, clubs:0, spades:0}, deck: [], currentDraw: 0, host: socketId } }

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('createRoom', (playerData) => {
    const roomId = Math.random().toString(36).substring(7);
    rooms[roomId] = { players: [], positions: initPositions(), deck: [], host: socket.id, gameInProgress: false };
    socket.join(roomId);
    addPlayer(socket, roomId, playerData);
    socket.emit('roomCreated', roomId);
  });

  socket.on('joinRoom', (data) => {
    const { roomId } = data;
    if (rooms[roomId]) {
      // Check if player already exists in this room
      const existingPlayer = rooms[roomId].players.find(p => p.id === socket.id);
      if (!existingPlayer) {
        socket.join(roomId);
        addPlayer(socket, roomId, data);
      }
      io.to(roomId).emit('playerJoined', rooms[roomId].players);
      socket.emit('roomJoined', roomId, rooms[roomId].players, rooms[roomId].host);
    } else {
      socket.emit('error', 'Room not found');
    }
  });

  socket.on('placeBet', ({ suit, amount }) => {
    const roomId = getRoomId(socket);
    if (roomId && rooms[roomId]) {
      const player = rooms[roomId].players.find(p => p.id === socket.id);
      if (player) {
        player.betSuit = suit;
        player.betAmount = amount;
        io.to(roomId).emit('betPlaced', rooms[roomId].players); // Update with bet placed event
        io.to(roomId).emit('playerJoined', rooms[roomId].players); // Also update players
      }
    }
  });

  socket.on('startGame', () => {
    const roomId = getRoomId(socket);
    if (roomId && rooms[roomId] && rooms[roomId].host === socket.id) {
      startRace(roomId);
    }
  });

  socket.on('resetGame', () => {
    const roomId = getRoomId(socket);
    if (roomId && rooms[roomId] && rooms[roomId].host === socket.id) {
      resetGame(roomId);
    }
  });

  socket.on('gameWon', (winner) => {
    const roomId = getRoomId(socket);
    if (roomId && rooms[roomId] && rooms[roomId].host === socket.id) {
      rooms[roomId].gameInProgress = false;
      io.to(roomId).emit('gameEnded', winner);
    }
  });

  socket.on('addBot', () => {
    const roomId = getRoomId(socket);
    if (roomId && rooms[roomId] && rooms[roomId].host === socket.id && rooms[roomId].players.length < 6) {
      addBot(roomId);
    }
  });

  socket.on('dealCard', () => {
    const roomId = getRoomId(socket);
    if (roomId && rooms[roomId] && rooms[roomId].host === socket.id && rooms[roomId].gameInProgress) {
      dealNextCard(roomId);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
    const roomId = getRoomId(socket);
    if (roomId && rooms[roomId]) {
      // Remove player from room
      const playerIndex = rooms[roomId].players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        rooms[roomId].players.splice(playerIndex, 1);
        io.to(roomId).emit('playerJoined', rooms[roomId].players);
      }
      
      // If host disconnects, assign new host
      if (rooms[roomId].host === socket.id && rooms[roomId].players.length > 0) {
        rooms[roomId].host = rooms[roomId].players[0].id;
      }
      
      // Delete room if empty
      if (rooms[roomId].players.length === 0) {
        delete rooms[roomId];
      }
    }
  });
});

function addPlayer(socket, roomId, playerData = {}) {
  // Check if player already exists to prevent duplicates
  const existingPlayerIndex = rooms[roomId].players.findIndex(p => p.id === socket.id);
  
  if (existingPlayerIndex !== -1) {
    // Update existing player data
    rooms[roomId].players[existingPlayerIndex].name = playerData.name || playerData.playerName || rooms[roomId].players[existingPlayerIndex].name;
    rooms[roomId].players[existingPlayerIndex].avatar = playerData.avatar || rooms[roomId].players[existingPlayerIndex].avatar;
  } else {
    // Add new player
    const player = {
      id: socket.id, 
      name: playerData.name || playerData.playerName || `Player ${rooms[roomId].players.length + 1}`, 
      avatar: playerData.avatar || '🧑‍💼',
      betSuit: null, 
      betAmount: 0,
      isBot: false
    };
    rooms[roomId].players.push(player);
  }
}

function addBot(roomId) {
  const botNames = ['Bot Alice', 'Bot Bob', 'Bot Charlie', 'Bot Diana', 'Bot Echo'];
  const botAvatars = ['🤖', '👾', '🎯', '🎲', '🎪'];
  const existingBots = rooms[roomId].players.filter(p => p.isBot).length;
  
  const bot = {
    id: `bot_${Date.now()}`,
    name: botNames[existingBots % botNames.length],
    avatar: botAvatars[existingBots % botAvatars.length],
    betSuit: null,
    betAmount: 0,
    isBot: true
  };
  
  rooms[roomId].players.push(bot);
  io.to(roomId).emit('playerJoined', rooms[roomId].players);
  
  // Auto-bet for bot after a short delay
  setTimeout(() => {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    bot.betSuit = suits[Math.floor(Math.random() * suits.length)];
    bot.betAmount = Math.floor(Math.random() * 5) + 1; // 1-5 drinks
    io.to(roomId).emit('betPlaced', rooms[roomId].players);
    io.to(roomId).emit('playerJoined', rooms[roomId].players);
  }, 1000);
}

function initPositions() {
  return { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
}

function getRoomId(socket) {
  return Array.from(socket.rooms)[1]; // First is socket.id, second is room
}

function generateDeck() {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K']; // No Aces
  const deck = [];
  for (let suit of suits) {
    for (let rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  return shuffle(deck);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function startRace(roomId) {
  const room = rooms[roomId];
  room.positions = initPositions();
  room.deck = generateDeck();
  room.currentDraw = 0;
  room.gameInProgress = true;
  io.to(roomId).emit('gameStarted'); // Match frontend event name
}

function resetGame(roomId) {
  const room = rooms[roomId];
  room.positions = initPositions();
  room.deck = [];
  room.currentDraw = 0;
  room.gameInProgress = false;
  
  // Reset all player bets
  room.players.forEach(player => {
    if (!player.isBot) {
      player.betSuit = null;
      player.betAmount = 0;
    }
  });
  
  io.to(roomId).emit('gameReset');
  io.to(roomId).emit('playerJoined', room.players);
}

function dealNextCard(roomId) {
  const room = rooms[roomId];
  if (!room.gameInProgress || room.currentDraw >= room.deck.length) return;
  
  const card = room.deck[room.currentDraw];
  room.positions[card.suit]++;
  
  // Send full card data including rank and suit
  io.to(roomId).emit('cardDrawn', card);
  room.currentDraw++;

  if (Object.values(room.positions).some(pos => pos >= 10)) {
    const winner = Object.keys(room.positions).find(suit => room.positions[suit] >= 10);
    room.gameInProgress = false;
    io.to(roomId).emit('gameEnded', winner); // Match frontend event name
  } else if (room.currentDraw >= room.deck.length) {
    // If deck runs out, pick random winner
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const winner = suits[Math.floor(Math.random() * suits.length)];
    room.gameInProgress = false;
    io.to(roomId).emit('gameEnded', winner); // Match frontend event name
  }
}
