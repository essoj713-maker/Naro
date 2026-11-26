import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer, useFocusEffect } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Coordinates, CalculationMethod, PrayerTimes } from "adhan";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

/* ======================= إعدادات التطبيق ======================= */
// ضع بيانات مشروعك من Firebase هنا لتفعيل الشات الحي
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID",
};

// ضع مفتاح Gemini API هنا لتفعيل ردود Naro الحقيقية
const GEMINI_API_KEY = "PASTE_YOUR_GEMINI_API_KEY";
const GEMINI_MODEL = "gemini-2.5-flash";

// إعدادات الدفع والأدمن
const WALLET_NUMBER = "01121808240";
const MONTHLY_PRICE = "5 جنيه";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const ADMIN_CONFIG = Object.freeze({
  username: "youssef",
  secretKey: "##Yossefjoo011!-",
});

const ROOM_ID = "room_general";
const USERS_KEY = "naro_users_v2";
const SESSION_KEY = "naro_session_v2";
const LOCATION_KEY = "naro_last_location_v2";

const PRAYER_LABELS = {
  fajr: "الفجر",
  dhuhr: "الضهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

let db = null;
try {
  if (firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("PASTE_YOUR_")) {
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
  }
} catch {
  db = null;
}

function hasActiveSubscription(profile) {
  if (!profile) return false;
  if (profile.isAdmin === true) return true;
  if (!profile.subscriptionActive) return false;
  if (!profile.subscriptionExpiresAt) return false;
  return profile.subscriptionExpiresAt > Date.now();
}

function normalizeUsername(raw) {
  return (raw || "").trim().toLowerCase();
}

/* ======================= Auth & RBAC ======================= */
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUsersMap = useCallback(async () => {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  }, []);

  const saveUsersMap = useCallback(async (map) => {
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(map));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const sessionRaw = await AsyncStorage.getItem(SESSION_KEY);
        if (sessionRaw) {
          const parsed = JSON.parse(sessionRaw);
          const users = await loadUsersMap();
          const fresh = users[normalizeUsername(parsed.username)];
          if (fresh) {
            setUser(fresh);
            await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
          } else {
            await AsyncStorage.removeItem(SESSION_KEY);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [loadUsersMap]);

  async function signup(username, password, adminCode) {
    const cleanName = normalizeUsername(username);
    if (!cleanName) throw new Error("اكتب اسم مستخدم صحيح");

    const users = await loadUsersMap();
    if (users[cleanName]) throw new Error("الاسم ده مستخدم قبل كده");

    const isAdminAttempt = cleanName === normalizeUsername(ADMIN_CONFIG.username);
    if (isAdminAttempt && adminCode !== ADMIN_CONFIG.secretKey) {
      throw new Error("اسم المستخدم ده مخصص للأدمن فقط والكود غير صحيح.");
    }

    const isAdmin = isAdminAttempt && adminCode === ADMIN_CONFIG.secretKey;

    const newUser = {
      username: cleanName,
      password,
      role: isAdmin ? "admin" : "member",
      isAdmin,
      subscriptionActive: isAdmin,
      subscriptionExpiresAt: null,
      prayerLog: {},
      createdAt: Date.now(),
    };

    users[cleanName] = newUser;
    await saveUsersMap(users);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    setUser(newUser);
  }

  async function login(username, password) {
    const cleanName = normalizeUsername(username);
    const users = await loadUsersMap();
    const found = users[cleanName];
    if (!found || found.password !== password) {
      throw new Error("اسم المستخدم أو كلمة السر غلط");
    }

    const normalizedUser = {
      ...found,
      role: found.isAdmin ? "admin" : "member",
    };

    users[cleanName] = normalizedUser;
    await saveUsersMap(users);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(normalizedUser));
    setUser(normalizedUser);
  }

  async function logout() {
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  async function updateUser(targetUsername, patch, options = { allowSelfPrayerLog: false }) {
    const cleanTarget = normalizeUsername(targetUsername);
    const isSelf = user && normalizeUsername(user.username) === cleanTarget;
    const isAdminCaller = user && user.isAdmin === true;

    if (!isAdminCaller && !(isSelf && options.allowSelfPrayerLog)) {
      throw new Error("غير مصرح لك بتنفيذ هذا الإجراء.");
    }

    const users = await loadUsersMap();
    if (!users[cleanTarget]) return;

    const safePatch = isAdminCaller
      ? { ...patch }
      : { prayerLog: patch.prayerLog ?? users[cleanTarget].prayerLog };

    delete safePatch.username;
    delete safePatch.role;
    delete safePatch.isAdmin;

    users[cleanTarget] = { ...users[cleanTarget], ...safePatch };
    await saveUsersMap(users);

    if (isSelf) {
      const updatedSelf = users[cleanTarget];
      setUser(updatedSelf);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updatedSelf));
    }
  }

  async function getAllUsers() {
    if (!user || user.isAdmin !== true) {
      throw new Error("لوحة الإدارة متاحة للأدمن فقط.");
    }
    return loadUsersMap();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signup,
        login,
        logout,
        updateUser,
        getAllUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  return useContext(AuthContext);
}

/* ======================= مواعيد الصلاة ======================= */
function getTodayPrayerTimes(latitude, longitude, date = new Date()) {
  const coordinates = new Coordinates(latitude, longitude);
  const params = CalculationMethod.Egyptian();
  const times = new PrayerTimes(coordinates, date, params);
  return {
    fajr: times.fajr,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  };
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForLocalNotifications() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("adhan", {
      name: "مواعيد الصلاة",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });
  }
  if (Device.isDevice) {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      await Notifications.requestPermissionsAsync();
    }
  }
}

