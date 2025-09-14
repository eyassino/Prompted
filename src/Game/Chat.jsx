import { useEffect, useRef, useState } from "react";
import { socket } from "../socket";
import {Button} from "@mui/material";
import TextField from "@mui/material/TextField";

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
            <div className="innerChat">
                {chatMessages.map((msg) => (
                    <div key={msg.id} style={{ marginBottom: "4px", wordWrap: "break-word", overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
                        <strong><u>{msg.name}</u>: </strong>
                        <span>{msg.message}</span>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
            <div style={{ margin: "5%", display: "flex" }}>
                <TextField
                    sx={{
                        // Input text
                        "& .MuiInputBase-input": { color: "white" },
                        // Label
                        "& .MuiInputLabel-root": { color: "white" },
                        '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                                borderColor: 'purple',
                            },
                            '&:hover fieldset': {
                                borderColor: "rgb(209, 44, 205)",
                            },
                        }
                    }}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    label="Message"
                    color="secondary"
                    variant="outlined"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            sendMessage();
                        }
                    }}
                />
                <Button
                    sx={{
                        marginLeft: 1 + "em",
                        backgroundColor: "#2c0e38",
                        "&:hover": {
                            backgroundColor: "#5a1d73",
                        },
                        border: "1px solid purple",
                    }}
                    variant="contained"
                    color="secondary"
                    onClick={sendMessage}
                >Send</Button>
            </div>
        </div>
    );
}
