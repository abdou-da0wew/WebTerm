/**
 * Shared type definitions for WebTerm
 * Used by both client and server
 */

/** Message types for WebSocket communication */
export enum MessageType {
    /** Terminal input from client to server */
    INPUT = 'input',
    /** Terminal output from server to client */
    OUTPUT = 'output',
    /** Resize event from client to server */
    RESIZE = 'resize',
    /** File upload from client to server */
    FILE_UPLOAD = 'file-upload',
    /** File download from server to client */
    FILE_DOWNLOAD = 'file-download',
    /** Authentication token message */
    AUTH = 'auth',
    /** Error message */
    ERROR = 'error',
    /** Connection established confirmation */
    READY = 'ready'
}

/** Base message structure */
export interface BaseMessage {
    type: MessageType;
    timestamp?: number;
}

/** Terminal input message */
export interface InputMessage extends BaseMessage {
    type: MessageType.INPUT;
    data: string;
}

/** Terminal output message */
export interface OutputMessage extends BaseMessage {
    type: MessageType.OUTPUT;
    data: string | Uint8Array;
}

/** Terminal resize message */
export interface ResizeMessage extends BaseMessage {
    type: MessageType.RESIZE;
    cols: number;
    rows: number;
}

/** File upload message */
export interface FileUploadMessage extends BaseMessage {
    type: MessageType.FILE_UPLOAD;
    filename: string;
    data: ArrayBuffer | string; // ArrayBuffer or base64
    size: number;
}

/** File download message */
export interface FileDownloadMessage extends BaseMessage {
    type: MessageType.FILE_DOWNLOAD;
    filename: string;
    data: string; // base64 encoded
    size: number;
}

/** Authentication message */
export interface AuthMessage extends BaseMessage {
    type: MessageType.AUTH;
    token: string;
}

/** Error message */
export interface ErrorMessage extends BaseMessage {
    type: MessageType.ERROR;
    message: string;
}

/** Ready confirmation message */
export interface ReadyMessage extends BaseMessage {
    type: MessageType.READY;
    shellType: string;
    cwd: string;
}

/** Union type for all messages */
export type TerminalMessage =
    | InputMessage
    | OutputMessage
    | ResizeMessage
    | FileUploadMessage
    | FileDownloadMessage
    | AuthMessage
    | ErrorMessage
    | ReadyMessage;

/** PTY configuration */
export interface PTYConfig {
    shell: string;
    cwd: string;
    env: Record<string, string>;
    cols: number;
    rows: number;
}

/** Server configuration */
export interface ServerConfig {
    port: number;
    authSecret: string;
    tokenExpiry: number; // seconds
    maxMessageSize: number; // bytes
    rateLimit: number; // messages per minute
}
