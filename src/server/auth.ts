/**
 * Authentication module using HMAC-SHA256
 * Generates and validates time-limited tokens
 */

import crypto from 'crypto';

export class AuthService {
    private readonly secret: string;
    private readonly tokenExpiry: number;

    constructor(secret?: string, tokenExpiry: number = 3600) {
        this.secret = secret || crypto.randomBytes(32).toString('hex');
        this.tokenExpiry = tokenExpiry;

        if (!secret) {
            console.log('⚠️  No AUTH_SECRET provided, generated random secret');
            console.log(`   Set AUTH_SECRET=${this.secret} to persist tokens across restarts`);
        }
    }

    /**
     * Generate a new authentication token
     * @returns Token string and expiry timestamp
     */
    generateToken(): { token: string; expiresAt: number } {
        const timestamp = Date.now();
        const expiresAt = timestamp + (this.tokenExpiry * 1000);

        const payload = `${timestamp}:${expiresAt}`;
        const signature = this.createSignature(payload);
        const token = `${payload}:${signature}`;

        return { token, expiresAt };
    }

    /**
     * Validate a token
     * @param token Token string to validate
     * @returns true if valid and not expired
     */
    validateToken(token: string): boolean {
        try {
            const parts = token.split(':');
            if (parts.length !== 3) {
                return false;
            }

            const [timestamp, expiresAt, signature] = parts;
            const payload = `${timestamp}:${expiresAt}`;

            // Verify signature
            const expectedSignature = this.createSignature(payload);
            if (signature !== expectedSignature) {
                return false;
            }

            // Check expiry
            const expiryTime = parseInt(expiresAt, 10);
            if (Date.now() > expiryTime) {
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Create HMAC-SHA256 signature
     */
    private createSignature(payload: string): string {
        return crypto
            .createHmac('sha256', this.secret)
            .update(payload)
            .digest('hex');
    }

    /**
     * Get secret for logging/display purposes
     */
    getSecret(): string {
        return this.secret;
    }
}
