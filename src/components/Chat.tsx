import React, { useState, useEffect, useRef } from 'react';
import { NetworkManager } from '../game/NetworkManager';

interface ChatProps {
    networkManager: NetworkManager | null;
    isMultiplayer: boolean;
    isOpen: boolean;
    onToggle: (isOpen: boolean) => void;
}

interface Message {
    sender: 'ME' | 'THEM';
    text: string;
}

export const Chat: React.FC<ChatProps> = ({ networkManager, isMultiplayer, isOpen, onToggle }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [hasUnread, setHasUnread] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (networkManager) {
            networkManager.onChat((text) => {
                setMessages(prev => [...prev, { sender: 'THEM', text }]);
                if (!isOpen) {
                    setHasUnread(true);
                }
            });
        }
    }, [networkManager, isOpen]);

    useEffect(() => {
        if (isOpen) {
            setHasUnread(false);
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [isOpen, messages]);

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !networkManager) return;

        networkManager.sendChat(inputText);
        setMessages(prev => [...prev, { sender: 'ME', text: inputText }]);
        setInputText('');
    };

    if (!isMultiplayer) return null;

    return (
        <>
            {/* Chat Toggle Button (Floating) */}
            {!isOpen && (
                <button
                    onClick={() => onToggle(true)}
                    className="fixed bottom-6 right-6 w-14 h-14 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center z-40 hover:scale-105 active:scale-95 transition-transform"
                >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {hasUnread && (
                        <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                    )}
                </button>
            )}

            {/* Chat Sidebar */}
            <div
                className={`fixed top-12 right-0 bottom-0 w-80 bg-white/95 backdrop-blur-xl border-l border-gray-200 z-30 transition-transform duration-300 ease-in-out flex flex-col shadow-xl ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white/50">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="font-semibold text-gray-900">Game Chat</span>
                    </div>
                    <button onClick={() => onToggle(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 && (
                        <div className="text-center text-gray-400 text-sm py-10">
                            No messages yet.<br />Say hello!
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

                <form onSubmit={handleSend} className="p-4 border-t border-gray-100 bg-white/50 flex gap-2">
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
            </div>
        </>
    );
};
