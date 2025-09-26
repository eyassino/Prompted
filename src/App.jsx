import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import Chat from "./Game/Chat";
import { socket } from "./socket";
import React from 'react';
import GameScreen from "./Game/GameScreen";
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import {
    Button,
    Card, CardContent,
    createTheme,
    FormControlLabel,
    FormGroup, Grid,
    Switch,
    ThemeProvider, Tooltip, Typography
} from "@mui/material";
import { createLobbyHandlers } from "./socketEvents/lobbyEvents.jsx"
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import {Instructions} from "./Helper/Instructions.jsx";
import useSound from 'use-sound'
import readySound from "./assets/ready.mp3";
import joinSound from "./assets/join.mp3";
import dcSound from "./assets/dc.mp3";

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
    const [lobbyLeader, setLobbyLeader] = useState(false);
    const [currentPhase, setCurrentPhase] = useState("promptPick");
    const [playReadySound] = useSound(readySound, { volume: 0.3 });
    const [playJoinSound] = useSound(joinSound, { volume: 0.3 });
    const [playDCSound] = useSound(dcSound, { volume: 0.3 });

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
        const handlers = createLobbyHandlers({
            setPlayers,
            setLobbyLeader,
            setGameStarted,
            setAltMode,
            playReadySound,
            playJoinSound,
            playDCSound,
            playerId
        })
        for (const [event, handler] of Object.entries(handlers)) {
            socket.on(event, handler);
        }

        return () => {
            for (const [event, handler] of Object.entries(handlers)) {
                socket.off(event, handler);
            }
        };
    }, [altMode, playDCSound, playJoinSound, playReadySound, playerId, roomCode]);

    const createRoom = () => {
        if (!name || (name.length > 15) || name.replace(/\s+/g, ' ').trim() === "") return setBadName(true); else {setBadName(false);}
        socket.emit("createRoom", name.replace(/\s+/g, ' ').trim(), playerId, (code) => {
            setRoomCode(code);
            setInRoom(true);
        });
    };

    const joinRoom = () => {
        if (!name || (name.length > 15) || name.replace(/\s+/g, ' ').trim() === "") {
            setBadName(true);
            return;
        }
        if (!roomCode || (roomCode.length > 4)) {
            setBadCode(true);
            return;
        }
        setBadName(false);
        setBadCode(false);
        socket.emit(
            "joinRoom",
            { roomCode, playerName: name.replace(/\s+/g, ' ').trim(), playerId },
            (res) => {
                if (res.success) {
                    setInRoom(true);
                    setChatHistory(res.chat || []);
                    if (res.rejoined){
                        setGameStarted(true);
                        setCurrentPhase(res.phase || "promptPick");
                        socket.emit("requestSync", {roomCode, playerId});
                    }
                } else {
                    setBadCode(true);
                }
                if (res.leader) {
                    setLobbyLeader(true);
                }
            }
        );
    };

    const leaveRoom = () => {
        if (!roomCode) return;
        socket.emit("leaveRoom", { roomCode, playerId });
        setInRoom(false);
        setRoomCode("");
        setGameStarted(false);
        localStorage.removeItem("roomCode");
    };

    const readyUp = () => {
        socket.emit("readyUp", { roomCode, playerId });
    }

    const handleAltMode = () => {
        if(!lobbyLeader) return;
        const next = !altMode; // Avoid race condition with emit
        setAltMode(next);
        if (roomCode) {
            socket.emit("gameMode", { roomCode, altMode: next });
        }
    }

    const buttonTheme = createTheme({
        components: {
            MuiButton: {
                styleOverrides: {
                    root: {
                        "&:hover": {
                            backgroundColor: "rgba(255,255,255,0.05)",
                            borderColor: "rgb(209, 44, 205)",
                            color: "rgb(209, 44, 205)"
                        },
                    },
                },
            }
        }
    });

    const handleLeaveLobbyFromGame = () => {
        leaveRoom();
    };

    const handlePlayAgainFromGame = (keepScores) => {
        if (roomCode) {
            socket.emit("playAgain", { roomCode, keepScores });
        }
    };


    useEffect(() => {
        if (roomCode) localStorage.setItem("roomCode", roomCode);
    }, [roomCode]);

    useEffect(() => {
        function handleMouseMove(e) {
            const x = (e.clientX / window.innerWidth) * 100;
            const y = (e.clientY / window.innerHeight) * 100;

            const titleElem = document?.querySelector(".game-title");
            if (titleElem) {
                const rect = titleElem.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                const dx = e.clientX - centerX;
                const dy = e.clientY - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Glow intensity inversely proportional to distance
                const maxDistance = 300; // pixels
                const intensity = Math.max(0, (maxDistance - distance) / maxDistance);

                // Update text-shadow based on intensity
                titleElem.style.textShadow = `
                    0 0 ${5 + 10 * intensity}px rgba(255,126,179,${0.3 + 0.3 * intensity}),
                    0 0 ${10 + 15 * intensity}px rgba(122,252,255,${0.2 + 0.2 * intensity})`;
            }

            document.body.style.setProperty("--mouse-x", x + "%");
            document.body.style.setProperty("--mouse-y", y + "%");
        }

        document.addEventListener("mousemove", handleMouseMove);

        // Cleanup on unmount or when gameStarted changes
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
        };
    }, [gameStarted]);


    function handleShowGuide() {
        setShowGuide(!showGuide);
    }

    if (!inRoom) {
        return (
            <div className="main-body">
                <h1 className="game-title">Prompted</h1>
                <Instructions hidden={!showGuide} onHide={handleShowGuide} />
                    <Box sx={{ '& button': { m: 1 } }}>
                        <ThemeProvider theme={buttonTheme}>
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
                                helperText={badName ? name.length > 15 ? "Enter a shorter name" : "Enter a valid name" : ""}
                                value={name}
                                required
                                slotProps={{ htmlInput: { maxLength: 15 } }}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (badName) {
                                        setBadName(false);
                                    }
                                }}
                            />
                            <Button
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
                                slotProps={{ htmlInput: { maxLength: 4 } }}
                                onChange={(e) => {
                                    setRoomCode(e.target.value.toUpperCase());
                                    if (badCode) {
                                        setBadCode(false);
                                    }
                                }}
                            />
                            <Button
                                sx={{
                                    paddingRight: 2 + 'em',
                                    paddingLeft: 2 + 'em',
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
                            }}
                            variant="outlined"
                            color="secondary"
                            onClick={handleShowGuide}
                        >
                            Guide
                        </Button>
                    </ThemeProvider>
                </Box>
            </div>
        );
    }

    return (
        <React.Fragment>
            <ThemeProvider theme={buttonTheme}>
                {!gameStarted ?
                    <div className="main-body">
                        <h1 className="game-title">Room {roomCode}</h1>
                        <div>
                            <Button
                                style={{marginRight: 1 + 'em'}}
                                variant="outlined"
                                color="secondary"
                                onClick={readyUp}
                            >
                                {"Ready Up " + players.filter(p => p.ready).length + "/" + (players.length > 3 ? players.length : "3")}
                            </Button>
                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={leaveRoom}
                            >
                                Leave Room
                            </Button>
                        </div>
                        <FormGroup>
                            <div style={{ marginTop: 1 + `em`}}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            id="altMode"
                                            onClick={handleAltMode}
                                            checked={altMode}
                                            color="secondary"
                                            name="Alternate mode"
                                            label="Alternate mode"
                                            disabled={lobbyLeader ? "" : "disabled"}
                                        />
                                    }
                                    label="Alternate mode"
                                    sx={{
                                        ".MuiFormControlLabel-label": {
                                            color: altMode ? "purple" : "white"
                                        }
                                    }}
                                />
                                <Tooltip title="One prompt mode, imposter gets censored version of the prompt">
                                    <HelpOutlineIcon/>
                                </Tooltip>
                            </div>
                        </FormGroup>
                        <Grid container spacing={1} className="center-container">
                            {players.map((p) => (
                                <Card key={p.playerId}
                                      className={`player-card ${p.ready ? 'ready-glow' : ''}`}
                                      style={{
                                        backgroundColor:
                                            p.leader ? `rgba(255, 215, 0, 0.8)` : `rgba(120, 38, 153, 0.3)`,
                                        margin: 1 + `em`
                                    }}
                                      >
                                    <CardContent>
                                        <Typography style={{ color: p.leader ? "black" : "white" }}>
                                            {p.name}
                                            <br/>
                                            <br/>
                                            <span style={{color: p.ready ? "green" : "darkred"}} >{p.ready ? "Ready" : "Not ready"} </span>
                                        </Typography>
                                    </CardContent>
                                </Card>
                            ))}
                        </Grid>
                    </div>
                    : <GameScreen
                        playerId={playerId}
                        initialPlayers={players}
                        roomCode={roomCode}
                        altMode={altMode}
                        onLeaveLobby={handleLeaveLobbyFromGame}
                        onPlayAgain={handlePlayAgainFromGame}
                        currentPhase={currentPhase}
                    />
                }
                <Chat roomCode={roomCode} playerId={playerId} initialChat={chatHistory}/>
            </ThemeProvider>
        </React.Fragment>
    );
}