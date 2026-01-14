import React, { useState, useEffect, useRef } from 'react';
import { NetworkManager } from '../game/NetworkManager';

interface MultiplayerSidebarProps {
    networkManager: NetworkManager | null;
    connectionStatus: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';
    networkRole: 'HOST' | 'GUEST' | null;
    gameId: string | null;
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
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [copied, setCopied] = useState(false);
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

    const handleCopyId = () => {
        if (!gameId) return;
        navigator.clipboard.writeText(gameId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed top-12 right-0 bottom-0 w-80 apple-card border-none rounded-none border-l border-gray-100 z-30 flex flex-col shadow-none">
            {/* Unified Status Header */}
            <div className="apple-card-header bg-gray-50/50 backdrop-blur-sm border-b border-gray-100/50">
                <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full transition-colors ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-gray-300'}`}></span>
                    <span className="font-bold text-xs uppercase tracking-widest text-gray-900">Multiplayer</span>
                </div>
                {isConnected && (
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-tight">
                        {networkRole === 'HOST' ? 'PLAYER X' : 'PLAYER O'}
                    </span>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                {connectionStatus === 'DISCONNECTED' && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-10 opacity-60">
                        <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-300">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-bold text-gray-900 uppercase">OFFLINE</p>
                            <p className="text-xs text-gray-500 font-medium leading-relaxed max-w-[200px] mx-auto">
                                Enable multiplayer in the menu to play with friends.
                            </p>
                        </div>
                    </div>
                )}

                {connectionStatus === 'CONNECTING' && (
                    <div className="flex flex-col items-center justify-center h-full space-y-8 py-10">
                        <div className="relative">
                            <div className="w-16 h-16 border-2 border-blue-100 rounded-3xl"></div>
                            <div className="absolute inset-0 border-t-2 border-blue-500 rounded-3xl animate-spin"></div>
                        </div>

                        {networkRole === 'HOST' && gameId && (
                            <div className="w-full space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="text-center space-y-1">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Your Private Code</p>
                                    <div className="text-4xl font-black text-gray-900 tracking-tighter font-mono bg-gray-50 py-4 rounded-2xl border border-gray-100">
                                        {gameId}
                                    </div>
                                </div>
                                <button
                                    onClick={handleCopyId}
                                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${copied
                                        ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                                        : 'bg-white text-gray-900 border border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md active:scale-[0.98]'
                                        }`}
                                >
                                    {copied ? (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                            COPIED
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                            COPY CODE
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Establishing Link...</p>
                    </div>
                )}

                {isConnected && (
                    <div className="flex flex-col h-full">
                        <div className="flex-1 space-y-4">
                            {messages.length === 0 && (
                                <div className="text-center py-10 opacity-40">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Secure Link Ready</p>
                                </div>
                            )}
                            {messages.map((msg, i) => {
                                const isMe = msg.sender === 'ME';
                                return (
                                    <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
                                        <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[13px] font-medium leading-relaxed shadow-sm ${isMe
                                            ? 'bg-blue-600 text-white rounded-tr-none'
                                            : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                                            }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                )}
            </div>

            {/* Standardized Footer */}
            {isConnected && (
                <div className="p-4 border-t border-gray-100 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                    <form onSubmit={handleSend} className="flex gap-2">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Type message..."
                            className="apple-input flex-1 !rounded-2xl !py-2.5"
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim()}
                            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-90 transition-all disabled:opacity-30"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};
