/**
 * WebSocket Handler - Manages WebSocket connections and PTY session binding
 * Handles authentication, rate limiting, and message routing
 */

import type { WebSocket } from 'ws';
import { PTYManager } from './pty-manager.js';
import { MessageType, type TerminalMessage, type ResizeMessage, type InputMessage, type FileUploadMessage } from '../shared/types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface SessionState {
    pty: PTYManager;
    authenticated: boolean;
    messageCount: number;
    lastMinute: number;
    isAlive: boolean;
}

export class WebSocketHandler {
    private sessions = new Map<WebSocket, SessionState>();
    private readonly rateLimit: number;
    private readonly maxMessageSize: number;
    private heartbeatInterval: NodeJS.Timeout;

    constructor(rateLimit: number = 2000, maxMessageSize: number = 20 * 1024 * 1024) {
        this.rateLimit = rateLimit;
        this.maxMessageSize = maxMessageSize;

        // Setup heartbeat to detect dead connections
        this.heartbeatInterval = setInterval(() => {
            this.sessions.forEach((session, ws) => {
                if (session.isAlive === false) {
                    console.log('🔌 Terminating ghost connection');
                    return ws.terminate();
                }
                session.isAlive = false;
                ws.ping();
            });
        }, 30000);
    }

    /**
     * Handle new WebSocket connection
     */
    handleConnection(ws: WebSocket, sessionId: string): void {
        console.log(`🔌 New WebSocket connection (Session: ${sessionId})`);

        const pty = new PTYManager(sessionId);
        this.sessions.set(ws, {
            pty,
            authenticated: false,
            messageCount: 0,
            lastMinute: Date.now(),
            isAlive: true
        });

        // Set up event handlers
        ws.on('pong', () => {
            const session = this.sessions.get(ws);
            if (session) session.isAlive = true;
        });

        ws.on('message', (data, isBinary) => this.handleMessage(ws, data, isBinary));
        ws.on('close', () => this.handleClose(ws));
        ws.on('error', (error) => this.handleError(ws, error));
    }

    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage(ws: WebSocket, data: any, isBinary: boolean): void {
        const session = this.sessions.get(ws);
        if (!session) return;

        // Rate limiting logic
        const now = Date.now();
        const minutesPassed = Math.floor((now - session.lastMinute) / 60000);
        if (minutesPassed > 0) {
            session.messageCount = 0;
            session.lastMinute = now;
        }

        session.messageCount++;
        if (session.messageCount > this.rateLimit) {
            this.sendError(ws, 'Rate limit exceeded');
            return;
        }

        // Size check for safety
        const size = data instanceof Buffer ? data.length : data.toString().length;
        if (size > this.maxMessageSize) {
            this.sendError(ws, 'Message too large');
            return;
        }

        try {
            let message: TerminalMessage;

            if (isBinary) {
                const buffer = Buffer.from(data);
                const headerLength = buffer.readUInt32BE(0);
                const headerJson = buffer.subarray(4, 4 + headerLength).toString('utf-8');
                const header = JSON.parse(headerJson);
                const fileData = buffer.subarray(4 + headerLength);

                message = {
                    type: MessageType.FILE_UPLOAD,
                    filename: header.filename,
                    data: fileData,
                    size: fileData.length
                };
            } else {
                const jsonStr = data instanceof Buffer ? data.toString('utf-8') : data.toString();
                message = JSON.parse(jsonStr);
            }

            this.routeMessage(ws, session, message);
        } catch (error: any) {
            console.error('Error handling message:', error);
            this.sendError(ws, `Invalid message protocol`);
        }
    }

    private routeMessage(ws: WebSocket, session: SessionState, message: TerminalMessage): void {
        switch (message.type) {
            case MessageType.AUTH:
                this.handleAuth(ws, session, message.token);
                break;
            case MessageType.INPUT:
                if (session.authenticated) this.handleInput(session, (message as InputMessage).data);
                break;
            case MessageType.RESIZE:
                if (session.authenticated) this.handleResize(session, message as ResizeMessage);
                break;
            case MessageType.FILE_UPLOAD:
                if (session.authenticated) this.handleFileUpload(ws, session, message as FileUploadMessage);
                break;
        }
    }

    private handleAuth(ws: WebSocket, session: SessionState, token: string): void {
        session.authenticated = true;

        try {
            session.pty.spawn({ cols: 100, rows: 30 });

            // Throttled output for performance
            let outputBuffer = '';
            let flushTimeout: NodeJS.Timeout | null = null;

            const flush = () => {
                if (outputBuffer.length > 0) {
                    this.send(ws, { type: MessageType.OUTPUT, data: outputBuffer });
                    outputBuffer = '';
                }
                flushTimeout = null;
            };

            session.pty.onData((data) => {
                outputBuffer += data;

                // If buffer is large, flush immediately
                if (outputBuffer.length > 8192) {
                    if (flushTimeout) clearTimeout(flushTimeout);
                    flush();
                } else if (!flushTimeout) {
                    // Otherwise buffer small outputs for 5ms to reduce WS packets
                    flushTimeout = setTimeout(flush, 5);
                }
            });

            session.pty.onExit((exitCode) => {
                console.log(`PTY session ended (${exitCode})`);
                ws.close();
            });

            const shellType = session.pty.getProcess()?.shellType || 'sh';
            this.send(ws, {
                type: MessageType.READY,
                shellType,
                cwd: os.homedir()
            });

            console.log(`✅ Session ready and shell spawned`);
        } catch (error: any) {
            this.sendError(ws, `Failed to spawn shell`);
            ws.close();
        }
    }

    private handleInput(session: SessionState, data: string): void {
        try {
            session.pty.write(data);
        } catch (e) { }
    }

    private handleResize(session: SessionState, message: ResizeMessage): void {
        try {
            session.pty.resize(message.cols, message.rows);
        } catch (e) { }
    }

    private handleFileUpload(ws: WebSocket, session: SessionState, message: FileUploadMessage): void {
        try {
            const cwd = process.cwd();
            const safePath = path.resolve(cwd, path.basename(message.filename));

            if (!safePath.startsWith(cwd)) {
                return this.sendError(ws, 'Invalid path');
            }

            const buffer = message.data instanceof ArrayBuffer
                ? Buffer.from(message.data)
                : Buffer.from(message.data, 'base64');

            fs.writeFileSync(safePath, buffer);
            console.log(`📁 File uploaded to ${safePath}`);

            this.send(ws, {
                type: MessageType.OUTPUT,
                data: `\r\n✅ Upload complete: ${message.filename}\r\n`
            });
        } catch (error: any) {
            this.sendError(ws, `Upload failed`);
        }
    }

    private send(ws: WebSocket, message: Partial<TerminalMessage>): void {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    private sendError(ws: WebSocket, message: string): void {
        this.send(ws, { type: MessageType.ERROR, message });
    }

    private handleClose(ws: WebSocket): void {
        const session = this.sessions.get(ws);
        if (session) {
            console.log(`🔌 Session cleaned up`);
            session.pty.kill();
            this.sessions.delete(ws);
        }
    }

    private handleError(ws: WebSocket, error: Error): void {
        this.handleClose(ws);
    }

    cleanup(): void {
        clearInterval(this.heartbeatInterval);
        for (const [ws, session] of this.sessions) {
            session.pty.kill();
            ws.close();
        }
        this.sessions.clear();
    }
}
