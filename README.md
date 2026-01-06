# WebTerm

Production-grade browser-based terminal with real PTY backend. Access a fully functional shell session through your browser with streaming I/O, file transfer, and complete TTY behavior.

## Features

- **Real PTY Backend**: Uses `node-pty` for authentic shell behavior
- **Full Shell Support**: Works with vim, nano, top, htop, and any terminal application
- **Auto Shell Detection**: Automatically detects and uses your default shell (bash/zsh)
- **File Transfer**: Drag & drop file upload support
- **Single File Deployment**: Entire application bundled into one executable JavaScript file
- **Security**: Token-based authentication with HMAC-SHA256
- **Performance**: WebSocket streaming with near-zero latency
- **Terminal Features**: Colors, cursor movement, tab completion, history, signals (CTRL+C, CTRL+Z)

## Requirements

- **Node.js**: v18+ (Required for runtime execution)
- **Bun**: Package manager & Build tool (Required for building)

## Installation

```bash
# Clone or navigate to the project directory
cd WebTerm

# Install dependencies using Bun
bun install
```

## Build

```bash
# Build the project (creates dist/server.js)
bun run build
```

## Run

```bash
# Start the server (uses Node.js)
bun run start

# Or run directly
node dist/server.js
```

The server will output a URL with an authentication token:

```
╔═══════════════════════════════════════════════════╗
║                    WebTerm                        ║
╚═══════════════════════════════════════════════════╝

🚀 Server running on http://localhost:3000

📋 Copy this URL to your browser:
   http://localhost:3000/?token=1234567890abcdef...

⏰ Token expires at: 1/6/2026, 7:50:31 AM

💡 Tip: Set AUTH_SECRET environment variable to persist tokens
```

Open the URL in your browser to access the terminal.

## Configuration

Create a `.env` file (use `.env.example` as template):

```bash
# Authentication secret (auto-generated if not set)
AUTH_SECRET=your-random-secret-key-here

# Server port (default: 3000)
PORT=3000

# Token expiry in seconds (default: 3600 = 1 hour)
TOKEN_EXPIRY=3600
```

## Usage

### Basic Terminal

Once connected, you have a full interactive shell:

```bash
# Run any command
ls -la
echo "Hello from WebTerm"

# Start interactive applications
vim myfile.txt
nano config.ini
top
htop
```

### File Upload

Simply drag and drop files from your desktop into the browser window. Files will be uploaded to the current working directory.

### Keyboard Shortcuts

All standard terminal shortcuts work:
- `CTRL+C` - Interrupt current process
- `CTRL+Z` - Suspend current process
- `CTRL+D` - End of file / logout
- `TAB` - Auto-completion
- `↑/↓` - Command history

## Security Notes

- **No Root Access**: Runs under current user permissions only
- **No Sudo**: Cannot execute privileged commands
- **Token Authentication**: All connections require valid HMAC token
- **Rate Limiting**: 1000 messages per minute per session
- **Auto Cleanup**: PTY processes cleaned up on disconnect

## Architecture

```
WebTerm
├── Client (Browser)
│   ├── xterm.js - Terminal rendering
│   ├── WebSocket client - Communication
│   └── File upload handler
│
├── WebSocket Server
│   ├── Authentication
│   ├── Rate limiting
│   └── Message routing
│
└── PTY Manager
    ├── Shell detection
    ├── Process spawning
    └── TTY management
```

## Troubleshooting

### "No authentication token provided"

Add the token parameter to the URL: `http://localhost:3000/?token=YOUR_TOKEN`

### Terminal doesn't resize properly

Try refreshing the browser window. The terminal should auto-fit on load.

### Colors not showing

Ensure your shell config files are properly sourced. WebTerm uses `xterm-256color` terminal type.

### File upload not working

Check browser console for errors. Ensure files are not too large (10MB limit).

## Development

```bash
# Build and run in development mode
bun run dev

# This will:
# 1. Build the project
# 2. Start the server
```

## License

MIT

## Technical Details

- **Frontend**: xterm.js with WebGL acceleration
- **Backend**: Node.js with node-pty
- **Transport**: WebSocket (no polling)
- **Bundler**: esbuild
- **Package Manager**: Bun
- **Language**: TypeScript (strict mode)
