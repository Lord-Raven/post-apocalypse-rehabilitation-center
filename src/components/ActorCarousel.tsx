/*
 * A reusable component for displaying a horizontal carousel of actor cards.
 * Used by AttenuationScreen, EchoScreen, and optionally CryoScreen.
 */
import React, { FC } from 'react';
import { motion } from 'framer-motion';
import Actor from '../actors/Actor';
import ActorCard, { ActorCardSection } from './ActorCard';
import { RemoveButton } from './RemoveButton';
import { Stage } from '../Stage';

interface ActorCarouselProps {
	actors: Actor[];
	stage: Stage;
	isVerticalLayout: boolean;
	expandedActorId: string | null;
	onExpandActor: (actorId: string | null) => void;
	
	// Optional props for customization
	borderColor?: string;
	glowColor?: string;
	showRemoveButton?: boolean;
	onRemoveActor?: (actorId: string, e: React.MouseEvent) => void;
	draggable?: boolean;
	onDragStart?: (e: React.DragEvent, actor: Actor) => void;
	onDrop?: (e: React.DragEvent) => void;
	onDragOver?: (e: React.DragEvent) => void;
}

export const ActorCarousel: FC<ActorCarouselProps> = ({
	actors,
	stage,
	isVerticalLayout,
	expandedActorId,
	onExpandActor,
	borderColor = 'rgba(0,255,136,0.2)',
	glowColor = 'rgba(0, 255, 136, 0.4)',
	showRemoveButton = false,
	onRemoveActor,
	draggable = false,
	onDragStart,
	onDrop,
	onDragOver
}) => {
	return (
		<div 
			style={{ 
				flex: '0 0 auto', 
				padding: '1vh', 
				borderBottom: `2px solid ${borderColor}`,
				background: 'rgba(0,0,0,0.3)',
				overflowX: 'auto',
				overflowY: 'hidden'
			}}
			onDrop={onDrop}
			onDragOver={onDragOver}
		>
			<div style={{ 
				display: 'flex', 
				gap: '1.2vmin', 
				justifyContent: 'center',
				minWidth: 'min-content',
				height: isVerticalLayout ? '32vh' : '22vh',
				paddingBottom: '0.5vh'
			}}>
				{actors.map((actor, index) => {
					const isExpanded = expandedActorId === actor.id;
					return (
						<motion.div
							key={`actor_${actor.id}`}
							style={{ 
								display: 'inline-block',
								position: 'relative',
								width: isVerticalLayout 
									? (isExpanded ? '48vmin' : (expandedActorId ? '24vmin' : '32vmin')) 
									: (isExpanded ? '32vmin' : (expandedActorId ? '12vmin' : '16vmin')),
								transition: 'width 0.3s ease'
							}}
							animate={{
								y: [0, -3, -1, -4, 0],
								x: [0, 1, -1, 0.5, 0],
								rotate: [0, 0.5, -0.3, 0.2, 0],
								transition: {
									duration: 6,
									repeat: Infinity,
									ease: "easeInOut",
									delay: 0.2 + index * 0.7
								}
							}}
							whileHover={{ 
								scale: 1.05,
								filter: 'brightness(1.1)',
								transition: {
									type: "spring",
									stiffness: 150,
									damping: 15
								}
							}}
							whileTap={{ scale: 0.99 }}
						>
							{showRemoveButton && onRemoveActor && (
								<RemoveButton
									onClick={(e: React.MouseEvent) => onRemoveActor(actor.id, e)}
									title="Remove from reserves"
									variant="topRight"
									size="small"
								/>
							)}
							<ActorCard
								actor={actor}
								isAway={actor.isOffSite(stage.getSave())}
								collapsedSections={[ActorCardSection.PORTRAIT]}
								expandedSections={[ActorCardSection.PORTRAIT, ActorCardSection.STATS]}
								isExpanded={isExpanded}
								onClick={() => onExpandActor(isExpanded ? null : actor.id)}
								draggable={draggable}
								onDragStart={onDragStart ? (e) => onDragStart(e, actor) : undefined}
								style={{
									height: isVerticalLayout ? '30vh' : '20vh',
									boxShadow: `0 6px 18px rgba(0,0,0,0.4), 0 0 20px ${actor.themeColor ? actor.themeColor + '66' : glowColor}`,
									padding: '8px',
									overflow: 'hidden'
								}}
							/>
						</motion.div>
					);
				})}
			</div>
		</div>
	);
};
