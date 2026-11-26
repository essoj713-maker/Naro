import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, ready } from './firebase';
import { CHARS, BGS } from './art';
import { SUB_PRICE } from './config';
import { OrderForm } from './Store';
import { Btn, Card, Input, T } from './ui';

const grid = { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, justifyContent: 'center' };
const pick = (on) => ({ borderWidth: 3, borderRadius: 14, padding: 4, alignItems: 'center', borderColor: on ? '#0F6B4E' : 'transparent' });

export default function More({ prefs, save, user, isAdmin }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [sub, setSub] = useState(false);
  const login = () => ready ? signInWithEmailAndPassword(auth, email.trim(), pass).then(() => setPass('')).catch((e) => Alert.alert('الدخول', e.message)) : Alert.alert('الدخول', 'لسه محتاج بيانات Firebase');
  if (sub) return <ScrollView contentContainerStyle={{ padding: 12 }}><OrderForm item={{ id: 'subscription', title: 'اشتراك نارو', price: SUB_PRICE }} user={user} onClose={() => setSub(false)} /></ScrollView>;
  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} keyboardShouldPersistTaps="handled">
      <Card><T big>اسمك في الشات</T><Input value={prefs.name} onChangeText={(name) => save({ name })} maxLength={30} /></Card>
      <Card><T big>اختار شكل نارو</T><View style={grid}>
        {CHARS.map((c, i) => <Pressable key={c.name} onPress={() => save({ char: i })} style={pick(prefs.char === i)}><SvgXml xml={c.svg} width={84} height={84} /><T>{c.name}</T></Pressable>)}
      </View></Card>
      <Card><T big>اختار الخلفية</T><View style={grid}>
        {BGS.map((b, i) => <Pressable key={b.name} onPress={() => save({ bg: i })} style={pick(prefs.bg === i)}><SvgXml xml={b.svg} width={64} height={110} /><T>{b.name}</T></Pressable>)}
      </View></Card>
      <Card><T big>الاشتراك</T><Btn title={`اشترك بـ ${SUB_PRICE} جنيه`} onPress={() => setSub(true)} /></Card>
      <Card><T big>{isAdmin ? 'انت داخل كمدير' : 'دخول المدير'}</T>
        {isAdmin ? <Btn light title="خروج" onPress={() => signOut(auth)} /> : <>
          <Input placeholder="الإيميل" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Input placeholder="الباسورد" secureTextEntry value={pass} onChangeText={setPass} />
          <Btn light title="دخول" onPress={login} /></>}
      </Card>
    </ScrollView>
  );
}
