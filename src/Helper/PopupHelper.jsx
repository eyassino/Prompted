import { Button } from "@mui/material";

const hideButtonSx = {
    "&:hover": {
        backgroundColor: "rgba(255,255,255,0.05)",
        borderColor: "rgb(209, 44, 205)",
        color: "rgb(209, 44, 205)",
    },
};

export function PopupHelper({ hidden = true, onHide, title, children }) {
    return (
        <div hidden={hidden} className="popup">
            <header className="popup-header">
                <h2 className="popup-title">{title}</h2>
                <Button
                    sx={hideButtonSx}
                    variant="outlined"
                    color="secondary"
                    onClick={onHide}
                >
                    Hide
                </Button>
            </header>
            <div className="guide-body">{children}</div>
        </div>
    );
}
