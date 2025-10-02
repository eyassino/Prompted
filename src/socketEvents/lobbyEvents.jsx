export function createLobbyHandlers({
                                        setPlayers,
                                        setLobbyLeader,
                                        setGameStarted,
                                        setCensoredMode,
                                        setMultipleMode,
                                        playReadySound,
                                        playJoinSound,
                                        playDCSound,
                                        playerId,
                                        setPublicLobbies
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
        startGame: (serverPlayers) => {
            setGameStarted(true);
            setPlayers(serverPlayers);
        },
        updateGameMode: (modes) => {
            setCensoredMode(modes.censoredMode);
            setMultipleMode(modes.multipleMode);
        },
        updatePublicLobbies: (publicLobbies) => {
            setPublicLobbies(publicLobbies);
        },
    };
}
