import React, { useState, useEffect, useRef } from 'react';
import { createInitialGameState, applyMove, isValidMove } from '../game/logic';
import { SvgBoard } from './SvgBoard';
import type { GameState, Move } from '../game/types';
import { NetworkManager } from '../game/NetworkManager';
import { soundManager } from '../game/SoundManager';
import { MultiplayerSidebar } from './MultiplayerSidebar';

export const Game: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>(createInitialGameState());
    const [error, setError] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    // UI State
    const [showSettings, setShowSettings] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    // Visual Settings
    const [zoom, setZoom] = useState(85);
    const [lineWeights, setLineWeights] = useState({ level1: 12, level2: 13, level3: 17 });
    const [inactiveBlur, setInactiveBlur] = useState(5);
    const [occupiedOpacity, setOccupiedOpacity] = useState(0.35);

    // Multiplayer State
    const [isMultiplayer, setIsMultiplayer] = useState(false);
    const [networkRole, setNetworkRole] = useState<'HOST' | 'GUEST' | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');
    const [gameId, setGameId] = useState<string | null>(null);
    const [joinId, setJoinId] = useState('');

    const networkManagerRef = useRef<NetworkManager | null>(null);

    useEffect(() => {
        return () => {
            if (networkManagerRef.current) {
                networkManagerRef.current.cleanup();
            }
        };
    }, []);

    const startHost = async () => {
        setIsMultiplayer(true);
        setNetworkRole('HOST');
        setConnectionStatus('CONNECTING');

        const manager = new NetworkManager();
        networkManagerRef.current = manager;

        try {
            const id = await manager.hostGame();
            setGameId(id);

            manager.onConnectionChange((isConnected) => {
                setConnectionStatus(isConnected ? 'CONNECTED' : 'DISCONNECTED');
                if (isConnected) {
                    manager.sendGameState(gameState);
                }
            });

            manager.onMove((move) => {
                handleRemoteMove(move);
            });

            manager.onReset(() => {
                setGameState(createInitialGameState());
                setError(null);
            });

        } catch (err) {
            console.error("Failed to host:", err);
            setError("Failed to start multiplayer session.");
            setConnectionStatus('DISCONNECTED');
        }
    };

    const joinGame = () => {
        if (!joinId) return;

        setIsMultiplayer(true);
        setNetworkRole('GUEST');
        setConnectionStatus('CONNECTING');

        const manager = new NetworkManager();
        networkManagerRef.current = manager;

        manager.joinGame(joinId);

        manager.onConnectionChange((isConnected) => {
            setConnectionStatus(isConnected ? 'CONNECTED' : 'DISCONNECTED');
        });

        manager.onGameState((newState) => {
            setGameState(newState);
        });

        manager.onMove((move) => {
            handleRemoteMove(move);
        });

        manager.onReset(() => {
            setGameState(createInitialGameState());
            setError(null);
        });
    };

    const handleDisconnect = () => {
        setIsMultiplayer(false);
        setNetworkRole(null);
        setConnectionStatus('DISCONNECTED');
        setGameId(null);
        if (networkManagerRef.current) {
            networkManagerRef.current.cleanup();
            networkManagerRef.current = null;
        }
    };

    const handleRemoteMove = (move: Move) => {
        setGameState(prevState => {
            try {
                const newState = applyMove(prevState, move);
                soundManager.playMove();
                return newState;
            } catch (e) {
                console.error("Error applying remote move", e);
                return prevState;
            }
        });
    };

    const myPlayer = networkRole === 'HOST' ? 'X' : 'O';
    const isMyTurn = !isMultiplayer || connectionStatus !== 'CONNECTED' || gameState.currentPlayer === myPlayer;

    const handleCellClick = (path: [number, number, number]) => {
        setError(null);

        // In multiplayer, block moves when it's not your turn (but allow in edit mode)
        if (!isEditMode && isMultiplayer && connectionStatus === 'CONNECTED' && !isMyTurn) {
            setError("It's not your turn!");
            soundManager.playInvalid();
            return;
        }

        try {
            const move = { path, player: gameState.currentPlayer };

            if (isEditMode) {
                const [l3, l2, l1] = path;
                const newBoard = { ...gameState.board };
                const newGrid = [...newBoard.grid];
                const medium = { ...newGrid[l3] };
                const mediumGrid = [...medium.grid];
                const small = { ...mediumGrid[l2] };
                const smallGrid = [...small.grid];

                smallGrid[l1] = gameState.currentPlayer;
                small.grid = smallGrid;

                mediumGrid[l2] = small;
                newGrid[l3] = medium;
                newBoard.grid = newGrid;

                const newState = { ...gameState, board: newBoard };
                setGameState(newState);
                soundManager.playMove();

            } else {
                if (isValidMove(gameState, move)) {
                    const newState = applyMove(gameState, move);
                    setGameState(newState);
                    soundManager.playMove();

                    if (isMultiplayer && connectionStatus === 'CONNECTED' && networkManagerRef.current) {
                        networkManagerRef.current.sendMove(move);
                    }
                } else {
                    soundManager.playInvalid();
                }
            }
        } catch (e) {
            console.error(e);
            setError("An error occurred making that move.");
            soundManager.playInvalid();
        }
    };

    const resetGame = () => {
        setGameState(createInitialGameState());
        setError(null);
        setShowResetConfirm(false);
        // Sync reset to opponent if in multiplayer
        if (isMultiplayer && connectionStatus === 'CONNECTED' && networkManagerRef.current) {
            networkManagerRef.current.sendReset();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white overflow-hidden">
            {/* Navigation Bar */}
            <nav className="fixed top-0 left-0 right-0 h-12 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 z-50">
                <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <span className="text-xl font-semibold tracking-tight">Ultimate Tic Tac Toe</span>

                        <div className="hidden md:flex items-center gap-1">
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${showSettings ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                            >
                                Settings
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Player Indicators */}
                        <div className="flex items-center gap-2 mr-4">
                            <div className="flex flex-col items-center">
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-all ${gameState.currentPlayer === 'X'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-gray-400'
                                    }`}>
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    Player X
                                </div>
                                {isMultiplayer && connectionStatus === 'CONNECTED' && networkRole === 'HOST' && gameState.currentPlayer === 'X' && (
                                    <span className="text-[10px] font-bold text-blue-600 mt-0.5 animate-pulse">YOUR TURN</span>
                                )}
                            </div>
                            <div className="flex flex-col items-center">
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-all ${gameState.currentPlayer === 'O'
                                    ? 'bg-red-100 text-red-700'
                                    : 'text-gray-400'
                                    }`}>
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    Player O
                                </div>
                                {isMultiplayer && connectionStatus === 'CONNECTED' && networkRole === 'GUEST' && gameState.currentPlayer === 'O' && (
                                    <span className="text-[10px] font-bold text-red-600 mt-0.5 animate-pulse">YOUR TURN</span>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${isEditMode
                                ? 'bg-amber-100 text-amber-800'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {isEditMode ? 'Editing' : 'Edit'}
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setShowResetConfirm(!showResetConfirm)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${showResetConfirm ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                Reset
                            </button>
                            {showResetConfirm && (
                                <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-56 z-50 animate-in fade-in slide-in-from-top-2">
                                    <p className="text-sm text-gray-600 mb-3">Reset the board? This will clear all moves.</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowResetConfirm(false)} className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
                                        <button onClick={resetGame} className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700">Reset</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Settings Panel */}
            {showSettings && (
                <div className="fixed top-14 left-1/2 -translate-x-1/2 w-full max-w-md apple-card z-40 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="apple-panel-header flex justify-between items-center">
                        <span>Visual Settings</span>
                        <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Zoom</span><span className="font-medium">{zoom}%</span></div>
                            <input type="range" min="50" max="150" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="apple-slider" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Grid Lines</span></div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <span className="text-xs text-gray-400">Small</span>
                                    <input type="range" min="1" max="20" value={lineWeights.level1} onChange={(e) => setLineWeights({ ...lineWeights, level1: Number(e.target.value) })} className="apple-slider" />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-gray-400">Medium</span>
                                    <input type="range" min="1" max="30" value={lineWeights.level2} onChange={(e) => setLineWeights({ ...lineWeights, level2: Number(e.target.value) })} className="apple-slider" />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-gray-400">Large</span>
                                    <input type="range" min="1" max="50" value={lineWeights.level3} onChange={(e) => setLineWeights({ ...lineWeights, level3: Number(e.target.value) })} className="apple-slider" />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Inactive Blur</span><span className="font-medium">{inactiveBlur}px</span></div>
                            <input type="range" min="0" max="10" step="0.5" value={inactiveBlur} onChange={(e) => setInactiveBlur(Number(e.target.value))} className="apple-slider" />
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Occupied Dimming</span><span className="font-medium">{Math.round(occupiedOpacity * 100)}%</span></div>
                            <input type="range" min="0" max="0.8" step="0.05" value={occupiedOpacity} onChange={(e) => setOccupiedOpacity(Number(e.target.value))} className="apple-slider" />
                        </div>
                    </div>
                </div>
            )}

            {/* Multiplayer Sidebar (Always Visible) */}
            <MultiplayerSidebar
                networkManager={networkManagerRef.current}
                connectionStatus={connectionStatus}
                networkRole={networkRole}
                gameId={gameId}
                joinId={joinId}
                onJoinIdChange={setJoinId}
                onHost={startHost}
                onJoin={joinGame}
                onDisconnect={handleDisconnect}
            />

            {/* Game Board */}
            <main className="pt-20 pb-10 mr-80 flex items-center justify-center min-h-screen transition-all duration-300 ease-out">
                {/* Gray backing layer */}
                <div className="bg-gray-200 p-3 rounded-3xl shadow-lg">
                    <div
                        className="transition-all duration-300 ease-out rounded-2xl overflow-hidden"
                        style={{ width: `${zoom}vmin`, height: `${zoom}vmin` }}
                    >
                        <SvgBoard
                            gameState={gameState}
                            onCellClick={handleCellClick}
                            activePath={isEditMode ? null : gameState.activeBoardPath}
                            lineWeights={lineWeights}
                            inactiveBlur={inactiveBlur}
                            occupiedOpacity={occupiedOpacity}
                            cornerRadius={60}
                        />
                    </div>
                </div>
            </main>

            {/* Error Toast */}
            {error && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-full shadow-lg z-50 animate-in fade-in slide-in-from-bottom-4 text-sm font-medium flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                </div>
            )}

            {/* Not Your Turn Banner */}
            {isMultiplayer && connectionStatus === 'CONNECTED' && !isMyTurn && !error && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg z-50 text-sm font-medium">
                    Waiting for opponent...
                </div>
            )}
        </div>
    );
};
