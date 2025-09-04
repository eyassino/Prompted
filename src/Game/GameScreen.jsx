import { socket } from "../socket";
import React, {useEffect, useState} from "react";
import {Button, Grid} from "@mui/material";
import TextField from "@mui/material/TextField";
import prompts from "../assets/prompts.json";
import {Card, CardContent, Typography} from "@mui/material";
import TypingText from "../assets/typing.jsx";
import { useInView } from "react-intersection-observer";

export default function GameScreen({playerId, initialPlayers, roomCode, altMode }) {

    //Prompts
    const [prompt, setPrompt] = useState("");
    const [impPrompt, setImpPrompt] = useState("");
    const [promptSent, setPromptSent] = useState(false);
    const [currentPrompt, setCurrentPrompt] = useState("");
    const [finalPrompts, setFinalPrompts] = useState({});
    const [players, setPlayers] = useState(initialPlayers);
    const [promptData, setPromptData] = useState({ regularPrompts: [], imposterPrompts: [] });

    //Player related
    const [isImposter, setIsImposter] = useState(false);
    const [playerAnswer, setPlayerAnswer] = useState("");
    const [answers, setAnswers] = useState([]);
    const [votedOut, setVotedOut] = useState(null);
    const [imposter, setImposter] = useState("");
    const [selectedPlayer, setSelectedPlayer] = useState("");

    //flags
    const [phase, setPhase] = useState("promptPick");
    const [playerAnswered, setPlayerAnswered] = useState(false);
    const [voted, setVoted] = useState(false);
    const [gameDone, setGameDone] = useState(false);
    const [tie, setTie] = useState(false);
    const [typingIsDone, setTypingIsDone] = useState(false);

    //counters
    const [finalVotes, setFinalVotes] = useState({});
    const [voteCounts, setVoteCounts] = useState({});


    const sendPrompt = () => {
        socket.emit("sendPrompt", {roomCode, playerId, prompt, impPrompt });
        setPromptSent(true);
    };

    useEffect(() => {
        socket.on("allPromptsReceived", ({ prompt, isImposter }) => {
            setCurrentPrompt(prompt);
            setIsImposter(isImposter);
            setPhase("answer");
        });
        socket.on("promptToAnswer", ({ prompt, isImposter }) => {
            setCurrentPrompt(prompt);
            setIsImposter(isImposter);
            setPhase("answer");
        });
        socket.on("revealAnswers", (answers) => {
            setVoteCounts(Object.fromEntries(answers.map(a => [a.playerId, 0])));
            setAnswers(answers);
            setPhase("voting");
        });
        socket.on("revealData", ({votedOut, votes, prompts, imposter, players}) => {
            if(votedOut === null){
                setTie(true);
            }
            setVotedOut(votedOut);
            setFinalVotes(votes);
            setFinalPrompts(prompts);
            setImposter(imposter);
            setPlayers(players);
            setPhase("reveal");
        });
        socket.on("voteUpdate", (voteCount) => {
            setVoteCounts(voteCount);
        });
        socket.on("noPromptsLeft", () => {
            setGameDone(true);
        });
        socket.on("startNextRound", ({ prompt, isImposter }) => {
            setCurrentPrompt(prompt);
            setIsImposter(isImposter);
            setPlayerAnswered(false);
            setPlayerAnswer("");
            setPromptSent(false);
            setVoted(false);
            setSelectedPlayer("");
            setVotedOut(null);
            setTie(false);
            setTypingIsDone(false);
            setPhase("answer");
        });
        socket.on("finishGame", (players) => {
            setPlayers(players);
            setPhase("done");
        });
    }, []);

    const submitAnswer = () => {
        socket.emit("submitAnswer", { roomCode, playerId, answer: playerAnswer });
        setPlayerAnswered(true);
    };

    const lockInVote = () => {
        if (!selectedPlayer) return alert("Select a player to vote for!");
        socket.emit("submitVote", {roomCode, playerId});
        setVoted(true);
    };

    const votePlayer = (e, selectedPlayer) => {
        e.currentTarget.style.backgroundColor = "purple";
        setSelectedPlayer(selectedPlayer);
        socket.emit("votePlayer", {roomCode, playerId, votedPlayerId: selectedPlayer});
    };

    const sendStartNextRound = () => {
        socket.emit("nextRound", {roomCode});
    };

    const handleEndGame = () => {
        socket.emit("gameDone", {roomCode});
    };

    useEffect(() => {
        setPromptData(prompts);
        console.log("Loaded prompts:", prompts);
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

    return (
        <React.Fragment>
            <div className="main-body">
                <Grid container spacing={1} sx={{justifyContent: "center", alignItems: "center", paddingRight: "20%"}}>
                    {players.map((p) => (
                        <Card style={{ backgroundColor: `rgba(120, 38, 153, 0.3)`, margin: 1 + `em` }} key={p.playerId}>
                            <CardContent>
                                <Typography style={{ color: "white" }}>
                                    {p.name}
                                    <br/>
                                    <br/>
                                    <span>{"score: " + p.score} </span>
                                </Typography>
                            </CardContent>
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
                            <div>Discuss! who do you think the imposter is?</div>
                            <br/>
                            <div><strong>The prompt was:</strong> {currentPrompt} </div>
                        </div>
                        <ul>
                            <Grid container spacing={1} sx={{justifyContent: "center", alignItems: "center", paddingRight: "20%"}}>
                            {answers.map((a) => (
                                <Card
                                    style={{ backgroundColor: `rgba(120, 38, 153, 0.3)`, margin: 1 + `em`, cursor: "pointer" }}
                                    key={a.playerId}
                                    onClick={e => {
                                    votePlayer(e, a.playerId);
                                }}>
                                    <CardContent>
                                        <Typography style={{ color: "white" }}>
                                            {a.name}
                                            <br/>
                                            <br/>
                                            <span>{a.answer} </span>
                                        </Typography>
                                    </CardContent>
                                </Card>
                            ))}
                            </Grid>
                        </ul>
                        <Button
                            sx={{
                                marginTop: 1 + "em",
                                marginRight: "20%",
                                float: "right"
                            }}
                            disabled={!selectedPlayer}
                            color="secondary"
                            variant="outlined"
                            onClick={lockInVote}
                        >Lock in</Button>
                    </div>
                ) : voted && phase === "voting" ? (
                    <div>Waiting for others to finish voting :)</div>
                ) : null}
                {phase === "reveal" && (
                    <div>
                        <div>
                            <strong>The <span style={{color: "red"}}>imposter</span> was: </strong>
                            <TypingText typingDone={handleTypingDone} fakeOut={true} eraseText={"emil"} finalText={players.find(p => p.playerId === imposter)?.name}/>
                        </div>
                        <br/>
                        <div><strong style={{color: "green"}}>Prompt:</strong> {finalPrompts.prompt}</div>
                        <br/>
                        <div><strong><span style={{color: "red"}}>Imposter's</span> Prompt was:</strong> {finalPrompts.impPrompt}</div>
                        <br/>
                        {!tie ? (
                            <React.Fragment>
                                <div><strong>Majority of you voted for:</strong></div>
                                <div style={{display: "flex", justifyContent: "center", flexDirection: "row", alignItems: "center", width: "100%"}}>
                                    <Card
                                        style={{ backgroundColor: `rgba(120, 38, 153, 0.3)`, margin: 1 + `em`}}
                                        key={votedOut.playerId}
                                        >
                                        <CardContent>
                                            <Typography style={{ color: "white" }}>
                                                {votedOut.name}
                                                <br/>
                                                <br/>
                                                <span>Answered with: {votedOut.answer} </span>
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </div>
                                {typingIsDone ? (
                                <div ref={ref} className={`fadeUp ${inView ? "fade-in" : ""}`}><strong>Unlucky round or weird answer?</strong></div>
                                ): null}
                            </React.Fragment>
                        ) : (
                            <div><strong>It's a tie!</strong></div>
                        )}
                        {gameDone ? (
                            <Button
                                sx={{
                                    float: "right"
                                }}
                                color="secondary"
                                variant="outlined"
                                onClick={handleEndGame}>Results</Button>
                        ) : (
                            <Button
                                sx={{
                                    float: "right"
                                }}
                                color="secondary"
                                variant="outlined"
                                onClick={sendStartNextRound}>Next Round</Button>
                        )}
                    </div>
                )}
                {phase === "done" && (
                    <ul>
                        {players.map((p) => (
                            <li key={p.playerId}><strong>{p.name} with a score of {p.score ?? 0}</strong></li>
                        ))}
                    </ul>
                )}
            </div>
        </React.Fragment>
    );
}