import React from 'react';

interface SingleTypeOutProps {
    text: string;
    speed?: number; // ms per character
    className?: string;
    onAdvance?: () => void; // called when user clicks and the text is already complete
}

/*
  Types `text` from empty to full once. It restarts whenever the `text` prop changes.
  Click behavior:
  - If still typing: finish immediately.
  - If already finished: call `onAdvance`.
*/
export const SingleTypeOut: React.FC<SingleTypeOutProps> = ({ text, speed = 25, className, onAdvance }) => {
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
            }
        }, speed);

        return () => {
            if (timerRef.current !== null) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [text, speed]);

    const handleClick = () => {
        if (!finished) {
            // Finish immediately
            if (timerRef.current !== null) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            setDisplay(text);
            setFinished(true);
            return;
        }
        // Already finished -> inform parent to advance
        onAdvance?.();
    };

    return (
        <span
            className={className}
            onClick={handleClick}
            style={{ cursor: 'pointer', userSelect: 'none' }}
            aria-label="message"
        >
      {display}
    </span>
    );
};

export default SingleTypeOut;
