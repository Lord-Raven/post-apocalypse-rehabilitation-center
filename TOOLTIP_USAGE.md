# Tooltip System Usage Guide

## Overview
The unified tooltip/message bar system provides a consistent way to display contextual messages across all screens in the application. The tooltip appears at the bottom center of the screen with an optional Material UI icon.

## Architecture
- **TooltipBar Component**: The visual component that renders the tooltip
- **TooltipContext**: React context that manages tooltip state globally
- **useTooltip Hook**: Hook to access and control the tooltip from any screen component

## Basic Usage

### 1. Import the hook
```tsx
import { useTooltip } from '../contexts/TooltipContext';
```

### 2. Use in your component
```tsx
export const YourScreen: FC<YourScreenProps> = ({stage, setScreenType}) => {
    const { setTooltip, clearTooltip } = useTooltip();
    
    // Show tooltip with message and icon
    const handleDragStart = () => {
        setTooltip('Drag to reposition', SwapHoriz);
    };
    
    // Clear tooltip
    const handleDragEnd = () => {
        clearTooltip();
    };
    
    // ...rest of component
};
```

## Available Icons
Import icons from Material UI Icons:
```tsx
import { 
    HourglassEmpty,  // Time-consuming actions
    SwapHoriz,       // Swap/move operations
    Home,            // Home/quarters assignments
    Build,           // Construction/building
    Delete,          // Delete operations
    // ... any other @mui/icons-material icon
} from '@mui/icons-material';
```

## Examples

### Example 1: Drag and Drop Assignment (StationScreen)
```tsx
onDragOver={(e) => {
    if (draggedActor) {
        e.preventDefault();
        const role = module.getAttribute('role') || module.type;
        setTooltip(
            `Assign ${draggedActor.name} to ${role}`,
            HourglassEmpty
        );
    }
}}

onDragLeave={() => {
    clearTooltip();
}}

onDrop={() => {
    // Handle drop
    clearTooltip();
}}
```

### Example 2: Module Movement
```tsx
const handleModuleDragStart = (module: Module) => {
    setTooltip(`Moving ${module.type} module`, SwapHoriz);
};

const handleModuleDrop = () => {
    // Handle drop logic
    clearTooltip();
};
```

### Example 3: Action Confirmation
```tsx
const handleDeleteClick = () => {
    setTooltip('Click again to confirm deletion', Delete);
    setTimeout(() => clearTooltip(), 3000); // Auto-clear after 3s
};
```

### Example 4: Hover Hints
```tsx
onMouseEnter={() => {
    setTooltip('Click to upgrade this module', Build);
}}

onMouseLeave={() => {
    clearTooltip();
}}
```

## API Reference

### `useTooltip()`
Returns an object with:

#### `setTooltip(message: string | null, icon?: SvgIconComponent)`
Shows the tooltip with the specified message and optional icon.
- **message**: The text to display
- **icon**: Optional Material UI icon component

#### `clearTooltip()`
Hides the tooltip immediately.

#### `message: string | null`
Current tooltip message (read-only).

#### `icon: SvgIconComponent | undefined`
Current tooltip icon (read-only).

## Best Practices

1. **Always clear tooltips**: Make sure to call `clearTooltip()` when the action completes or is cancelled
2. **Keep messages concise**: Short, actionable messages work best
3. **Use appropriate icons**: Choose icons that match the action semantics
4. **Don't overuse**: Only show tooltips for actions that benefit from additional context
5. **Timing**: Clear tooltips on:
   - Drag end events
   - Mouse leave events
   - Action completion
   - Component unmount (if needed)

## Styling
The tooltip automatically inherits the cyberpunk theme with:
- Glowing border effect
- Backdrop blur
- Smooth animations
- Consistent with the station aesthetic

No additional styling is typically needed, but you can customize by modifying `TooltipBar.tsx`.
