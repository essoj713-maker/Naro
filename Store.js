import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView } from 'react-native';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db, ready } from './firebase';
import { PAY_NUMBER } from './config';
import { Btn, Card, Input, T } from './ui';

const STATUS = { new: 'جديد', paid: 'الدفع اتأكد', done: 'اتسلم', rejected: 'مرفوض' };
const fail = (e) => Alert.alert('حصلت مشكلة', e.message);

export function OrderForm({ item, user, onClose }) {
  const [f, setF] = useState({ name: '', phone: '', from: '', address: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));
  const send = async () => {
    if (!ready || !user) return Alert.alert('المتجر', 'لسه محتاج بيانات Firebase');
    if (!f.name || !f.phone || !f.from) return Alert.alert('ناقص', 'اكتب اسمك ورقمك والرقم اللي حولت منه');
    setBusy(true);
    try {
      await addDoc(collection(db, 'orders'), { ...f, productId: item.id, title: item.title, price: item.price, uid: user.uid, status: 'new', at: serverTimestamp() });
      Alert.alert('تم', 'طلبك وصل، هيتأكد بعد مراجعة التحويل'); onClose();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };
  return (
    <Card>
      <T big>{item.title} - {item.price} جنيه</T>
      <T>حوّل المبلغ على الرقم ده وبعدين ابعت الطلب:</T>
      <T big style={{ textAlign: 'center' }}>{PAY_NUMBER}</T>
      <Input placeholder="اسمك" value={f.name} onChangeText={set('name')} />
      <Input placeholder="رقم موبايلك" keyboardType="phone-pad" value={f.phone} onChangeText={set('phone')} />
      <Input placeholder="الرقم اللي حولت منه" keyboardType="phone-pad" value={f.from} onChangeText={set('from')} />
      <Input placeholder="العنوان (لو في توصيل)" value={f.address} onChangeText={set('address')} />
      <Btn title="أرسل الطلب" disabled={busy} onPress={send} />
      <Btn light title="رجوع" onPress={onClose} />
    </Card>
  );
}

export default function Store({ user, isAdmin }) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [buy, setBuy] = useState(null);
  const [p, setP] = useState({ title: '', price: '', desc: '', image: '' });
  const rows = (q) => q.docs.map((d) => ({ id: d.id, ...d.data() }));
  useEffect(() => {
    if (!ready || !user) return;
    const a = onSnapshot(collection(db, 'products'), (q) => setProducts(rows(q)), fail);
    const col = collection(db, 'orders');
    const b = onSnapshot(isAdmin ? col : query(col, where('uid', '==', user.uid)),
      (q) => setOrders(rows(q).sort((x, y) => (y.at?.seconds || 0) - (x.at?.seconds || 0))), fail);
    return () => { a(); b(); };
  }, [user, isAdmin]);
  const add = async () => {
    const price = Number(p.price);
    if (!p.title || !(price > 0)) return Alert.alert('ناقص', 'اكتب الاسم والسعر بالأرقام الإنجليزي');
    try { await addDoc(collection(db, 'products'), { ...p, price }); setP({ title: '', price: '', desc: '', image: '' }); } catch (e) { fail(e); }
  };
  if (buy) return <ScrollView contentContainerStyle={{ padding: 12 }}><OrderForm item={buy} user={user} onClose={() => setBuy(null)} /></ScrollView>;
  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} keyboardShouldPersistTaps="handled">
      {isAdmin && (
        <Card>
          <T big>ضيف منتج</T>
          <Input placeholder="اسم المنتج" value={p.title} onChangeText={(title) => setP({ ...p, title })} />
          <Input placeholder="السعر" keyboardType="numeric" value={p.price} onChangeText={(price) => setP({ ...p, price })} />
          <Input placeholder="الوصف" value={p.desc} onChangeText={(desc) => setP({ ...p, desc })} />
          <Input placeholder="لينك صورة المنتج (اختياري)" autoCapitalize="none" value={p.image} onChangeText={(image) => setP({ ...p, image })} />
          <Btn title="انشر" onPress={add} />
        </Card>
      )}
      {!products.length && <Card><T>{ready ? 'مفيش منتجات لسه' : 'المتجر محتاج بيانات Firebase في config.js'}</T></Card>}
      {products.map((x) => (
        <Card key={x.id}>
          {!!x.image && <Image source={{ uri: x.image }} style={{ height: 160, borderRadius: 12 }} />}
          <T big>{x.title}</T><T>{x.desc}</T><T big>{x.price} جنيه</T>
          {isAdmin ? <Btn light title="امسح المنتج" onPress={() => Alert.alert('تأكيد', 'تمسح المنتج؟', [{ text: 'لا' }, { text: 'امسح', onPress: () => deleteDoc(doc(db, 'products', x.id)).catch(fail) }])} />
            : <Btn title="اشتري" onPress={() => setBuy(x)} />}
        </Card>
      ))}
      <T big>{isAdmin ? 'الطلبات اللي جاتلك' : 'طلباتي'}</T>
      {orders.map((o) => (
        <Card key={o.id}>
          <T>{o.title} - {o.price} جنيه ({STATUS[o.status]})</T>
          {isAdmin && <><T>{o.name} | {o.phone}</T><T>حوّل من: {o.from}</T><T>{o.address}</T>
            {['paid', 'done', 'rejected'].map((st) => <Btn light key={st} title={STATUS[st]} onPress={() => updateDoc(doc(db, 'orders', o.id), { status: st }).catch(fail)} />)}</>}
        </Card>
      ))}
    </ScrollView>
  );
}
