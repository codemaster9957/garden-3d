# 🌱 Garden Bloom 3D - Online Deployment Guide

## Overview
This guide covers how to deploy the Garden 3D server online so anyone can access it.

---

## 🚀 Quick Start (Recommended: Railway.app)

Railway is the easiest option for deploying Node.js apps with free tiers.

### Step 1: Set Up Railway Account
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your garden-3d repository

### Step 2: Configure Environment
In Railway dashboard:
- Go to Variables
- Add these variables:
  ```
  PORT=3000
  HOST=0.0.0.0
  NODE_ENV=production
  ```

### Step 3: Verify Deployment
- Railway will automatically build and deploy
- You'll get a domain like: `garden-3d-production.up.railway.app`
- WebSocket URL will be: `wss://garden-3d-production.up.railway.app`

### Step 4: Update Client
In your client code, update the WebSocket URL:

**Option A: Build-time (Recommended)**
```bash
# Before building the client
export VITE_WS_URL=wss://garden-3d-production.up.railway.app
npm run build
```

**Option B: Runtime**
- Update `garden-3d/src/network.js` directly with your production URL

---

## 📋 Full Deployment Options

### **1. Railway.app (★ Easiest)**
- Free tier: 5GB disk, limited hours/month
- HTTPS + WSS automatic
- One-click deployment
- Dashboard for monitoring

**Deploy:**
```bash
npm install -g railway
railway link
railway up
```

---

### **2. Render.com**
- Free tier available
- Auto HTTPS/WSS
- Easy GitHub integration

**Steps:**
1. Go to https://render.com
2. New → Web Service → Connect GitHub
3. Set build command: (leave empty, uses package.json)
4. Set start command: `node server/server.js`
5. Add environment variables

---

### **3. Heroku (Paid after credits)**
```bash
heroku create garden-3d
heroku config:set NODE_ENV=production
git push heroku main
```

---

### **4. AWS / DigitalOcean / Linode**
More complex but full control:
1. Create EC2/Droplet with Node.js
2. Clone repo, install dependencies
3. Use PM2 for process management
4. Set up Nginx as reverse proxy
5. Use Let's Encrypt for HTTPS

---

## 🔒 Security for Online

### **Use WSS (Secure WebSocket)**
HTTPS/WSS is required for production. All deployment platforms above handle this automatically.

The client automatically detects:
```javascript
// Automatic protocol detection
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
```

### **Add Rate Limiting (Optional)**
```javascript
// In server/server.js, add before WebSocket server:
const rateLimit = require('express-rate-limit');

app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));
```

---

## 🌐 Local Network Access (Testing)

Before deploying online, test locally on your network:

### **On Server:**
```bash
HOST=0.0.0.0 PORT=3000 node server/server.js
```

### **On Client Machine (same network):**
Find your server machine's IP:
- **Windows**: `ipconfig` → look for IPv4 Address (e.g., 192.168.1.100)
- **Mac/Linux**: `ifconfig` → look for inet address

Then update client:
```javascript
// In network.js or .env
VITE_WS_URL=ws://192.168.1.100:3000
```

---

## 📝 Environment Variables Reference

### **Server (.env or deployment platform)**
```
PORT=3000                    # Port to listen on
HOST=0.0.0.0                # 0.0.0.0 means accessible from network
NODE_ENV=production         # 'development' or 'production'
```

### **Client (Vite, .env.local)**
```
VITE_WS_URL=wss://your-domain.com   # WebSocket URL for production
```

---

## 🔧 Deploy Step-by-Step (Railway)

```bash
# 1. Ensure you have the repo on GitHub
git init
git add .
git commit -m "Initial commit"
git push -u origin main

# 2. Install Railway CLI
npm install -g railway

# 3. Link your Railway project
railway link

# 4. Deploy
railway up

# 5. Get your public URL
railway domain

# 6. Update client with new URL
echo "VITE_WS_URL=wss://your-railway-domain.com" > garden-3d/.env.local

# 7. Rebuild and redeploy client
cd garden-3d
npm run build

# 8. Done! 🎉
```

---

## 🐛 Troubleshooting

### **"Connection refused" or "WebSocket is closed"**
- Check your deployed server URL is correct
- Verify server is running: `https://your-domain.com/health`
- Check firewall/port settings

### **"Mixed Content" error**
- You're loading HTTP client on HTTPS site
- Must use WSS for secure clients, WS for non-secure
- The auto-detection in network.js should handle this

### **Blank screen or stuck connecting**
- Open browser DevTools (F12) → Console
- Check for errors
- Verify `VITE_WS_URL` environment variable

### **High latency**
- Use a deployment region close to users
- Consider CDN for static assets
- Check network.js for connection issues

---

## ✅ Testing Your Deployment

1. **Local test:** Open `http://localhost:3000/health` → should show `{"status":"ok",...}`

2. **Network test:** Open `http://[your-ip]:3000/health` from another device

3. **Online test:** Deploy, visit your domain, check browser console for WebSocket connection

4. **Multi-player test:** Open from multiple tabs/devices, see other players appear

---

## 📊 Monitoring & Logs

**Railway Dashboard:**
- Real-time logs of server
- CPU/Memory usage
- Deployment history

**Local monitoring:**
```bash
# View server logs
tail -f server-logs.txt

# Monitor with PM2 (recommended for production)
npm install -g pm2
pm2 start server/server.js --name "garden-3d"
pm2 logs garden-3d
```

---

## 🎯 What's Next?

1. ✅ Deploy server online
2. ✅ Update client to point to deployed server
3. ✅ Test with multiple players
4. ⬜ Add user authentication (optional)
5. ⬜ Add database for persistence (optional)
6. ⬜ Add Discord webhook notifications (optional)

Questions? Check your deployment platform's docs!
