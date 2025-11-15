/*
 * This is the screen where the player can view available echo pods and choose to wake a character.
 * Extends ScreenBase.
 */
import React, { FC } from 'react';
import { motion } from 'framer-motion';
import { BaseScreen, ScreenType } from './BaseScreen';
import { Stage } from '../Stage';
import { VignetteType } from '../Vignette';
import Nameplate from '../components/Nameplate';
import { generateAdditionalActorImages } from '../actors/Actor';

interface EchoScreenProps {
	stage: () => Stage;
	setScreenType: (type: ScreenType) => void;
}

export const EchoScreen: FC<EchoScreenProps> = ({stage, setScreenType}) => {

	const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
	const candidates = stage().reserveActors;

	const cancel = () => {
		setScreenType(ScreenType.STATION);
	};

	const accept = () => {
		const selected = selectedIndex != null ? candidates[selectedIndex] : null;
		const firstRoom = stage().getSave().layout.getModulesWhere(m => m?.type === 'quarters' && !m?.ownerId)[0] || null;
		if (selected && firstRoom) {
			// Assign the selected actor to the first available room
			firstRoom.ownerId = selected.id;
			// Set the actor's location to the echo room:
			const sceneRoom = stage().getSave().layout.getModulesWhere(m => m.type === 'echo')[0] || firstRoom;
			selected.locationId = sceneRoom?.id || '';
			stage().getSave().actors[selected.id] = selected;
			stage().reserveActors = stage().reserveActors.filter(a => a.id !== selected.id);
			// Possibly set other properties on the selected actor as needed
			selected.birth(stage().getSave().day);
			generateAdditionalActorImages(selected, stage()).then(() => {
				console.log(`Finished generating additional images for actor ${selected.name}`);
			}).catch(err => {
				console.error(`Error generating additional images for actor ${selected.name}:`, err);
			});
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

	const availableRooms = stage().getSave().layout.getModulesWhere(m => m?.type === 'quarters' && !m?.ownerId) || [];

	const acceptable = selectedIndex != null && availableRooms.length > 0;

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
			{/* Main centered area for pods */}
			<div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
				<div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', justifyContent: 'center' }}>
					{candidates.map((actor, idx) => {
						const isSelected = selectedIndex === idx;
						return (
							<motion.div
								key={`pod_${idx}`}
								onClick={() => setSelectedIndex(idx)}
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								style={{
									cursor: 'pointer',
									width: '15vw',
									height: '80vh',
									minHeight: 360,
									display: 'flex',
									flexDirection: 'column',
									justifyContent: 'flex-end',
									alignItems: 'stretch',
									borderRadius: 12,
									overflow: 'hidden',
									background: `url(${actor.emotionPack['neutral'] || actor.avatarImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center top',
									border: isSelected ? '5px solid #ffffff' : '3px solid #00ff88',
									boxShadow: isSelected ? '0 8px 30px rgba(0,255,136,0.12)' : '0 6px 18px rgba(0,0,0,0.4)'
								}}
							>
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
								{/* Lay out actor property scores with large stylized letter grades */}
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
								
							</motion.div>
						);
					})}
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
					{availableRooms.length === 0 ? 'No Available Quarters' : (selectedIndex == null ? 'Select a Candidate' : 'Accept Candidate')}
				</motion.button>
			</div>
		</div>
	);
}
