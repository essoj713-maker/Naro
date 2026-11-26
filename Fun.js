import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Btn, Card, Input, T } from './ui';

const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const winner = (b) => { const l = LINES.find(([a, c, d]) => b[a] && b[a] === b[c] && b[a] === b[d]); return l ? b[l[0]] : null; };
const rnd = (n) => Math.floor(Math.random() * n);

export default function Fun() {
  const [board, setBoard] = useState(Array(9).fill(''));
  const [turn, setTurn] = useState('X');
  const [secret, setSecret] = useState(() => rnd(100) + 1);
  const [guess, setGuess] = useState('');
  const [hint, setHint] = useState('خمن رقم من 1 لـ 100');
  const [rps, setRps] = useState('اختار');
  const w = winner(board);
  const tap = (i) => { if (board[i] || w) return; const b = [...board]; b[i] = turn; setBoard(b); setTurn(turn === 'X' ? 'O' : 'X'); };
  const check = () => {
    const n = Number(guess);
    if (!n) return;
    if (n === secret) { setHint('صح! جبت الرقم. ابدأ من جديد'); setSecret(rnd(100) + 1); } else setHint(n > secret ? 'أقل من كده' : 'أكبر من كده');
    setGuess('');
  };
  const play = (i) => {
    const names = ['حجر', 'ورقة', 'مقص'], c = rnd(3);
    setRps(`انت: ${names[i]} | نارو: ${names[c]} - ${i === c ? 'تعادل' : (i - c + 3) % 3 === 1 ? 'كسبت' : 'خسرت'}`);
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }} keyboardShouldPersistTaps="handled">
      <Card>
        <T big>إكس أو (لاعبين)</T>
        <T>{w ? `الكسبان: ${w}` : board.every(Boolean) ? 'تعادل' : `الدور على: ${turn}`}</T>
        <View style={{ width: 240, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap' }}>
          {board.map((v, i) => <Pressable key={i} onPress={() => tap(i)} style={{ width: 80, height: 80, borderWidth: 1, borderColor: '#0F6B4E', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 34, fontWeight: '800' }}>{v}</Text></Pressable>)}
        </View>
        <Btn light title="دور جديد" onPress={() => { setBoard(Array(9).fill('')); setTurn('X'); }} />
      </Card>
      <Card><T big>خمن الرقم</T><T>{hint}</T><Input keyboardType="numeric" value={guess} onChangeText={setGuess} /><Btn title="جرب" onPress={check} /></Card>
      <Card><T big>حجر ورقة مقص</T><T>{rps}</T>{['حجر', 'ورقة', 'مقص'].map((n, i) => <Btn light key={n} title={n} onPress={() => play(i)} />)}</Card>
    </ScrollView>
  );
}
