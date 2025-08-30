import { useEffect, useRef, useState } from "react";
import { socket } from "../socket";

export default function Chat({ roomCode, playerId, initialChat = [] }) {
    const [chatMessages, setChatMessages] = useState(initialChat);
    const [newMessage, setNewMessage] = useState("");
    const chatEndRef = useRef(null);

    // Set chat messages if there is chat history
    useEffect(() => {
        setChatMessages(initialChat);
    }, [initialChat]);

    // Listen for messages
    useEffect(() => {
        socket.on("newMessage", (message) => {
            console.log(message);
            setChatMessages((prev) => [...prev, message]);
        });

        return () => {
            socket.off("newMessage");
        };
    }, []);

    // Auto-scroll to bottom when messages update
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    // Send new message
    const sendMessage = () => {
        if (!newMessage.trim()) return;
        socket.emit("sendMessage", { roomCode, playerId, message: newMessage });
        setNewMessage("");
    };

    return (
        <div className="chat">
            {/* Messages Window */}
            <div className="innerChat">
                {chatMessages.map((msg) => (
                    <div key={msg.id} style={{ marginBottom: "4px" }}>
                        <strong>{msg.name}: </strong>
                        <span>{msg.message}</span>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            {/* Input + Button */}
            <div style={{ display: "flex" }}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    style={{ flexGrow: 1, marginRight: "5px" }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            sendMessage();
                        }
                    }}
                />
                <button onClick={sendMessage}>Send</button>
            </div>
        </div>
    );
}
