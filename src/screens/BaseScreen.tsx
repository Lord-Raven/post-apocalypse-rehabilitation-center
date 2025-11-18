import React, { FC } from 'react';
import { Stage } from '../Stage';
import { VignetteScreen } from './VignetteScreen';
import { StationScreen } from './StationScreen';
import { EchoScreen } from './EchoScreen';
import { MenuScreen } from './MenuScreen';
import { TooltipProvider } from '../contexts/TooltipContext';
import TooltipBar from '../components/TooltipBar';
import { useTooltip } from '../contexts/TooltipContext';

/*
 * Base screen management; the Stage class will display this, and this will track the current screen being displayed.
 */

export enum ScreenType {
    MENU = 'menu',
    STATION = 'station',
    ECHO = 'echo',
    VIGNETTE = 'vignette',
}

interface BaseScreenProps {
    stage: () => Stage;
}

const BaseScreenContent: FC<{ stage: () => Stage }> = ({ stage }) => {
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const [screenType, setScreenType] = React.useState<ScreenType>(ScreenType.MENU);
    const { message, icon } = useTooltip();

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            {screenType === ScreenType.MENU && (
                // Render menu screen
                <MenuScreen stage={stage} setScreenType={setScreenType} />
            )}
            {screenType === ScreenType.STATION && (
                // Render station screen
                <StationScreen stage={stage} setScreenType={setScreenType} />
            )}
            {screenType === ScreenType.ECHO && (
                // Render echo screen
                <EchoScreen stage={stage} setScreenType={setScreenType} />
            )}
            {screenType === ScreenType.VIGNETTE && (
                // Render vignette screen
                <VignetteScreen stage={stage} setScreenType={setScreenType} />
            )}
            
            {/* Unified tooltip bar that renders over all screens */}
            <TooltipBar message={message} Icon={icon} />
        </div>
    );
};

export const BaseScreen: FC<BaseScreenProps> = ({ stage }) => {
    return (
        <TooltipProvider>
            <BaseScreenContent stage={stage} />
        </TooltipProvider>
    );
}