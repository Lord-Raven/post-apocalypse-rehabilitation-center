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
	stage?: any;
	candidates: Actor[]; // array of labels for each cryo pod
	onAccept?: (selected: Actor | null, stage: Stage) => void;
	onCancel?: (stage: Stage) => void;
}

interface ScreenCryoState {
	selectedIndex: number | null;
}

export default class ScreenCryo extends ScreenBase {
	props: ScreenCryoProps;
	state: ScreenCryoState = { selectedIndex: null };

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
		if (this.props.onAccept) this.props.onAccept(selected, this.props.stage);
	};

	cancel = () => {
		if (this.props.onCancel) this.props.onCancel(this.props.stage);
	};

	render(): React.ReactNode {
		const pods = this.props.candidates || [];
		const { selectedIndex } = this.state;

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
										width: 180,
										height: '70vh',
										minHeight: 360,
										display: 'flex',
										flexDirection: 'column',
										justifyContent: 'flex-end',
										alignItems: 'stretch',
										borderRadius: 12,
										overflow: 'hidden',
										backgroundImage: `url(${actor.avatarImageUrl})`,
										backgroundSize: 'cover',
										backgroundPosition: 'center',
										border: isSelected ? '3px solid #00ff88' : '2px solid rgba(255,255,255,0.06)',
										boxShadow: isSelected ? '0 8px 30px rgba(0,255,136,0.12)' : '0 6px 18px rgba(0,0,0,0.4)'
									}}
								>
									{/* Label across bottom */}
									<div style={{ padding: '12px 10px', background: 'rgba(0,0,0,0.45)', color: '#e9fff0', fontWeight: 700, textAlign: 'center', fontSize: 16 }}>
										{actor.name}
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
						whileHover={{ scale: selectedIndex != null ? 1.03 : 1 }}
						whileTap={{ scale: selectedIndex != null ? 0.98 : 1 }}
						style={{
							padding: '12px 18px',
							borderRadius: 8,
							border: '2px solid rgba(0,255,136,0.15)',
							background: selectedIndex != null ? '#00ff88' : 'rgba(255,255,255,0.06)',
							color: selectedIndex != null ? '#002210' : '#9aa0a6',
							fontWeight: 800,
							cursor: selectedIndex != null ? 'pointer' : 'not-allowed'
						}}
						disabled={selectedIndex == null}
					>
						Accept
					</motion.button>
				</div>
			</div>
		);
	}
}

