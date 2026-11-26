import React, { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { GEMINI_API_KEY, GEMINI_MODEL } from './config';
import { Btn, Card, Input, Naro, T } from './ui';

const IDEAS = ['قولي نكتة خفيفة', 'ساعدني أذاكر', 'اديني تحدي معلومات', 'احكيلي حكاية قصيرة', 'ترجم للإنجليزي: صباح الخير'];
const SYSTEM = 'أنت نارو، مساعد مرح ومحترم. رد بالعامية المصرية باختصار ووضوح. لو مش متأكد قول إنك مش متأكد. المحتوى مناسب لكل الأعمار.';

export default function Ai({ char, msgs, setMsgs }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const scroll = useRef(null);
  const ask = async (q) => {
    q = q.trim();
    if (!q || busy) return;
    const history = [...msgs, { role: 'user', text: q }];
    setMsgs(history); setText(''); setBusy(true);
    try {
      if (!GEMINI_API_KEY) throw new Error('حط مفتاح Gemini في config.js');
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: history.filter((m) => !m.error).slice(-12).map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error?.message || 'خطأ في الاتصال');
      const a = j.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('');
      setMsgs([...history, { role: 'model', text: a || 'معرفتش أرد، جرب بصيغة تانية' }]);
    } catch (e) {
      setMsgs([...history, { role: 'model', text: 'تعذر الرد: ' + e.message, error: true }]);
    } finally { setBusy(false); }
  };
  return (
    <View style={{ flex: 1, padding: 12, gap: 8 }}>
      <Card style={{ flexDirection: 'row-reverse', alignItems: 'center' }}><Naro i={char} size={64} /><T big>{busy ? 'نارو بيفكر...' : 'نارو جاهز'}</T></Card>
      <ScrollView horizontal style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>{IDEAS.map((i) => <Btn light key={i} title={i} onPress={() => ask(i)} />)}</ScrollView>
      <ScrollView ref={scroll} onContentSizeChange={() => scroll.current?.scrollToEnd()} contentContainerStyle={{ gap: 8 }}>
        {msgs.map((m, i) => <Card key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}><T>{m.text}</T></Card>)}
      </ScrollView>
      <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 'auto' }}>
        <Input style={{ flex: 1 }} value={text} onChangeText={setText} placeholder="اسأل نارو..." />
        <Btn title="ابعت" disabled={busy} onPress={() => ask(text)} />
        <Btn light title="مسح" disabled={busy} onPress={() => setMsgs([])} />
      </View>
    </View>
  );
}
