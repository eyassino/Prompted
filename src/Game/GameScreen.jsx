import { socket } from "../socket";
import React, {useEffect, useState} from "react";
import {Button, Grid, Stack} from "@mui/material";
import TextField from "@mui/material/TextField";
import prompts from "../assets/prompts.json";
import {Card, CardContent, Typography, Badge, FormControlLabel, Switch} from "@mui/material";
import TypingText from "../assets/typing.jsx";
import { useInView } from "react-intersection-observer";
import { BarChart } from '@mui/x-charts/BarChart';

export default function GameScreen({
                                       playerId,
                                       initialPlayers,
                                       roomCode,
                                       altMode,
                                       onLeaveLobby,
                                       onPlayAgain
                                   }) {

    //Prompts
    const [prompt, setPrompt] = useState("");
    const [impPrompt, setImpPrompt] = useState("");
    const [promptSent, setPromptSent] = useState(false);
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
    const [phase, setPhase] = useState("promptPick");
    const [playerAnswered, setPlayerAnswered] = useState(false);
    const [voted, setVoted] = useState(false);
    const [gameDone, setGameDone] = useState(false);
    const [noImposters, setNoImposters] = useState(false);
    const [typingIsDone, setTypingIsDone] = useState(false);
    const [fakeOut, setFakeOut] = useState(false);
    const [badPrompt, setBadPrompt] = useState(false);
    const [badImpPrompt, setImpBadPrompt] = useState(false);
    const [badAnswer, setBadAnswer] = useState(false);
    const [keepScores, setKeepScores] = useState(false);
    const [badVote, setBadVote] = useState(false);

    //counters
    const [voteCounts, setVoteCounts] = useState({});
    const [playAgainCount, setPlayAgainCount] = useState(0);


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
        setPromptSent(true);
    };

    useEffect(() => {
        socket.on("updatePlayers", (players) => {
            setPlayers(players);
            setLobbyLeader(players.find(p => p.leader && p.playerId === playerId) !== undefined)
        })
        socket.on("allPromptsReceived", ({ prompt }) => {
            setCurrentPrompt(prompt);
            setPhase("answer");
        });
        socket.on("revealAnswers", (answers, currentPrompt) => {
            const initialCounts = Object.fromEntries(answers.map(a => [a.playerId, 0]));
            initialCounts["0"] = 0;
            setVoteCounts(initialCounts);
            setAnswers(answers);
            setCurrentPrompt(currentPrompt)
            setPhase("voting");
        });
        socket.on("revealData", ({votedOut, prompts, imposter, players, fakeOut, fakePlayer}) => {
            if(votedOut.length === 1 && votedOut.includes("0")){
                setNoImposters(true);
            }
            setVotedOut(votedOut);
            setFinalPrompts(prompts);
            setImposter(imposter || []);
            setPlayers(players);
            setFakeOut(fakeOut);
            setFakePlayer(fakePlayer);
            setPhase("reveal");
        });
        socket.on("voteUpdate", (voteCount) => {
            setVoteCounts(voteCount);
        });
        socket.on("noPromptsLeft", () => {
            setGameDone(true);
        });
        socket.on("startNextRound", ({ prompt }) => {
            setCurrentPrompt(prompt);
            setPlayerAnswered(false);
            setPlayerAnswer("");
            setPromptSent(false);
            setVoted(false);
            setSelectedPlayer([]);
            setVotedOut(null);
            setNoImposters(false);
            setTypingIsDone(false);
            setPhase("answer");
        });
        socket.on("finishGame", (players) => {
            setPlayers(players);
            setPhase("done");
        });
        socket.on("updateKeepScore", (keepScores) => {
            setKeepScores(keepScores);
        })
        socket.on("updatePlayAgainCount", (voteCount) => {
            setPlayAgainCount(voteCount);
        })
        socket.on("lobbyReset", () => {
            setPlayerAnswered(false);
            setPlayerAnswer("");
            setPromptSent(false);
            setVoted(false);
            setSelectedPlayer([]);
            setVotedOut(null);
            setNoImposters(false);
            setTypingIsDone(false);
            setFakeOut(false);
            setGameDone(false);
            setKeepScores(false);
            setPlayAgainCount(0);
            setPrompt("");
            setImpPrompt("");
            setPhase("promptPick");
        });
    }, [playerId]);

    const submitAnswer = () => {
        if(!playerAnswer || playerAnswer.length > 115) {
            return setBadAnswer(true);
        } else {
            setBadAnswer(false);
        }
        socket.emit("submitAnswer", { roomCode, playerId, answer: playerAnswer });
        setPlayerAnswered(true);
    };

    const lockInVote = () => {
        if (!selectedPlayer.length) {
            setBadVote(true);
            return;
        }
        socket.emit("submitVote", { roomCode, playerId });
        setVoted(true);
    };

    const votePlayer = (e, selection) => {
        if (!selectedPlayer.includes(selection)) {
            selectedPlayer.push(selection);
            setBadVote(false);
        } else {
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

    return (
        <React.Fragment>
            <div className="main-body">
                <Grid container spacing={1} sx={{justifyContent: "center", alignItems: "center", paddingRight: "20%"}}>
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
                    !promptSent ? (
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
                    !playerAnswered ? (
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
                    <div>
                        <div style={{textAlign: "center", marginRight: "20%"}}>
                            <div>{voted ? "Voted! Waiting for everyone to finish voting..." : "Discuss! who do you think the imposter is?"}</div>
                            <br/>
                            <div><strong>The prompt was:</strong> {currentPrompt} </div>
                        </div>
                            <Grid container spacing={1} sx={{justifyContent: "center", alignItems: "center", paddingRight: "20%", marginTop: 1 + "em"}}>
                            {answers.map((a) => (
                                <Card
                                    sx={{ overflow: "visible" }}
                                    className="card-selectable"
                                    style={{ backgroundColor: selectedPlayer.includes(a.playerId) ? "purple" : `rgba(120, 38, 153, 0.3)`}}
                                    key={a.playerId}
                                    onClick={e => {
                                    if (!voted)
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
                            </Grid>
                        <Stack direction="row" alignItems="center" justifyContent="center" sx={{marginTop: 1 + "em", paddingRight: "20%"}}>
                            <Card
                                style={{
                                    backgroundColor: selectedPlayer.includes("0") ? "purple" : `rgba(120, 38, 153, 0.3)`,
                                    cursor: "pointer",
                                    overflow: "visible"
                                }}
                                onClick={e => {
                                    if (!voted)
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
                        {!voted ? (
                            <Stack direction="column" alignItems="center" justifyContent="center" sx={{marginTop: 2 + "em", paddingRight: "20%", float: "right", minWidth: "50%"}}>
                                <Button
                                    sx={{
                                        float: "right"
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
                    <div>
                        <div>
                            {imposter.length === 0 ? (
                                <strong>No imposters this round!</strong>
                            ) : (
                                <>
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
                                </>
                            )}
                        </div>
                        <br/>
                        <div><strong style={{color: "green"}}>Prompt:</strong> {finalPrompts.prompt}</div>
                        <br/>
                        <div><strong><span style={{color: "red"}}>Imposter{imposter.length !== 1 ? "s" : ""}</span> Prompt{imposter.length !== 1 ? "s" : ""}:</strong> {finalPrompts.impPrompt}</div>
                        <br/>
                        {!noImposters ? (
                            <React.Fragment>
                                <div><strong>Majority of you voted for:</strong></div>
                                <div style={{display: "flex", justifyContent: "center", flexDirection: "row", alignItems: "center", width: "100%"}}>
                                    {votedOut.map((p) => (
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
                                    ))}
                                </div>
                                {typingIsDone && Array.isArray(votedOut) && votedOut.length > 0 && !votedOut.some(p => p && typeof p === "object" && imposter.includes(p.playerId)) ? (
                                    <div ref={ref} className={`fadeUp ${inView ? "fade-in" : ""}`}><strong>Unlucky round or weird answer?</strong></div>
                                ): null}
                            </React.Fragment>
                        ) : (
                            <div><strong>Most of you voted that there are no imposters this round!</strong></div>
                        )}
                        {gameDone ? (
                            <Button
                                sx={{
                                    float: "right"
                                }}
                                color="secondary"
                                variant="outlined"
                                disabled={!lobbyLeader}
                                onClick={handleEndGame}>Results</Button>
                        ) : (
                            <Button
                                sx={{
                                    float: "right"
                                }}
                                color="secondary"
                                variant="outlined"
                                disabled={!lobbyLeader}
                                onClick={sendStartNextRound}>Next Round</Button>
                        )}
                    </div>
                )}
                {phase === "done" && (
                    <>
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
                    </>
                )}
            </div>
        </React.Fragment>
    );
}