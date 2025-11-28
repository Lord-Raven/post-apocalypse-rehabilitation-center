/*
 * This is the screen where the player can view available echo pods and choose to wake a character.
 */
import React, { FC } from 'react';
import { motion } from 'framer-motion';
import { ScreenType } from './BaseScreen';
import { Stage } from '../Stage';
import { SkitType } from '../Skit';
import Nameplate from '../components/Nameplate';
import Actor, { generateActorDecor, Stat, ACTOR_STAT_ICONS } from '../actors/Actor';
import ActorCard, { ActorCardSection } from '../components/ActorCard';
import { scoreToGrade } from '../utils';
import { BlurredBackground } from '../components/BlurredBackground';
import AuthorLink from '../components/AuthorLink';
import { RemoveButton } from '../components/RemoveButton';
import { Button } from '../components/UIComponents';

interface EchoScreenProps {
	stage: () => Stage;
	setScreenType: (type: ScreenType) => void;
}

export const EchoScreen: FC<EchoScreenProps> = ({stage, setScreenType}) => {

	const [selectedSlotIndex, setSelectedSlotIndex] = React.useState<number | null>(null);
	const [expandedCandidateId, setExpandedCandidateId] = React.useState<string | null>(null);
	const [refreshKey, setRefreshKey] = React.useState(0); // Force re-renders when data changes
	const reserveActors = stage().reserveActors;
	const echoSlots = stage().getEchoSlots();

	const cancel = () => {
		setScreenType(ScreenType.STATION);
	};

	const removeReserveActor = (actorId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();
		stage().reserveActors = stage().reserveActors.filter(a => a.id !== actorId);
		stage().loadReserveActors();
		setRefreshKey(prev => prev + 1); // Force re-render
	};

	const removeEchoActor = (actorId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();
		// Find the actor in echo slots
		const actor = echoSlots.find(a => a?.id === actorId);
		if (actor) {
			// Remove from echo slot
			stage().removeActorFromEcho(actorId, true);
			// Add back to reserve actors if not already there
			if (!stage().reserveActors.find(a => a.id === actorId)) {
				stage().reserveActors.push(actor);
			}
			setRefreshKey(prev => prev + 1); // Force re-render
		}
	};

	const accept = () => {
		const selected = selectedSlotIndex != null ? echoSlots[selectedSlotIndex] : null;
		const firstRoom = stage().getSave().layout.getModulesWhere(m => m?.type === 'quarters' && !m?.ownerId)[0] || null;
		if (selected && firstRoom && selected.isPrimaryImageReady) {
			// Assign the selected actor to the first available room
			firstRoom.ownerId = selected.id;
			generateActorDecor(selected, firstRoom, stage());
			// Set the actor's location to the echo room:
			const sceneRoom = stage().getSave().layout.getModulesWhere(m => m.type === 'echo chamber')[0] || firstRoom;
			selected.locationId = sceneRoom?.id || '';
			stage().getSave().actors[selected.id] = selected;
			// Remove from reserve actors and echo slots
			stage().reserveActors = stage().reserveActors.filter(a => a.id !== selected.id);
			stage().removeActorFromEcho(selected.id, false);
			// Possibly set other properties on the selected actor as needed
			selected.birth(stage().getSave().day);
            stage().setSkit({
                    type: SkitType.INTRO_CHARACTER,
                    actorId: selected.id,
                    moduleId: sceneRoom?.id,
                    script: [],
                    generating: true,
                    context: {}
                });
		}
	};

	const handleDragStart = (e: React.DragEvent, actor: Actor, source: 'reserve' | 'echo') => {
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

	const handleDropOnEchoSlot = async (e: React.DragEvent, slotIndex: number) => {
		e.preventDefault();
		const data = JSON.parse(e.dataTransfer.getData('application/json'));
		console.log('Dropping echo onto slot');
		console.log(data);
		const actor = reserveActors.find(a => a.id === data.actorId) || echoSlots.find(a => a?.id === data.actorId);
		console.log(actor);
		if (actor) {
			// Check if slot is occupied
			const existingActor = echoSlots[slotIndex];
			if (existingActor && existingActor.id !== actor.id) {
				// Move existing actor back to reserves
				if (!stage().reserveActors.find(a => a.id === existingActor.id)) {
					stage().reserveActors.push(existingActor);
				}
			}
			await stage().commitActorToEcho(actor.id, slotIndex);
			// Remove dragged actor from reserves if they came from there
			if (data.source === 'reserve') {
				stage().reserveActors = stage().reserveActors.filter(a => a.id !== actor.id);
			}
			// Use Stage method to manage echo slots
			setRefreshKey(prev => prev + 1); // Force re-render
		}
	};

	const handleDropOnReserve = (e: React.DragEvent) => {
		e.preventDefault();
		const data = JSON.parse(e.dataTransfer.getData('application/json'));
		if (data.source === 'echo') {
			// Remove from echo slot using Stage method
			stage().removeActorFromEcho(data.actorId, true);
			setRefreshKey(prev => prev + 1); // Force re-render
		}
	};

	const availableRooms = stage().getSave().layout.getModulesWhere(m => m?.type === 'quarters' && !m?.ownerId) || [];
	const selectedActor = selectedSlotIndex != null ? echoSlots[selectedSlotIndex] : null;
	const acceptable = selectedActor && selectedActor.isPrimaryImageReady && availableRooms.length > 0;

	return (
		<BlurredBackground imageUrl="https://media.charhub.io/026ae01a-7dc8-472d-bfea-61548b87e6ef/84990780-8260-4833-ac0b-79c1a15ddb9e.png">
			<div style={{ 
				display: 'flex', 
				flexDirection: 'column', 
				height: '100vh', 
				width: '100vw'
			}}>
			{/* Reserve carousel at top */}
			<div 
				style={{ 
					flex: '0 0 auto', 
					padding: '1vh', 
					borderBottom: '2px solid rgba(0,255,136,0.2)',
					background: 'rgba(0,0,0,0.3)',
					overflow: 'visible'
				}}
				onDrop={handleDropOnReserve}
				onDragOver={handleDragOver}
			>
				<div style={{ 
					display: 'flex', 
					gap: '1.2vh', 
					justifyContent: 'center', 
					flexWrap: 'wrap',
					maxHeight: '25vh',
				}}>
				{reserveActors.map((actor, index) => {
					const isExpanded = expandedCandidateId === actor.id;
					return (
					<motion.div
					key={`reserve_${actor.id}`}
					style={{ 
						display: 'inline-block',
						position: 'relative',
						width: isExpanded ? '32vh' : '16vh',
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
					whileTap={{ scale: 0.98 }}
					>
						<RemoveButton
							onClick={(e: React.MouseEvent) => removeReserveActor(actor.id, e)}
							title="Remove from reserves"
							variant="topRight"
							size="small"
						/>							
						<ActorCard
								actor={actor}
								collapsedSections={[ActorCardSection.PORTRAIT]}
								expandedSections={[ActorCardSection.PORTRAIT, ActorCardSection.STATS]}
								isExpanded={isExpanded}
								onClick={() => setExpandedCandidateId(isExpanded ? null : actor.id)}
								draggable
								onDragStart={(e) => handleDragStart(e, actor, 'reserve')}
							style={{
								height: '20vh',
								boxShadow: `0 6px 18px rgba(0,0,0,0.4), 0 0 20px ${actor.themeColor ? actor.themeColor + '66' : 'rgba(0, 255, 136, 0.4)'}`,
								padding: '8px',
								overflow: 'hidden'
							}}
						/>
					</motion.div>
				);})}
			</div>
		</div>			{/* Echo slots in center with buttons on sides */}
			<div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '40px' }}>
				{/* Cancel button on the left */}
				<Button
					variant="secondary"
					onClick={cancel}
				>
					Cancel
				</Button>

				{/* Echo slots container */}
				<div style={{ display: 'flex', gap: 40, alignItems: 'flex-end', justifyContent: 'center', flex: 1 }}>
					{echoSlots.map((actor, slotIndex) => {
						const isSelected = selectedSlotIndex === slotIndex;

						return (
							<motion.div
								key={`echo_slot_${slotIndex}`}
								onClick={() => setSelectedSlotIndex(actor ? slotIndex : null)}
								onDrop={(e) => handleDropOnEchoSlot(e, slotIndex)}
								onDragOver={handleDragOver}
								animate={{
									scale: (actor && isSelected) ? 1.1 : 1,
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
									scale: actor ? (isSelected ? 1.15 : 1.05) : 1,
									filter: 'brightness(1.1)',
									transition: {
										type: "spring",
										stiffness: 150,
										damping: 15
									}
								}}
								whileTap={{ scale: actor ? 0.98 : 1 }}
								className={actor && !actor.isPrimaryImageReady ? 'loading-echo-slot' : ''}
								style={{
									...((actor && !actor.isPrimaryImageReady && actor.themeColor) && {
										'--shimmer-color': actor.themeColor
									} as React.CSSProperties),
									animationDelay: `${slotIndex * 0.7}s`,
									cursor: actor ? 'pointer' : 'default',
									height: '65vh',
									width: '18vw',
									display: 'flex',
									flexDirection: 'column',
									justifyContent: actor ? 'flex-end' : 'center',
									alignItems: actor ? 'stretch' : 'center',
									borderRadius: 12,
									overflow: 'hidden',
									background: actor ? undefined : 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,200,255,0.1))',
									border: isSelected
										? `5px solid ${actor?.themeColor || '#ffffff'}` 
										: actor 
											? `4px solid ${actor.themeColor || '#00ff88'}`
											: '3px dashed rgba(0,255,136,0.5)',
									boxShadow: isSelected
										? `0 12px 40px ${actor?.themeColor ? actor.themeColor + '40' : 'rgba(0,255,136,0.25)'}, inset 0 0 50px ${actor?.themeColor ? actor.themeColor + '20' : 'rgba(0,255,136,0.1)'}` 
										: actor
											? `0 8px 25px rgba(0,0,0,0.4), inset 0 0 30px ${actor.themeColor ? actor.themeColor + '15' : 'rgba(0,255,136,0.05)'}, 0 0 20px ${actor.themeColor ? actor.themeColor + '30' : 'rgba(0,255,136,0.1)'}`
											: '0 8px 25px rgba(0,0,0,0.4), inset 0 0 30px rgba(0,255,136,0.05)',
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
													rgba(0, 255, 136, 0.15) 0%, 
													rgba(0, 200, 255, 0.1) 50%, 
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
									<RemoveButton
										onClick={(e: React.MouseEvent) => removeEchoActor(actor.id, e)}
										title="Move to reserves"
										variant="topRightInset"
										size="medium"
									/>
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
											padding: '12px 16px',
											fontSize: 18,
											position: 'relative',
											zIndex: 2
										}}
									/>
									{/* Stats */}
									<div className="stat-list" style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.8)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', position: 'relative', zIndex: 2 }}>
										{Object.values(Stat).map((stat) => {
											const grade = scoreToGrade(actor.stats[stat]);
											const StatIcon = ACTOR_STAT_ICONS[stat];
											return (
												<div className="stat-row" key={`${actor.id}_${stat}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
													<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
														{StatIcon && <StatIcon style={{ fontSize: '1.1rem', opacity: 0.8, flexShrink: 0 }} />}
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
									color: 'rgba(0,255,136,0.7)', 
									fontSize: '18px', 
									textAlign: 'center',
									padding: '20px'
								}}>
									Drop an echo here to initiate the echofusion process.
								</div>
							)}
								</motion.div>
						);
					})}
				</div>

				{/* Wake button on the right */}
				<Button
					variant="primary"
					onClick={accept}
					disabled={!acceptable}
					style={{
						background: acceptable ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)',
						color: acceptable ? '#002210' : '#9aa0a6'
					}}
				>
					{availableRooms.length === 0 
						? 'No Available Quarters' 
						: selectedActor 
							? (selectedActor.isPrimaryImageReady ? 'Wake Candidate' : 'Candidate Still Fusing')
							: 'Select a Candidate'
					}
				</Button>
			</div>
			</div>
		</BlurredBackground>
	);
}
