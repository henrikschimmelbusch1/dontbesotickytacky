import React, { useState, useEffect, useRef } from 'react';
import { NetworkManager } from '../game/NetworkManager';

interface MultiplayerSidebarProps {
    networkManager: NetworkManager | null;
    connectionStatus: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';
    networkRole: 'HOST' | 'GUEST' | null;
    gameId: string | null;
    joinId: string;
    onJoinIdChange: (id: string) => void;
    onHost: () => void;
    onJoin: () => void;
    onDisconnect: () => void;
}

interface Message {
    sender: 'ME' | 'THEM';
    text: string;
}

export const MultiplayerSidebar: React.FC<MultiplayerSidebarProps> = ({
    networkManager,
    connectionStatus,
    networkRole,
    gameId,
    joinId,
    onJoinIdChange,
    onHost,
    onJoin,
    onDisconnect,
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const isConnected = connectionStatus === 'CONNECTED';

    useEffect(() => {
        if (networkManager) {
            networkManager.onChat((text) => {
                setMessages(prev => [...prev, { sender: 'THEM', text }]);
            });
        }
    }, [networkManager]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !networkManager) return;

        networkManager.sendChat(inputText);
        setMessages(prev => [...prev, { sender: 'ME', text: inputText }]);
        setInputText('');
    };

    return (
        <div className="fixed top-12 right-0 bottom-0 w-80 bg-white/95 backdrop-blur-xl border-l border-gray-200 z-30 flex flex-col shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white/50">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    <span className="font-semibold text-gray-900">Multiplayer</span>
                </div>
                {isConnected && (
                    <span className="text-xs text-gray-400 font-medium uppercase">
                        {networkRole} ({networkRole === 'HOST' ? 'X' : 'O'})
                    </span>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {connectionStatus === 'DISCONNECTED' && (
                    <div className="space-y-4">
                        <p className="text-center text-gray-500 text-sm pb-2">
                            Play with a friend online!
                        </p>
                        <button onClick={onHost} className="w-full apple-button-primary py-3">
                            Host New Game
                        </button>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                            <div className="relative flex justify-center text-sm"><span className="px-3 bg-white text-gray-500">or join</span></div>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Enter Game ID..."
                                className="apple-input flex-1"
                                value={joinId}
                                onChange={(e) => onJoinIdChange(e.target.value)}
                            />
                            <button onClick={onJoin} disabled={!joinId} className="apple-button-secondary px-6 disabled:opacity-50">
                                Join
                            </button>
                        </div>
                    </div>
                )}

                {connectionStatus === 'CONNECTING' && (
                    <div className="text-center py-10 space-y-3">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-gray-500 text-sm">Connecting...</p>
                        {networkRole === 'HOST' && gameId && (
                            <div className="mt-4 bg-gray-50 p-3 rounded-xl">
                                <p className="text-xs text-gray-400 mb-1">Share this Game ID:</p>
                                <div className="flex gap-2 items-center">
                                    <span className="font-mono text-sm flex-1 break-all select-all">{gameId}</span>
                                    <button onClick={() => navigator.clipboard.writeText(gameId)} className="apple-button-ghost text-xs px-2 py-1">Copy</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {isConnected && (
                    <>
                        {/* Chat Messages */}
                        <div className="space-y-3 min-h-[100px]">
                            {messages.length === 0 && (
                                <div className="text-center text-gray-400 text-sm py-6">
                                    Connected! Say hello.
                                </div>
                            )}
                            {messages.map((msg, i) => {
                                const isMe = msg.sender === 'ME';
                                return (
                                    <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <span className="text-[10px] text-gray-400 mb-1 px-1 font-medium uppercase tracking-wider">
                                            {isMe ? 'You' : 'Opponent'}
                                        </span>
                                        <div className={`max-w-[90%] px-4 py-2.5 rounded-2xl text-sm ${isMe
                                            ? 'bg-blue-600 text-white rounded-br-md'
                                            : 'bg-gray-100 text-gray-800 rounded-bl-md'
                                            }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    </>
                )}
            </div>

            {/* Footer */}
            {isConnected ? (
                <div className="border-t border-gray-100 bg-white/50">
                    <form onSubmit={handleSend} className="p-4 flex gap-2">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Type a message..."
                            className="apple-input flex-1 bg-white"
                        />
                        <button
                            type="submit"
                            className="apple-button-primary w-10 h-10 flex items-center justify-center p-0 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!inputText.trim()}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </button>
                    </form>
                    <button
                        onClick={onDisconnect}
                        className="w-full py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                    >
                        Disconnect
                    </button>
                </div>
            ) : (
                <div className="p-4 border-t border-gray-100 bg-white/50">
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            alert("Link copied! Share it with a friend.");
                        }}
                        className="w-full apple-button-ghost text-sm flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        Copy Page Link
                    </button>
                </div>
            )}
        </div>
    );
};
