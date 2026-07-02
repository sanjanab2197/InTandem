import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Theme } from '@/constants/Theme';

export interface DropdownOption {
  key: string;
  label: string;
}

interface OptionDropdownProps {
  label: string;
  options: DropdownOption[];
  selected: string;
  onSelect: (key: string) => void;
  placeholder?: string;
  disabled?: boolean;
  embedded?: boolean;
  inline?: boolean;
  leadingIcon?: ReactNode;
  hideLabel?: boolean;
  caption?: string;
  inset?: boolean;
  accentColor?: string;
  optionColors?: Record<string, string>;
  fontFamily?: string;
  fontFamilyMedium?: string;
  fontFamilySemiBold?: string;
}

function ChevronDownIcon({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9l6 6 6-6"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function OptionDropdown({
  label,
  options,
  selected,
  onSelect,
  placeholder = 'Choose',
  disabled = false,
  embedded = false,
  inline = false,
  leadingIcon,
  hideLabel = false,
  caption,
  inset = false,
  accentColor,
  optionColors,
  fontFamily,
  fontFamilyMedium,
  fontFamilySemiBold,
}: OptionDropdownProps) {
  const accent = accentColor ?? Theme.primary;
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.key === selected);
  const selectedAccent = optionColors?.[selected] ?? accent;
  const valueFont = current ? (fontFamilyMedium ?? fontFamily) : fontFamily;
  const menuTitleFont = fontFamilySemiBold ?? fontFamilyMedium ?? fontFamily;

  const menu = (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
        <Pressable style={styles.menu} onPress={() => {}}>
          <Text style={[styles.menuTitle, menuTitleFont ? { fontFamily: menuTitleFont } : null]}>
            {label}
          </Text>
          <ScrollView style={styles.menuScroll} keyboardShouldPersistTaps="handled">
            {options.map((opt) => {
              const isSelected = selected === opt.key;
              const itemColor = optionColors?.[opt.key];
              return (
                <Pressable
                  key={opt.key || '__none__'}
                  style={({ pressed }) => [
                    styles.menuItem,
                    isSelected && styles.menuItemSelected,
                    isSelected && itemColor ? { backgroundColor: `${itemColor}18` } : null,
                    pressed && styles.menuItemPressed,
                  ]}
                  onPress={() => {
                    onSelect(opt.key);
                    setOpen(false);
                  }}>
                  <Text
                    style={[
                      styles.menuText,
                      isSelected && styles.menuTextSelected,
                      fontFamily ? { fontFamily } : null,
                      isSelected && itemColor ? { color: itemColor, fontWeight: '600' } : null,
                      isSelected && fontFamilySemiBold
                        ? { fontFamily: fontFamilySemiBold, fontWeight: undefined }
                        : null,
                    ]}>
                    {opt.label}
                  </Text>
                  {isSelected ? (
                    <Text style={[styles.menuCheck, itemColor ? { color: itemColor } : null]}>✓</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  if (inline) {
    return (
      <>
        <Pressable
          style={({ pressed }) => [
            styles.inlineRow,
            inset && styles.inlineRowInset,
            caption && styles.inlineRowWithCaption,
            pressed && !disabled && styles.inlineRowPressed,
            open && styles.inlineRowOpen,
            disabled && styles.triggerDisabled,
          ]}
          onPress={() => !disabled && setOpen(true)}
          disabled={disabled}>
          {!inset && leadingIcon ? (
            <View style={styles.leadingIcon}>{leadingIcon}</View>
          ) : !inset && !hideLabel ? (
            <Text style={styles.inlineLabel}>{label}</Text>
          ) : null}
          <View style={styles.inlineValueColumn}>
            <View style={styles.inlineValueWrap}>
              <Text
                style={[
                  styles.inlineValue,
                  inset && styles.inlineValueInset,
                  !current && styles.triggerPlaceholder,
                  current && (optionColors?.[selected] ?? accentColor)
                    ? { color: selectedAccent, fontWeight: '600' }
                    : null,
                  valueFont ? { fontFamily: valueFont, fontWeight: undefined } : null,
                ]}
                numberOfLines={2}>
                {current?.label ?? placeholder}
              </Text>
              <ChevronDownIcon color={open ? selectedAccent : Theme.textSecondary} />
            </View>
            {caption ? (
              <Text
                style={[
                  styles.inlineCaption,
                  accentColor && !optionColors ? { color: accent } : null,
                  fontFamily ? { fontFamily } : null,
                ]}>
                {caption}
              </Text>
            ) : null}
          </View>
        </Pressable>
        {menu}
      </>
    );
  }

  return (
    <View style={[styles.wrap, embedded && styles.wrapEmbedded]}>
      <Text style={[styles.fieldLabel, embedded && styles.fieldLabelEmbedded]}>{label}</Text>
      <Pressable
        style={({ pressed }) => [
          styles.trigger,
          embedded && styles.triggerEmbedded,
          pressed && !disabled && (embedded ? styles.triggerEmbeddedPressed : styles.triggerPressed),
          open && !embedded && styles.triggerOpen,
          open && embedded && styles.triggerEmbeddedPressed,
          disabled && styles.triggerDisabled,
        ]}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}>
        <Text style={[styles.triggerLabel, !current && styles.triggerPlaceholder]} numberOfLines={1}>
          {current?.label ?? placeholder}
        </Text>
        <View style={[styles.chevronWrap, open && styles.chevronWrapOpen]}>
          <ChevronDownIcon color={open ? Theme.primary : Theme.textSecondary} size={14} />
        </View>
      </Pressable>
      {menu}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  wrapEmbedded: { marginBottom: 0 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  fieldLabelEmbedded: {
    fontSize: 13,
    textTransform: 'none',
    letterSpacing: 0.1,
    marginBottom: 10,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    gap: 12,
  },
  inlineRowInset: {
    paddingVertical: 0,
    gap: 0,
    alignItems: 'center',
  },
  inlineRowWithCaption: {
    alignItems: 'flex-start',
  },
  inlineRowPressed: { opacity: 0.7 },
  inlineRowOpen: {},
  leadingIcon: {
    width: 28,
    flexShrink: 0,
    alignItems: 'center',
    paddingTop: 2,
  },
  inlineLabel: {
    width: 100,
    flexShrink: 0,
    fontSize: 15,
    color: Theme.textSecondary,
    paddingTop: 1,
  },
  inlineValueColumn: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  inlineCaption: {
    fontSize: 12,
    color: Theme.textSecondary,
    letterSpacing: 0.1,
  },
  inlineValueWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  inlineValue: {
    flex: 1,
    fontSize: 15,
    color: Theme.text,
    flexShrink: 1,
  },
  inlineValueInset: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: Theme.border,
    gap: 8,
    marginBottom: 14,
  },
  triggerEmbedded: {
    paddingTop: 0,
    paddingBottom: 10,
    marginBottom: 0,
  },
  triggerEmbeddedPressed: {
    borderBottomColor: Theme.primary,
  },
  triggerPressed: {
    borderBottomColor: Theme.primary,
  },
  triggerOpen: {
    borderBottomColor: Theme.primary,
  },
  triggerDisabled: { opacity: 0.45 },
  triggerLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Theme.text,
  },
  triggerPlaceholder: { color: Theme.textSecondary, fontWeight: '400' },
  chevronWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  chevronWrapOpen: {
    backgroundColor: Theme.primaryLight,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(42, 36, 56, 0.45)',
    justifyContent: 'center',
    padding: 28,
  },
  menu: {
    backgroundColor: Theme.surface,
    borderRadius: 14,
    paddingVertical: 8,
    maxHeight: 360,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  menuScroll: { maxHeight: 280 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Theme.border,
  },
  menuItemSelected: { backgroundColor: Theme.primaryLight },
  menuItemPressed: { opacity: 0.7 },
  menuText: { fontSize: 16, color: Theme.text, flex: 1 },
  menuTextSelected: { fontWeight: '600', color: Theme.primaryDark },
  menuCheck: { fontSize: 15, fontWeight: '700', color: Theme.primary, marginLeft: 8 },
});
