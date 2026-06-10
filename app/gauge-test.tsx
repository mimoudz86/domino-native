import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import VerticalGauge from '@/components/VerticalGauge';

export default function GaugeTest() {
  const [value, setValue] = useState(70);

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <Text style={{ color: '#fff', fontSize: 18 }}>VerticalGauge — test</Text>

      <VerticalGauge value={value} />
      <Text style={{ color: '#fff' }}>value : {value}</Text>

      <View style={{ flexDirection: 'row', gap: 24 }}>
        <Pressable onPress={() => setValue((v) => Math.max(0, v - 10))}>
          <Text style={{ color: '#fff', fontSize: 28 }}>➖</Text>
        </Pressable>
        <Pressable onPress={() => setValue((v) => Math.min(100, v + 10))}>
          <Text style={{ color: '#fff', fontSize: 28 }}>➕</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
        <VerticalGauge value={20} />
        <VerticalGauge value={50} />
        <VerticalGauge value={90} />
      </View>
    </View>
  );
}
