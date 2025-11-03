import React from 'react';

/*
 * Base screen management; the Stage class will display a single screen at a time. Other screens will extend ScreenBase.
 */

export interface ScreenBaseProps {
    stage?: any; // Reference to the Stage component for shared data access
}

export abstract class ScreenBase extends React.Component<ScreenBaseProps> {
    protected stage = this.props.stage;

    abstract render(): React.ReactNode;
}