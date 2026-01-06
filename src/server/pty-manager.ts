/**
 * PTY Manager - Handles shell process lifecycle
 * Creates real interactive shells with full TTY support
 */

import * as os from 'os';
import * as fs from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import type { PTYConfig } from '../shared/types.js';

// Handle bundled environment
let pty: any;
try {
    const require = createRequire(import.meta.url);
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // If running from bundle, we might have an embedded binary
    // @ts-ignore - defined during build
    if (typeof __PTY_BINARY__ !== 'undefined') {
        const ptyPath = path.join(__dirname, 'pty.node');
        if (!fs.existsSync(ptyPath)) {
            fs.writeFileSync(ptyPath, Buffer.from(__PTY_BINARY__, 'base64'));
        }
    }

    pty = require('node-pty');
} catch (error) {
    console.error('Failed to load node-pty:', error);
}

export class PTYManager {
    private ptyProcess: pty.IPty | null = null;
    private readonly sessionId: string;

    constructor(sessionId: string) {
        this.sessionId = sessionId;
    }

    /**
     * Detect user's default shell
     */
    private detectShell(): string {
        // Try to get shell from /etc/passwd
        try {
            const username = os.userInfo().username;
            const passwdContent = fs.readFileSync('/etc/passwd', 'utf-8');
            const userLine = passwdContent.split('\n').find(line => line.startsWith(`${username}:`));

            if (userLine) {
                const shell = userLine.split(':').pop()?.trim();
                if (shell && fs.existsSync(shell)) {
                    return shell;
                }
            }
        } catch (error) {
            console.warn('Could not read /etc/passwd:', error);
        }

        // Fallback chain
        const fallbacks = [
            process.env.SHELL,
            '/bin/zsh',
            '/bin/bash',
            '/bin/sh'
        ];

        for (const shell of fallbacks) {
            if (shell && fs.existsSync(shell)) {
                return shell;
            }
        }

        return '/bin/sh'; // Last resort
    }

    /**
     * Spawn a new PTY process
     */
    spawn(config?: Partial<PTYConfig>): void {
        const shell = config?.shell || this.detectShell();
        const cwd = config?.cwd || os.homedir();
        const cols = config?.cols || 80;
        const rows = config?.rows || 24;

        // Build environment with proper shell config
        const env = {
            ...process.env,
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
            HOME: os.homedir(),
            USER: os.userInfo().username,
            SHELL: shell,
            LANG: process.env.LANG || 'en_US.UTF-8',
            ...config?.env
        };

        console.log(`🐚 Spawning shell: ${shell}`);
        console.log(`📁 Working directory: ${cwd}`);
        console.log(`📏 Size: ${cols}x${rows}`);

        try {
            this.ptyProcess = pty.spawn(shell, [], {
                name: 'xterm-256color',
                cols,
                rows,
                cwd,
                env: env as { [key: string]: string },
                // Use login shell to source config files
                handleFlowControl: true
            });

            console.log(`✅ PTY spawned successfully (PID: ${this.ptyProcess.pid})`);
        } catch (error) {
            console.error('❌ Failed to spawn PTY:', error);
            throw error;
        }
    }

    /**
     * Write data to PTY (user input)
     */
    write(data: string): void {
        if (!this.ptyProcess) {
            throw new Error('PTY not spawned');
        }
        this.ptyProcess.write(data);
    }

    /**
     * Resize PTY
     */
    resize(cols: number, rows: number): void {
        if (!this.ptyProcess) {
            throw new Error('PTY not spawned');
        }

        try {
            this.ptyProcess.resize(cols, rows);
            console.log(`📏 Resized PTY to ${cols}x${rows}`);
        } catch (error) {
            console.error('Failed to resize PTY:', error);
        }
    }

    /**
     * Register data handler (output from shell)
     */
    onData(callback: (data: string) => void): void {
        if (!this.ptyProcess) {
            throw new Error('PTY not spawned');
        }
        this.ptyProcess.onData(callback);
    }

    /**
     * Register exit handler
     */
    onExit(callback: (exitCode: number, signal?: number) => void): void {
        if (!this.ptyProcess) {
            throw new Error('PTY not spawned');
        }
        this.ptyProcess.onExit((event) => {
            callback(event.exitCode, event.signal);
        });
    }

    /**
     * Kill PTY process
     */
    kill(signal?: string): void {
        if (this.ptyProcess) {
            console.log(`🔪 Killing PTY (PID: ${this.ptyProcess.pid})`);
            try {
                this.ptyProcess.kill(signal);
                this.ptyProcess = null;
            } catch (error) {
                console.error('Error killing PTY:', error);
            }
        }
    }

    /**
     * Get PTY process
     */
    getProcess(): pty.IPty | null {
        return this.ptyProcess;
    }

    /**
     * Check if PTY is active
     */
    isAlive(): boolean {
        return this.ptyProcess !== null;
    }
}
