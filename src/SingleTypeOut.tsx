import React from 'react';

interface SingleTypeOutProps {
    text: string;
    speed?: number; // ms per character
    className?: string;
    finishTyping?: boolean; // forces immediate completion when true
    onTypingComplete?: () => void; // called when typing animation finishes (either naturally or forced)
}

/*
  Types `text` from empty to full once. It restarts whenever the `text` prop changes.
  Can be forced to complete immediately via finishTyping prop.
*/
export const SingleTypeOut: React.FC<SingleTypeOutProps> = ({ text, speed = 25, className, finishTyping = false, onTypingComplete }) => {
    const [display, setDisplay] = React.useState<string>('');
    const [finished, setFinished] = React.useState<boolean>(false);
    const timerRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        // Reset state whenever text changes
        setDisplay('');
        setFinished(false);
        let idx = 0;

        if (!text) {
            setFinished(true);
            onTypingComplete?.();
            return;
        }

        // Start interval to reveal characters
        timerRef.current = window.setInterval(() => {
            idx += 1;
            setDisplay(text.slice(0, idx));
            if (idx >= text.length) {
                if (timerRef.current !== null) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
                setFinished(true);
                onTypingComplete?.();
            }
        }, speed);

        return () => {
            if (timerRef.current !== null) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [text, speed, onTypingComplete]);

    // Effect to handle finishTyping prop
    React.useEffect(() => {
        if (finishTyping && !finished && timerRef.current !== null) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            setDisplay(text);
            setFinished(true);
            onTypingComplete?.();
        }
    }, [finishTyping, finished, text, onTypingComplete]);

    return (
        <span
            className={className}
            style={{ userSelect: 'none' }}
            aria-label="message"
        >
      {display}
    </span>
    );
};

export default SingleTypeOut;
