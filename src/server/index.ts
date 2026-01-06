/**
 * WebTerm Server - Main entry point
 * Serves client interface and handles WebSocket connections
 */

import * as http from 'http';
import { WebSocketServer } from 'ws';
import { AuthService } from './auth.js';
import { WebSocketHandler } from './websocket-handler.js';
import * as crypto from 'crypto';

// Configuration from environment
const PORT = parseInt(process.env.PORT || '3000', 10);
const AUTH_SECRET = process.env.AUTH_SECRET;
const TOKEN_EXPIRY = parseInt(process.env.TOKEN_EXPIRY || '3600', 10);

// Services
const authService = new AuthService(AUTH_SECRET, TOKEN_EXPIRY);
const wsHandler = new WebSocketHandler();

// Generate a token for demonstration
const { token: demoToken, expiresAt } = authService.generateToken();

// @ts-ignore - defined/replaced during build
const clientScript = typeof __CLIENT_SCRIPT__ !== 'undefined' ? __CLIENT_SCRIPT__ : '';
// @ts-ignore - defined/replaced during build
const clientCss = typeof __CLIENT_CSS__ !== 'undefined' ? __CLIENT_CSS__ : '';

// Client HTML template
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WebTerm</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🖥️</text></svg>">
  <style>
    /* xterm.css styles */
    ${clientCss}
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #1e1e1e; color: #d4d4d4; overflow: hidden; }
    #terminal-container { position: absolute; top: 0; left: 0; right: 0; bottom: 0; padding: 8px; }
    #terminal { width: 100%; height: 100%; }
    #drop-zone { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(33, 150, 243, 0.4); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; z-index: 1000; font-size: 24px; font-weight: bold; color: white; border: 4px dashed #2196f3; }
    #drop-zone.active { display: flex; }
    #status { position: fixed; top: 12px; right: 12px; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); padding: 6px 10px; border-radius: 6px; font-size: 11px; z-index: 999; font-weight: 500; border: 1px solid rgba(255,255,255,0.1); }
    #status.connected { color: #4caf50; }
    #status.disconnected { color: #f44336; }
    #status.connecting { color: #ff9800; }
  </style>
</head>
<body>
  <div id="status" class="connecting">Connecting...</div>
  <div id="terminal-container">
    <div id="terminal"></div>
  </div>
  <div id="drop-zone">📂 Drop files here to upload</div>
  <script>${clientScript}</script>
</body>
</html>`;

// HTTP server
const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url?.startsWith('/?')) {
        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache'
        });
        res.end(HTML_CONTENT);
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

// WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token || !authService.validateToken(token)) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
        const sessionId = crypto.randomBytes(8).toString('hex');
        wsHandler.handleConnection(ws, sessionId);
    });
});

// Start server
server.listen(PORT, () => {
    console.log('\x1b[32m%s\x1b[0m', '╔═══════════════════════════════════════════════════╗');
    console.log('\x1b[32m%s\x1b[0m', '║                    WebTerm                        ║');
    console.log('\x1b[32m%s\x1b[0m', '╚═══════════════════════════════════════════════════╝');
    console.log(`\r\n🚀 Server: http://localhost:${PORT}`);
    console.log(`🔑 Access: http://localhost:${PORT}/?token=${demoToken}`);
    console.log(`\r\n💡 Tip: Set AUTH_SECRET in .env to persist the session\r\n`);
});

const shutdown = () => {
    wsHandler.cleanup();
    server.close(() => process.exit(0));
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
