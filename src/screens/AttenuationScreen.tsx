/*
 * This is the screen where the player can manage reserve actors,
 * request specific actor URLs for retrieval, and specify content modifiers.
 */
import React, { FC } from 'react';
import { ScreenType } from './BaseScreen';
import { Stage } from '../Stage';
import { loadReserveActorFromFullPath } from '../actors/Actor';
import { BlurredBackground } from '../components/BlurredBackground';
import { Button, GlassPanel } from '../components/UIComponents';
import { ActorCarousel } from '../components/ActorCarousel';
import { Box, setRef, TextField, Typography } from '@mui/material';

interface AttenuationScreenProps {
	stage: () => Stage;
	setScreenType: (type: ScreenType) => void;
	isVerticalLayout: boolean;
}

export const AttenuationScreen: FC<AttenuationScreenProps> = ({stage, setScreenType, isVerticalLayout}) => {

	const [expandedCandidateId, setExpandedCandidateId] = React.useState<string | null>(null);
	const [actorUrl, setActorUrl] = React.useState('');
	const [modifierText, setModifierText] = React.useState(stage().getSave().attenuation || '');
    const [loadingReserve, setLoadingReserve] = React.useState(stage().reserveActorsLoadPromise != undefined);
	const [refreshKey, setRefreshKey] = React.useState(0); // Force re-renders when data changes
	const reserveActors = stage().reserveActors;
	const RESERVE_LIMIT = stage().RESERVE_ACTORS;

	// Monitor the stage's reserve loading promise and update state when it completes
	React.useEffect(() => {
		const promise = stage().reserveActorsLoadPromise;
		if (promise) {
			setLoadingReserve(true);
			promise.finally(() => {
				setLoadingReserve(false);
			});
		} else {
			setLoadingReserve(false);
		}
	}, [stage().reserveActorsLoadPromise]);

	const cancel = () => {
		setScreenType(ScreenType.STATION);
	};

    // Update stage attenuation modifiers when changed
    React.useEffect(() => {
        stage().getSave().attenuation = modifierText;
    }, [modifierText]);

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

	const removeReserveActor = (actorId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();
		
		stage().reserveActors = stage().reserveActors.filter(a => a.id !== actorId);
		setRefreshKey(refreshKey + 1);
	};

	const handleAttenuate = () => {

        if (actorUrl.trim() !== '') {
            loadReserveActorFromFullPath(actorUrl.trim(), stage());
        } else {
            // Kick off actor loading; this will populate remaining reserve slots. The generation process will pull attenuation modifiers from stage().
            stage().loadReserveActors();
        }
		console.log('Attenuate clicked with:', { actorUrl, modifierText });
		setActorUrl('');
		setRefreshKey(refreshKey + 1);
	};

	const isReserveFull = reserveActors.length >= RESERVE_LIMIT;
    const module = stage().getSave().layout.getModulesWhere(m => m?.type === 'aperture')[0]!;
   	const background = stage().getSave().actors[module.ownerId || '']?.decorImageUrls[module.type] || module.getAttribute('defaultImageUrl')


	return (
		<BlurredBackground imageUrl={background}>
			<div style={{ 
				display: 'flex', 
				flexDirection: 'column', 
				height: '100vh', 
				width: '100vw'
			}}>
			{/* Reserve carousel at top */}
			<ActorCarousel
				actors={reserveActors}
				stage={stage()}
				isVerticalLayout={isVerticalLayout}
				expandedActorId={expandedCandidateId}
				onExpandActor={setExpandedCandidateId}
				showRemoveButton={true}
				onRemoveActor={removeReserveActor}
			/>

			{/* Main content area */}
			<div style={{ 
				flex: '1 1 auto', 
				display: 'flex', 
				flexDirection: 'column',
				alignItems: 'center', 
				justifyContent: 'center', 
				padding: isVerticalLayout ? '20px' : '40px',
				gap: '30px'
			}}>
				{/* Attenuation panel */}
				<GlassPanel
					variant="bright"
					style={{
						width: isVerticalLayout ? '90%' : 'clamp(400px, 50vw, 700px)',
						maxWidth: '800px'
					}}
				>
					<Typography 
						variant="h4" 
						sx={{
							color: '#00ff88',
							textShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
							marginBottom: 3,
							textAlign: 'center',
							fontWeight: 700
						}}
					>
						Attenuation Chamber
					</Typography>

					<Typography 
						variant="body2" 
						sx={{
							color: 'rgba(255, 255, 255, 0.7)',
							marginBottom: 3,
							textAlign: 'center'
						}}
					>
						Request specific characters or apply modifiers to newly summoned characters.
					</Typography>

					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
						{/* Actor URL input */}
						<Box>
							<Typography 
								variant="body1" 
								sx={{
									color: '#eafff2',
									marginBottom: 1,
									fontWeight: 600
								}}
							>
								Character Path
							</Typography>
							<TextField
								fullWidth
								value={actorUrl}
								onChange={(e) => setActorUrl(e.target.value)}
								placeholder={Object.values(stage().getSave().actors).filter(a => a.fullPath)[0]?.fullPath || "Enter a path to retrieve a targeted character..."}
								variant="outlined"
								size="small"
								sx={{
									'& .MuiOutlinedInput-root': {
										background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
										color: '#eafff2',
										fontSize: isVerticalLayout ? '0.85rem' : '1rem',
										'& fieldset': {
											borderColor: 'rgba(0,255,136,0.3)',
										},
										'&:hover fieldset': {
											borderColor: 'rgba(0,255,136,0.5)',
										},
										'&.Mui-focused fieldset': {
											borderColor: 'rgba(0,255,136,0.7)',
										},
									},
									'& .MuiInputBase-input::placeholder': {
										color: 'rgba(255,255,255,0.4)',
										opacity: 1,
									},
								}}
							/>
						</Box>

						{/* Modifier text input */}
						<Box>
							<Typography 
								variant="body1" 
								sx={{
									color: '#eafff2',
									marginBottom: 1,
									fontWeight: 600
								}}
							>
								Content Modifiers (Optional)
							</Typography>
							<TextField
								fullWidth
								multiline
								rows={4}
								value={modifierText}
								onChange={(e) => setModifierText(e.target.value)}
								placeholder="Describe traits, themes, or characteristics to impose upon newly summoned characters..."
								variant="outlined"
								sx={{
									'& .MuiOutlinedInput-root': {
										background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
										color: '#eafff2',
										fontSize: isVerticalLayout ? '0.85rem' : '1rem',
										'& fieldset': {
											borderColor: 'rgba(0,255,136,0.3)',
										},
										'&:hover fieldset': {
											borderColor: 'rgba(0,255,136,0.5)',
										},
										'&.Mui-focused fieldset': {
											borderColor: 'rgba(0,255,136,0.7)',
										},
									},
									'& .MuiInputBase-input::placeholder': {
										color: 'rgba(255,255,255,0.4)',
										opacity: 1,
									},
								}}
							/>
						</Box>

						{/* Reserve status */}
						<Typography 
							variant="body2" 
							sx={{
								color: isReserveFull ? '#ff8c66' : 'rgba(255, 255, 255, 0.6)',
								textAlign: 'center',
								fontStyle: 'italic'
							}}
						>
							Reserve: {reserveActors.length} / {RESERVE_LIMIT}
							{isReserveFull && ' (Full - Remove actors to make space)'}
						</Typography>
					</Box>
				</GlassPanel>

				{/* Action buttons */}
				<Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
					<Button
						variant="secondary"
						onClick={cancel}
					>
						Cancel
					</Button>
					<Button
						variant="primary"
						onClick={handleAttenuate}
						disabled={isReserveFull || loadingReserve}
						style={{
							background: (isReserveFull || loadingReserve) ? 'rgba(255,255,255,0.06)' : 'linear-gradient(90deg,#00ff88,#00b38f)',
							color: (isReserveFull || loadingReserve) ? '#9aa0a6' : '#002210'
						}}
					>
						{loadingReserve ? 'Attenuating...' : (isReserveFull ? 'Reserve Full' : 'Attenuate')}
					</Button>
				</Box>
			</div>
			</div>
		</BlurredBackground>
	);
}
