# 🌱 Garden Bloom 3D

A multiplayer gardening game built with Three.js and Node.js WebSocket.

## 🎮 Features

- **3D Gardens**: Grow your own vegetables in real-time
- **Multiplayer**: See and trade with other players online
- **Economy**: Buy seeds, sell crops, expand your garden
- **Progression**: Unlock larger gardens through expansion
- **Mutations**: Rare mutated crops worth 2x price

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies  
cd ../garden-3d
npm install
```

### Run Locally
```bash
# Terminal 1: Start server
cd server
npm run dev

# Terminal 2: Start client dev server
cd garden-3d
npm run dev
```

Then open `http://localhost:5173` in your browser.

## 🌐 Online Deployment

Want to play with friends online? See [ONLINE_QUICK_START.md](./ONLINE_QUICK_START.md) for the easiest way (5 minutes with Railway).

For detailed deployment guide, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 📂 Project Structure

```
garden-3d/
├── server/                 # Node.js WebSocket server
│   ├── server.js          # Main server with game logic
│   └── package.json
├── garden-3d/             # Vite + Three.js client
│   ├── src/
│   │   ├── main.js        # Entry point
│   │   ├── network.js     # WebSocket client
│   │   ├── garden.js      # 3D garden rendering
│   │   ├── scene.js       # Three.js scene setup
│   │   ├── player.js      # Player movement
│   │   ├── seeds.js       # Seed catalog
│   │   └── ui.js          # HUD and UI
│   ├── index.html
│   └── package.json
└── README.md
```

## 🎯 How to Play

### Controls
- **WASD**: Move around
- **1-9/0**: Select seed to plant
- **E**: Open shop or sell stand
- **Click on soil**: Plant selected seed or harvest
- **H**: Toggle harvest mode

### Gameplay
1. Start with 100 coins and 3 carrot seeds
2. Click a soil cell and press E to interact
3. Buy seeds from the shop using coins
4. Plant seeds in your garden
5. Wait for crops to grow (4 stages)
6. Harvest ready crops
7. Sell crops for coins
8. Expand your garden (buy at the expansion stand)

## 🔧 Server Architecture

- **Authoritative**: All game logic runs on server
- **Real-time**: WebSocket for instant updates
- **Stateful**: Player data persists during session
- **Multi-player**: Supports N concurrent players

### Game Systems
- **Shop**: Stock probability with chained rolls
- **Prices**: Dynamic market prices updated every 3 restocks
- **Growth**: Staged plant growth over time
- **Mutations**: 5% chance for 2x value crops
- **Expansion**: Unlock larger gardens (3x3 → 6x6)

## 🛠️ Development

### Build Client
```bash
cd garden-3d
npm run build   # Creates dist/ folder
```

### Run Production
```bash
# Server
NODE_ENV=production node server/server.js

# Client - open dist/index.html or serve with HTTP server
npx http-server garden-3d/dist
```

## 📊 Technologies

**Server:**
- Node.js
- WebSocket (ws library)
- Express (for health checks)

**Client:**
- Three.js (3D rendering)
- Vite (build tool)
- Vanilla JavaScript

## 📝 License

MIT

## 🤝 Contributing

Found a bug or have an idea? Let us know!

## 📞 Support

See deployment docs:
- [ONLINE_QUICK_START.md](./ONLINE_QUICK_START.md) - Deploy in 5 minutes
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment guide with all options
