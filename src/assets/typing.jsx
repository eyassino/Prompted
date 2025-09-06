import React, {useState, useEffect, useRef} from "react";

const TypingText = ({
                      typingDone = () => {},
                        fakeOut = false,
                        eraseText = "",
                        finalText = ""
                    }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState("typing"); // "typing", "deleting", or "final"
  const [showCursor, setShowCursor] = useState(true); // Blinking cursor state
  const [cursorBlink, setCursorBlink] = useState(false); // Blinking cursor state
  const isDone = useRef(false);

  const speed = 60;
  const eraseSpeed = 40;
  const pauseTime = 4000;
  const cursorBlinkSpeed = 500;

  useEffect(() => {

    const interval = setInterval(() => {
      if (phase === "typing" && currentIndex < eraseText.length) {
        // Typing the eraseText
        setDisplayedText((prev) => prev + eraseText[currentIndex]);
        setCurrentIndex((prevIndex) => prevIndex + 1);
      } else if (phase === "deleting" && currentIndex > 0) {
        // Erasing the eraseText
        setDisplayedText((prev) => prev.slice(0, -1));
        setCurrentIndex((prevIndex) => prevIndex - 1);
      } else if (phase === "final" && currentIndex < finalText.length) {
        // Typing the finalText
        setDisplayedText((prev) => prev + finalText[currentIndex]);
        setCurrentIndex((prevIndex) => prevIndex + 1);
      } else {
        clearInterval(interval);

        // Transition between phases
        if (phase === "typing" && currentIndex === eraseText.length) {
          setTimeout(() => {
              if(fakeOut) {
                  setPhase("deleting");
              } else {
                isDone.current = true;
                setCursorBlink(true);
                typingDone();
              }
          }, pauseTime);
        } else if (phase === "deleting" && currentIndex === 0) {
          setTimeout(() => {
            setPhase("final");
            setCurrentIndex(0);
          }, pauseTime/2);
        } else if (phase === "final" && currentIndex === finalText.length) {
          isDone.current = true;
          setCursorBlink(true);
          typingDone();
        }
      }
    }, phase === "deleting" ? eraseSpeed : speed);

    return () => clearInterval(interval);
  }, [currentIndex, eraseText, fakeOut, finalText, phase, typingDone]);

  useEffect(() => {
          const cursorInterval = setInterval(() => {
              if(cursorBlink){
                setShowCursor((prev) => !prev);
              }
          }, cursorBlinkSpeed);
      return () => clearInterval(cursorInterval);
  }, [cursorBlinkSpeed, cursorBlink]);

  return(
      <span>
      {displayedText}
      <span style={{visibility: showCursor ? "visible" : "hidden"}}>|</span>
    </span>
  );
};

export default TypingText;
