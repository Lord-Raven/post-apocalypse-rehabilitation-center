/*
 * This is the screen where the player can manage characters in cryostasis.
 * Characters can be placed into cryo (locationId set to "cryo") or woken up.
 */
import React, { FC } from 'react';
import { motion } from 'framer-motion';
import { ScreenType } from './BaseScreen';
import { Stage } from '../Stage';
import Nameplate from '../components/Nameplate';
import Actor, { Stat, ACTOR_STAT_ICONS } from '../actors/Actor';
import ActorCard, { ActorCardSection } from '../components/ActorCard';
import { scoreToGrade } from '../utils';
import { BlurredBackground } from '../components/BlurredBackground';
import AuthorLink from '../components/AuthorLink';
import { RemoveButton } from '../components/RemoveButton';
import { Button } from '../components/UIComponents';
import { SkitType } from '../Skit';

interface CryoScreenProps {
	stage: () => Stage;
	setScreenType: (type: ScreenType) => void;
	isVerticalLayout: boolean;
}

export const CryoScreen: FC<CryoScreenProps> = ({stage, setScreenType, isVerticalLayout}) => {

	const [selectedSlotIndex, setSelectedSlotIndex] = React.useState<number | null>(null);
	const [expandedCandidateId, setExpandedCandidateId] = React.useState<string | null>(null);
	
	// Get actors present on the station (locationId is '' or matches a module ID in the layout)
	const stationActors = Object.values(stage().getSave().actors).filter(actor => {
		if (actor.locationId === 'cryo') return false;
		if (actor.locationId === '') return true;
		// Check if locationId matches a module ID
		return stage().getSave().layout.getModuleById(actor.locationId) !== null;
	});

	// Get actors in cryo (locationId === 'cryo'), max 3 slots
	const cryoSlots: (Actor | null)[] = [null, null, null];
	const cryoActors = Object.values(stage().getSave().actors).filter(actor => actor.locationId === 'cryo');
	cryoActors.slice(0, 3).forEach((actor, index) => {
		cryoSlots[index] = actor;
	});

	const cancel = () => {
		setScreenType(ScreenType.STATION);
	};

	// Handle Escape key to close the screen
	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				cancel();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, []);

	// Characters in cryo cannot be dragged out - they must be awakened using the Wake button

	// Wake a character from cryo
	const wake = () => {
		const selected = selectedSlotIndex != null ? cryoSlots[selectedSlotIndex] : null;
		const availableQuarters = stage().getSave().layout.getModulesWhere(m => m?.type === 'quarters' && !m?.ownerId);
		
		if (selected && availableQuarters.length > 0) {
			const firstRoom = availableQuarters[0];
			// Assign the selected actor to the first available quarters
			firstRoom.ownerId = selected.id;
            setSelectedSlotIndex(null);
            // Move actor to cryo module
            const cryoModule = stage().getSave().layout.getModulesWhere(m => m?.type === 'cryo bank')[0];
            if (cryoModule) {
                // Set the actor's last known module to the cryo module
                selected.locationId = cryoModule.id;
            }
            // EXIT_CRYO skit is triggered here
            stage().setSkit({
                actorId: selected.id,
                type: SkitType.EXIT_CRYO,
                moduleId: cryoModule.id,
                context: {},
                script: []
            });
            setScreenType(ScreenType.SKIT);
		}
	};

	const handleDragStart = (e: React.DragEvent, actor: Actor, source: 'station' | 'cryo') => {
		e.dataTransfer.setData('application/json', JSON.stringify({
			actorId: actor.id,
			source
		}));

		// Create custom drag image to show only the current card
		const dragElement = e.currentTarget as HTMLElement;
		const dragImage = dragElement.cloneNode(true) as HTMLElement;
		dragImage.style.position = 'absolute';
		dragImage.style.top = '-9999px';
		dragImage.style.width = dragElement.offsetWidth + 'px';
		dragImage.style.height = dragElement.offsetHeight + 'px';
		document.body.appendChild(dragImage);
		
		e.dataTransfer.setDragImage(dragImage, dragElement.offsetWidth / 2, dragElement.offsetHeight / 2);
		
		// Clean up the temporary drag image after a short delay
		setTimeout(() => {
			document.body.removeChild(dragImage);
		}, 0);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	const handleDropOnCryoSlot = (e: React.DragEvent, slotIndex: number) => {
		e.preventDefault();
		const data = JSON.parse(e.dataTransfer.getData('application/json'));
		const actor = stage().getSave().actors[data.actorId];
		
		if (actor && data.source === 'station') {
			// Check if slot is occupied
			const existingActor = cryoSlots[slotIndex];
			if (existingActor && existingActor.id !== actor.id) {
				// Move existing actor back to station
				existingActor.locationId = '';
			}
			
			// Move actor into cryo
			actor.locationId = 'cryo';
			
			// Clear actor from ownership on their quarters
			const quarters = stage().getSave().layout.getModulesWhere(m => m?.type === 'quarters' && m?.ownerId === actor.id);
			quarters.forEach(q => {
				q.ownerId = '';
			});
			
			// Clear actor from any module where they hold a role
			const roleModules = stage().getSave().layout.getModulesWhere(m => m?.type !== 'quarters' && m?.ownerId === actor.id);
			roleModules.forEach(m => {
				m.ownerId = '';
			});

            // Maybe trigger ENTER_CRYO skit here; the trouble is that locationId = 'cryo' is being used to indicate that the actor is already in cryo, but their location would need to be the module ID for the skit.
		}
	};

	// Characters in cryo cannot be dragged back to station - they must be awakened using the Wake button

	const module = stage().getSave().layout.getModulesWhere(m => m?.type === 'cryo bank')[0]!;
	const availableQuarters = stage().getSave().layout.getModulesWhere(m => m?.type === 'quarters' && !m?.ownerId) || [];
	const selectedActor = selectedSlotIndex != null ? cryoSlots[selectedSlotIndex] : null;
	const acceptable = selectedActor && availableQuarters.length > 0;
	const background = stage().getSave().actors[module.ownerId || '']?.decorImageUrls[module.type] || module.getAttribute('defaultImageUrl')


	return (
		<BlurredBackground imageUrl={background}>
			<div style={{ 
				display: 'flex', 
				flexDirection: 'column', 
				height: '100vh', 
				width: '100vw'
			}}>
			{/* Station actors carousel at top */}
			<div 
				style={{ 
					flex: '0 0 auto', 
					padding: '1vh', 
					borderBottom: '2px solid rgba(0,200,255,0.2)',
					background: 'rgba(0,0,0,0.3)',
					overflowX: 'auto',
					overflowY: 'hidden'
				}}
			>
				<div style={{ 
					display: 'flex', 
					gap: '1.2vmin', 
					justifyContent: 'center',
					minWidth: 'min-content',
					height: isVerticalLayout ? '32vh' : '22vh',
					paddingBottom: '0.5vh'
				}}>
				{stationActors.map((actor, index) => {
					const isExpanded = expandedCandidateId === actor.id;
					return (
					<motion.div
					key={`station_${actor.id}`}
					style={{ 
						display: 'inline-block',
						position: 'relative',
						width: isVerticalLayout ? (isExpanded ? '48vmin' : (expandedCandidateId ? '24vmin' : '32vmin')) : (isExpanded ? '32vmin' : (expandedCandidateId ? '12vmin' : '16vmin')),
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
						<ActorCard
								actor={actor}
								isAway={actor.isOffSite(stage().getSave())}
								collapsedSections={[ActorCardSection.PORTRAIT]}
								expandedSections={[ActorCardSection.PORTRAIT, ActorCardSection.STATS]}
								isExpanded={isExpanded}
								onClick={() => setExpandedCandidateId(isExpanded ? null : actor.id)}
								draggable
								onDragStart={(e) => handleDragStart(e, actor, 'station')}
							style={{
								height: isVerticalLayout ? '30vh' : '20vh',
								boxShadow: `0 6px 18px rgba(0,0,0,0.4), 0 0 20px ${actor.themeColor ? actor.themeColor + '66' : 'rgba(0, 200, 255, 0.4)'}`,
								padding: '8px',
								overflow: 'hidden'
							}}
						/>
					</motion.div>
				);})}
			</div>
		</div>
			{/* Cryo slots in center with buttons on sides or bottom */}
			<div style={{ 
				flex: '1 1 auto', 
				display: 'flex', 
				flexDirection: isVerticalLayout ? 'column' : 'row',
				alignItems: 'center', 
				justifyContent: 'center', 
				padding: isVerticalLayout ? '20px' : '40px',
				gap: isVerticalLayout ? '20px' : '40px'
			}}>
				{/* Cancel button on the left (or in button row below if vertical) */}
				{!isVerticalLayout && (
					<Button
						variant="secondary"
						onClick={cancel}
					>
						Cancel
					</Button>
				)}

				{/* Cryo slots container */}
				<div style={{ display: 'flex', gap: isVerticalLayout ? '20px' : '40px', alignItems: 'flex-end', justifyContent: 'center', flex: 1 }}>
					{cryoSlots.map((actor, slotIndex) => {
						const isSelected = selectedSlotIndex === slotIndex;

						return (
							<motion.div
								key={`cryo_slot_${slotIndex}`}
								onClick={() => setSelectedSlotIndex(actor ? slotIndex : null)}
								onDrop={(e) => handleDropOnCryoSlot(e, slotIndex)}
								onDragOver={handleDragOver}
								animate={{
									scale: (actor && isSelected) ? 1.05 : 1,
									y: [0, -3, -1, -4, 0],
									x: [0, 1, -1, 0.5, 0],
									rotate: [0, 0.5, -0.3, 0.2, 0],
									transition: {
										scale: {
											type: "spring",
											stiffness: 150,
											damping: 15
										},
										y: {
											duration: 6,
											repeat: Infinity,
											ease: "easeInOut",
											delay: slotIndex * 0.7
										},
										x: {
											duration: 6,
											repeat: Infinity,
											ease: "easeInOut",
											delay: slotIndex * 0.7
										},
										rotate: {
											duration: 6,
											repeat: Infinity,
											ease: "easeInOut",
											delay: slotIndex * 0.7
										}
									}
								}}
								whileHover={{ 
									scale: actor ? (isSelected ? 1.1 : 1.05) : 1,
									filter: 'brightness(1.1)',
									transition: {
										type: "spring",
										stiffness: 150,
										damping: 15
									}
								}}
								whileTap={{ scale: actor ? 0.98 : 1 }}
								style={{
									cursor: actor ? 'pointer' : 'default',
									height: isVerticalLayout ? '50vh' : '65vh',
									width: isVerticalLayout ? '28vw' : '18vw',
									display: 'flex',
									flexDirection: 'column',
									justifyContent: actor ? 'flex-end' : 'center',
									alignItems: actor ? 'stretch' : 'center',
									borderRadius: 12,
									overflow: 'hidden',
									background: actor ? undefined : 'linear-gradient(135deg, rgba(0,200,255,0.15), rgba(100,150,255,0.1))',
									border: isSelected
										? `5px solid ${actor?.themeColor || '#ffffff'}` 
										: actor 
											? `4px solid ${actor.themeColor || '#00c8ff'}`
											: '3px dashed rgba(0,200,255,0.5)',
									boxShadow: isSelected
										? `0 12px 40px ${actor?.themeColor ? actor.themeColor + '40' : 'rgba(0,200,255,0.25)'}, inset 0 0 50px ${actor?.themeColor ? actor.themeColor + '20' : 'rgba(0,200,255,0.1)'}` 
										: actor
											? `0 8px 25px rgba(0,0,0,0.4), inset 0 0 30px ${actor.themeColor ? actor.themeColor + '15' : 'rgba(0,200,255,0.05)'}, 0 0 20px ${actor.themeColor ? actor.themeColor + '30' : 'rgba(0,200,255,0.1)'}`
											: '0 8px 25px rgba(0,0,0,0.4), inset 0 0 30px rgba(0,200,255,0.05)',
									position: 'relative',
								}}
							>
								{/* Background layers for actor slots */}
								{actor && (
									<>
										{/* Actor portrait image layer */}
										<div 
											style={{
												position: 'absolute',
												top: 0,
												left: 0,
												width: '100%',
												height: '100%',
												backgroundImage: `url(${actor.getEmotionImage('neutral', stage())})`,
												backgroundSize: 'cover',
												backgroundPosition: 'center top',
												backgroundRepeat: 'no-repeat',
												zIndex: 0,
											}}
										/>
										{/* Gradient overlay layer */}
										<div 
											style={{
												position: 'absolute',
												top: 0,
												left: 0,
												width: '100%',
												height: '100%',
												background: `linear-gradient(
													135deg, 
													rgba(0, 200, 255, 0.15) 0%, 
													rgba(100, 150, 255, 0.1) 50%, 
													rgba(109, 87, 131, 0.15) 100%
												)`,
												mixBlendMode: 'overlay',
												zIndex: 1,
											}}
										/>
									</>
								)}
							{actor ? (
								<>
									{/* Spacer to push the nameplate and stats down about 30vh */}
									<div style={{ flex: '0 0 30vh', position: 'relative', zIndex: 2 }}></div>
									{/* Actor nameplate */}
									<Nameplate 
										actor={actor} 
										size="medium"
										role={(() => {
											const roleModules = stage().getSave().layout.getModulesWhere((m: any) => 
												m && m.type !== 'quarters' && m.ownerId === actor.id
											);
											return roleModules.length > 0 ? roleModules[0].getAttribute('role') : undefined;
										})()}
										layout="stacked"
										style={{
											padding: 'clamp(8px, 1.5vmin, 16px) clamp(10px, 2vmin, 20px)',
											fontSize: 'clamp(14px, 2.2vmin, 20px)',
											position: 'relative',
											zIndex: 2
										}}
									/>
								{/* Stats */}
								<div className="stat-list" style={{ padding: 'clamp(6px, 1vmin, 10px) clamp(8px, 1.5vmin, 14px)', background: 'rgba(0,0,0,0.8)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', position: 'relative', zIndex: 2 }}>
										{Object.values(Stat).map((stat) => {
											const grade = scoreToGrade(actor.stats[stat]);
											const StatIcon = ACTOR_STAT_ICONS[stat];
											return (
												<div className="stat-row" key={`${actor.id}_${stat}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
													<div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px, 0.8vmin, 8px)' }}>
														{StatIcon && <StatIcon style={{ fontSize: 'clamp(0.8rem, 2vmin, 1.2rem)', opacity: 0.8, flexShrink: 0 }} />}
														<span className="stat-label">{stat}</span>
													</div>
													<span className="stat-grade" data-grade={grade}>{grade}</span>
												</div>
												);
										})}
										{/* Author link */}
										<AuthorLink actor={actor} />
									</div>
								</>
							) : (
								<div style={{ 
									color: 'rgba(0,200,255,0.7)', 
									fontSize: 'clamp(14px, 2.2vmin, 20px)', 
									textAlign: 'center',
									padding: 'clamp(12px, 2.5vmin, 24px)'
								}}>
									Drop a character here to place them in cryostasis.
								</div>
							)}
								</motion.div>
						);
					})}
				</div>

				{/* Wake button on the right (or in button row below if vertical) */}
				{!isVerticalLayout && (
					<Button
						variant="primary"
						onClick={wake}
						disabled={!acceptable}
						style={{
							background: acceptable ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)',
							color: acceptable ? '#002210' : '#9aa0a6'
						}}
					>
						{availableQuarters.length === 0 
							? 'No Available Quarters' 
							: selectedActor 
								? 'Wake Character'
								: 'Select a Character'
						}
					</Button>
				)}

				{/* Button row for vertical layout */}
				{isVerticalLayout && (
					<div style={{ display: 'flex', gap: '20px', justifyContent: 'center', width: '100%' }}>
						<Button
							variant="secondary"
							onClick={cancel}
						>
							Cancel
						</Button>
						<Button
							variant="primary"
							onClick={wake}
							disabled={!acceptable}
							style={{
								background: acceptable ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)',
								color: acceptable ? '#002210' : '#9aa0a6'
							}}
						>
							{availableQuarters.length === 0 
								? 'No Available Quarters' 
								: selectedActor 
									? 'Wake Character'
									: 'Select a Character'
							}
						</Button>
					</div>
				)}
			</div>
			</div>
		</BlurredBackground>
	);
}