async function scheduleTodayAdhanNotifications(latitude, longitude) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const times = getTodayPrayerTimes(latitude, longitude);
  const now = new Date();
  for (const key of Object.keys(PRAYER_LABELS)) {
    const time = times[key];
    if (time > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `حان وقت صلاة ${PRAYER_LABELS[key]}`,
          body: "حي على الصلاة، حي على الفلاح 🕌",
          sound: "default",
        },
        trigger: time,
      });
    }
  }
}

/* ======================= شاشات الدخول والتسجيل ======================= */
function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    if (!username.trim() || !password) {
      return Alert.alert("تنبيه", "لازم تكتب اسم المستخدم وكلمة السر");
    }
    setBusy(true);
    try {
      await login(username, password);
    } catch (e) {
      Alert.alert("خطأ", e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.logo}>Naro</Text>
      <Text style={styles.subtitle}>سجّل دخولك عشان تكمل</Text>
      <TextInput
        style={styles.input}
        placeholder="اسم المستخدم"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="كلمة السر"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? "جاري الدخول..." : "دخول"}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
        <Text style={styles.link}>لسه معندكش حساب؟ اعمل واحد</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

function SignupScreen({ navigation }) {
  const { signup } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [busy, setBusy] = useState(false);

  const looksLikeAdminName = normalizeUsername(username) === normalizeUsername(ADMIN_CONFIG.username);

  async function handleSignup() {
    if (!username.trim() || !password) {
      return Alert.alert("تنبيه", "لازم تكتب اسم المستخدم وكلمة السر");
    }
    if (password.length < 6) {
      return Alert.alert("تنبيه", "كلمة السر لازم تكون 6 أحرف أو أرقام على الأقل");
    }
    setBusy(true);
    try {
      await signup(username, password, adminCode);
    } catch (e) {
      Alert.alert("خطأ", e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.logo}>Naro</Text>
      <Text style={styles.subtitle}>اعمل حساب جديد</Text>
      <TextInput
        style={styles.input}
        placeholder="اسم المستخدم"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="كلمة السر (6 أحرف/أرقام فأكثر)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {looksLikeAdminName && (
        <TextInput
          style={styles.input}
          placeholder="كود التحقق الخاص بالأدمن"
          secureTextEntry
          autoCapitalize="none"
          value={adminCode}
          onChangeText={setAdminCode}
        />
      )}
      <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? "جاري التسجيل..." : "تسجيل"}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>عندك حساب بالفعل؟ ادخل</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

