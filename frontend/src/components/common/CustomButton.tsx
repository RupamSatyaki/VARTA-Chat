import React from 'react';
import { StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Colors } from '../../theme/colors';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const CustomButton: React.FC<CustomButtonProps> = ({ title, onPress, loading, disabled }) => {
  return (
    <TouchableOpacity
      style={[styles.button, (disabled || loading) ? styles.buttonDisabled : null]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={Colors.white} />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    height: 55,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 8,
    // Android Shadow
    elevation: 4,
    // Modern Shadow (SDK 56+)
    boxShadow: `0px 4px 8px ${Colors.primary}4D`, // 4D is ~30% opacity in hex
  },
  buttonDisabled: {
    backgroundColor: Colors.gray,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default CustomButton;
