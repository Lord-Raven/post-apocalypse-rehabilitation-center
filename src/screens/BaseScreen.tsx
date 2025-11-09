import React from 'react';
import { Stage } from '../Stage';

/*
 * Base screen management; the Stage class will display a single screen at a time. Other screens will extend ScreenBase and may have additional properties.
 */

export interface BaseScreenProps {
    stage: Stage; // Reference to the Stage component for shared data access
}

export abstract class BaseScreen extends React.Component<BaseScreenProps> {
    protected stage: Stage = this.props.stage;

    abstract render(): React.ReactNode;
}