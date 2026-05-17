export const guides = {
    main: {
        title: "Instructions",
        body: (
            <>
                <p>
                    This is a social deduction game where you are given a prompt and you have to answer to the best of your
                    ability. One player is the imposter, which the regular players will need to figure out.
                </p>
                <p>
                    At the start of the game everyone will submit their prompts to be used throughout the entire game.
                </p>
                <p>
                    Each round each player must answer their given prompt, but one player will be the
                    <span style={{ color: "red" }}> imposter </span>
                    that the other players will need to catch. The imposter will be given a different prompt and will need
                    to swindle their way out of suspicion.
                </p>
                <p>
                    The point system awards 1 point for each correct guess of who the imposter is, and the imposter gets 1
                    point for each player that is incorrect.
                </p>
                <p>
                    In the lobby you can enable optional game modes. Use the help icons next to each switch for details on
                    censored mode and multiple imposter mode.
                </p>
            </>
        ),
    },
    censored: {
        title: "Censored mode",
        body: (
            <>
                <p>
                    Each player inputs one prompt, and the imposter will be given a censored version of the prompt.
                </p>
            </>
        ),
    },
    multiple: {
        title: "Multiple imposter mode",
        body: (
            <>
                <p>
                    A round may have more than one imposter, or <strong>no imposter at all</strong>.
                </p>
            </>
        ),
    },
};
