export function createImposterGameHandlers({
    setPlayers,
    setLobbyLeader,
    playerId,
    setPrompt,
    setImpPrompt,
    setPromptSent,
    setCurrentPrompt,
    setFinalPrompts,
    setAnswers,
    setVotedOut,
    setImposter,
    setSelectedPlayer,
    setFakePlayer,
    setPhase,
    setPlayerAnswered,
    setVoted,
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
    playDCSound
                                    }) {
    return {
        updatePlayers: (updatedPlayers, readied) => {
            if (readied) playReadySound();

            setPlayers(prevPlayers => {
                if (updatedPlayers.length > prevPlayers.length) {
                    playJoinSound();
                } else if (updatedPlayers.length < prevPlayers.length) {
                    playDCSound();
                }
                return updatedPlayers;
            });

            setLobbyLeader(updatedPlayers.some(p => p.leader && p.playerId === playerId));
        },
        allPromptsReceived: ({ prompt }) => {
            setCurrentPrompt(prompt);
            setPhase("answer");
        },
        revealAnswers: (answers, currentPrompt) => {
            const initialCounts = Object.fromEntries(answers.map(a => [a.playerId, 0]));
            initialCounts["0"] = 0;
            setVoteCounts(initialCounts);
            setAnswers(answers);
            setCurrentPrompt(currentPrompt);
            setPhase("voting");
        },
        revealData: ({ votedOut, prompts, imposter, players, fakeOut, fakePlayer }) => {
            if (votedOut.length === 1 && votedOut.includes("0")) {
                setNoImposters(true);
            }
            setVotedOut(votedOut);
            setFinalPrompts(prompts);
            setImposter(imposter || []);
            setPlayers(players);
            setFakeOut(fakeOut);
            setFakePlayer(fakePlayer);
            setPhase("reveal");
        },
        voteUpdate: (voteCount) => setVoteCounts(voteCount),
        noPromptsLeft: () => setGameDone(true),
        startNextRound: ({ prompt }) => {
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
        },
        finishGame: (players) => {
            setPlayers(players);
            setPhase("done");
        },
        updateKeepScore: (keepScores) => setKeepScores(keepScores),
        updatePlayAgainCount: (voteCount) => setPlayAgainCount(voteCount),
        lobbyReset: () => {
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
        }
    };
}
