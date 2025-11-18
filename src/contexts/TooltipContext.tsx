import React, { createContext, useContext, useState, ReactNode, FC } from 'react';
import { SvgIconComponent } from '@mui/icons-material';

interface TooltipContextValue {
    message: string | null;
    icon: SvgIconComponent | undefined;
    setTooltip: (message: string | null, icon?: SvgIconComponent) => void;
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

    const setTooltip = (newMessage: string | null, newIcon?: SvgIconComponent) => {
        setMessage(newMessage);
        setIcon(newIcon);
    };

    const clearTooltip = () => {
        setMessage(null);
        setIcon(undefined);
    };

    return (
        <TooltipContext.Provider value={{ message, icon, setTooltip, clearTooltip }}>
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
