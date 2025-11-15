import React, { FC } from 'react';

interface BlurredBackgroundProps {
    imageUrl: string;
    brightness?: number;
    contrast?: number;
    blur?: number;
    scale?: number;
    overlay?: string;
    children?: React.ReactNode;
}

/**
 * A reusable component that provides a blurred background image with consistent styling
 * across all screens in the application.
 */
export const BlurredBackground: FC<BlurredBackgroundProps> = ({
    imageUrl,
    brightness = 0.6,
    contrast = 1.05,
    blur = 6,
    scale = 1.03,
    overlay,
    children
}) => {
    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden'
        }}>
            {/* Background image with blur effect */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                filter: `blur(${blur}px) brightness(${brightness}) contrast(${contrast})`,
                transform: `scale(${scale})`
            }} />

            {/* Optional overlay */}
            {overlay && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: overlay,
                    zIndex: 1
                }} />
            )}

            {/* Content */}
            <div style={{
                position: 'relative',
                zIndex: 2,
                width: '100%',
                height: '100%'
            }}>
                {children}
            </div>
        </div>
    );
};

export default BlurredBackground;