/* ======================= الشات الجماعي ======================= */
function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (!hasActiveSubscription(user) || !db) return;
    const q = query(collection(db, "rooms", ROOM_ID, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      },
      () => {
        Alert.alert("تنبيه", "تعذر الاتصال بقاعدة بيانات الشات. تأكد من إعدادات Firebase.");
      }
    );
    return unsub;
  }, [user]);

  async function sendMessage() {
    if (!text.trim() || sending) return;
    if (!hasActiveSubscription(user)) {
      return Alert.alert("الاشتراك مطلوب", "يجب تفعيل الاشتراك أولاً لإرسال الرسائل.");
    }
    if (!db) {
      return Alert.alert("إعداد Firebase ناقص", "أضف بيانات مشروع Firebase في أعلى الكود لتفعيل الشات.");
    }
    const toSend = text.trim();
    setText("");
    setSending(true);
    try {
      await addDoc(collection(db, "rooms", ROOM_ID, "messages"), {
        text: toSend,
        sender: user.username,
        createdAt: serverTimestamp(),
      });
    } catch {
      Alert.alert("خطأ", "لم يتم إرسال الرسالة، تحقق من الإنترنت وFirebase.");
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {!db && (
        <View style={styles.configBanner}>
          <Text style={styles.configBannerText}>
            الشات محتاج بيانات Firebase في أعلى الكود عشان يشتغل بينك وبين صحابك.
          </Text>
        </View>
      )}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => {
          const mine = item.sender === user.username;
          return (
            <View style={[styles.bubble, mine ? styles.myBubble : styles.theirBubble]}>
              {!mine && <Text style={styles.sender}>{item.sender}</Text>}
              <Text style={mine ? styles.myText : styles.theirText}>{item.text}</Text>
            </View>
          );
        }}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.chatInput}
          placeholder="اكتب رسالة..."
          value={text}
          onChangeText={setText}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={sending}>
          <Text style={styles.sendText}>{sending ? "..." : "بعت"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ======================= مساعد Naro (ذكاء اصطناعي حقيقي) ======================= */
async function askGeminiAssistant(historyMessages, latestPrompt) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.startsWith("PASTE_YOUR_")) {
    throw new Error("لم يتم ضبط مفتاح GEMINI_API_KEY بعد في إعدادات التطبيق.");
  }

  const contents = historyMessages.slice(-12).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }],
  }));

  contents.push({
    role: "user",
    parts: [{ text: latestPrompt }],
  });

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
    GEMINI_API_KEY
  )}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: "أنت مساعد ذكي ودود اسمك نارو (Naro) داخل تطبيق عربي. أجب بوضوح واختصار ومساعدة عملية باللغة العربية.",
          },
        ],
      },
      contents,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const apiMessage = data?.error?.message || "حدث خطأ أثناء الاتصال بخدمة الذكاء الاصطناعي.";
    throw new Error(apiMessage);
  }

  const replyText =
    data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join("\n")
      .trim() || "";

  if (!replyText) {
    throw new Error("لم يرجع النموذج رداً نصياً واضحاً.");
  }

  return replyText;
}

function NaroScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    { id: "welcome", role: "assistant", text: "أهلاً بك، أنا نارو. اسألني في أي موضوع تحبه." },
  ]);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const listRef = useRef(null);

  async function send() {
    if (!text.trim() || thinking) return;
    if (!hasActiveSubscription(user)) {
      return Alert.alert("الاشتراك مطلوب", "يجب تفعيل الاشتراك أولاً لاستخدام نارو.");
    }

    const promptText = text.trim();
    const userMsg = { id: `${Date.now()}_u`, role: "user", text: promptText };
    const nextHistory = [...messages, userMsg];

    setMessages(nextHistory);
    setText("");
    setThinking(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const answer = await askGeminiAssistant(nextHistory, promptText);
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}_a`, role: "assistant", text: answer },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}_e`, role: "assistant", text: `تعذر الرد الآن: ${err.message}` },
      ]);
    } finally {
      setThinking(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === "user" ? styles.myBubble : styles.theirBubble]}>
            <Text style={item.role === "user" ? styles.myText : styles.theirText}>{item.text}</Text>
          </View>
        )}
      />
      {thinking && (
        <View style={styles.thinkingBar}>
          <ActivityIndicator size="small" color="#0F6A4D" />
          <Text style={styles.thinkingText}>نارو يفكر...</Text>
        </View>
      )}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.chatInput}
          placeholder="اسأل نارو..."
          value={text}
          onChangeText={setText}
          onSubmitEditing={send}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={thinking}>
          <Text style={styles.sendText}>{thinking ? "..." : "بعت"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ======================= مواعيد الصلاة ======================= */
function formatTime(date) {
  return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function PrayerTimesScreen() {
  const { user, updateUser } = useAuth();
  const [times, setTimes] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadLocationAndTimes = useCallback(async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let loc;
      if (status === "granted") {
        loc = await Location.getCurrentPositionAsync({});
        await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(loc.coords));
      } else {
        const cached = await AsyncStorage.getItem(LOCATION_KEY);
        if (cached) loc = { coords: JSON.parse(cached) };
      }
      if (loc) {
        const computed = getTodayPrayerTimes(loc.coords.latitude, loc.coords.longitude);
        setTimes(computed);
        await registerForLocalNotifications();
        await scheduleTodayAdhanNotifications(loc.coords.latitude, loc.coords.longitude);
      } else {
        Alert.alert("محتاجين موقعك", "من غير إذن الموقع مش هنقدر نحسب مواعيد الصلاة.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocationAndTimes();
  }, [loadLocationAndTimes]);

  async function markPrayed(key) {
    const log = { ...(user.prayerLog || {}) };
    const day = todayKey();
    log[day] = { ...(log[day] || {}), [key]: true };
    await updateUser(user.username, { prayerLog: log }, { allowSelfPrayerLog: true });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0F6A4D" />
      </View>
    );
  }

  const day = todayKey();
  const todayLog = (user.prayerLog || {})[day] || {};

  return (
    <View style={styles.prayerContainer}>
      <Text style={styles.title}>مواعيد الصلاة النهاردة</Text>
      {times &&
        Object.keys(PRAYER_LABELS).map((key) => {
          const prayed = !!todayLog[key];
          return (
            <View key={key} style={styles.row}>
              <View>
                <Text style={styles.prayerName}>{PRAYER_LABELS[key]}</Text>
                <Text style={styles.prayerTime}>{formatTime(times[key])}</Text>
              </View>
              <TouchableOpacity
                style={[styles.checkBtn, prayed && styles.checkedBtn]}
                onPress={() => markPrayed(key)}
              >
                <Text style={prayed ? styles.checkedText : styles.checkText}>
                  {prayed ? "✓ صليت" : "علّم إنك صليت"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      <TouchableOpacity style={styles.refreshBtn} onPress={loadLocationAndTimes}>
        <Text style={styles.refreshText}>تحديث الموقع والمواعيد</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ======================= الاشتراك ======================= */
function daysLeft(expiresAt) {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));
}

function SubscriptionScreen() {
  const { user } = useAuth();
  const active = hasActiveSubscription(user);
  const remaining = daysLeft(user.subscriptionExpiresAt);

  return (
    <ScrollView contentContainerStyle={styles.subContainer}>
      <Text style={styles.title}>الاشتراك الشهري</Text>
      <View style={[styles.statusCard, active ? styles.activeCard : styles.inactiveCard]}>
        <Text style={styles.statusText}>
          {active ? "اشتراكك شغال ✅" : "اشتراكك مش شغال حاليًا"}
        </Text>
        {active && remaining !== null && (
          <Text style={styles.statusSub}>باقي {remaining} يوم</Text>
        )}
      </View>
      <Text style={styles.sectionTitle}>إزاي تشترك؟</Text>
      <Text style={styles.step}>
        1. حوّل {MONTHLY_PRICE} على الرقم ده (فودافون كاش / إنستاباي):
      </Text>
      <Text style={styles.walletNumber}>{WALLET_NUMBER}</Text>
      <Text style={styles.step}>2. ابعت صورة إيصال التحويل لصاحب التطبيق.</Text>
      <Text style={styles.step}>3. هيفعّلك الاشتراك يدويًا من لوحة التحكم.</Text>
      <Text style={styles.note}>
        الاشتراك ده مقابل استخدام التطبيق لمدة شهر، وبيتجدد كل شهر بنفس الطريقة.
      </Text>
    </ScrollView>
  );
}

/* ======================= لوحة الإدارة (للأدمن فقط) ======================= */
function AdminScreen() {
  const { user, getAllUsers, updateUser } = useAuth();
  const [users, setUsers] = useState([]);

  const load = useCallback(async () => {
    if (!user?.isAdmin) return;
    try {
      const all = await getAllUsers();
      setUsers(Object.values(all));
    } catch (e) {
      Alert.alert("غير مسموح", e.message);
    }
  }, [user, getAllUsers]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!user?.isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.lockedText}>هذه الشاشة مخصصة للأدمن فقط.</Text>
      </View>
    );
  }

  async function approveSubscription(username) {
    try {
      await updateUser(username, {
        subscriptionActive: true,
        subscriptionExpiresAt: Date.now() + THIRTY_DAYS_MS,
      });
      await load();
    } catch (e) {
      Alert.alert("خطأ", e.message);
    }
  }

  async function revokeSubscription(username) {
    try {
      await updateUser(username, {
        subscriptionActive: false,
        subscriptionExpiresAt: null,
      });
      await load();
    } catch (e) {
      Alert.alert("خطأ", e.message);
    }
  }

  return (
    <View style={styles.prayerContainer}>
      <Text style={styles.title}>لوحة التحكم</Text>
      <FlatList
        data={users}
        keyExtractor={(u) => u.username}
        renderItem={({ item }) => {
          const active = hasActiveSubscription(item);
          return (
            <View style={styles.adminRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.username}>
                  {item.username} {item.isAdmin ? "👑" : ""}
                </Text>
                <Text style={styles.status}>{active ? "مشترك ✅" : "مش مشترك ❌"}</Text>
              </View>
              {!item.isAdmin && (
                <TouchableOpacity
                  style={[styles.adminBtn, active ? styles.revokeBtn : styles.approveBtn]}
                  onPress={() =>
                    active ? revokeSubscription(item.username) : approveSubscription(item.username)
                  }
                >
                  <Text style={styles.adminBtnText}>{active ? "إلغاء" : "فعّل شهر"}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

/* ======================= التنقل وحماية المسارات ======================= */
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function LogoutButton() {
  const { logout } = useAuth();
  return (
    <TouchableOpacity onPress={logout} style={{ marginEnd: 12 }}>
      <Text style={{ color: "#0F6A4D", fontWeight: "700" }}>خروج</Text>
    </TouchableOpacity>
  );
}

function LockedScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.lockedText}>
        القسم ده محتاج اشتراك شغال. روح لقسم "الاشتراك" وفعّله الأول.
      </Text>
    </View>
  );
}

function MainTabs() {
  const { user } = useAuth();
  const active = hasActiveSubscription(user);
  const isAdmin = user?.isAdmin === true;

  return (
    <Tab.Navigator
      screenOptions={{
        headerRight: () => <LogoutButton />,
        tabBarActiveTintColor: "#0F6A4D",
      }}
    >
      <Tab.Screen
        name="الشات"
        component={active ? ChatScreen : LockedScreen}
        options={{ title: active ? "الشات" : "🔒 الشات" }}
      />
      <Tab.Screen
        name="Naro"
        component={active ? NaroScreen : LockedScreen}
        options={{ title: active ? "Naro" : "🔒 Naro" }}
      />
      <Tab.Screen name="الصلاة" component={PrayerTimesScreen} />
      <Tab.Screen name="الاشتراك" component={SubscriptionScreen} />
      {isAdmin && <Tab.Screen name="الإدارة" component={AdminScreen} />}
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return (
    <NavigationContainer>
      {user ? (
        <MainTabs />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}

/* ======================= الأشكال ======================= */
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  logo: { fontSize: 42, fontWeight: "800", textAlign: "center", color: "#0F6A4D" },
  subtitle: { textAlign: "center", color: "#666", marginBottom: 32, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    fontSize: 16,
    textAlign: "right",
  },
  button: { backgroundColor: "#0F6A4D", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  link: { textAlign: "center", marginTop: 20, color: "#0F6A4D" },

  chatContainer: { flex: 1, backgroundColor: "#f3f3f3" },
  configBanner: { backgroundColor: "#FFF3CD", padding: 10, borderBottomWidth: 1, borderBottomColor: "#FFEEBA" },
  configBannerText: { color: "#664D03", fontSize: 12, textAlign: "center" },
  bubble: { maxWidth: "80%", padding: 10, borderRadius: 14, marginBottom: 8 },
  myBubble: { backgroundColor: "#0F6A4D", alignSelf: "flex-end" },
  theirBubble: { backgroundColor: "#fff", alignSelf: "flex-start" },
  myText: { color: "#fff", fontSize: 15 },
  theirText: { color: "#222", fontSize: 15 },
  sender: { fontSize: 11, color: "#888", marginBottom: 2 },
  thinkingBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#eef6f2",
  },
  thinkingText: { marginStart: 8, color: "#0F6A4D", fontSize: 13 },
  inputRow: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    backgroundColor: "#fff",
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    textAlign: "right",
  },
  sendBtn: {
    marginStart: 8,
    backgroundColor: "#0F6A4D",
    borderRadius: 20,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  sendText: { color: "#fff", fontWeight: "700" },

  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30 },
  lockedText: { fontSize: 16, textAlign: "center", color: "#666", lineHeight: 26 },

  prayerContainer: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 20, color: "#0F6A4D" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  prayerName: { fontSize: 18, fontWeight: "700", textAlign: "right" },
  prayerTime: { fontSize: 15, color: "#666", textAlign: "right" },
  checkBtn: {
    borderWidth: 1,
    borderColor: "#0F6A4D",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  checkedBtn: { backgroundColor: "#0F6A4D" },
  checkText: { color: "#0F6A4D", fontWeight: "600" },
  checkedText: { color: "#fff", fontWeight: "600" },
  refreshBtn: { marginTop: 24, alignItems: "center" },
  refreshText: { color: "#0F6A4D" },

  subContainer: { padding: 20, flexGrow: 1 },
  statusCard: { borderRadius: 14, padding: 16, marginBottom: 24, alignItems: "center" },
  activeCard: { backgroundColor: "#E6F4EC" },
  inactiveCard: { backgroundColor: "#FDEDED" },
  statusText: { fontSize: 17, fontWeight: "700" },
  statusSub: { marginTop: 4, color: "#555" },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 8, textAlign: "right" },
  step: { fontSize: 15, color: "#333", textAlign: "right", marginBottom: 8, lineHeight: 22 },
  walletNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F6A4D",
    textAlign: "center",
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  note: { marginTop: 20, fontSize: 13, color: "#888", textAlign: "right", lineHeight: 20 },

  adminRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  username: { fontSize: 16, fontWeight: "700", textAlign: "right" },
  status: { fontSize: 13, color: "#666", textAlign: "right" },
  adminBtn: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  approveBtn: { backgroundColor: "#0F6A4D" },
  revokeBtn: { backgroundColor: "#c0392b" },
  adminBtnText: { color: "#fff", fontWeight: "700" },
});
