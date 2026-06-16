# 🔌 Network Configuration Reference

## How the Game Connects Online

The client automatically detects and connects to the server based on where it's running.

### Automatic URL Detection (garden-3d/src/network.js)

```javascript
const getWsUrl = () => {
  // If we have a window (browser environment)
  if (typeof window !== 'undefined') {
    // Auto-detect HTTPS → WSS, HTTP → WS
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Auto-detect hostname and port
    const host = import.meta.env.VITE_WS_URL || 
                 `${protocol}//${window.location.hostname}:${window.location.port || (protocol === 'wss:' ? 443 : 80)}`;
    return host;
  }
  return 'ws://localhost:3000';
};
```

### How It Works

| Scenario | URL | Protocol | Example |
|----------|-----|----------|---------|
| **Local dev** | `http://localhost:5173` | WS | `ws://localhost:5173` |
| **Railway** | `https://garden-3d-xyz.railway.app` | WSS | `wss://garden-3d-xyz.railway.app` |
| **Custom domain** | `https://mydomain.com` | WSS | `wss://mydomain.com` |
| **Local network** | `http://192.168.1.100:3000` | WS | `ws://192.168.1.100:3000` |

## Environment Variables

### Development (.env.local)
```env
# Override server URL (if needed)
VITE_WS_URL=ws://localhost:3000
```

### Production (.env.production)
```env
# Usually not needed - auto-detection works
# Only set if client and server are on different domains
VITE_WS_URL=wss://your-deployed-server.com
```

## Server Configuration

### Server accepts connections from:
```javascript
// Listens on all interfaces by default
HOST=0.0.0.0          // Accept from anywhere
PORT=3000             // On this port
```

### Environment Variables
```bash
# Server
PORT=3000                    # Which port to listen on
HOST=0.0.0.0                # 0.0.0.0 = all interfaces
NODE_ENV=production         # 'development' or 'production'

# Client (Vite)
VITE_WS_URL=ws://server:3000  # Override auto-detection (optional)
```

## Deployment URL Patterns

### Railway.app
```
Client URL: https://garden-3d-xyz.railway.app
WebSocket:  wss://garden-3d-xyz.railway.app
→ Auto-detects and works!
```

### Render.com
```
Client URL: https://garden-3d.onrender.com
WebSocket:  wss://garden-3d.onrender.com
→ Auto-detects and works!
```

### Vercel (Client) + External Server
```
VITE_WS_URL=wss://your-server.com
→ Use environment variable to override
```

## Testing Connection

### Test WebSocket from Browser Console
```javascript
// Test connection
const ws = new WebSocket('ws://localhost:3000');
ws.onopen = () => console.log('✅ Connected');
ws.onerror = (err) => console.log('❌ Error:', err);
```

### Test Server Health Endpoint
```bash
# Local
curl http://localhost:3000/health

# Production
curl https://your-deployed-server.com/health
```

Expected response:
```json
{
  "status": "ok",
  "players": 5,
  "uptime": 3600.25
}
```

## Security

### HTTP vs HTTPS/WSS

| Protocol | Security | When to Use | Example |
|----------|----------|------------|---------|
| **WS** | ❌ Unencrypted | Local/testing only | `ws://localhost:3000` |
| **WSS** | ✅ Encrypted TLS | Production/online | `wss://game.example.com` |

All major deployment platforms (Railway, Render, Vercel) provide HTTPS/WSS automatically.

### CORS & Mixed Content

- ✅ Same domain: Always works
- ✅ Different domains with WSS: Works (HTTPS client → WSS server)
- ❌ Mixed: HTTPS client → WS server: Browser blocks (security)

Solution: Use WSS for all production deployments.

## Troubleshooting Connection Issues

### "WebSocket connection to ... failed"
```
Check:
1. Server is running: https://your-server.com/health
2. Protocol is correct (WSS for HTTPS, WS for HTTP)
3. Port is accessible from client
4. Firewall allows WebSocket connections
```

### "Mixed Content" Error
```
Error: Cannot connect to ws://... from https://...
Fix: Ensure server uses WSS for HTTPS clients
Railway/Render handle this automatically
```

### "Connection refused"
```
Check:
1. Server is deployed and running
2. URL is correct in browser (check console)
3. No typos in domain name
4. DNS resolution works (ping the domain)
```

### High Latency
```
Check:
1. Server region is close to your location
2. Network connection is stable
3. Server isn't overloaded (check /health endpoint)
4. Consider using a CDN for static assets
```

## Development vs Production

### Development (Local)
```bash
PORT=3000 npm run dev
# Accessible at: http://localhost:5173
# WebSocket: ws://localhost:5173 or ws://localhost:3000
# Can see console logs
```

### Production (Deployed)
```bash
NODE_ENV=production PORT=3000 node server.js
# Accessible at: https://your-domain.com
# WebSocket: wss://your-domain.com
# Errors logged but not visible to client
```

## For More Information

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment guide
- [ONLINE_QUICK_START.md](./ONLINE_QUICK_START.md) - 5-minute Railway setup
- [README.md](./README.md) - Project overview
