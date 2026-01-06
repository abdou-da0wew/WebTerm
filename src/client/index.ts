/**
 * Client-side terminal application
 * Handles xterm.js initialization, WebSocket connection, and file handling
 */

import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { MessageType, type TerminalMessage } from '../shared/types';

class WebTermClient {
    private terminal: Terminal;
    private fitAddon: FitAddon;
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private readonly maxReconnectAttempts = 5;

    constructor() {
        // Initialize terminal with optimized settings
        this.terminal = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            // Optimized font stack for icons and nerd fonts
            fontFamily: '"FiraCode NF", "Fira Code", "SauceCodePro Nerd Font", "Source Code Pro", Menlo, Monaco, "Courier New", monospace',
            theme: {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
                cursor: '#d4d4d4',
                black: '#000000',
                red: '#cd3131',
                green: '#0dbc79',
                yellow: '#e5e510',
                blue: '#2472c8',
                magenta: '#bc3fbc',
                cyan: '#11a8cd',
                white: '#e5e5e5',
                brightBlack: '#666666',
                brightRed: '#f14c4c',
                brightGreen: '#23d18b',
                brightYellow: '#f5f543',
                brightBlue: '#3b8eea',
                brightMagenta: '#d670d6',
                brightCyan: '#29b8db',
                brightWhite: '#e5e5e5'
            },
            allowProposedApi: true,
            scrollback: 10000, // Large scrollback limit
            drawBoldTextInBrightColors: true
        });

        // Add regular addons
        this.fitAddon = new FitAddon();
        this.terminal.loadAddon(this.fitAddon);
        this.terminal.loadAddon(new WebLinksAddon());

        // Add Unicode support for emojis and icons
        const unicode11Addon = new Unicode11Addon();
        this.terminal.loadAddon(unicode11Addon);
        this.terminal.unicode.activeVersion = '11';

        // Try to load WebGL addon for performance (fallback to canvas if fails)
        try {
            this.terminal.loadAddon(new WebglAddon());
        } catch (e) {
            console.warn('WebGL addon failed to load, using canvas renderer');
        }
    }

    /**
     * Initialize the terminal application
     */
    async init(): Promise<void> {
        const container = document.getElementById('terminal');
        if (!container) throw new Error('Terminal container not found');

        this.terminal.open(container);

        // Initial fit
        requestAnimationFrame(() => {
            this.fitAddon.fit();
            this.sendResize();
        });

        // Optimized resize handling with debounce
        let resizeTimeout: any;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.fitAddon.fit();
                this.sendResize();
            }, 100);
        });

        // Handle terminal input
        this.terminal.onData((data) => {
            this.send({ type: MessageType.INPUT, data });
        });

        // Set up file upload
        this.setupFileUpload();

        // Connect WebSocket
        this.connect();
    }

    /**
     * Connect to WebSocket server
     */
    private connect(): void {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = new URL(window.location.href);
        const token = url.searchParams.get('token');

        if (!token) {
            this.updateStatus('disconnected');
            this.terminal.writeln('\x1b[1;31mError: No authentication token provided\x1b[0m');
            return;
        }

        const wsUrl = `${protocol}//${window.location.host}${window.location.pathname}?token=${token}`;

        this.updateStatus('connecting');
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            this.updateStatus('connected');
            this.reconnectAttempts = 0;
            this.send({ type: MessageType.AUTH, token });
            this.fitAddon.fit();
            this.sendResize();
        };

        this.ws.onmessage = (event) => {
            this.handleMessage(event.data);
        };

        this.ws.onclose = () => {
            this.updateStatus('disconnected');
            this.ws = null;

            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                setTimeout(() => {
                    this.terminal.writeln(`\r\n\x1b[1;33mReconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...\x1b[0m`);
                    this.connect();
                }, 1000 * this.reconnectAttempts);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    private handleMessage(data: any): void {
        try {
            // Handle binary data from server if any
            if (data instanceof ArrayBuffer || data instanceof Blob) {
                return; // Not expecting binary from server yet
            }

            const message: TerminalMessage = JSON.parse(data);

            switch (message.type) {
                case MessageType.OUTPUT:
                    if (typeof message.data === 'string') {
                        this.terminal.write(message.data);
                    }
                    break;
                case MessageType.READY:
                    console.log('Terminal ready');
                    break;
                case MessageType.ERROR:
                    this.terminal.writeln(`\r\n\x1b[1;31mError: ${message.message}\x1b[0m`);
                    break;
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    private send(message: Partial<TerminalMessage>): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    private sendResize(): void {
        this.send({
            type: MessageType.RESIZE,
            cols: this.terminal.cols,
            rows: this.terminal.rows
        });
    }

    private setupFileUpload(): void {
        const dropZone = document.getElementById('drop-zone');
        if (!dropZone) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.body.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        document.body.addEventListener('dragenter', () => dropZone.classList.add('active'));
        dropZone.addEventListener('dragleave', (e) => {
            if (e.target === dropZone) dropZone.classList.remove('active');
        });

        document.body.addEventListener('drop', async (e) => {
            dropZone.classList.remove('active');
            const files = e.dataTransfer?.files;
            if (!files || files.length === 0) return;

            for (let i = 0; i < files.length; i++) {
                await this.uploadFile(files[i]);
            }
        });
    }

    private async uploadFile(file: File): Promise<void> {
        this.terminal.writeln(`\r\n📤 Uploading ${file.name}...`);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const header = JSON.stringify({ filename: file.name, size: file.size });
            const headerBuffer = new TextEncoder().encode(header);
            const headerLength = headerBuffer.length;

            const message = new Uint8Array(4 + headerLength + arrayBuffer.byteLength);
            const view = new DataView(message.buffer);
            view.setUint32(0, headerLength, false);
            message.set(headerBuffer, 4);
            message.set(new Uint8Array(arrayBuffer), 4 + headerLength);

            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(message);
            }
        } catch (error) {
            this.terminal.writeln(`\x1b[1;31m❌ Upload failed: ${error}\x1b[0m`);
        }
    }

    private updateStatus(status: 'connected' | 'disconnected' | 'connecting'): void {
        const statusEl = document.getElementById('status');
        if (!statusEl) return;
        statusEl.className = status;
        const statusMap = {
            connected: '🟢 Connected',
            disconnected: '🔴 Disconnected',
            connecting: '🟡 Connecting...'
        };
        statusEl.textContent = statusMap[status];
    }
}

// Singleton instance
const client = new WebTermClient();
window.onload = () => client.init();
