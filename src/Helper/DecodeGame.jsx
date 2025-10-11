import React, {useEffect, useMemo, useState} from "react";
import { socket } from "../socket";
import {Button, TextField, Badge, Card, CardContent, Typography, Grid} from "@mui/material";
import Box from "@mui/material/Box";

export function DecodeGame({ roomCode, playerId }) {
    const [scrambled, setScrambled] = useState("");
    const [guess, setGuess] = useState("");
    const [miniGameGuesses, setMiniGameGuesses] = useState({});
    const [badGuess, setBadGuess] = useState(false);

    useEffect(() => {
        const onUpdate = (payload) => {
            const nextWord = typeof payload === "string" ? payload : payload?.word;
            setScrambled(nextWord || "");
            setGuess("");
        };

        const miniGameGuessesUpdate = (payload) => {
            setMiniGameGuesses(payload || {});
        };

        socket.on("updateScrambledWord", onUpdate);
        socket.on("updateMiniGameGuesses", miniGameGuessesUpdate);

        if (roomCode && socket.connected) {
            socket.emit("requestMiniGameWord", { roomCode }, (data) => {
                if (data?.word) setScrambled(data.word);
                if (data?.playerGuesses) (setMiniGameGuesses(data.playerGuesses) || {});
            });
        } else {
            const onConnect = () => {
                if (roomCode) {
                    socket.emit("requestMiniGameWord", { roomCode }, (data) => {
                        if (data?.word) setScrambled(data.word);
                        if (data?.playerGuesses) (setMiniGameGuesses(data.playerGuesses) || {});
                    });
                }
            };
            socket.on("connect", onConnect);
            return () => {
                socket.off("updateScrambledWord", onUpdate);
                socket.off("updateMiniGameGuesses", miniGameGuessesUpdate);
                socket.off("connect", onConnect);
            };
        }

        return () => {
            socket.off("updateScrambledWord", onUpdate);
            socket.off("updateMiniGameGuesses", miniGameGuessesUpdate);
        };
    }, [roomCode]);

    const submitGuess = () => {
        if (!guess.trim()) return;
        if (guess.length <= 20) {
            socket.emit("submitUnscrambleGuess", {roomCode, playerId, guess});
            setGuess("");
            setBadGuess(false);
        } else {
            setBadGuess(true);
        }
    };

    const waitingCards = useMemo(() => {
        return Object.entries(miniGameGuesses).map(([pid, list]) => {
            const arr = Array.isArray(list) ? list : [];
            const name = arr[0]?.name || "";
            const last4 = arr.slice(-4);
            return {
                playerId: pid,
                name,
                guesses: last4.map(x => ({ guess: x.guess, mask: x.mask || [] })),
                miniGameScore: arr[0]?.score || 0
            };
        });
    }, [miniGameGuesses]);

    const renderColoredGuess = (g, mask) => {
        if (!Array.isArray(mask) || mask.length === 0) return <>{g}</>;
        const spans = [];
        const len = g.length;
        for (let i = 0; i < len; i++) {
            const ch = g[i];
            const correct = !!mask[i];
            spans.push(
                <span key={i} style={{ color: correct ? "#3DDC84" : "white" }}>
                    {ch}
                </span>
            );
        }
        return <>{spans}</>;
    };

    return (
        <div style={{ marginTop: 1 + "em", textAlign: "center" }}>
            <div>In the meantime... try to decode some words:</div>
            <div style={{ marginTop: 1 + "em" }}>
                {scrambled || "Waiting for word..."}
            </div>
            <div style={{ marginTop: 1 + "em" }}>
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
                error={badGuess}
                color="secondary"
                label="Your Guess"
                variant="standard"
                value={guess}
                required
                slotProps={{ htmlInput: { maxLength: 20 } }}
                onChange={(e) => {
                    setGuess(e.target.value);
                    if (badGuess) {
                        setBadGuess(false);
                    }
                }}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        submitGuess();
                    }
                }}
            />
                <Button
                    sx={{marginLeft: 1 + "em"}}
                    color="secondary"
                    variant="outlined"
                    onClick={submitGuess}
                >
                    Guess
                </Button>
            </div>
            <Grid container spacing={1} sx={{justifyContent: "center", alignItems: "center", minWidth: "80%"}}>
                {waitingCards.map((p) => (
                    <React.Fragment>
                        {p.name ? (
                            <Grid item key={p.playerId}>
                                <Box sx={{display: "flex", flexDirection: "column", alignItems: "center"}}>
                                    <Card
                                        sx={{ overflow: "visible" }}
                                        style={{ backgroundColor: `rgba(120, 38, 153, 0.3)`, margin: 1 + `em` }}
                                    >
                                        <Badge badgeContent={p.miniGameScore} color="secondary" anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                                            <CardContent>
                                                <Typography style={{ color: "white" }}>
                                                    {p.name}
                                                </Typography>
                                            </CardContent>
                                        </Badge>
                                    </Card>
                                    <Box display="flex" flexDirection="column-reverse">
                                        {p.guesses.length > 0 && p.guesses.map((g, idx) => (
                                            g.guess.length > 0 && (
                                                <Typography style={{ color: "white"}} key={idx}>
                                                    • {renderColoredGuess(g.guess, g.mask)}
                                                </Typography>
                                            )
                                        ))}
                                    </Box>
                                </Box>
                            </Grid>
                        ) : null}
                    </React.Fragment>
                ))}
            </Grid>
        </div>
    );
}