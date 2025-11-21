import React, { createContext, useContext, useState, useRef, ReactNode, FC } from 'react';
import { SvgIconComponent } from '@mui/icons-material';

interface TooltipContextValue {
    message: string | null;
    icon: SvgIconComponent | undefined;
    actionCost: number | undefined;
    setTooltip: (message: string | null, icon?: SvgIconComponent, actionCost?: number, expiryMs?: number) => void;
    clearTooltip: () => void;
}

const TooltipContext = createContext<TooltipContextValue | undefined>(undefined);

interface TooltipProviderProps {
    children: ReactNode;
}

/**
 * Provider for managing tooltip state across all screens
 */
export const TooltipProvider: FC<TooltipProviderProps> = ({ children }) => {
    const [message, setMessage] = useState<string | null>(null);
    const [icon, setIcon] = useState<SvgIconComponent | undefined>(undefined);
    const [actionCost, setActionCost] = useState<number | undefined>(undefined);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const setTooltip = (newMessage: string | null, newIcon?: SvgIconComponent, newActionCost?: number, expiryMs?: number) => {
        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        setMessage(newMessage);
        setIcon(newIcon);
        setActionCost(newActionCost);

        // Set up auto-expiry if specified
        if (expiryMs && expiryMs > 0 && newMessage) {
            timeoutRef.current = setTimeout(() => {
                // Only clear if the message hasn't changed
                setMessage((currentMessage) => {
                    if (currentMessage === newMessage) {
                        setIcon(undefined);
                        setActionCost(undefined);
                        return null;
                    }
                    return currentMessage;
                });
                timeoutRef.current = null;
            }, expiryMs);
        }
    };

    const clearTooltip = () => {
        // Clear any pending timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        
        setMessage(null);
        setIcon(undefined);
        setActionCost(undefined);
    };

    return (
        <TooltipContext.Provider value={{ message, icon, actionCost, setTooltip, clearTooltip }}>
            {children}
        </TooltipContext.Provider>
    );
};

/**
 * Hook to access tooltip context in any component
 */
export const useTooltip = (): TooltipContextValue => {
    const context = useContext(TooltipContext);
    if (!context) {
        throw new Error('useTooltip must be used within a TooltipProvider');
    }
    return context;
};
