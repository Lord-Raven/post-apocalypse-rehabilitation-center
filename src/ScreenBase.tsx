import React from 'react';
import { Stage } from './Stage';

/*
 * Base screen management; the Stage class will display a single screen at a time. Other screens will extend ScreenBase and may have additional properties.
 */

export interface ScreenBaseProps {
    stage: Stage; // Reference to the Stage component for shared data access
}

export abstract class ScreenBase extends React.Component<ScreenBaseProps> {
    protected stage: Stage = this.props.stage;

    abstract render(): React.ReactNode;
}