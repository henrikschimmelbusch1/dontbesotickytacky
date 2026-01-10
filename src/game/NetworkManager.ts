import { Peer } from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { Move, GameState } from './types';

type MoveCallback = (move: Move) => void;
type GameStateCallback = (gameState: GameState) => void;
type ConnectionCallback = (isConnected: boolean) => void;
type ChatCallback = (message: string) => void;
type ResetCallback = () => void;

export class NetworkManager {
    private peer: Peer | null = null;
    private conn: DataConnection | null = null;
    private onMoveCallback: MoveCallback | null = null;
    private onGameStateCallback: GameStateCallback | null = null;
    private onConnectionCallback: ConnectionCallback | null = null;
    private onChatCallback: ChatCallback | null = null;
    private onResetCallback: ResetCallback | null = null;

    constructor() { }

    // Initialize as Host
    public async hostGame(): Promise<string> {
        return new Promise((resolve, reject) => {
            this.peer = new Peer();

            this.peer.on('open', (id) => {
                console.log('My peer ID is: ' + id);
                resolve(id);
            });

            this.peer.on('connection', (conn) => {
                this.handleConnection(conn);
            });

            this.peer.on('error', (err) => {
                console.error(err);
                reject(err);
            });
        });
    }

    // Join a Game
    public joinGame(hostId: string): void {
        this.peer = new Peer();

        this.peer.on('open', () => {
            const conn = this.peer!.connect(hostId);
            this.handleConnection(conn);
        });

        this.peer.on('error', (err) => {
            console.error(err);
        });
    }

    private handleConnection(conn: DataConnection) {
        this.conn = conn;

        this.conn.on('open', () => {
            console.log('Connected to peer!');
            if (this.onConnectionCallback) this.onConnectionCallback(true);
        });

        this.conn.on('data', (data: any) => {
            console.log('Received data:', data);
            if (data.type === 'MOVE' && this.onMoveCallback) {
                this.onMoveCallback(data.payload);
            } else if (data.type === 'STATE' && this.onGameStateCallback) {
                this.onGameStateCallback(data.payload);
            } else if (data.type === 'CHAT' && this.onChatCallback) {
                this.onChatCallback(data.payload);
            } else if (data.type === 'RESET' && this.onResetCallback) {
                this.onResetCallback();
            }
        });

        this.conn.on('close', () => {
            console.log('Connection closed');
            if (this.onConnectionCallback) this.onConnectionCallback(false);
            this.conn = null;
        });

        this.conn.on('error', (err) => {
            console.error('Connection error:', err);
            if (this.onConnectionCallback) this.onConnectionCallback(false);
        });
    }

    public sendMove(move: Move) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'MOVE', payload: move });
        }
    }

    public sendGameState(gameState: GameState) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'STATE', payload: gameState });
        }
    }

    public sendChat(message: string) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'CHAT', payload: message });
        }
    }

    public onMove(callback: MoveCallback) {
        this.onMoveCallback = callback;
    }

    public onGameState(callback: GameStateCallback) {
        this.onGameStateCallback = callback;
    }

    public onConnectionChange(callback: ConnectionCallback) {
        this.onConnectionCallback = callback;
    }

    public onChat(callback: ChatCallback) {
        this.onChatCallback = callback;
    }

    public sendReset() {
        if (this.conn && this.conn.open) {
            this.conn.send({ type: 'RESET' });
        }
    }

    public onReset(callback: ResetCallback) {
        this.onResetCallback = callback;
    }

    public cleanup() {
        if (this.conn) this.conn.close();
        if (this.peer) this.peer.destroy();
    }
}
