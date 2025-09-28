import { socket } from "../socket";
import React, {useEffect, useMemo, useState} from "react";
import {Button, Grid, LinearProgress, Stack} from "@mui/material";
import TextField from "@mui/material/TextField";
import prompts from "../assets/prompts.json";
import {Card, CardContent, Typography, Badge, FormControlLabel, Switch} from "@mui/material";
import TypingText from "../Helper/typing.jsx";
import { useInView } from "react-intersection-observer";
import { BarChart } from '@mui/x-charts/BarChart';
import Box from "@mui/material/Box";
import { createImposterGameHandlers } from "../socketEvents/imposterGameEvents.jsx";
import useSound from 'use-sound'
import readySound from "../assets/ready.mp3";
import joinSound from "../assets/join.mp3";
import dcSound from "../assets/dc.mp3";
import tickingSound from "../assets/ticking.mp3";

export default function GameScreen({
                                       playerId,
                                       initialPlayers,
                                       roomCode,
                                       altMode,
                                       onLeaveLobby,
                                       onPlayAgain,
                                       currentPhase
                                   }) {

    //Prompts
    const [prompt, setPrompt] = useState("");
    const [impPrompt, setImpPrompt] = useState("");
    const [currentPrompt, setCurrentPrompt] = useState("");
    const [finalPrompts, setFinalPrompts] = useState({});
    const [players, setPlayers] = useState(initialPlayers);
    const [promptData, setPromptData] = useState({ regularPrompts: [], imposterPrompts: [] });

    //Player related
    const [playerAnswer, setPlayerAnswer] = useState("");
    const [answers, setAnswers] = useState([]);
    const [votedOut, setVotedOut] = useState(null);
    const [imposter, setImposter] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState([]);
    const [fakePlayer, setFakePlayer] = useState("");
    const [lobbyLeader, setLobbyLeader] = useState(players.find(p => p.leader && p.playerId === playerId) !== undefined);

    //flags
    const [phase, setPhase] = useState(currentPhase || "promptPick");
    const [gameDone, setGameDone] = useState(false);
    const [noImposters, setNoImposters] = useState(false);
    const [typingIsDone, setTypingIsDone] = useState(false);
    const [fakeOut, setFakeOut] = useState(false);
    const [badPrompt, setBadPrompt] = useState(false);
    const [badImpPrompt, setImpBadPrompt] = useState(false);
    const [badAnswer, setBadAnswer] = useState(false);
    const [keepScores, setKeepScores] = useState(false);
    const [badVote, setBadVote] = useState(false);
    const [waiting, setWaiting] = useState(false);
    const [tickingPlayed, setTickingPlayed] = useState(false);

    //counters
    const [voteCounts, setVoteCounts] = useState({});
    const [playAgainCount, setPlayAgainCount] = useState(0);
    const PHASE_MS = 120000;

    //sounds
    const [playReadySound] = useSound(readySound, { volume: 0.3 });
    const [playJoinSound] = useSound(joinSound, { volume: 0.3 });
    const [playDCSound] = useSound(dcSound, { volume: 0.3 });
    const [playTickingSound] = useSound(tickingSound, { volume: 0.3 });

    //timers
    const [timerDeadline, setTimerDeadline] = useState(null);
    const [timerPhase, setTimerPhase] = useState(null);
    const [dateNow, setDateNow] = useState(Date.now());

    useEffect(() => {
        if (!timerDeadline) return;
        const t = setInterval(() => setDateNow(Date.now()), 200);
        return () => clearInterval(t);
    }, [timerDeadline]);

    const { msRemaining, percentRemaining } = useMemo(() => {
        if (!timerDeadline) return { msRemaining: 0, percentRemaining: 0 };
        const remaining = Math.max(0, timerDeadline - dateNow);
        const pct = Math.max(0, Math.min(100, (remaining / PHASE_MS) * 100));
        return { msRemaining: remaining, percentRemaining: pct };
    }, [timerDeadline, dateNow]);

    const formattedTime = useMemo(() => {
        const totalSec = Math.ceil(msRemaining / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        if (totalSec === 10 && !tickingPlayed) {
            setTickingPlayed(true);
            playTickingSound();
        }
        return `${m}:${String(s).padStart(2, "0")}`;
    }, [msRemaining, playTickingSound, tickingPlayed]);

    const sendPrompt = () => {
        if(!prompt || prompt.length > 115) {
            return setBadPrompt(true);
        } else {
            setBadPrompt(false);
        }
        if((!impPrompt && !altMode) || (impPrompt.length > 115 && altMode)) {
            return setImpBadPrompt(true);
        } else {
            setImpBadPrompt(false);
        }
        socket.emit("sendPrompt", {roomCode, playerId, prompt, impPrompt});
        setWaiting(true);
    };

    useEffect(() => {
        const eventHandlers = createImposterGameHandlers ({
            setPlayers,
            setLobbyLeader,
            playerId,
            setPrompt,
            setImpPrompt,
            setCurrentPrompt,
            setFinalPrompts,
            setAnswers,
            setVotedOut,
            setImposter,
            setSelectedPlayer,
            setFakePlayer,
            setPhase,
            setGameDone,
            setKeepScores,
            setPlayAgainCount,
            setVoteCounts,
            setNoImposters,
            setTypingIsDone,
            setFakeOut,
            setPlayerAnswer,
            playReadySound,
            playJoinSound,
            playDCSound,
            setWaiting,
            setTimerDeadline,
            setTimerPhase,
            setTickingPlayed
        })

        for (const [event, handler] of Object.entries(eventHandlers)) {
            socket.on(event, handler);
        }

        return () => {
            for (const [event, handler] of Object.entries(eventHandlers)) {
                socket.off(event, handler);
            }
        };
    }, [playDCSound, playJoinSound, playReadySound, playerId]);

    useEffect(() =>{ // in case listeners are built after emits (had issue with timer)
        socket.emit("requestSync", {roomCode, playerId});
    },[]);

    const submitAnswer = () => {
        if(!playerAnswer || playerAnswer.length > 115) {
            return setBadAnswer(true);
        } else {
            setBadAnswer(false);
        }
        socket.emit("submitAnswer", { roomCode, playerId, answer: playerAnswer });
        setWaiting(true);
    };

    const lockInVote = () => {
        if (!selectedPlayer.length) {
            setBadVote(true);
            return;
        }
        socket.emit("submitVote", { roomCode, playerId });
        setWaiting(true);
    };

    const votePlayer = (e, selection) => {
        if (!selectedPlayer.includes(selection)) {
            selectedPlayer.push(selection);
            setBadVote(false);
        } else if (!waiting) {
            selectedPlayer.splice(selectedPlayer.indexOf(selection), 1);
        }
        socket.emit("votePlayer", {roomCode, playerId, votedPlayerIds: selectedPlayer});
    };

    const sendStartNextRound = () => {
        if (lobbyLeader) {
            socket.emit("nextRound", {roomCode});
        }
    };

    const handleEndGame = () => {
        if (lobbyLeader) {
            socket.emit("gameDone", {roomCode});
        }
    };

    useEffect(() => {
        setPromptData(prompts);
    }, []);

    const pickRandomPrompts = () => {
        const minLength = Math.min(
            promptData.regularPrompts.length,
            promptData.imposterPrompts.length
        );
        if (minLength === 0) return;

        const index = Math.floor(Math.random() * minLength);
        const regChosen = promptData.regularPrompts[index];
        const impChosen = promptData.imposterPrompts[index];

        if (altMode) {
            setPrompt(regChosen);
        } else {
            setPrompt(regChosen);
            setImpPrompt(impChosen);
        }
    }

    const handleTypingDone = () => {
        setTypingIsDone(true);
    }

    const [ref, inView] = useInView({
        triggerOnce: true,
        threshold: 0.5
    });

    const handlePlayAgain = () => {
        if (lobbyLeader) {
            if (roomCode) socket.emit("playAgain", {roomCode, keepScores});
            onPlayAgain?.(keepScores);
        }
        else {
            socket.emit("playAgainVote", { roomCode, playerId });
        }
    }

    const handleKeepScore = () => {
        if (!lobbyLeader) return;
            const next = !keepScores; // Avoid race condition with emit
            setKeepScores(next);
            socket.emit("keepScore", { roomCode, keepScores: next });
    }

    const showTimerBar = (phase === "promptPick" || phase === "answer" || phase === "voting")
        && timerPhase === phase
        && !!timerDeadline;

    return (
        <React.Fragment>
            <div className="game-title" style={{position: "absolute", bottom: "5%", left: "3%", fontSize: "3rem"}}>{roomCode}</div>
            <div className="main-body">

                {showTimerBar ? (
                    <div style={{ width: "60%", margin: "1em auto" }}>
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
                            <span style={{ color: msRemaining <= 10000 ? "#ff6b6b" : "white", fontVariantNumeric: "tabular-nums" }}>
                                {formattedTime}
                            </span>
                        </div>
                        <LinearProgress
                            variant="determinate"
                            value={percentRemaining}
                            sx={{
                                height: 10,
                                borderRadius: 5,
                                "& .MuiLinearProgress-bar": {
                                    backgroundColor: msRemaining <= 10000 ? "#ff6b6b" : "#782699"
                                },
                                backgroundColor: "rgba(255,255,255,0.15)"
                            }}
                            color="secondary"
                        />
                    </div>
                ) : null}

                <Grid container spacing={1} sx={{justifyContent: "center", alignItems: "center", maxWidth: "60%"}}>
                    {players.map((p) => (
                        <Card
                            sx={{ overflow: "visible" }}
                            style={{ backgroundColor: p.leader ? `rgba(255, 215, 0, 0.8)` : `rgba(120, 38, 153, 0.3)`, margin: 1 + `em` }}
                            key={p.playerId}
                            className={`player-card ${p.ready ? 'ready-glow' : ''}`}
                        >
                            <Badge badgeContent={p.score} color="secondary" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} showZero={true}>
                                <CardContent>
                                    <Typography style={{ color: p.leader ? "black" : "white" }}>
                                        {p.name}
                                    </Typography>
                                </CardContent>
                           </Badge>
                        </Card>
                    ))}
                </Grid>
                {phase === "promptPick" ? (
                    !waiting ? (
                        <div style={{display: "flex", justifyContent: "center", flexDirection: "column", alignItems: "center", width: "100%", marginTop: 4 + "em"}}>
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
                                    },
                                    width: "50%"
                                }}
                                color="secondary"
                                variant="outlined"
                                style={{marginBottom: 1 + 'em', marginTop: 1 + 'em'}}
                                value={prompt}
                                label={altMode ? "Prompt" : "Regular Prompt"}
                                error={badPrompt}
                                helperText={badPrompt ? prompt.length > 115 ? "Enter a shorter prompt" : "Enter a prompt" : ""}
                                slotProps={{ htmlInput: { maxLength: 115 } }}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                            {!altMode ? (
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
                                        },
                                        width: "50%"
                                    }}
                                    color="secondary"
                                    variant="outlined"
                                    style={{marginBottom: 1 + 'em'}}
                                    value={impPrompt}
                                    label="Imposter's Prompt"
                                    error={badImpPrompt}
                                    helperText={badImpPrompt ? impPrompt.length > 115 ? "Enter a shorter prompt" : "Enter an imposter prompt" : ""}
                                    slotProps={{ htmlInput: { maxLength: 115 } }}
                                    onChange={(e) => setImpPrompt(e.target.value)}
                                />
                            ) : null}
                            <div style={{width: "50%"}}>
                                <Button
                                    sx={{
                                        float: "left"
                                    }}
                                    color="secondary"
                                    variant="outlined"
                                    onClick={pickRandomPrompts}
                                >
                                    Pick for me!
                                </Button>
                                <Button
                                    sx={{
                                        float: "right"
                                    }}
                                    color="secondary"
                                    variant="outlined"
                                    style={{marginBottom: 1 + 'em'}} onClick={sendPrompt}>
                                    Send prompt
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div>Prompt sent! Waiting for others...</div>
                    )
                ) : null}
                {phase === "answer" ? (
                    !waiting ? (
                    <div style={{width: "40%",marginTop: 4 + "em"}}>
                        <div style={{width: "100%"}}>
                            {currentPrompt}
                        </div>
                        <div style={{marginTop: 1 + "em"}}>
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
                                    },
                                    width: "100%",
                                    marginRight: 1 + "em"
                                }}
                                color="secondary"
                                variant="outlined"
                                value={playerAnswer}
                                error={badAnswer}
                                helperText={badAnswer ? playerAnswer.length > 115 ? "Enter a shorter answer" : "Enter an answer" : ""}
                                slotProps={{ htmlInput: { maxLength: 115 } }}
                                onChange={e => setPlayerAnswer(e.target.value)}
                                label="Your answer"
                            />
                            <Button
                                sx={{
                                    marginTop: 1 + "em",
                                    float: "right"
                                }}
                                color="secondary"
                                variant="outlined"
                                onClick={submitAnswer}>Submit Answer
                            </Button>
                        </div>
                    </div>
                    ) : (
                    <div>Waiting for others to finish answering :)</div>
                    )
                ): null}
                {phase === "voting" ? (
                    <div className="center-container">
                        <div style={{border: "2px dashed purple", padding: 1 + "em"}}>
                            <div>{waiting ? "Voted! Waiting for everyone to finish voting..." : "Discuss! who do you think the imposter is?"}</div>
                            <br/>
                            <div><strong>The prompt was:</strong> {currentPrompt} </div>
                        </div>
                            <Box sx={{marginTop: 1 + "em", border: "2px dashed purple", maxHeight: "50vh", overflow: "auto"}}>
                            {answers.map((a) => (
                                <Card
                                    sx={{ overflow: "visible" }}
                                    className="card-selectable"
                                    style={{ backgroundColor: selectedPlayer.includes(a.playerId) ? "purple" : `rgba(120, 38, 153, 0.3)`}}
                                    key={a.playerId}
                                    onClick={e => {
                                    if (!waiting)
                                        votePlayer(e, a.playerId);
                                }}>
                                    <Badge badgeContent={voteCounts[a.playerId]} color="secondary" anchorOrigin={{ vertical: 'top', horizontal: 'right' }} sx={{minWidth: "100%"}}>
                                        <CardContent>
                                            <Typography style={{ color: "white" }}>
                                                {a.name}
                                                <br/>
                                                <br/>
                                                <span>{a.answer} </span>
                                            </Typography>
                                        </CardContent>
                                    </Badge>
                                </Card>
                            ))}
                            </Box>
                        <Stack direction="row" alignItems="center" justifyContent="center" sx={{marginTop: 1 + "em"}}>
                            <Card
                                style={{
                                    backgroundColor: selectedPlayer.includes("0") ? "purple" : `rgba(120, 38, 153, 0.3)`,
                                    cursor: "pointer",
                                    overflow: "visible"
                                }}
                                onClick={e => {
                                    if (!waiting)
                                        votePlayer(e, "0");
                                }}
                            >
                                <Badge badgeContent={voteCounts["0"]} color="secondary" anchorOrigin={{ vertical: 'top', horizontal: 'right' }} sx={{minWidth: "100%"}}>
                                    <CardContent>
                                        <Typography sx={{ color: "white", textAlign: "center"}}>
                                            {"No imposter this round!"}
                                        </Typography>
                                    </CardContent>
                                </Badge>
                            </Card>
                        </Stack>
                        {!waiting ? (
                            <Stack direction="column" alignItems="center" justifyContent="center" sx={{marginTop: 2 + "em", minWidth: "50%"}}>
                                <Button
                                    sx={{
                                        marginLeft: "auto"
                                    }}
                                    color={badVote ? "error" :"secondary"}
                                    variant="outlined"
                                    onClick={lockInVote}
                                >Lock in</Button>
                                {badVote ? (
                                <span style={{color: "darkred", marginTop: 1 + "em"}}>Vote for something!</span>
                                ) : null}
                            </Stack>
                        ) : null}
                    </div>
                ) : null}
                {phase === "reveal" && (
                    <div className="center-container">
                        <Box component="section" sx={{
                            padding:  2,
                            border: "2px dashed purple",
                            marginBottom: 1 + "em"
                        }}>
                            <div>
                                {imposter.length === 0 ? (
                                    <strong>No imposters this round!</strong>
                                ) : (
                                    <React.Fragment>
                                        <strong>
                                            The <span style={{color: "red"}}>imposter{imposter.length > 1 ? "s" : ""}</span> {imposter.length > 1 ? "were" : "was"}:{" "}
                                        </strong>
                                        {(() => {
                                            const names = players.filter(p => imposter.includes(p.playerId)).map(p => p.name).join(", ");
                                            return (
                                                <TypingText
                                                    typingDone={handleTypingDone}
                                                    fakeOut={fakeOut}
                                                    eraseText={fakeOut ? fakePlayer : names}
                                                    finalText={names}
                                                />
                                            );
                                        })()}
                                    </React.Fragment>
                                )}
                            </div>
                            <br/>
                            <div><strong style={{color: "green"}}>Prompt:</strong> {finalPrompts.prompt}</div>
                            <br/>
                            <div><strong><span style={{color: "red"}}>Imposter{imposter.length !== 1 ? "s" : ""}</span> Prompt{imposter.length !== 1 ? "s" : ""}:</strong> {finalPrompts.impPrompt}</div>
                        </Box>
                        {!noImposters ? (
                            <React.Fragment>
                                <div><strong>Majority of you voted for:</strong></div>
                                <div style={{display: "flex", justifyContent: "center", flexDirection: "row", alignItems: "center", border: "2px dashed purple", marginTop: 1 + "em"}}>
                                    {Array.isArray(votedOut) ? votedOut.map((p) => (
                                        <Card
                                            style={{ backgroundColor: `rgba(120, 38, 153, 0.3)`, margin: 1 + `em`}}
                                            key={p.playerId}
                                        >
                                            <CardContent>
                                                <Typography style={{ color: "white" }}>
                                                    {p.name}
                                                    <br/>
                                                    <br/>
                                                    <span>Answered with: {p.answer} </span>
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    )) : null}
                                </div>
                                {typingIsDone && Array.isArray(votedOut) && votedOut.length > 0 && !votedOut.some(p => p && typeof p === "object" && imposter.includes(p.playerId)) ? (
                                    <div ref={ref} style={{marginTop: 1 + "em"}} className={`fadeUp ${inView ? "fade-in" : ""}`}><strong>Unlucky round or weird answer?</strong></div>
                                ): null}
                            </React.Fragment>
                        ) : (
                            <>
                            <div><strong>Most of you voted that there are no imposters this round!</strong></div>
                                {typingIsDone && imposter.length > 0 ? (
                                    <React.Fragment>
                                    <div ref={ref} className={`fadeUp ${inView ? "fade-in" : ""}`}>
                                    <br/>
                                    <span>But, sadly, that is wrong. Imposter{imposter.length !== 1 ? "s" : ""} answered with:</span></div>
                                    <Box sx={{overflow: "auto", maxHeight: "30vh", marginTop: 1 + "em", minWidth: "100", border: "2px dashed purple", padding: "2px", marginBottom: 1 + "em"}}>
                                {finalPrompts.answers.filter(p => imposter.includes(p.playerId)).map((p) => (
                                    <div ref={ref} className={`fadeUp ${inView ? "fade-in" : ""}`}>
                                        <Card
                                            style={{ backgroundColor: `rgba(120, 38, 153, 0.3)`, margin: 1 + `em`, display: "inline-block"}}
                                            key={p.playerId}
                                        >
                                            <CardContent>
                                                <Typography style={{ color: "white" }}>
                                                    {p.name}
                                                    <br/>
                                                    <br/>
                                                    <span>Answered with: {p.answer} </span>
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ))}
                                </Box>
                                </React.Fragment>
                                ) : null}
                            </>
                        )}
                        {gameDone ? (
                            <Button
                                sx={{
                                    marginLeft: "auto"
                                }}
                                color="secondary"
                                variant="outlined"
                                disabled={!lobbyLeader}
                                onClick={handleEndGame}>Results</Button>
                        ) : (
                            <Button
                                sx={{
                                    marginLeft: "auto"
                                }}
                                color="secondary"
                                variant="outlined"
                                disabled={!lobbyLeader}
                                onClick={sendStartNextRound}>Next Round</Button>
                        )}
                    </div>
                )}
                {phase === "done" && (
                    <React.Fragment>
                        {(() => {
                            const names = players.map(p => p.name);
                            const scores = players.map(p => p.score);
                            const maxScore = Math.max(...scores);

                            const barColors = players.map(p =>
                                p.score === maxScore ? "#ffd700" : "#782699"
                            );

                            return (
                                <div style={{ maxWidth: 500, margin: "2em auto" }}>
                                    <BarChart
                                        xAxis={[
                                            {
                                                data: names,
                                                tickLabelStyle: { fill: "white" },
                                                labelStyle: { fill: "white" },
                                                colorMap: {
                                                    type: "ordinal",
                                                    values: names,
                                                    colors: barColors,
                                                },
                                            }
                                        ]}
                                        yAxis={[{ position: 'none' }]}
                                        series={[
                                            {
                                                data: scores
                                            }
                                        ]}
                                        borderRadius={40}
                                        height={300}
                                        sx={{
                                            "& .MuiChartsAxis-tickLabel": { fill: "white" },
                                            "& .MuiChartsLegend-label": { color: "white" }
                                        }}
                                    />
                                    <div style={{textAlign: "center", color: "#ffd700", marginTop: 12}}>
                                        Winner{players.filter(p=>p.score===maxScore).length > 1 ? "s" : ""}:{" "}
                                        {players.filter(p=>p.score===maxScore).map(p=>p.name).join(", ")}
                                    </div>
                                </div>
                            );
                        })()}
                        <div style={{width: "50%"}}>
                            <Button
                                sx={{
                                    float: "left"
                                }}
                                color="secondary"
                                variant="outlined"
                                onClick={() => {
                                    if (roomCode) socket.emit("leaveRoom", { roomCode, playerId });
                                    onLeaveLobby?.();
                                }}
                            >Leave Lobby</Button>
                            <div style={{float: "right"}}>
                                <Badge badgeContent={playAgainCount} color="secondary" anchorOrigin={{ vertical: "top", horizontal: "right"}}>
                                    <Button
                                        color="secondary"
                                        variant="outlined"
                                        onClick={handlePlayAgain}
                                    >
                                        Play again
                                    </Button>
                                </Badge>
                            </div>
                        </div>
                        <div style={{width: "50%", marginTop: 1 + "em"}}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        id="keepScores"
                                        onChange={handleKeepScore}
                                        checked={keepScores}
                                        color="secondary"
                                        name="Keep scores"
                                        label="Keep scores"
                                        disabled={!lobbyLeader}
                                    />
                                }
                                label="Keep scores?"
                                labelPlacement="top"
                                sx={{
                                    float: "right",
                                    ".MuiFormControlLabel-label": {
                                        color: keepScores ? "purple" : "white"
                                    }
                                }}
                            />
                        </div>
                    </React.Fragment>
                )}
            </div>
        </React.Fragment>
    );
}