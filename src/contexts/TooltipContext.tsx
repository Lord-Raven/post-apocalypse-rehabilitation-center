import React, { createContext, useContext, useState, ReactNode, FC } from 'react';
import { SvgIconComponent } from '@mui/icons-material';

interface TooltipContextValue {
    message: string | null;
    icon: SvgIconComponent | undefined;
    actionCost: number | undefined;
    setTooltip: (message: string | null, icon?: SvgIconComponent, actionCost?: number) => void;
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

    const setTooltip = (newMessage: string | null, newIcon?: SvgIconComponent, newActionCost?: number) => {
        setMessage(newMessage);
        setIcon(newIcon);
        setActionCost(newActionCost);
    };

    const clearTooltip = () => {
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
