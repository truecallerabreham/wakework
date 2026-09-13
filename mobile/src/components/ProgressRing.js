import { View } from 'react-native';
import { colors } from '../utils/constants';

// Simple progress ring using pure Views (CSS-like tricks) to avoid SVG dependency
export default function ProgressRing({ progress, radius = 24, strokeWidth = 6 }) {
  const size = radius * 2;
  const degrees = (progress / 100) * 360;
  
  // Since we can't easily use SVG without adding dependencies, we'll draw a CSS-style pie chart using borders
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: radius,
      borderWidth: strokeWidth,
      borderColor: colors.progressBg,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden'
    }}>
      {/* We are limited in what we can do without SVG or Reanimated. 
          To represent the circle visually without deps, we'll just show the center colored for now 
          if it's not possible to do true CSS conical gradients in basic RN. */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: `${progress}%`,
        backgroundColor: colors.lime,
        opacity: 0.8
      }} />
    </View>
  );
}
