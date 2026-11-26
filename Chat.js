import React, { useEffect, useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db, ready } from './firebase';
import { Btn, Card, Input, T } from './ui';

export default function Chat({ user, name }) {
  const [list, setList] = useState([]);
  const [text, setText] = useState('');
  useEffect(() => {
    if (!ready || !user) return;
    return onSnapshot(query(collection(db, 'messages'), orderBy('at', 'desc'), limit(80)),
      (q) => setList(q.docs.map((d) => ({ id: d.id, ...d.data() }))), (e) => Alert.alert('الشات', e.message));
  }, [user]);
  const send = async () => {
    const t = text.trim();
    if (!t) return;
    if (!ready || !user) return Alert.alert('الشات', 'لسه محتاج بيانات Firebase');
    setText('');
    try { await addDoc(collection(db, 'messages'), { text: t, uid: user.uid, name: name || 'صاحبنا', at: serverTimestamp() }); }
    catch (e) { setText(t); Alert.alert('الرسالة ما اتبعتتش', e.message); }
  };
  return (
    <View style={{ flex: 1, padding: 12, gap: 8 }}>
      <FlatList inverted data={list} keyExtractor={(m) => m.id} contentContainerStyle={{ gap: 8 }}
        renderItem={({ item }) => <Card style={{ alignSelf: item.uid === user?.uid ? 'flex-end' : 'flex-start', maxWidth: '82%' }}><T style={{ fontWeight: '700', color: '#0F6B4E' }}>{item.name}</T><T>{item.text}</T></Card>} />
      <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
        <Input style={{ flex: 1 }} value={text} onChangeText={setText} maxLength={500} placeholder="اكتب رسالة..." />
        <Btn title="ابعت" onPress={send} />
      </View>
    </View>
  );
}
