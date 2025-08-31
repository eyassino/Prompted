import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import Chat from "./Game/Chat";
import { socket } from "./socket";
import React from 'react';
import GameScreen from "./Game/GameScreen";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import {Button} from "@mui/material";
import {Instructions} from "./Helper/Instructions.jsx";

export default function App() {
    const [name, setName] = useState("");
    const [badName, setBadName] = useState(false);
    const [badCode, setBadCode] = useState(false);
    const [roomCode, setRoomCode] = useState("");
    const [inRoom, setInRoom] = useState(false);
    const [players, setPlayers] = useState([]);
    const [playerId, setPlayerId] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [gameStarted, setGameStarted] = useState(false);
    const [altMode, setAltMode] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    // On first load: get or create a persistent playerId
    useEffect(() => {
        let storedId = localStorage.getItem("playerId");
        if (!storedId) {
            storedId = uuidv4();
            localStorage.setItem("playerId", storedId);
        }
        setPlayerId(storedId);
    }, []);

    useEffect(() => {
        socket.on("updatePlayers", (players) => {
            setPlayers(players);
        });
        return () => socket.off("updatePlayers");
    }, []);

    useEffect(() => {
        const handleStartGame = (serverPlayers) => {
            setGameStarted(true);
            socket.emit("gameMode", {roomCode, altMode});
            setPlayers(serverPlayers);
        };
        socket.on("startGame", handleStartGame);
        return () => socket.off("startGame", handleStartGame);
    }, [altMode, roomCode]);

    useEffect(() => {
       socket.on("updateGameMode", (altMode) => {
           setAltMode(altMode);
       });
    });

    const createRoom = () => {
        if (!name) return setBadName(true); else {setBadName(false);}
        socket.emit("createRoom", name, playerId, (code) => {
            setRoomCode(code);
            setInRoom(true);
        });
    };

    const joinRoom = () => {
        if (!roomCode) return setBadCode(true); else {setBadCode(false);}
        socket.emit(
            "joinRoom",
            { roomCode, playerName: name, playerId },
            (res) => {
                if (res.success) {
                    setInRoom(true);
                    setChatHistory(res.chat || []);
                    if (res.rejoined) {
                        console.log("Rejoined existing session as", res.name);
                    }
                } else {
                    setBadCode(true);
                }
            }
        );
    };

    const leaveRoom = () => {
        if (!roomCode) return;
        socket.emit("leaveRoom", { roomCode, playerId });
        setInRoom(false);
        setRoomCode("");
        localStorage.removeItem("roomCode");
    };

    const readyUp = () => {
        socket.emit("readyUp", { roomCode, playerId });
    }

    const handleAltMode = () => {
        const next = !altMode; // Avoid race condition with emit
        setAltMode(next);
        if (roomCode) {
            socket.emit("gameMode", { roomCode, altMode: next });
        }
    }

    useEffect(() => {
        if (roomCode) localStorage.setItem("roomCode", roomCode);
    }, [roomCode]);

    document.addEventListener("mousemove", e => {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        const rect = document.querySelector(".game-title").getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const distance = Math.sqrt(dx*dx + dy*dy);

        // Glow intensity inversely proportional to distance
        const maxDistance = 300; // pixels
        const intensity = Math.max(0, (maxDistance - distance) / maxDistance);

        document.body.style.setProperty("--mouse-x", x + "%");
        document.body.style.setProperty("--mouse-y", y + "%");

        // Update text-shadow based on intensity
        document.querySelector(".game-title").style.textShadow = `
        0 0 ${5 + 10*intensity}px rgba(255,126,179,${0.3 + 0.3*intensity}),
        0 0 ${10 + 15*intensity}px rgba(122,252,255,${0.2 + 0.2*intensity})`;
    });

    function handleShowGuide() {
        setShowGuide(!showGuide);
    }

    if (!inRoom) {
        return (
            <div className="main-body">
                <h1 className="game-title">Prompted</h1>
                <Instructions hidden={!showGuide} onHide={handleShowGuide} />
                <Box sx={{ '& button': { m: 1 } }}>
                    <div>
                        <TextField
                            sx={{
                                // Input text
                                "& .MuiInputBase-input": { color: "white" },
                                // Label
                                "& .MuiInputLabel-root": { color: "white" },
                                // Underline colors for standard variant
                                "& .MuiInput-underline:before": {
                                    borderBottomColor: "rgba(255,255,255,0.42)",
                                },
                                "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
                                    borderBottomColor: "#fff",
                                }
                            }}
                            error={badName}
                            color="secondary"
                            label="Your name"
                            variant="standard"
                            helperText={badName ? "Enter your name" : ""}
                            value={name}
                            required
                            onChange={(e) => setName(e.target.value)}
                        />
                        <Button
                            sx={{
                                "&:hover": {
                                    backgroundColor: "rgba(255,255,255,0.05)",
                                    borderColor: "rgb(209, 44, 205)",
                                    color: "rgb(209, 44, 205)"
                                }
                            }}
                            variant="outlined"
                            color="secondary"
                            onClick={createRoom}
                        >
                            Create Room
                        </Button>
                    </div>
                    <div>
                        <TextField
                            sx={{
                                // Input text
                                "& .MuiInputBase-input": { color: "white" },
                                // Label
                                "& .MuiInputLabel-root": { color: "white" },
                                // Underline colors for standard variant
                                "& .MuiInput-underline:before": {
                                    borderBottomColor: "rgba(255,255,255,0.42)",
                                },
                                "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
                                    borderBottomColor: "#fff",
                                }
                            }}
                            color="secondary"
                            error={badCode}
                            label="Room code"
                            variant="standard"
                            helperText={badCode ? "Enter a valid room code" : ""}
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        />
                        <Button
                            sx={{
                                paddingRight: 2 + 'em',
                                paddingLeft: 2 + 'em',
                                "&:hover": {
                                    backgroundColor: "rgba(255,255,255,0.05)",
                                    borderColor: "rgb(209, 44, 205)",
                                    color: "rgb(209, 44, 205)"
                                }
                            }}
                            variant="outlined"
                            color="secondary"
                            onClick={joinRoom}
                        >
                            Join Room
                        </Button>
                    </div>
                    <Button
                        sx={{
                            float: "right",
                            marginTop: 1 + `em`,
                            "&:hover": {
                                backgroundColor: "rgba(255,255,255,0.05)",
                                borderColor: "rgb(209, 44, 205)",
                                color: "rgb(209, 44, 205)"
                            }
                        }}
                        variant="outlined"
                        color="secondary"
                        onClick={handleShowGuide}
                    >
                        Guide
                    </Button>
                </Box>
            </div>
        );
    }

    return (
        <React.Fragment>
            {!gameStarted ?
                <div className="main-body">
                    <div>
                        <h1>Room {roomCode}</h1>
                        <h2>Players:</h2>
                        <ul>
                            {players.map((p) => (
                                <li style={{ color: p.ready ? "green" : "white" }} key={p.playerId}>{p.name}</li>
                            ))}
                        </ul>
                        <button style={{marginRight: 1 + 'em'}} onClick={readyUp}>
                            Ready Up
                        </button>
                        <button onClick={leaveRoom}>
                            Leave Room
                        </button>
                        <input id="altMode" type={"checkbox"} onClick={handleAltMode} checked={altMode}></input>
                        <label htmlFor="altMode">Alt gamemode</label>
                    </div>
                </div>
                : <GameScreen playerId={playerId} initialPlayers={players} roomCode={roomCode} altMode={altMode}/>
            }
        <Chat roomCode={roomCode} playerId={playerId} initialChat={chatHistory}/>
        </React.Fragment>
    );
}