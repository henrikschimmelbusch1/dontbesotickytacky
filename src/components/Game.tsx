import React, { useState, useEffect, useRef } from 'react';
import { createInitialGameState, applyMove, isValidMove } from '../game/logic';
import { SvgBoard } from './SvgBoard';
import type { GameState, Move, Player } from '../game/types';
import { NetworkManager } from '../game/NetworkManager';
import { soundManager } from '../game/SoundManager';
import { MultiplayerSidebar } from './MultiplayerSidebar';

export const Game: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>(createInitialGameState());
    const [error, setError] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editPlayer, setEditPlayer] = useState<Player>('X');

    // Unified UI State
    type Panel = 'MENU' | 'SETTINGS' | 'SAVE' | 'RESET' | 'JOIN_PROMPT' | null;
    const [activePanel, setActivePanel] = useState<Panel>(null);
    const [saveName, setSaveName] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);

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
    const fileInputRef = useRef<HTMLInputElement | null>(null);

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

            manager.onGameState((newState) => {
                setGameState(newState);
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

    const syncGameState = (state: GameState) => {
        if (isMultiplayer && connectionStatus === 'CONNECTED' && networkManagerRef.current) {
            networkManagerRef.current.sendGameState(state);
        }
    };

    const handleNameChange = (newName: string) => {
        const newState = { ...gameState, gameName: newName };
        setGameState(newState);
        syncGameState(newState);
    };

    const handleCellClick = (path: [number, number, number]) => {
        setError(null);

        try {
            if (isEditMode) {
                const [l3, l2, l1] = path;
                const newBoard = { ...gameState.board };
                const newGrid = [...newBoard.grid];
                const medium = { ...newGrid[l3] };
                const mediumGrid = [...medium.grid];
                const small = { ...mediumGrid[l2] };
                const smallGrid = [...small.grid];

                smallGrid[l1] = editPlayer;
                small.grid = smallGrid;

                mediumGrid[l2] = small;
                newGrid[l3] = medium;
                newBoard.grid = newGrid;

                const newState = { ...gameState, board: newBoard };
                setGameState(newState);
                soundManager.playMove();

            } else {
                // In multiplayer, block moves when it's not your turn
                if (isMultiplayer && connectionStatus === 'CONNECTED' && !isMyTurn) {
                    setError("It's not your turn!");
                    soundManager.playInvalid();
                    return;
                }

                const move = { path, player: gameState.currentPlayer };
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
        // setActivePanel(null) is handled by the caller or not needed here
        // Sync reset to opponent if in multiplayer
        if (isMultiplayer && connectionStatus === 'CONNECTED' && networkManagerRef.current) {
            networkManagerRef.current.sendReset();
        }
    };

    const handleSaveGame = (customName?: string) => {
        const finalName = customName || saveName.trim() || gameState.gameName || 'Don\'t Be Ticky Tacky';
        const blob = new Blob([JSON.stringify(gameState, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${finalName}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setActivePanel(null);
    };

    const handleLoadGame = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const newState = JSON.parse(content) as GameState;

                // Simple validation: check for board and currentPlayer
                if (!newState.board || !newState.currentPlayer) {
                    throw new Error("Invalid save file format");
                }

                setGameState(newState);
                // Also update local saveName state if needed, though we primarily use gameState.gameName now
                setSaveName(newState.gameName || 'Don\'t Be Ticky Tacky');
                setError(null);
                soundManager.playMove();

                // Sync to opponent in multiplayer
                syncGameState(newState);
            } catch (err) {
                console.error("Failed to load game:", err);
                setError("Failed to load game. Invalid file format.");
                soundManager.playInvalid();
            }
        };
        reader.readAsText(file);

        // Reset input value to allow loading the same file again if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white overflow-hidden">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleLoadGame}
                accept=".json"
                className="hidden"
            />

            {/* Navigation Bar */}
            <nav className="fixed top-0 left-0 right-0 h-12 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 z-50">
                <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        {isEditingName ? (
                            <input
                                autoFocus
                                type="text"
                                value={gameState.gameName}
                                onChange={(e) => handleNameChange(e.target.value)}
                                onBlur={() => setIsEditingName(false)}
                                onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                                className="text-xl font-bold bg-transparent border-b-2 border-blue-500 outline-none px-1 py-0 min-w-[200px]"
                            />
                        ) : (
                            <div
                                onClick={() => setIsEditingName(true)}
                                className="group flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-3 py-1 -ml-3 rounded-xl transition-all"
                            >
                                <span className="text-xl font-semibold tracking-tight text-gray-900">{gameState.gameName}</span>
                                <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Player Indicators */}
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center">
                                <div className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${gameState.currentPlayer === 'X'
                                    ? 'bg-blue-50 text-blue-600 shadow-sm'
                                    : 'text-gray-300'
                                    }`}>
                                    <span className={`w-2 h-2 rounded-full ${gameState.currentPlayer === 'X' ? 'bg-blue-500 animate-pulse' : 'bg-gray-200'}`}></span>
                                    PLAYER X
                                </div>
                                {isMultiplayer && connectionStatus === 'CONNECTED' && networkRole === 'HOST' && gameState.currentPlayer === 'X' && (
                                    <span className="text-[10px] font-black text-blue-500 mt-1 tracking-tighter animate-pulse">YOUR TURN</span>
                                )}
                            </div>

                            <div className="w-px h-8 bg-gray-100 mx-2" />

                            <div className="flex flex-col items-center">
                                <div className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${gameState.currentPlayer === 'O'
                                    ? 'bg-red-50 text-red-600 shadow-sm'
                                    : 'text-gray-300'
                                    }`}>
                                    <span className={`w-2 h-2 rounded-full ${gameState.currentPlayer === 'O' ? 'bg-red-500 animate-pulse' : 'bg-gray-200'}`}></span>
                                    PLAYER O
                                </div>
                                {isMultiplayer && connectionStatus === 'CONNECTED' && networkRole === 'GUEST' && gameState.currentPlayer === 'O' && (
                                    <span className="text-[10px] font-black text-red-500 mt-1 tracking-tighter animate-pulse">YOUR TURN</span>
                                )}
                            </div>
                        </div>

                        {/* Unified Action Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setActivePanel(activePanel === 'MENU' ? null : 'MENU')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activePanel === 'MENU' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                <span>Menu</span>
                                <svg className={`w-4 h-4 transition-transform duration-200 ${activePanel === 'MENU' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {activePanel === 'MENU' && (
                                <div className="absolute top-full right-0 mt-3 apple-card w-56 z-[60] py-2 animate-in fade-in slide-in-from-top-2">
                                    <button
                                        onClick={() => setActivePanel('SETTINGS')}
                                        className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                    >
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        Settings
                                    </button>

                                    <div className="h-px bg-gray-100 my-1 mx-2" />

                                    {/* Multiplayer Actions (New Location) */}
                                    {connectionStatus === 'DISCONNECTED' ? (
                                        <>
                                            <button
                                                onClick={() => { startHost(); setActivePanel(null); }}
                                                className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 text-blue-600 hover:bg-blue-50 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                                Host Online Game
                                            </button>
                                            <button
                                                onClick={() => setActivePanel('JOIN_PROMPT')}
                                                className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 text-blue-600 hover:bg-blue-50 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                                                Join Online Game
                                            </button>
                                            <div className="h-px bg-gray-100 my-1 mx-2" />
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => { handleDisconnect(); setActivePanel(null); }}
                                                className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                                                Disconnect
                                            </button>
                                            <div className="h-px bg-gray-100 my-1 mx-2" />
                                        </>
                                    )}

                                    <button
                                        onClick={() => {
                                            setSaveName(gameState.gameName);
                                            setActivePanel('SAVE');
                                        }}
                                        className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                    >
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                                        Save Game
                                    </button>

                                    <button
                                        onClick={() => {
                                            fileInputRef.current?.click();
                                            setActivePanel(null);
                                        }}
                                        className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                    >
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        Load Game
                                    </button>

                                    <div className="h-px bg-gray-100 my-1 mx-2" />

                                    <button
                                        onClick={() => {
                                            setIsEditMode(!isEditMode);
                                            setActivePanel(null);
                                        }}
                                        className={`w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 transition-colors ${isEditMode ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        {isEditMode ? 'Stop Editing' : 'Edit Board'}
                                    </button>

                                    <div className="h-px bg-gray-100 my-1 mx-2" />

                                    <button
                                        onClick={() => setActivePanel('RESET')}
                                        className="w-full px-4 py-2.5 text-sm text-left flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        Reset Game
                                    </button>
                                </div>
                            )}

                            {/* Standardized Panels */}
                            {activePanel === 'RESET' && (
                                <div className="absolute top-full right-0 mt-3 apple-card p-4 w-64 z-[70] animate-in fade-in slide-in-from-top-2">
                                    <p className="text-sm font-bold text-gray-900 mb-1">Reset Game</p>
                                    <p className="text-xs text-gray-500 mb-4 font-medium leading-relaxed">This will permanently clear the board and start a new session.</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setActivePanel(null)} className="flex-1 apple-button-secondary py-1.5 px-3">Cancel</button>
                                        <button onClick={() => { resetGame(); setActivePanel(null); }} className="flex-1 apple-button-primary bg-red-600 hover:bg-red-700 py-1.5 px-3">Reset</button>
                                    </div>
                                </div>
                            )}

                            {activePanel === 'SAVE' && (
                                <div className="absolute top-full right-0 mt-3 apple-card p-4 w-72 z-[70] animate-in fade-in slide-in-from-top-2">
                                    <p className="text-sm font-bold text-gray-900 mb-1">Save Game</p>
                                    <p className="text-xs text-gray-500 mb-3 font-medium">Download a snapshot of the current state:</p>
                                    <input
                                        type="text"
                                        autoFocus
                                        value={saveName}
                                        onChange={(e) => setSaveName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveGame(saveName)}
                                        className="apple-input mb-4"
                                        placeholder="Enter save name..."
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => setActivePanel(null)} className="flex-1 apple-button-secondary py-2 px-3">Cancel</button>
                                        <button onClick={() => { handleSaveGame(saveName); setActivePanel(null); }} className="flex-1 apple-button-primary py-2 px-3">Download</button>
                                    </div>
                                </div>
                            )}

                            {activePanel === 'JOIN_PROMPT' && (
                                <div className="absolute top-full right-0 mt-3 apple-card p-4 w-72 z-[70] animate-in fade-in slide-in-from-top-2">
                                    <p className="text-sm font-bold text-gray-900 mb-1">Join Game</p>
                                    <p className="text-xs text-gray-500 mb-3 font-medium">Enter your friend's 6-digit game code:</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            autoFocus
                                            value={joinId}
                                            maxLength={6}
                                            onChange={(e) => setJoinId(e.target.value.replace(/\D/g, ''))}
                                            className="apple-input flex-1"
                                            placeholder="Code..."
                                        />
                                        <button
                                            onClick={() => { joinGame(); setActivePanel(null); }}
                                            disabled={joinId.length !== 6}
                                            className="apple-button-primary bg-blue-600 px-4"
                                        >
                                            Join
                                        </button>
                                    </div>
                                    <button onClick={() => setActivePanel(null)} className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 font-medium py-1">Cancel</button>
                                </div>
                            )}
                        </div>

                        {/* Edit Mode Quick Player Selector */}
                        {isEditMode && (
                            <div className="flex items-center bg-gray-100 rounded-full p-1 ml-1 animate-in slide-in-from-right-2">
                                <button
                                    onClick={() => setEditPlayer('X')}
                                    className={`px-3 py-0.5 rounded-full text-xs font-bold transition-all ${editPlayer === 'X' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    X
                                </button>
                                <button
                                    onClick={() => setEditPlayer('O')}
                                    className={`px-3 py-0.5 rounded-full text-xs font-bold transition-all ${editPlayer === 'O' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    O
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Settings Panel */}
            {activePanel === 'SETTINGS' && (
                <div className="fixed top-16 left-1/2 -translate-x-1/2 w-full max-w-md apple-card z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="apple-card-header">
                        <span>Visual Settings</span>
                        <button onClick={() => setActivePanel(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="p-6 space-y-7">
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm font-bold text-gray-900 uppercase tracking-wider"><span className="text-gray-400">Zoom</span><span>{zoom}%</span></div>
                            <input type="range" min="50" max="150" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="apple-slider" />
                        </div>
                        <div className="space-y-4">
                            <div className="text-sm font-bold text-gray-900 uppercase tracking-wider text-gray-400">Grid Lines</div>
                            <div className="grid grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Small</span>
                                    <input type="range" min="1" max="20" value={lineWeights.level1} onChange={(e) => setLineWeights({ ...lineWeights, level1: Number(e.target.value) })} className="apple-slider" />
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Medium</span>
                                    <input type="range" min="1" max="30" value={lineWeights.level2} onChange={(e) => setLineWeights({ ...lineWeights, level2: Number(e.target.value) })} className="apple-slider" />
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Large</span>
                                    <input type="range" min="1" max="50" value={lineWeights.level3} onChange={(e) => setLineWeights({ ...lineWeights, level3: Number(e.target.value) })} className="apple-slider" />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-8 pt-2">
                            <div className="space-y-3">
                                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">Blur <span>{inactiveBlur}px</span></div>
                                <input type="range" min="0" max="10" step="0.5" value={inactiveBlur} onChange={(e) => setInactiveBlur(Number(e.target.value))} className="apple-slider" />
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">Dim <span>{Math.round(occupiedOpacity * 100)}%</span></div>
                                <input type="range" min="0" max="0.8" step="0.05" value={occupiedOpacity} onChange={(e) => setOccupiedOpacity(Number(e.target.value))} className="apple-slider" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar (Pure Status/Chat) */}
            {isMultiplayer && (
                <MultiplayerSidebar
                    networkManager={networkManagerRef.current}
                    connectionStatus={connectionStatus}
                    networkRole={networkRole}
                    gameId={gameId}
                />
            )}

            {/* Game Board */}
            <main className={`pt-20 pb-10 ${isMultiplayer ? 'mr-80' : ''} flex items-center justify-center min-h-screen transition-all duration-300 ease-out`}>
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
