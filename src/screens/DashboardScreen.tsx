import React, { useCallback, useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import THEME from "../../theme";
import { auth, db } from "../../firebaseConfig";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { NativeBottomTabScreenProps } from "@react-navigation/bottom-tabs/unstable";
import { RootTabsParamsLists } from "../../App";
import DAYS_OF_WEEK from "../constants/day";
import { ExamType, StudyType } from "./TimetableScreen";

const SkeletonItem = ({ width, height, borderRadius = 8, style }: any) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: THEME.CARD_BG, opacity },
        style,
      ]}
    />
  );
};

type Props = NativeBottomTabScreenProps<RootTabsParamsLists>

export default function DashboardScreen({ navigation }: Props) {

  const [loadingUser, setLoadingUser] = useState<boolean>(true);
  const [loadingClass, setLoadingClass] = useState<boolean>(true);
  const [loadingExams, setLoadingExams] = useState<boolean>(true);

  const [userName, setUserName] = useState<string>('');
  const [nextClass, setNextClass] = useState<Partial<StudyType> | null>(null)

  const [sevenDaysExams , setSevenDaysExam] = useState<Partial<ExamType>[]>([])

  const fetchNUserName = async (isActive: boolean) => {
    setLoadingUser(true);
    try {
      if (!auth.currentUser?.uid) return;
      const data = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (data.exists() && isActive) {
        setUserName(data.data()?.name || '');
      }
    } catch (error) {
      console.error("Error fetching user name:", error);
    } finally {
      if (isActive) setLoadingUser(false);
    }
  };

  const fetchNextClass = async (isActive: boolean) => {
    setLoadingClass(true);
    try {
      if (!auth.currentUser?.uid) return
      const studySnap = await getDocs(collection(db, 'users', auth.currentUser.uid, 'class'));
      const allClasss: StudyType[] = studySnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as StudyType));
      // เชคว่าวันนนี้คือ index เท่าไรใน DAY_OF_WEEK จากนั้นเอาทุกวิชามาวนลูปเพื่อจัดตำแหน่งใหม่ โดยใช้ index เทียบกัน 
      // เช่น วันนี้วัน พฤ คือ index = 4 จะได้วิชาวันอังคารคือวัน 2 จากนั้นเอาวิชาปลายทางลบปัจจุบันจะได้ระยะห่างจากปัจจุบัน
      // เช่น จากวันอังคารถึง พฤ ห่างทั้งหมด 2 - 4 = -2 หากน้อยกว่า 0 ต้องบวก 7 จะได้จำนวนวันที่ห่างจริงๆ -2 + 7 = 5 วัน
      // หากเป็น 0 ก็คือเดียวกัน ให้ดูว่าเวลาเริ่มของวิชานั้นกับเวลาปัจจุบันผ่านไปหรือยัง ถ้าผ่านไปแล้วให้รอไปเรียนสัปดาห์หน้าเลย + 7 
      // เรียงกัน หาก จำนวนวันเท่ากันให้ใส่วิชาที่เรียนก่อน จากนั้น ดึงตำแหน่งแรกไปแสดงเป็น วิชาที่จะถึง

      const today = new Date()
      const todayIndex = today.getDay()
      // ลูปหาวันที่จะถึง
      const classWithDayAhead = allClasss.map(cls => {
        const clsDayIndex = DAYS_OF_WEEK.findIndex(d => d === cls.day)

        let dayAhead = clsDayIndex - todayIndex

        if (dayAhead === 0) { // ถ้าเป็นวันเดียวกันใหดูเวลาเริ่มว่าผ่านไปยัง 
          const hours = String(today.getHours()).padStart(2, '0');
          const minutes = String(today.getMinutes()).padStart(2, '0');
          const currentTime = Number(hours + '.' + minutes)
          if (cls.start < currentTime) {   // ผ่านไปแล้วให้รอไปสัปดาห์หน้าเลย
            dayAhead += 7
          }
        } else if (dayAhead < 0) { // เลยวันไปแล้ว
          dayAhead += 7
        }

        return {
          ...cls,
          dayAhead
        }
      })

      // เอามาเรียงกัน
      const sortClass = classWithDayAhead.sort((a, b) => {
        // หากระยะห่างวันเท่ากัน ให้เรียงตามเวลาที่เริ่มเรียน (จากน้อยไปมาก)
        if (a.dayAhead === b.dayAhead) {
          return a.start - b.start;
        }
        return a.dayAhead - b.dayAhead;
      });

      setNextClass(sortClass[0])
    } finally {
      if (isActive) setLoadingClass(false);
    }
  };

  const fetchExamIn7days = async (isActive: boolean) => {
    setLoadingExams(true);
    try {

      await new Promise(r => setTimeout(r, 700));
    } finally {
      if (isActive) setLoadingExams(false);
    }
  };

  const [lastTimeCheck, setLastTimeCheck] = useState<string>('');
  const getTimeNow = () => {
    const today = new Date();

    const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    const dayName = days[today.getDay()];
    const date = today.getDate();
    const monthName = months[today.getMonth()];

    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');

    const formattedDateTime = `${dayName} ${date} ${monthName} เวลา ${hours}:${minutes} น.`;

    setLastTimeCheck(formattedDateTime);
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      fetchNUserName(isActive);
      fetchNextClass(isActive);
      fetchExamIn7days(isActive);

      getTimeNow()

      return () => {
        isActive = false;
      };
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Header Section */}
        <View style={styles.header}>
          {loadingUser ? (
            <>
              <SkeletonItem width={180} height={32} style={{ marginBottom: 8 }} />
              <SkeletonItem width={220} height={20} />
            </>
          ) : (
            <>
              <Text style={styles.greeting}>สวัสดี, {userName || "ผู้ใช้งาน"}</Text>
              <Text style={styles.subtitle}>{lastTimeCheck}</Text>
            </>
          )}
        </View>

        {/* Next Class Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>วิชาถัดไป</Text>
          {loadingClass ? (
            <View style={[styles.card, { backgroundColor: THEME.BACKGROUND, borderColor: THEME.CARD_BG, borderWidth: 1 }]}>
              <View style={styles.cardHeader}>
                <SkeletonItem width={90} height={20} />
              </View>
              <SkeletonItem width={200} height={28} style={{ marginBottom: 8 }} />
              <SkeletonItem width={120} height={20} />
            </View>
          ) : nextClass ? (
            <View style={[styles.card, styles.primaryCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.timeText}>
                  {nextClass.day} เวลา {nextClass.start} น. - {nextClass.end} น.
                </Text>
              </View>
              <Text style={styles.courseName}>{nextClass.class_name}</Text>
              <Text style={styles.location}>ห้อง {nextClass.room}</Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: THEME.BACKGROUND, alignItems: 'center', paddingVertical: 32, borderColor: THEME.CARD_BG, borderWidth: 1 }]}>
              <Text style={{ fontFamily: "REGULAR", fontSize: 16, color: THEME.TEXT_SUB }}>
                ไม่พบวิชาเรียน
              </Text>
            </View>
          )}
        </View>

        {/* Upcoming Exams List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>สอบใน 7 วันนี้</Text>
          {loadingExams ? (
            <View style={[styles.card, { backgroundColor: THEME.BACKGROUND, borderColor: THEME.CARD_BG, borderWidth: 1 }]}>
              <View style={styles.examRow}>
                <View style={styles.examInfo}>
                  <SkeletonItem width={150} height={20} style={{ marginBottom: 6 }} />
                  <SkeletonItem width={100} height={16} />
                </View>
                <SkeletonItem width={40} height={20} />
              </View>
              <View style={styles.divider} />
              <View style={styles.examRow}>
                <View style={styles.examInfo}>
                  <SkeletonItem width={170} height={20} style={{ marginBottom: 6 }} />
                  <SkeletonItem width={120} height={16} />
                </View>
                <SkeletonItem width={40} height={20} />
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              {/* Exam Item 1 */}
              <View style={styles.examRow}>
                <View style={styles.examInfo}>
                  <Text style={styles.examName}>Algorithm Design</Text>
                  <Text style={styles.examDate}>พรุ่งนี้, 09:00 น.</Text>
                </View>
                <Text style={styles.daysLeftText}>1 วัน</Text>
              </View>

              <View style={styles.divider} />

              {/* Exam Item 2 */}
              <View style={styles.examRow}>
                <View style={styles.examInfo}>
                  <Text style={styles.examName}>Software Engineering</Text>
                  <Text style={styles.examDate}>28 ก.พ., 13:00 น.</Text>
                </View>
                <Text style={[styles.daysLeftText, { color: THEME.TEXT_SUB }]}>5 วัน</Text>
              </View>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Floating Action Button (Quick Add) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('planner')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.BACKGROUND,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 32,
    marginTop: 16,
    minHeight: 60, // กำหนดความสูงขั้นต่ำ ป้องกัน Layout Shift เวลาข้อมูลเปลี่ยน
  },
  greeting: {
    fontFamily: "BOLD",
    fontSize: 28,
    color: THEME.TEXT_MAIN,
  },
  subtitle: {
    fontFamily: "REGULAR",
    fontSize: 16,
    color: THEME.TEXT_SUB,
    marginTop: 4,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontFamily: "BOLD",
    fontSize: 18,
    color: THEME.TEXT_MAIN,
    marginBottom: 16,
  },
  card: {
    backgroundColor: THEME.CARD_BG,
    borderRadius: 16,
    padding: 20,
    minHeight: 120,
  },
  primaryCard: {
    backgroundColor: THEME.SECONDARY,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  timeText: {
    fontFamily: "BOLD",
    fontSize: 14,
    color: THEME.TEXT_MAIN,
  },
  courseName: {
    fontFamily: "BOLD",
    fontSize: 30,
    color: THEME.TEXT_MAIN,
    marginBottom: 4,
  },
  location: {
    fontFamily: "REGULAR",
    fontSize: 14,
    color: THEME.TEXT_SUB,
  },
  examRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  examInfo: {
    flex: 1,
  },
  examName: {
    fontFamily: "BOLD",
    fontSize: 16,
    color: THEME.TEXT_MAIN,
    marginBottom: 2,
  },
  examDate: {
    fontFamily: "REGULAR",
    fontSize: 14,
    color: THEME.TEXT_SUB,
  },
  daysLeftText: {
    fontFamily: "BOLD",
    fontSize: 14,
    color: THEME.ERROR,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginVertical: 8,
  },
  fab: {
    position: "absolute",
    bottom: 110,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: THEME.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  fabIcon: {
    fontFamily: "REGULAR",
    fontSize: 32,
    color: THEME.BACKGROUND,
    lineHeight: 36,
  },
});