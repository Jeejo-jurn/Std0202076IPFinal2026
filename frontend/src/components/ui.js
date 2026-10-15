import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, radius } from '../theme';

const VARIANTS = {
  primary: { bg: colors.forest, bgPressed: colors.forestDeep, text: '#fff', border: colors.forest },
  secondary: { bg: colors.paper, bgPressed: colors.mint, text: colors.forest, border: colors.line },
  danger: { bg: colors.paper, bgPressed: colors.brickTint, text: colors.brick, border: '#EBC7BF' },
};

export function Button({ title, onPress, variant = 'primary', size = 'md', loading, disabled, style }) {
  const v = VARIANTS[variant];
  const small = size === 'sm';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed, hovered, focused }) => [
        styles.button,
        small && styles.buttonSm,
        {
          backgroundColor: pressed || hovered ? v.bgPressed : v.bg,
          borderColor: focused ? colors.ink : v.border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <Text style={[styles.buttonText, small && styles.buttonTextSm, { color: v.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({ label, style, ...inputProps }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        placeholderTextColor={colors.inkFaint}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, focused && styles.inputFocused]}
      />
    </View>
  );
}

export function StatusPill({ status }) {
  const active = status === 'Active';
  return (
    <View style={[styles.pill, { backgroundColor: active ? colors.activeTint : colors.amberTint }]}>
      <View style={[styles.pillDot, { backgroundColor: active ? colors.activeText : colors.amber }]} />
      <Text style={[styles.pillText, { color: active ? colors.activeText : colors.amber }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSm: { minHeight: 34, paddingHorizontal: 12, borderRadius: radius.sm },
  buttonText: { fontFamily: fonts.bodySemi, fontSize: 15 },
  buttonTextSm: { fontSize: 13 },
  field: { marginBottom: 14 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.inkMuted, marginBottom: 6 },
  input: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    outlineStyle: 'none',
  },
  inputFocused: { borderColor: colors.forest, borderWidth: 1.5 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  pillText: { fontFamily: fonts.bodySemi, fontSize: 12 },
});
