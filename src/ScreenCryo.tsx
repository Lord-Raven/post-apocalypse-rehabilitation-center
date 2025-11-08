/*
 * This is the screen where the player can view available cryo pods and choose to wake a character.
 * Extends ScreenBase.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { ScreenBase } from './ScreenBase';
import { Stage } from './Stage';
import Actor from './Actor';

interface ScreenCryoProps {
	stage: Stage;
	candidates: Actor[]; // array of labels for each cryo pod
	onAccept?: (selected: Actor | null, stage: Stage) => void;
	onCancel?: (stage: Stage) => void;
}

interface ScreenCryoState {
	selectedIndex: number | null;
}

export default class ScreenCryo extends ScreenBase {
	state: ScreenCryoState = { selectedIndex: null };
	props: ScreenCryoProps;

	constructor(props: ScreenCryoProps) {
		super(props as any);
		this.props = props;
	}

	selectIndex = (idx: number) => {
		this.setState({ selectedIndex: idx });
	};

	accept = () => {
		const { selectedIndex } = this.state;
		const selected = selectedIndex != null ? this.props.candidates[selectedIndex] : null;
		const firstRoom = this.stage.getSave().layout.getModulesWhere(m => m?.type === 'quarters' && !m?.ownerId)[0] || null;
		if (selected && firstRoom) {
			// Assign the selected actor to the first available room
			firstRoom.ownerId = selected.id;
			selected.locationId = firstRoom.id;
			this.stage.getSave().actors[selected.id] = selected;
			this.stage.reserveActors = this.stage.reserveActors.filter(a => a.id !== selected.id);
			// Possibly set other properties on the selected actor as needed
		}
		if (this.props.onAccept) this.props.onAccept(selected, this.stage);
	};

	cancel = () => {
		if (this.props.onCancel) this.props.onCancel(this.stage);
	};

	render(): React.ReactNode {
		const pods = this.props.candidates || [];
		const { selectedIndex } = this.state;
		const availableRooms = this.stage.getSave().layout.getModulesWhere(m => m?.type === 'quarters' && !m?.ownerId) || [];
		const acceptable = selectedIndex != null && availableRooms.length > 0;

		return (
			<div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
				{/* Main centered area for pods */}
				<div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
					<div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', justifyContent: 'center' }}>
						{pods.map((actor, idx) => {
							const isSelected = selectedIndex === idx;
							return (
								<motion.div
									key={`cryo_${idx}`}
									onClick={() => this.selectIndex(idx)}
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
									{/* actor.name label across top center of parent div */}
									<div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.6)', color: '#fff', textAlign: 'center', fontWeight: 600, fontSize: 18 }}>
										{actor.name}
									</div>
									{/* Lay out actor property scores with large stylized letter grades */}
									<div className="stat-list" style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.8)' }}>
										{[
											['Condition', actor.condition],
											['Capability', actor.capability],
											['Intelligence', actor.intelligence],
											['Resilience', actor.resilience],
											['Charisma', actor.charisma],
											['Sexuality', actor.sexuality],
											['Compliance', actor.compliance]
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
						onClick={this.cancel}
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
						onClick={this.accept}
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
}

