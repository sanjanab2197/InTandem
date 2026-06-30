import { useEffect, useRef } from 'react';
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
const VISIBLE_ROWS = 3;
const PADDING = ITEM_HEIGHT;

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
  width?: number;
}

function ScrollColumn<T extends string | number>({
  items,
  selected,
  onSelect,
  format,
  width = 52,
}: ScrollColumnProps<T>) {
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(0, items.indexOf(selected));
  const scrollingRef = useRef(false);

  useEffect(() => {
    if (scrollingRef.current) return;
    scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
  }, [selectedIndex]);

  const snapToIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    scrollingRef.current = true;
    onSelect(items[clamped]);
    scrollRef.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: true });
    setTimeout(() => {
      scrollingRef.current = false;
    }, 200);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    snapToIndex(index);
  };

  return (
    <View style={[styles.columnWrap, { width }]}>
      <ScrollView
        ref={scrollRef}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        directionalLockEnabled
        bounces={false}
        contentContainerStyle={{ paddingVertical: PADDING }}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}>
        {items.map((item, index) => {
          const active = item === selected;
          return (
            <Pressable
              key={String(item)}
              style={styles.item}
              onPress={() => snapToIndex(index)}>
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
}

export default function TimeScrollPicker({ value, onChange }: TimeScrollPickerProps) {
  const parts = dateTo12Parts(value);

  const update = (next: Partial<Time12Parts>) => {
    onChange(
      apply12PartsToDate(value, {
        hour: next.hour ?? parts.hour,
        minute: next.minute ?? parts.minute,
        period: next.period ?? parts.period,
      })
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.highlight} pointerEvents="none" />
      <View style={styles.columns}>
        <ScrollColumn
          items={HOURS}
          selected={parts.hour}
          onSelect={(hour) => update({ hour })}
          format={(h) => String(h)}
        />
        <Text style={styles.separator}>:</Text>
        <ScrollColumn
          items={MINUTES}
          selected={parts.minute}
          onSelect={(minute) => update({ minute })}
          format={(m) => String(m).padStart(2, '0')}
          width={56}
        />
        <ScrollColumn
          items={PERIODS}
          selected={parts.period}
          onSelect={(period) => update({ period })}
          format={(p) => p}
          width={56}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: ITEM_HEIGHT * VISIBLE_ROWS,
    position: 'relative',
    marginVertical: 8,
  },
  highlight: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: PADDING,
    height: ITEM_HEIGHT,
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
    height: ITEM_HEIGHT * VISIBLE_ROWS,
    overflow: 'hidden',
  },
  item: {
    height: ITEM_HEIGHT,
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
});
