/**
 * Shared UI Components
 * Reusable styled components based on the VignetteScreen blue theme
 */

import React, { FC, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

/* ===============================================
   PANEL COMPONENTS
   =============================================== */

interface GlassPanelProps extends HTMLMotionProps<"div"> {
	variant?: 'default' | 'bright';
	children: ReactNode;
}

export const GlassPanel: FC<GlassPanelProps> = ({ 
	variant = 'default', 
	children, 
	className = '',
	style,
	...props 
}) => {
	const variantClass = variant === 'bright' ? 'glass-panel-bright' : 'glass-panel';
	
	return (
		<motion.div 
			className={`${variantClass} ${className}`}
			style={{
				padding: '24px',
				...style
			}}
			{...props}
		>
			{children}
		</motion.div>
	);
};

interface GlowingCardProps extends HTMLMotionProps<"div"> {
	children: ReactNode;
}

export const GlowingCard: FC<GlowingCardProps> = ({ 
	children, 
	className = '',
	style,
	...props 
}) => {
	return (
		<motion.div 
			className={`card-glowing ${className}`}
			style={{
				padding: '20px',
				...style
			}}
			initial={{ opacity: 0, scale: 0.9 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.5, ease: "easeOutBack" }}
			{...props}
		>
			{children}
		</motion.div>
	);
};

/* ===============================================
   BUTTON COMPONENTS
   =============================================== */

interface ButtonProps extends HTMLMotionProps<"button"> {
	variant?: 'primary' | 'secondary' | 'menu';
	children: ReactNode;
	disabled?: boolean;
}

export const Button: FC<ButtonProps> = ({ 
	variant = 'primary', 
	children, 
	disabled = false,
	className = '',
	style,
	...props 
}) => {
	const variantClass = `btn-${variant}`;
	
	return (
		<motion.button
			className={`${variantClass} ${className}`}
			disabled={disabled}
			whileHover={!disabled ? { scale: variant === 'menu' ? 1 : 1.03 } : {}}
			whileTap={!disabled ? { scale: 0.98 } : {}}
			style={{
				height: 'fit-content',
				alignSelf: 'center',
				...style
			}}
			{...props}
		>
			{children}
		</motion.button>
	);
};

/* ===============================================
   BACKGROUND COMPONENTS
   =============================================== */

interface GridOverlayProps {
	size?: number;
}

export const GridOverlay: FC<GridOverlayProps> = ({ size = 60 }) => {
	return (
		<div 
			className="grid-overlay"
			style={{
				backgroundSize: `${size}px ${size}px`
			}}
		/>
	);
};

/* ===============================================
   PROGRESS INDICATORS
   =============================================== */

interface PhaseIndicatorProps {
	currentPhase: number;
	totalPhases: number;
}

export const PhaseIndicator: FC<PhaseIndicatorProps> = ({ currentPhase, totalPhases }) => {
	return (
		<div className="phase-indicator">
			{Array.from({ length: totalPhases }).map((_, index) => (
				<motion.div
					key={index}
					className={`phase-segment ${
						index === currentPhase ? 'active' : 
						index < currentPhase ? 'completed' : ''
					}`}
					initial={{ scaleX: 0 }}
					animate={{ scaleX: 1 }}
					transition={{ 
						duration: 0.3, 
						delay: index * 0.1,
						ease: "easeOut"
					}}
					whileHover={{ 
						scaleY: 1.3,
						transition: { duration: 0.2 }
					}}
				/>
			))}
		</div>
	);
};

/* ===============================================
   TEXT COMPONENTS
   =============================================== */

interface TitleProps {
	variant?: 'primary' | 'glow';
	children: ReactNode;
	style?: React.CSSProperties;
	className?: string;
}

export const Title: FC<TitleProps> = ({ 
	variant = 'primary', 
	children,
	style,
	className = ''
}) => {
	const variantClass = variant === 'primary' ? 'title-primary' : 'title-glow';
	
	return (
		<h1 className={`${variantClass} ${className}`} style={style}>
			{children}
		</h1>
	);
};

/* ===============================================
   INPUT COMPONENTS
   =============================================== */

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	fullWidth?: boolean;
}

export const TextInput: FC<TextInputProps> = ({ 
	fullWidth = false,
	className = '',
	style,
	...props 
}) => {
	return (
		<input
			className={`text-input-primary ${className}`}
			style={{
				width: fullWidth ? '100%' : 'auto',
				padding: '12px',
				fontSize: '14px',
				...style
			}}
			{...props}
		/>
	);
};

/* ===============================================
   CHIP/BADGE COMPONENTS
   =============================================== */

interface ChipProps {
	children: ReactNode;
	style?: React.CSSProperties;
	className?: string;
}

export const Chip: FC<ChipProps> = ({ 
	children,
	style,
	className = ''
}) => {
	return (
		<span className={`chip-info ${className}`} style={style}>
			{children}
		</span>
	);
};

/* ===============================================
   EXPANDABLE MENU ITEM
   =============================================== */

interface MenuItemProps {
	title: string;
	isExpanded: boolean;
	onToggle: () => void;
	children: ReactNode;
}

export const MenuItem: FC<MenuItemProps> = ({ 
	title, 
	isExpanded, 
	onToggle, 
	children 
}) => {
	const [isHovered, setIsHovered] = React.useState(false);
	
	return (
		<motion.div 
			layout
			style={{ margin: '10px 0' }}
			animate={{ x: isHovered ? 10 : 0 }}
			transition={{ 
				layout: { duration: 0.3, ease: 'easeInOut' },
				x: { duration: 0.2, ease: 'easeOut' }
			}}
		>
			<motion.button
				onClick={onToggle}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				whileTap={{ scale: 0.95 }}
				className={`menu-item-header ${isExpanded ? 'expanded' : ''}`}
			>
				<span>{title}</span>
				<span className={`chevron ${isExpanded ? 'rotated' : ''}`}>▼</span>
			</motion.button>
			
			<motion.div
				layout
				initial={{ height: 0, opacity: 0 }}
				animate={{ 
					height: isExpanded ? 'auto' : 0,
					opacity: isExpanded ? 1 : 0
				}}
				transition={{ 
					height: { duration: 0.3, ease: 'easeInOut' },
					opacity: { duration: 0.2, ease: 'easeInOut' }
				}}
				style={{ 
					overflow: 'hidden',
					background: 'rgba(0, 20, 40, 0.7)',
					border: isExpanded ? '2px solid rgba(0, 255, 136, 0.3)' : 'none',
					borderTop: 'none',
					borderRadius: '0 0 5px 5px',
				}}
			>
				<div style={{ padding: '15px' }}>
					{children}
				</div>
			</motion.div>
		</motion.div>
	);
};
