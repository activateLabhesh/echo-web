"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {io} from 'socket.io-client';
import { Paperclip, X } from 'lucide-react'; // Using lucide-react for icons
import { getUserDMs } from '@/app/api/API'; 
import {Socket} from "socket.io-client";


interface User {
    id: string;
    fullname: string; // Frontend uses 'fullname'
    avatar_url?: string;
}



interface DirectMessage {
    id: string;
    content: string;
    sender_id: string; 
    receiver_id: string; 
    timestamp: string;
    thread_id?: string;
    media_url?: string | null;
}

// 1. ChatList Component (Updated to show errors)

interface ChatListProps {
    conversations: { user: User, lastMessage: string }[];
    activeDmId: string | null;
    onSelectDm: (userId: string) => void;
    isLoading: boolean;
    error: string | null;
}

const ChatList: React.FC<ChatListProps> = ({ conversations, activeDmId, onSelectDm, isLoading, error }) => {
    return (
        <div className="p-4 h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 sticky top-0 bg-black py-2">Messages</h2>
            {isLoading ? (
                <p className="text-gray-400">Loading conversations...</p>
            ) : error ? (
                <p className="text-red-400">{error}</p>
            ) : (
                <ul>
                    {conversations.map(({ user, lastMessage }) => (
                        <li
                            key={user.id}
                            className={`p-3 rounded-lg cursor-pointer mb-2 ${activeDmId === user.id ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                            onClick={() => onSelectDm(user.id)}
                        >
                            <p className="font-semibold">{user.fullname}</p>
                            <p className="text-sm text-gray-400 truncate">{lastMessage}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// 2. ChatWindow Component (No changes needed)

interface ChatWindowProps {
    activeUser: User | null;
    messages: DirectMessage[];
    currentUser: User | null;
    onSendMessage: (message: string, file: File | null) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ activeUser, messages, currentUser, onSendMessage }) => {
    const [newMessage, setNewMessage] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSend = async (newMessage: string) => {
        if (!newMessage.trim() && !file) return;
        onSendMessage(newMessage, file);
        setNewMessage('');
        setFile(null);
        console.log("Message sent:", { newMessage, file })
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setFile(event.target.files[0]);
        }
    };

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (!activeUser) {
        return (
            <div className="flex flex-1 items-center justify-center text-white text-lg">
                Select a DM to view the conversation.
            </div>
        );
    }

    return (
        <>
            <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold">Chat with {activeUser.fullname}</h3>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
                {messages.map((msg) => (
                    <div key={msg.id} className={`mb-4 flex ${msg.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-3 rounded-lg max-w-lg ${msg.sender_id === currentUser?.id ? 'bg-blue-700' : 'bg-gray-600'}`}>
                            {msg.media_url && (
                                <img src={msg.media_url} alt="Uploaded content" className="max-w-xs rounded-lg mb-2" />
                            )}
                            {msg.content && <p>{msg.content}</p>}
                            <span className="text-xs text-gray-400 mt-1 block text-right">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
            <div className="p-4 border-t border-gray-700">
                {file && (
                    <div className="mb-2 flex items-center bg-gray-700 p-2 rounded-md">
                        <Paperclip className="h-5 w-5 mr-2 text-gray-400" />
                        <span className="text-sm text-white truncate flex-1">{file.name}</span>
                        <button onClick={() => setFile(null)} className="ml-2 text-gray-400 hover:text-white">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                )}
                <div className="flex">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <button onClick={() => fileInputRef.current?.click()} className="bg-gray-700 p-2 rounded-l-md hover:bg-gray-600">
                        <Paperclip className="h-6 w-6 text-white" />
                    </button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend(newMessage)}
                        placeholder="Type a message..."
                        className="flex-1 bg-gray-700 p-2 outline-none text-white"
                    />
                    <button onClick={()=>handleSend(newMessage)} className="bg-blue-600 p-2 rounded-r-md hover:bg-blue-500">
                        Send
                    </button>
                </div>
            </div>
        </>
    );
};

// =============================================================
// 3. Main Page Content (Parent Component with updated logic)
// =============================================================
export default function MessagesPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedDM = searchParams.get("dm");

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [activeDmId, setActiveDmId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Map<string, DirectMessage[]>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

const socketRef = useRef<Socket | null>(null);


useEffect(() => {
    if (currentUser?.id && !socketRef.current) {
        console.log(`Initializing socket connection for user: ${currentUser.id}`);
        const newSocket = io(process.env.NEXT_PUBLIC_API_URL!, {
            auth: { userId: currentUser.id }
        });
        socketRef.current = newSocket;
    }

    const socket = socketRef.current;
    if (socket) {
        const handleNewMessage = (newMessage: DirectMessage) => {
            // Determine partner based on the CURRENT user at the time of the event
            setCurrentUser(currentUser => {
                if (!currentUser) return null;

                const partnerId = newMessage.sender_id === currentUser.id
                    ? newMessage.receiver_id
                    : newMessage.sender_id;

                setMessages(prevMap => {
                    const newMap = new Map(prevMap);
                    const currentDms = newMap.get(partnerId) || [];
                    if (!currentDms.some(m => m.id === newMessage.id)) {
                        const updatedDms = [...currentDms, newMessage];
                        updatedDms.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                        newMap.set(partnerId, updatedDms);
                    }
                    return newMap;
                });

                return currentUser;
            });
        };

        socket.on("dm_sent_confirmation", handleNewMessage);
        socket.on("receive_dm", handleNewMessage);

        return () => {
            socket.off("dm_sent_confirmation", handleNewMessage);
            socket.off("receive_dm", handleNewMessage);
        };
    }
}, [currentUser]);


    // Effect to get user and initialize socket
    useEffect(() => {
        const userItem = localStorage.getItem("user");
        if (userItem) {
            const loggedInUser = JSON.parse(userItem);
            setCurrentUser(loggedInUser);
        } else {
            router.push('/login');
        }
    }, [router]);
    
    useEffect(() => {
        // Only connect if we have a user and the socket doesn't exist yet
        if (currentUser?.id && !socketRef.current) {
            // Pass the userId in the `auth` object. This is what the backend expects.
            const newSocket = io(process.env.NEXT_PUBLIC_API_URL!, {
                auth: {
                    userId: currentUser.id
                }
            });

            socketRef.current = newSocket;

            // Setup listeners
            newSocket.on("connect", () => {
                 if (socketRef.current?.id === newSocket.id) {
            }
            });
            
            // newSocket.on("dm_sent_confirmation", addMessageToState => {
            //     console.log("Received dm_sent_confirmation:", addMessageToState);
            // });

            // newSocket.on("receive_dm", (messageData) => {
            //     // This is for the receiver. We need to know if this line is EVER reached.
            //     console.log("--- MESSAGE RECEIVED ON CLIENT ---");
            //     console.log("Event 'receive_dm' was triggered with this data:", messageData);
            //     console.log("---------------------------------");
            //     addMessageToState(messageData);
            // });


            newSocket.on("dm_error", (errorMessage) => {
                console.error("Socket DM Error:", errorMessage);
                // Optionally show a toast notification to the user
            });

            // Cleanup on component unmount OR when currentUser changes
            return () => {
                if (!socketRef.current){
                console.log('Disconnecting chat socket...');
                newSocket.off("dm_error");
                newSocket.disconnect();
                socketRef.current = null;
                }
            };
        }
    }, [currentUser]); // Re-run if currentUser changes

    // --- EFFECT TO FETCH HISTORICAL DMS (with improved error logging) ---
    useEffect(() => {
        // --- ADDED GUARD ---: Ensure we have a valid user before fetching
        if (currentUser && currentUser.id) {
            const fetchDms = async () => {
                try {
                    setIsLoading(true);
                    setError(null);
                    const response = await getUserDMs(); 
                    
                    const users: User[] = [];
                    const messagesMap = new Map<string, DirectMessage[]>();

                    (response.threads || []).forEach((thread: any) => {
                        if (thread.other_user) {
                            users.push({
                                id: thread.other_user.id,
                                fullname: thread.other_user.username, 
                                avatar_url: thread.other_user.avatar_url
                            });
                        }
                        if (thread.messages && thread.other_user) {
                            const sortedMessages = thread.messages.sort(
                                (a: DirectMessage, b: DirectMessage) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                            );
                            messagesMap.set(thread.other_user.id, sortedMessages);
                        }
                    });

                    setAllUsers(users);
                    setMessages(messagesMap);

                } catch (error: any) {
                    // --- IMPROVED LOGGING ---: Log the detailed error from the server
                    console.error("--- DETAILED FETCH ERROR ---");
                    console.error(error);
                    if (error.response) {
                        console.error("Backend Response Data:", error.response.data);
                    }
                    setError("Failed to load conversations. Check console for details.");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchDms();
        }
    }, [currentUser]);


    // Effect to set the active DM based on the URL parameter
    useEffect(() => {
        if (selectedDM) {
            setActiveDmId(selectedDM);
        }
    }, [selectedDM]);
// Empty dependency array is okay here due to the functional updates.
    // Effect for handling incoming socket events

    const handleSendMessage = async (content: string, file: File | null) => {
    if (!currentUser || !activeDmId || !content.trim()) return;

    if (socketRef.current) {
        const dmPayload = {
            senderId: currentUser.id,
            receiverId: activeDmId,
            message: content
        };
        socketRef.current.emit("send_dm", dmPayload);
    }
};

    const handleSelectDm = (userId: string) => {
        setActiveDmId(userId);
        router.push(`/messages?dm=${userId}`);
    };
    
    const conversations = allUsers.map(user => {
        const userMessages = messages.get(user.id) || [];
        const lastMessageObj = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
        let lastMessage = "No messages yet.";
        if (lastMessageObj) {
            lastMessage = lastMessageObj.media_url ? "Sent an attachment" : lastMessageObj.content;
        }
        return { user, lastMessage };
    });

    const activeUser = allUsers.find(u => u.id === activeDmId) || null;
    const activeMessages = activeDmId ? messages.get(activeDmId) || [] : [];

    return (
        <div className="flex h-screen w-full overflow-hidden">
            <div className="w-72 bg-black text-white">
                <ChatList 
                    conversations={conversations} 
                    activeDmId={activeDmId} 
                    onSelectDm={handleSelectDm}
                    isLoading={isLoading} 
                    error={error}
                />
            </div>
            <div className="flex flex-col flex-1 bg-[#1e1e2f]">
                <ChatWindow 
                    activeUser={activeUser}
                    messages={activeMessages} 
                    currentUser={currentUser}
                    onSendMessage={handleSendMessage}
                />
            </div>
        </div>
    );
}