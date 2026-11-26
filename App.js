import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { SvgXml } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth, ready } from './firebase';
import { BGS, ICONS } from './art';
import { Naro } from './ui';
import Chat from './Chat';
import Ai from './Ai';
import Store from './Store';
import Fun from './Fun';
import Pray from './Pray';
import More from './More';

const TABS = [['chat', 'الشات'], ['naro', 'نارو'], ['store', 'المتجر'], ['fun', 'المرح'], ['pray', 'الصلاة'], ['more', 'المزيد']];

export default function App() {
  const [tab, setTab] = useState('naro');
  const [prefs, setPrefs] = useState({ char: 0, bg: 2, name: '' });
  const [user, setUser] = useState(null);
  const [isAdmin, setAdmin] = useState(false);
  const [msgs, setMsgs] = useState([]);
  useEffect(() => { AsyncStorage.getItem('prefs').then((v) => v && setPrefs((p) => ({ ...p, ...JSON.parse(v) }))).catch(() => {}); }, []);
  useEffect(() => {
    if (!ready) return;
    return onAuthStateChanged(auth, (u) => {
      if (!u) { setUser(null); setAdmin(false); signInAnonymously(auth).catch(() => {}); return; }
      setUser(u); setAdmin(!u.isAnonymous);   // الصلاحية الحقيقية في firestore.rules
    });
  }, []);
  const save = (patch) => setPrefs((p) => { const n = { ...p, ...patch }; AsyncStorage.setItem('prefs', JSON.stringify(n)).catch(() => {}); return n; });
  const bg = BGS[prefs.bg];
  const screen = {
    chat: <Chat user={user} name={prefs.name} />,
    naro: <Ai char={prefs.char} msgs={msgs} setMsgs={setMsgs} />,
    store: <Store user={user} isAdmin={isAdmin} />,
    fun: <Fun />,
    pray: <Pray />,
    more: <More prefs={prefs} save={save} user={user} isAdmin={isAdmin} />,
  }[tab];
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <View style={StyleSheet.absoluteFill}><SvgXml xml={bg.svg} width="100%" height="100%" /></View>
        <StatusBar style={bg.dark ? 'light' : 'dark'} />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={st.header}><Naro i={prefs.char} size={44} /><Text style={st.title}>Naro</Text></View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>{screen}</KeyboardAvoidingView>
          <View style={st.bar}>
            {TABS.map(([k, label]) => {
              const c = tab === k ? '#0F6B4E' : '#777';
              return <Pressable key={k} onPress={() => setTab(k)} style={st.tab}><SvgXml xml={ICONS[k](c)} width={26} height={26} /><Text style={{ color: c, fontSize: 11 }}>{label}</Text></Pressable>;
            })}
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}
const st = StyleSheet.create({
  header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, padding: 8, backgroundColor: 'rgba(255,255,255,0.92)' },
  title: { fontSize: 24, fontWeight: '900', color: '#0F6B4E' },
  bar: { flexDirection: 'row-reverse', backgroundColor: '#fff', paddingVertical: 8 },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
});
