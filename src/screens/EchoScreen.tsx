/*
 * This is the screen where the player can view available echo pods and choose to wake a character.
 * Extends ScreenBase.
 */
import React, { FC } from 'react';
import { motion } from 'framer-motion';
import { ScreenType } from './BaseScreen';
import { Stage } from '../Stage';
import { VignetteType } from '../Vignette';
import Nameplate from '../components/Nameplate';
import Actor from '../actors/Actor';

interface EchoScreenProps {
	stage: () => Stage;
	setScreenType: (type: ScreenType) => void;
}

export const EchoScreen: FC<EchoScreenProps> = ({stage, setScreenType}) => {

	const [echoSlots, setEchoSlots] = React.useState<(Actor | null)[]>([null, null, null]);
	const [selectedSlotIndex, setSelectedSlotIndex] = React.useState<number | null>(null);
	const reserveActors = stage().reserveActors;

	const cancel = () => {
		setScreenType(ScreenType.STATION);
	};

	const accept = () => {
		const selected = selectedSlotIndex != null ? echoSlots[selectedSlotIndex] : null;
		const firstRoom = stage().getSave().layout.getModulesWhere(m => m?.type === 'quarters' && !m?.ownerId)[0] || null;
		if (selected && firstRoom && selected.isImageLoadingComplete) {
			// Assign the selected actor to the first available room
			firstRoom.ownerId = selected.id;
			// Set the actor's location to the echo room:
			const sceneRoom = stage().getSave().layout.getModulesWhere(m => m.type === 'echo')[0] || firstRoom;
			selected.locationId = sceneRoom?.id || '';
			stage().getSave().actors[selected.id] = selected;
			// Remove from reserve actors and echo slots
			stage().reserveActors = stage().reserveActors.filter(a => a.id !== selected.id);
			setEchoSlots(prev => prev.map(slot => slot?.id === selected.id ? null : slot));
			// Possibly set other properties on the selected actor as needed
			selected.birth(stage().getSave().day);
			stage().setVignette({
                    type: VignetteType.INTRO_CHARACTER,
                    actorId: selected.id,
                    moduleId: sceneRoom?.id,
                    script: [],
                    generating: true,
                    context: {},
                    endScene: false
                });
			setScreenType(ScreenType.VIGNETTE);
		}
	};

	const handleDragStart = (e: React.DragEvent, actor: Actor, source: 'reserve' | 'echo') => {
		e.dataTransfer.setData('application/json', JSON.stringify({
			actorId: actor.id,
			source
		}));
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	const handleDropOnEchoSlot = async (e: React.DragEvent, slotIndex: number) => {
		e.preventDefault();
		const data = JSON.parse(e.dataTransfer.getData('application/json'));
		const actor = reserveActors.find(a => a.id === data.actorId) || echoSlots.find(a => a?.id === data.actorId);
		
		if (actor) {
			// Remove from previous echo slot if moving between slots
			if (data.source === 'echo') {
				setEchoSlots(prev => prev.map(slot => slot?.id === actor.id ? null : slot));
			}
			
			// Place in new echo slot
			setEchoSlots(prev => {
				const newSlots = [...prev];
				newSlots[slotIndex] = actor;
				return newSlots;
			});

			// Trigger image loading
			if (!actor.isCommittedToEcho) {
				stage().commitActorToEcho(actor.id);
			}
		}
	};

	const handleDropOnReserve = (e: React.DragEvent) => {
		e.preventDefault();
		const data = JSON.parse(e.dataTransfer.getData('application/json'));
		if (data.source === 'echo') {
			// Remove from echo slot
			setEchoSlots(prev => prev.map(slot => slot?.id === data.actorId ? null : slot));
		}
	};

	const availableRooms = stage().getSave().layout.getModulesWhere(m => m?.type === 'quarters' && !m?.ownerId) || [];
	const selectedActor = selectedSlotIndex != null ? echoSlots[selectedSlotIndex] : null;
	const acceptable = selectedActor && selectedActor.isImageLoadingComplete && availableRooms.length > 0;

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
			{/* Reserve carousel at top */}
			<div 
				style={{ 
					flex: '0 0 auto', 
					padding: '20px', 
					borderBottom: '2px solid rgba(0,255,136,0.2)',
					background: 'rgba(0,0,0,0.3)'
				}}
				onDrop={handleDropOnReserve}
				onDragOver={handleDragOver}
			>
				<h3 style={{ color: '#00ff88', marginBottom: '15px', textAlign: 'center' }}>Reserve Candidates</h3>
				<div style={{ 
					display: 'flex', 
					gap: 12, 
					justifyContent: 'center', 
					flexWrap: 'wrap',
					maxHeight: '200px',
					overflowY: 'auto'
				}}>
					{reserveActors.map((actor) => (
						<div
							key={`reserve_${actor.id}`}
							draggable
							onDragStart={(e) => handleDragStart(e, actor, 'reserve')}
							style={{ display: 'inline-block' }}
						>
						<motion.div
							whileHover={{ scale: 1.05 }}
							style={{
								cursor: 'grab',
								width: '80px',
								height: '120px',
								display: 'flex',
								flexDirection: 'column',
								borderRadius: 8,
								overflow: 'hidden',
								background: `url(${actor.emotionPack['neutral'] || actor.avatarImageUrl})`,
								backgroundSize: 'cover',
								backgroundPosition: 'center top',
								border: '2px solid #00ff88',
								boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
								position: 'relative'
							}}
						>
							<div style={{
								position: 'absolute',
								bottom: 0,
								left: 0,
								right: 0,
								background: 'rgba(0,0,0,0.8)',
								color: '#fff',
								fontSize: '10px',
								padding: '4px',
								textAlign: 'center',
								textOverflow: 'ellipsis',
								overflow: 'hidden',
								whiteSpace: 'nowrap'
							}}>
								{actor.name}
							</div>
						</motion.div>
						</div>
					))}
				</div>
			</div>

			{/* Echo slots in center */}
			<div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
				<div style={{ display: 'flex', gap: 40, alignItems: 'flex-end', justifyContent: 'center' }}>
					{echoSlots.map((actor, slotIndex) => (
						<motion.div
							key={`echo_slot_${slotIndex}`}
							onClick={() => setSelectedSlotIndex(actor ? slotIndex : null)}
							onDrop={(e) => handleDropOnEchoSlot(e, slotIndex)}
							onDragOver={handleDragOver}
							whileHover={{ scale: actor ? 1.02 : 1 }}
							whileTap={{ scale: actor ? 0.98 : 1 }}
							style={{
								cursor: actor ? 'pointer' : 'default',
								width: '20vw',
								height: '75vh',
								minHeight: 400,
								display: 'flex',
								flexDirection: 'column',
								justifyContent: actor ? 'flex-end' : 'center',
								alignItems: actor ? 'stretch' : 'center',
								borderRadius: 12,
								overflow: 'hidden',
								background: actor 
									? `url(${actor.emotionPack['neutral'] || actor.avatarImageUrl})`
									: 'rgba(0,255,136,0.1)',
								backgroundSize: 'cover',
								backgroundPosition: 'center top',
								border: selectedSlotIndex === slotIndex 
									? '5px solid #ffffff' 
									: actor 
										? (actor.isImageLoadingComplete ? '3px solid #00ff88' : '3px solid #ffaa00')
										: '3px dashed rgba(0,255,136,0.5)',
								boxShadow: selectedSlotIndex === slotIndex 
									? '0 8px 30px rgba(0,255,136,0.12)' 
									: '0 6px 18px rgba(0,0,0,0.4)',
								position: 'relative'
							}}
						>
							{actor ? (
								<>
									{/* Loading indicator */}
									{!actor.isImageLoadingComplete && (
										<div style={{
											position: 'absolute',
											top: '10px',
											right: '10px',
											background: 'rgba(255,170,0,0.9)',
											color: '#000',
											padding: '4px 8px',
											borderRadius: 4,
											fontSize: '12px',
											fontWeight: 'bold'
										}}>
											Loading Images...
										</div>
									)}
									
									{/* Draggable indicator */}
									<div
										draggable
										onDragStart={(e) => handleDragStart(e as any, actor, 'echo')}
										style={{
											position: 'absolute',
											top: '10px',
											left: '10px',
											background: 'rgba(0,0,0,0.7)',
											color: '#fff',
											padding: '4px 8px',
											borderRadius: 4,
											fontSize: '12px',
											cursor: 'grab'
										}}
									>
										⋮⋮
									</div>

									{/* Actor nameplate */}
									<Nameplate 
										actor={actor} 
										size="medium"
										style={{
											padding: '12px 16px',
											fontSize: 18,
											borderRadius: 0
										}}
									/>
									{/* Stats */}
									<div className="stat-list" style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.8)' }}>
										{[
											['Brawn', actor.stats['brawn']],
											['Wits', actor.stats['wits']],
											['Nerve', actor.stats['nerve']],
											['Skill', actor.stats['skill']],
											['Charm', actor.stats['charm']],
											['Lust', actor.stats['lust']],
											['Joy', actor.stats['joy']],
											['Trust', actor.stats['trust']],
										].map(([label, value]) => {
											const grade = actor.scoreToGrade(value as number);
											return (
												<div className="stat-row" key={`${actor.id}_${label}`}>
													<span className="stat-label">{label}</span>
													<span className="stat-grade" data-grade={grade}>{grade}</span>
												</div>
											);
										})}
									</div>
								</>
							) : (
								<div style={{ 
									color: 'rgba(0,255,136,0.7)', 
									fontSize: '18px', 
									textAlign: 'center',
									padding: '20px'
								}}>
									Drop a candidate here to commit them to the echo process
								</div>
							)}
						</motion.div>
					))}
				</div>
			</div>

			{/* Footer actions */}
			<div style={{ flex: '0 0 auto', padding: '18px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
				<motion.button
					onClick={cancel}
					whileHover={{ x: 6 }}
					whileTap={{ scale: 0.98 }}
					style={{
						padding: '12px 18px',
						borderRadius: 8,
						border: '2px solid rgba(255,255,255,0.06)',
						background: 'rgba(0,0,0,0.5)',
						color: '#fff',
						cursor: 'pointer'
					}}
				>
					Cancel
				</motion.button>

				<motion.button
					onClick={accept}
					whileHover={{ scale: acceptable ? 1.03 : 1 }}
					whileTap={{ scale: acceptable ? 0.98 : 1 }}
					style={{
						padding: '12px 18px',
						borderRadius: 8,
						border: '2px solid rgba(0,255,136,0.15)',
						background: acceptable ? '#00ff88' : 'rgba(255,255,255,0.06)',
						color: acceptable ? '#002210' : '#9aa0a6',
						fontWeight: 800,
						cursor: acceptable ? 'pointer' : 'not-allowed'
					}}
					disabled={!acceptable}
				>
					{availableRooms.length === 0 
						? 'No Available Quarters' 
						: selectedActor 
							? (selectedActor.isImageLoadingComplete ? 'Wake Candidate' : 'Candidate Still Fusing')
							: 'Select a Candidate'
					}
				</motion.button>
			</div>
		</div>
	);
}
