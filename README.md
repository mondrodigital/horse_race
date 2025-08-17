# 🏇 Horse Card Race - Online Multiplayer Game

A real-time multiplayer card game where players bet on horse races! Built with Node.js, Express, Socket.io, and GSAP animations.

## 🎮 How to Play

1. **Create or Join a Room**: Enter your name, choose an avatar, and create/join a game room
2. **Place Your Bets**: Choose a suit (Hearts ♥️, Diamonds ♦️, Clubs ♣️, or Spades ♠️) and bet drinks
3. **Watch the Race**: Host deals cards, and horses advance based on the suit drawn
4. **First to Cross Wins**: First horse to reach position 10 wins the race!
5. **Drink Up**: Losers drink their bet amount, winners celebrate! 🎉

## 🚀 Features

- **Real-time Multiplayer**: Play with friends using room codes
- **Authentic Card Simulation**: Proper 48-card deck with Fisher-Yates shuffle
- **Player Rankings**: Live leaderboard tracking wins and losses
- **Host Controls**: Game creator controls the pace by dealing cards
- **Bot Players**: Add AI players for testing or filling empty seats
- **Responsive Design**: Works on desktop and mobile devices
- **Professional UI**: Casino-themed interface with smooth animations

## 🛠 Tech Stack

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Animations**: GSAP (GreenSock)
- **Deployment**: Vercel

## 📦 Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Run locally: `npm start`
4. Open `http://localhost:3000`

## 🌐 Deployment

This game is configured for easy deployment on Vercel:

1. Push code to GitHub repository
2. Connect Vercel to your GitHub account
3. Import the project and deploy
4. Share the live URL with friends!

## 🎯 Game Rules

- Each suit has 12 cards in the deck (no Aces - they're the horses!)
- Players bet on which suit will win the race
- Cards are drawn randomly from a shuffled deck
- First horse to position 10 crosses the finish line and wins
- Winners celebrate, losers drink their bet amount

## 👥 Multiplayer Features

- **Room System**: Private rooms with shareable codes
- **Real-time Updates**: All players see moves instantly
- **Player Ranking**: Track performance across multiple games
- **Host Powers**: Game creator controls start, reset, and card dealing
- **Flexible Players**: 2-10 players per room

Enjoy the races! 🏁🎰🥂
