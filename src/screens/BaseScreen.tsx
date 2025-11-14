import React, { FC } from 'react';
import { Stage } from '../Stage';
import { VignetteScreen } from './VignetteScreen';
import { StationScreen } from './StationScreen';
import { EchoScreen } from './EchoScreen';
import { MenuScreen } from './MenuScreen';

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

export const BaseScreen: FC<BaseScreenProps> = ({ stage }) => {
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const [screenType, setScreenType] = React.useState<ScreenType>(ScreenType.MENU);

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
        </div>
    )
}