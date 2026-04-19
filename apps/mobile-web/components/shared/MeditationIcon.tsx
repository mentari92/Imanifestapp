import React from 'react';
import { View } from 'react-native';

type MeditationIconProps = {
  size?: number;
  color?: string;
};

export function MeditationIcon({ size = 20, color = '#0f766e' }: MeditationIconProps) {
  const unit = size / 24;

  return (
    <View
      style={{
        width: size,
        height: size,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 2 * unit,
          width: 4.6 * unit,
          height: 4.6 * unit,
          borderRadius: 99,
          backgroundColor: color,
        }}
      />

      <View
        style={{
          position: 'absolute',
          top: 7.4 * unit,
          width: 8.5 * unit,
          height: 5.2 * unit,
          borderRadius: 99,
          backgroundColor: color,
        }}
      />

      <View
        style={{
          position: 'absolute',
          top: 12.6 * unit,
          width: 14.5 * unit,
          height: 3.4 * unit,
          borderRadius: 99,
          backgroundColor: color,
        }}
      />

      <View
        style={{
          position: 'absolute',
          top: 16.6 * unit,
          width: 17.8 * unit,
          height: 2.4 * unit,
          borderRadius: 99,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
