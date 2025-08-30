import { socket } from "../socket";
import React, {useEffect, useState} from "react";
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';

export default function GameScreen({playerId, initialPlayers, roomCode, altMode }) {

    //Prompts
    const [prompt, setPrompt] = useState("");
    const [impPrompt, setImpPrompt] = useState("");
    const [promptSent, setPromptSent] = useState(false);
    const [currentPrompt, setCurrentPrompt] = useState("");
    const [finalPrompts, setFinalPrompts] = useState({});
    const [players, setPlayers] = useState(initialPlayers);

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
        e.currentTarget.style.backgroundColor = "blue";
        setSelectedPlayer(selectedPlayer);
        socket.emit("votePlayer", {roomCode, playerId, votedPlayerId: selectedPlayer});
    };

    const sendStartNextRound = () => {
        socket.emit("nextRound", {roomCode});
    };

    const handleEndGame = () => {
        socket.emit("gameDone", {roomCode});
    };

    return (
        <React.Fragment>
            <div className="main-body">Game Screen
                <Stack
                    direction="row"
                    divider={<Divider orientation="vertical" flexItem />}
                    spacing={2}
                >
                    {players.map((p) => (
                        <li key={p.playerId}>{p.name} score: {p.score ?? 0}</li>
                    ))}
                </Stack>
                {phase === "promptPick" ? (
                    !promptSent ? (
                        <div style={{display: "flex", justifyContent: "center", flexDirection: "column", alignItems: "center"}}>
                            <input
                                style={{marginBottom: 1 + 'em', marginTop: 1 + 'em'}}
                                value={prompt}
                                placeholder={"Regular Prompt"}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                            {!altMode ? (
                                <input
                                    style={{marginBottom: 1 + 'em'}}
                                    value={impPrompt}
                                    placeholder={"Imposter's Prompt"}
                                    onChange={(e) => setImpPrompt(e.target.value)}
                                />
                            ) : null}
                            <button style={{marginBottom: 1 + 'em'}} onClick={sendPrompt}>
                                Send prompt
                            </button>
                            <button>
                                Pick for me!
                            </button>
                        </div>
                    ) : (
                        <div>Prompt sent! Waiting for others...</div>
                    )
                ) : null}
                {phase === "answer" ? (
                    !playerAnswered ? (
                    <div>
                        <div>
                            <strong>Your prompt:</strong> {currentPrompt}
                            {isImposter && <span style={{color: "red"}}> (You are the imposter!)</span>}
                        </div>
                        <input
                            value={playerAnswer}
                            onChange={e => setPlayerAnswer(e.target.value)}
                            placeholder="Your answer"
                        />
                        <button onClick={submitAnswer}>Submit Answer</button>
                    </div>
                    ) : (
                    <div>Waiting for others to finish answering :)</div>
                    )
                ): null}
                {phase === "voting" ? (
                    <div>
                        <div>Vote for who you think the imposter is!</div>
                        <div><strong>Prompt:</strong> {currentPrompt} </div>
                        <div><strong>Answers:</strong></div>
                        <ul>
                            {answers.map((a) => (
                                <button
                                    key={a.playerId}
                                    onClick={e => {
                                        votePlayer(e, a.playerId);
                                    }}
                                >
                                <strong>{a.name + ": " + (voteCounts[a.playerId] ?? 0) + " votes"}</strong> {"\n" + a.answer}</button>
                            ))}
                        </ul>
                        <button
                            onClick={lockInVote}
                        >Lock in</button>
                    </div>
                ) : voted && phase === "voting" ? (
                    <div>Waiting for others to finish voting :)</div>
                ) : null}
                {phase === "reveal" && (
                    <div>
                        <div><strong>Prompt:</strong> {finalPrompts.prompt}</div>
                        <div><strong>Imposter's Prompt:</strong> {finalPrompts.impPrompt}</div>
                        {!tie ? (
                            <React.Fragment>
                                <div><strong>Voted person's answer:</strong></div>
                                <ul>
                                    <li key={votedOut.playerId}><strong>Votes: {finalVotes[votedOut.playerId]} {votedOut.name}:</strong> {votedOut.answer}</li>
                                </ul>
                            </React.Fragment>
                        ) : (
                            <div><strong>It's a tie!</strong></div>
                        )}
                        <div>
                            <strong>Imposter was: </strong>
                            {players.find(p => p.playerId === imposter)?.name}
                        </div>
                        {gameDone ? (
                            <button onClick={handleEndGame}>Results</button>
                        ) : (
                            <button onClick={sendStartNextRound}>Next Round</button>
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