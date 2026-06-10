import React, { useEffect } from 'react';
import { StyleSheet, View, Animated, ViewStyle, DimensionValue, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../theme/colors';

interface ShimmerLoaderProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

const ShimmerLoader: React.FC<ShimmerLoaderProps> = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4, 
  style 
}) => {
  const shimmerAnimatedValue = new Animated.Value(0);

  useEffect(() => {
    const config: any = {
      toValue: 1,
      duration: 1500,
    };
    
    if (Platform.OS !== 'web') {
      config.useNativeDriver = true;
    } else {
      config.useNativeDriver = false;
    }

    Animated.loop(
      Animated.timing(shimmerAnimatedValue, config)
    ).start();
  }, []);

  const translateX = shimmerAnimatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-400, 400],
  });

  return (
    <View style={[styles.container, { width, height, borderRadius }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={['transparent', 'rgba(255, 255, 255, 0.05)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
});

export default ShimmerLoader;
