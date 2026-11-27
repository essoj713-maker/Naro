import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, ready } from './firebase';
import { Btn, Card, Input, Naro, T } from './ui';

const fail = (e) => Alert.alert('حصلت مشكلة', e.message);
const request = (user, name) => setDoc(doc(db, 'users', user.uid), { name, email: user.email, status: 'pending' });

export function Login() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (isNew) => {
    if (!ready) return Alert.alert('Naro', 'لسه محتاج بيانات Firebase');
    if (!email || !pass || (isNew && !name)) return Alert.alert('ناقص', isNew ? 'اكتب اسمك والإيميل والباسورد' : 'اكتب الإيميل والباسورد');
    setBusy(true);
    try {
      if (isNew) await request((await createUserWithEmailAndPassword(auth, email.trim(), pass)).user, name.trim());
      else await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (e) { fail(e); setBusy(false); }
  };
  return (
    <Card style={{ margin: 16 }}>
      <View style={{ alignItems: 'center' }}><Naro i={0} size={110} /></View>
      <T big>أهلا بيك في نارو</T>
      <Input placeholder="اسمك (للتسجيل الجديد)" value={name} onChangeText={setName} maxLength={30} />
      <Input placeholder="الإيميل" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Input placeholder="الباسورد (6 حروف على الأقل)" secureTextEntry value={pass} onChangeText={setPass} />
      <Btn title="تسجيل جديد" disabled={busy} onPress={() => run(true)} />
      <Btn light title="دخول" disabled={busy} onPress={() => run(false)} />
    </Card>
  );
}

export function Pending({ user, status }) {
  return (
    <Card style={{ margin: 16 }}>
      <View style={{ alignItems: 'center' }}><Naro i={5} size={110} /></View>
      <T big>{status === 'rejected' ? 'طلبك ما اتقبلش' : 'اصبر لحد ما الـ Joo يقبل طلبك'}</T>
      {status === 'missing' && <Btn title="ابعت طلب الدخول" onPress={() => request(user, user.email.split('@')[0]).catch(fail)} />}
      <Btn light title="خروج" onPress={() => signOut(auth)} />
    </Card>
  );
}

export function Requests() {
  const [list, setList] = useState([]);
  useEffect(() => onSnapshot(collection(db, 'users'), (q) => setList(q.docs.map((d) => ({ id: d.id, ...d.data() }))), fail), []);
  const set = (id, status) => updateDoc(doc(db, 'users', id), { status }).catch(fail);
  const order = { pending: 0, approved: 1, rejected: 2 };
  const label = { pending: 'مستني', approved: 'مقبول', rejected: 'مرفوض' };
  return (
    <Card>
      <T big>طلبات الدخول ({list.filter((u) => u.status === 'pending').length})</T>
      {[...list].sort((a, b) => order[a.status] - order[b.status]).map((u) => (
        <View key={u.id} style={{ gap: 6 }}>
          <T>{u.name} - {u.email} ({label[u.status]})</T>
          {u.status !== 'approved' && <Btn title="اقبل" onPress={() => set(u.id, 'approved')} />}
          {u.status !== 'rejected' && <Btn light title="ارفض" onPress={() => set(u.id, 'rejected')} />}
        </View>
      ))}
    </Card>
  );
  }
