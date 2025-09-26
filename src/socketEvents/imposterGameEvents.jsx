export function createImposterGameHandlers({
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
                                               setWaiting
                                    }) {
    return {
        updatePlayers: (updatedPlayers, readied) => {
            if (readied) {
                playReadySound();
            }
            else {
                setWaiting(false);
            }

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
            setPlayerAnswer("");
            setWaiting(false);
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
            setWaiting(false);
            setPlayerAnswer("");
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
        },
        syncState: (state) => {
            setPhase(state.phase);
            setPlayers(state.players || []);
            setCurrentPrompt(typeof state.prompt === "string" ? state.prompt : "");
            setAnswers(Array.isArray(state.answers) ? state.answers : []);
            setVoteCounts(state.voteCounts || {});
            const syncedVotedOut = Array.isArray(state.votedOut) ? state.votedOut : [];
            setVotedOut(syncedVotedOut);
            setImposter(Array.isArray(state.imposterIds) ? state.imposterIds : []);
            setFakeOut(!!state.fakeOut);
            setFakePlayer(state.fakePlayer || "");
            setWaiting(state.waiting);
            setSelectedPlayer(state.voted || []);
            setFinalPrompts({
                prompt: typeof state.prompt === "string" ? state.prompt : "",
                impPrompt: typeof state.impPrompt === "string" ? state.impPrompt : "",
                answers: Array.isArray(state.answers) ? state.answers : []
            });
            setNoImposters(syncedVotedOut.length === 1 && syncedVotedOut.includes("0"));
        }
    };
}
