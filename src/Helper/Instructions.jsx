import { Button } from "@mui/material";

export function Instructions({ hidden = true, onHide }) {
    return (
        <div hidden={hidden}
             className="popup"
             style={{
                 placeContent: "center"
             }}
        >
            <header>
                <h2>
                    Instructions
                    <Button
                        sx={{
                            "&:hover": {
                                backgroundColor: "rgba(255,255,255,0.05)",
                                borderColor: "rgb(209, 44, 205)",
                                color: "rgb(209, 44, 205)"
                            }
                        }}
                        style={{marginRight: 2 + "em" ,float: "right"}}
                        variant="outlined"
                        color="secondary"
                        onClick={onHide}
                    >
                        Hide
                    </Button>
                </h2>
            </header>
            <p>
                This is a social deduction game where you are given a prompt and you have to answer to the best of your ability, one player is the imposter
                which the regular players will need to figure out.
                <br />
                <br />
                At the start of the game everyone will submit their prompts to be used throughout the entire game.
                <br />
                Each round each player must answer their given prompt but one player will be the
                <span style={{color: "red"}}> imposter </span>
                that the other players will need to catch
                in which case the imposter will be given a different prompt and will need to swindle their way out of suspicion.
                <br />
                <br />
                The point system awards 1 point for each correct guess of who the imposter is, and the imposter gets 1 point for each player that is incorrect.
                <br />
                <br />
                At the moment theres the "Alt gamemode" switch which changes the way the imposter gets their prompt, with this turned on the imposter will
                get a 'censored' prompt that the others are answering and will need to guess what the prompt is asking for.
            </p>
        </div>
    );
}