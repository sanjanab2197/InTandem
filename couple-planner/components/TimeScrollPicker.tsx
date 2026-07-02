import { useEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Theme } from '@/constants/Theme';

const ITEM_HEIGHT = 36;
const COMPACT_ITEM_HEIGHT = 32;
const VISIBLE_ROWS = 3;

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS: ('AM' | 'PM')[] = ['AM', 'PM'];

export interface Time12Parts {
  hour: number;
  minute: number;
  period: 'AM' | 'PM';
}

export function dateTo12Parts(date: Date): Time12Parts {
  let hour = date.getHours();
  const period: 'AM' | 'PM' = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return { hour, minute: date.getMinutes(), period };
}

export function apply12PartsToDate(base: Date, parts: Time12Parts): Date {
  let hour = parts.hour % 12;
  if (parts.period === 'PM') hour += 12;
  const next = new Date(base);
  next.setHours(hour, parts.minute, 0, 0);
  return next;
}

interface ScrollColumnProps<T extends string | number> {
  items: T[];
  selected: T;
  onSelect: (item: T) => void;
  format: (item: T) => string;
  itemHeight: number;
  width?: number;
}

function ScrollColumn<T extends string | number>({
  items,
  selected,
  onSelect,
  format,
  itemHeight,
  width = 52,
}: ScrollColumnProps<T>) {
  const scrollRef = useRef<ScrollView>(null);
  const interactingRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastOffsetRef = useRef(0);
  const selectedIndex = Math.max(0, items.indexOf(selected));
  const padding = itemHeight;
  const columnHeight = itemHeight * VISIBLE_ROWS;
  const [centerIndex, setCenterIndex] = useState(selectedIndex);

  useEffect(() => {
    setCenterIndex(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    if (interactingRef.current) return;
    scrollRef.current?.scrollTo({ y: selectedIndex * itemHeight, animated: false });
  }, [selectedIndex, itemHeight]);

  const indexFromOffset = (offsetY: number) => {
    const index = Math.round(offsetY / itemHeight);
    return Math.max(0, Math.min(items.length - 1, index));
  };

  const applyCenterIndex = (
    index: number,
    { scroll = true, animated = false }: { scroll?: boolean; animated?: boolean } = {}
  ) => {
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    setCenterIndex(clamped);
    onSelect(items[clamped]);
    if (scroll) {
      scrollRef.current?.scrollTo({ y: clamped * itemHeight, animated });
    }
  };

  const syncFromOffset = (
    offsetY: number,
    options?: { scroll?: boolean; animated?: boolean }
  ) => {
    applyCenterIndex(indexFromOffset(offsetY), options);
  };

  const finishInteraction = (offsetY: number) => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    interactingRef.current = false;
    syncFromOffset(offsetY, { animated: true });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    interactingRef.current = true;
    const offsetY = e.nativeEvent.contentOffset.y;
    lastOffsetRef.current = offsetY;
    syncFromOffset(offsetY, { scroll: false });

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      finishInteraction(lastOffsetRef.current);
    }, 120);
  };

  return (
    <View style={[styles.columnWrap, { width, height: columnHeight }]}>
      <ScrollView
        ref={scrollRef}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        directionalLockEnabled
        bounces={false}
        contentContainerStyle={{ paddingVertical: padding }}
        onScrollBeginDrag={() => {
          interactingRef.current = true;
        }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => finishInteraction(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => finishInteraction(e.nativeEvent.contentOffset.y)}>
        {items.map((item, index) => {
          const active = index === centerIndex;
          return (
            <Pressable
              key={String(item)}
              style={[styles.item, { height: itemHeight }]}
              onPress={() => applyCenterIndex(index, { animated: true })}>
              <Text style={[styles.itemText, active && styles.itemTextActive]}>{format(item)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface TimeScrollPickerProps {
  value: Date;
  onChange: (date: Date) => void;
  compact?: boolean;
}

export default function TimeScrollPicker({
  value,
  onChange,
  compact = false,
}: TimeScrollPickerProps) {
  const valueRef = useRef(value);
  valueRef.current = value;

  const parts = dateTo12Parts(value);
  const itemHeight = compact ? COMPACT_ITEM_HEIGHT : ITEM_HEIGHT;
  const pickerHeight = itemHeight * VISIBLE_ROWS;
  const padding = itemHeight;

  const update = (next: Partial<Time12Parts>) => {
    const current = dateTo12Parts(valueRef.current);
    onChange(
      apply12PartsToDate(valueRef.current, {
        hour: next.hour ?? current.hour,
        minute: next.minute ?? current.minute,
        period: next.period ?? current.period,
      })
    );
  };

  return (
    <View style={[styles.wrap, { height: pickerHeight }]}>
      <View
        style={[
          styles.highlight,
          { top: padding, height: itemHeight, left: compact ? 0 : 8, right: compact ? 0 : 8 },
        ]}
        pointerEvents="none"
      />

      <View style={styles.columns}>
        <ScrollColumn
          items={HOURS}
          selected={parts.hour}
          onSelect={(hour) => update({ hour })}
          format={(h) => String(h)}
          itemHeight={itemHeight}
          width={compact ? 40 : 52}
        />
        <Text style={[styles.separator, compact && styles.separatorCompact]}>:</Text>
        <ScrollColumn
          items={MINUTES}
          selected={parts.minute}
          onSelect={(minute) => update({ minute })}
          format={(m) => String(m).padStart(2, '0')}
          itemHeight={itemHeight}
          width={compact ? 44 : 56}
        />
        <ScrollColumn
          items={PERIODS}
          selected={parts.period}
          onSelect={(period) => update({ period })}
          format={(p) => p}
          itemHeight={itemHeight}
          width={compact ? 44 : 56}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    backgroundColor: Theme.primaryLight,
    borderRadius: 8,
    zIndex: 0,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  columnWrap: {
    overflow: 'hidden',
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 18,
    fontWeight: '500',
    color: Theme.textSecondary,
  },
  itemTextActive: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.primaryDark,
  },
  separator: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.text,
    marginHorizontal: 2,
    marginBottom: 2,
  },
  separatorCompact: {
    fontSize: 18,
    marginHorizontal: 0,
  },
});
