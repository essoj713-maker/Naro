import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { CHARS } from './art';

export function Naro({ i, size = 80 }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(y, { toValue: -6, duration: 1200, useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 1200, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [y]);
  return <Animated.View style={{ transform: [{ translateY: y }] }}><SvgXml xml={CHARS[i].svg} width={size} height={size} /></Animated.View>;
}
export const Btn = ({ title, onPress, light, disabled }) => (
  <Pressable onPress={onPress} disabled={disabled} style={[s.btn, light && s.light, disabled && { opacity: 0.5 }]}>
    <Text style={[s.btnText, light && { color: '#0F6B4E' }]}>{title}</Text>
  </Pressable>
);
export const Input = (p) => <TextInput placeholderTextColor="#777" {...p} style={[s.input, p.style]} />;
export const Card = ({ children, style }) => <View style={[s.card, style]}>{children}</View>;
export const T = ({ children, big, style }) => <Text style={[s.text, big && s.big, style]}>{children}</Text>;
export const s = StyleSheet.create({
  btn: { backgroundColor: '#0F6B4E', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  light: { backgroundColor: '#E4F5EC' },
  btnText: { color: '#fff', fontWeight: '700' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 16, padding: 12, textAlign: 'right', color: '#111' },
  card: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, padding: 16, gap: 10 },
  text: { textAlign: 'right', writingDirection: 'rtl', color: '#14231D', fontSize: 15 },
  big: { fontSize: 20, fontWeight: '800' },
});
