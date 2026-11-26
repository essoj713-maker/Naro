import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Btn, Card, Input, T } from './ui';

const NAMES = { Fajr: 'الفجر', Sunrise: 'الشروق', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };

export default function Pray() {
  const [city, setCity] = useState('Cairo');
  const [times, setTimes] = useState(null);
  const [msg, setMsg] = useState('');
  const [count, setCount] = useState(0);
  const load = async () => {
    setMsg('بيحمل...'); setTimes(null);
    try {
      const j = await (await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=Egypt&method=5`)).json();
      if (j.code !== 200) throw new Error();
      setTimes(j.data.timings); setMsg('');
    } catch { setMsg('تأكد من النت واسم المدينة'); }
  };
  useEffect(() => { load(); }, []);
  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }}>
      <Card>
        <T big>مواقيت الصلاة</T>
        <Input value={city} onChangeText={setCity} placeholder="المدينة بالإنجليزي" />
        <Btn light title="حدّث" onPress={load} />
        {!!msg && <T>{msg}</T>}
        {times && Object.entries(NAMES).map(([k, n]) => <View key={k} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}><T big>{n}</T><T big>{times[k]}</T></View>)}
      </Card>
      <Card><T big>السبحة: {count}</T><Btn title="سبّح" onPress={() => setCount(count + 1)} /><Btn light title="صفّر" onPress={() => setCount(0)} /></Card>
    </ScrollView>
  );
}
