import React from 'react';

interface SingleTypeOutProps {
    text?: string;
    children?: React.ReactNode;
    speed?: number; // ms per character
    className?: string;
    finishTyping?: boolean; // forces immediate completion when true
    onTypingComplete?: () => void; // called when typing animation finishes (either naturally or forced)
}

// Helper function to extract text content from React elements
const extractTextContent = (node: React.ReactNode): string => {
    if (typeof node === 'string') {
        return node;
    }
    if (typeof node === 'number') {
        return String(node);
    }
    if (React.isValidElement(node)) {
        if (node.props.children) {
            return extractTextContent(node.props.children);
        }
    }
    if (Array.isArray(node)) {
        return node.map(extractTextContent).join('');
    }
    return '';
};

// Helper function to truncate React elements based on character count
const truncateReactContent = (node: React.ReactNode, maxLength: number): React.ReactNode => {
    let currentLength = 0;
    
    const truncateNode = (n: React.ReactNode): React.ReactNode => {
        if (currentLength >= maxLength) {
            return null;
        }
        
        if (typeof n === 'string') {
            const remaining = maxLength - currentLength;
            const truncated = n.slice(0, remaining);
            currentLength += truncated.length;
            return truncated;
        }
        
        if (typeof n === 'number') {
            const str = String(n);
            const remaining = maxLength - currentLength;
            const truncated = str.slice(0, remaining);
            currentLength += truncated.length;
            return truncated;
        }
        
        if (React.isValidElement(n)) {
            const children = n.props.children;
            if (children) {
                const truncatedChildren = truncateNode(children);
                return React.cloneElement(n, n.props, truncatedChildren);
            }
            return n;
        }
        
        if (Array.isArray(n)) {
            const result = [];
            for (const child of n) {
                if (currentLength >= maxLength) break;
                const truncated = truncateNode(child);
                if (truncated !== null) {
                    result.push(truncated);
                }
            }
            return result;
        }
        
        return n;
    };
    
    return truncateNode(node);
};

/*
  Types content from empty to full once. It restarts whenever the content changes.
  Can be forced to complete immediately via finishTyping prop.
  Supports both text prop and children for flexible content rendering.
*/
export const SingleTypeOut: React.FC<SingleTypeOutProps> = ({ 
    text, 
    children, 
    speed = 25, 
    className, 
    finishTyping = false, 
    onTypingComplete 
}) => {
    const [displayLength, setDisplayLength] = React.useState<number>(0);
    const [finished, setFinished] = React.useState<boolean>(false);
    const timerRef = React.useRef<number | null>(null);
    
    // Determine what content to use - prioritize children over text
    const content = children !== undefined ? children : text;
    const textContent = React.useMemo(() => extractTextContent(content), [content]);
    
    React.useEffect(() => {
        // Reset state whenever content changes
        setDisplayLength(0);
        setFinished(false);
        let idx = 0;

        if (!textContent) {
            setFinished(true);
            onTypingComplete?.();
            return;
        }

        // Start interval to reveal characters
        timerRef.current = window.setInterval(() => {
            idx += 1;
            setDisplayLength(idx);
            if (idx >= textContent.length) {
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
    }, [textContent, speed, onTypingComplete]);

    // Effect to handle finishTyping prop
    React.useEffect(() => {
        if (finishTyping && !finished && timerRef.current !== null) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            setDisplayLength(textContent.length);
            setFinished(true);
            onTypingComplete?.();
        }
    }, [finishTyping, finished, textContent.length, onTypingComplete]);

    // Determine what to display
    const displayContent = React.useMemo(() => {
        if (displayLength === 0) {
            return '';
        }
        
        if (children !== undefined) {
            // For React children, truncate based on character count
            return truncateReactContent(children, displayLength);
        } else {
            // For text prop, slice the string
            return text ? text.slice(0, displayLength) : '';
        }
    }, [children, text, displayLength]);

    return (
        <span
            className={className}
            style={{ userSelect: 'none' }}
            aria-label="message"
        >
            {displayContent}
        </span>
    );
};

export default SingleTypeOut;
