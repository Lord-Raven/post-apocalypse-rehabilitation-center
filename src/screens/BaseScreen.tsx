import React, { FC } from 'react';
import { Stage } from '../Stage';
import { SkitScreen } from './SkitScreen';
import { StationScreen } from './StationScreen';
import { EchoScreen } from './EchoScreen';
import { MenuScreen } from './MenuScreen';
import { LoadingScreen } from './LoadingScreen';
import { TooltipProvider } from '../contexts/TooltipContext';
import TooltipBar from '../components/TooltipBar';
import { useTooltip } from '../contexts/TooltipContext';

/*
 * Base screen management; the Stage class will display this, and this will track the current screen being displayed.
 */

export enum ScreenType {
    MENU = 'menu',
    LOADING = 'loading',
    STATION = 'station',
    ECHO = 'echo',
    SKIT = 'skit',
}

interface BaseScreenProps {
    stage: () => Stage;
}

const BaseScreenContent: FC<{ stage: () => Stage }> = ({ stage }) => {
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const [screenType, setScreenType] = React.useState<ScreenType>(ScreenType.MENU);
    const [isVerticalLayout, setIsVerticalLayout] = React.useState<boolean>(stage().isVerticalLayout());
    const { message, icon, actionCost, clearTooltip } = useTooltip();

    // Update layout orientation on resize
    React.useEffect(() => {
        const handleResize = () => {
            setIsVerticalLayout(stage().isVerticalLayout());
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Clear tooltip whenever screen type changes
    React.useEffect(() => {
        clearTooltip();
    }, [screenType]);

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
            {screenType === ScreenType.MENU && (
                // Render menu screen
                <MenuScreen stage={stage} setScreenType={setScreenType} />
            )}
            {screenType === ScreenType.LOADING && (
                // Render loading screen
                <LoadingScreen stage={stage} setScreenType={setScreenType} />
            )}
            {screenType === ScreenType.STATION && (
                // Render station screen
                <StationScreen stage={stage} setScreenType={setScreenType} isVerticalLayout={isVerticalLayout} />
            )}
            {screenType === ScreenType.ECHO && (
                // Render echo screen
                <EchoScreen stage={stage} setScreenType={setScreenType} isVerticalLayout={isVerticalLayout} />
            )}
            {screenType === ScreenType.SKIT && (
                // Render skit screen
                <SkitScreen stage={stage} setScreenType={setScreenType} isVerticalLayout={isVerticalLayout} />
            )}
            
            {/* Unified tooltip bar that renders over all screens */}
            <TooltipBar message={message} Icon={icon} actionCost={actionCost} />
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