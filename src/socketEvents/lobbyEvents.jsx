export function createLobbyHandlers({
                                        setPlayers,
                                        setLobbyLeader,
                                        setGameStarted,
                                        setAltMode,
                                        playReadySound,
                                        playJoinSound,
                                        playDCSound,
                                        playerId
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
        updateGameMode: (altMode) => {
            setAltMode(altMode);
        }
    };
}
