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

interface ExamTypeDashboard {
  id: string,
  class_name: string,
  date: string,
  room: string,
  start: number,
  end: number,
  type: string,
  dayleft: number
}

type Props = NativeBottomTabScreenProps<RootTabsParamsLists>

export default function DashboardScreen({ navigation }: Props) {

  const [loadingUser, setLoadingUser] = useState<boolean>(true);
  const [loadingClass, setLoadingClass] = useState<boolean>(true);
  const [loadingExams, setLoadingExams] = useState<boolean>(true);

  const [userName, setUserName] = useState<string>('');
  const [nextClass, setNextClass] = useState<Partial<StudyType> | null>(null)

  const [sevenDaysExams, setSevenDaysExam] = useState<Partial<ExamTypeDashboard>[]>([])

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

      const today = new Date()
      const todayIndex = today.getDay()

      const classWithDayAhead = allClasss.map(cls => {
        const clsDayIndex = DAYS_OF_WEEK.findIndex(d => d === cls.day)
        let dayAhead = clsDayIndex - todayIndex

        if (dayAhead === 0) {
          const hours = String(today.getHours()).padStart(2, '0');
          const minutes = String(today.getMinutes()).padStart(2, '0');
          const currentTime = Number(hours + '.' + minutes)
          if (cls.start < currentTime) {
            dayAhead += 7
          }
        } else if (dayAhead < 0) {
          dayAhead += 7
        }

        return {
          ...cls,
          dayAhead
        }
      })

      const sortClass = classWithDayAhead.sort((a, b) => {
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
      const uid = auth.currentUser?.uid
      if (!uid) return null

      const classSnap = await getDocs(collection(db, 'users', uid, 'class'));
      const allClass: StudyType[] = classSnap.docs.map(cls => ({ id: cls.id, ...cls.data() } as StudyType))

      const examSnap = await getDocs(collection(db, 'users', uid, 'exam'))
      const tmp: ExamTypeDashboard[] = examSnap.docs.map(ex => ({
        id: ex.id,
        ...ex.data()
      } as ExamType)).map(ex => ({
        id: ex.id,
        class_name: allClass.find(c => ex.class_id === c.id)?.class_name ?? 'ไม่พบชื่อวิชา',
        start: ex.start,
        end: ex.end,
        room: ex.room ?? 'ไม่ระบุห้องสอบ',
        type: ex.type,
        date: ex.date,
        dayleft: 0
      }))

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const filterExam = tmp.map(ex => {
        const [day, month, year] = ex.date.split('/')
        const examDay = new Date(Number(year), Number(month) - 1, Number(day)).setHours(0, 0, 0, 0)

        const ONE_DAY_MILLI = 24 * 60 * 60 * 1000
        const dayleft = (examDay - today.getTime()) / ONE_DAY_MILLI
        return { ...ex, dayleft }
      }).filter(ex => ex.dayleft >= 0 && ex.dayleft <= 7)
        .sort((a, b) => a.dayleft - b.dayleft);

      setSevenDaysExam(filterExam)

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

        <View style={styles.header}>
          {loadingUser ? (
            <>
              <SkeletonItem width={180} height={32} style={{ marginBottom: 8 }} />
              <SkeletonItem width={220} height={20} />
            </>
          ) : (
            <View>
              <Text style={styles.greeting}>สวัสดี, {userName || "ผู้ใช้งาน"}</Text>
              <Text style={styles.subtitle}>{lastTimeCheck}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate('planner')}
            activeOpacity={0.8}
          >
            <Text style={styles.fabIcon}>+</Text>
          </TouchableOpacity>
        </View>

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
            <View style={[styles.card, styles.emptyCard]}>
              <Text style={styles.emptyStateText}>
                ไม่พบวิชาเรียน
              </Text>
            </View>
          )}
        </View>

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
          ) : sevenDaysExams.length > 0 ? (
            <View style={styles.card}>
              {sevenDaysExams.map((ex, index) => (
                <View key={ex.id}>
                  <View style={styles.examRow}>
                    <View style={styles.examInfo}>
                      <View style={styles.examHeaderGroup}>
                        <View style={styles.examTypeBadge}>
                          <Text style={styles.examTypeBadgeText}>{ex.type}</Text>
                        </View>
                        <Text style={styles.examName} numberOfLines={1}>{ex.class_name}</Text>
                      </View>
                      <Text style={styles.examDetailText}>วันที่ {ex.date} | เวลา {ex.start} - {ex.end} น.</Text>
                      <Text style={styles.examDetailText}>ห้อง {ex.room || 'ไม่ระบุ'}</Text>
                    </View>

                    <View style={styles.countdownContainer}>
                      <Text style={[
                        styles.countdownNumber,
                        { color: ex.dayleft && ex.dayleft <= 3 ? THEME.ERROR : THEME.PRIMARY }
                      ]}>
                        {ex.dayleft === 0 ? 'วันนี้' : ex.dayleft}
                      </Text>
                      {ex.dayleft !== 0 && <Text style={styles.countdownLabel}>วัน</Text>}
                    </View>
                  </View>

                  {index < sevenDaysExams.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.card, styles.emptyCard]}>
              <Text style={styles.emptyStateText}>ไม่พบวิชาสอบในช่วง 7 วันข้างหน้า</Text>
            </View>
          )}
        </View>

      </ScrollView>

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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
    marginTop: 16,
    minHeight: 60,
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
    justifyContent: 'center',
  },
  primaryCard: {
    backgroundColor: THEME.SECONDARY,
    justifyContent: 'flex-start',
  },
  emptyCard: {
    backgroundColor: THEME.CARD_BG,
    alignItems: 'center',
    paddingVertical: 32,
    minHeight: 100,
  },
  emptyStateText: {
    fontFamily: "REGULAR",
    fontSize: 16,
    color: THEME.TEXT_SUB,
    textAlign: 'center',
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
  examHeaderGroup: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  examTypeBadge: {
    backgroundColor: THEME.PRIMARY + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  examTypeBadgeText: {
    fontFamily: "BOLD",
    fontSize: 10,
    color: THEME.PRIMARY,
  },
  examName: {
    fontFamily: "BOLD",
    fontSize: 16,
    color: THEME.TEXT_MAIN,
    marginBottom: 2,
  },
  examDetailText: {
    fontFamily: "REGULAR",
    fontSize: 13,
    color: THEME.TEXT_SUB,
    marginBottom: 2,
  },
  countdownContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    backgroundColor: THEME.BACKGROUND,
    padding: 8,
    borderRadius: 12,
  },
  countdownNumber: {
    fontFamily: "BOLD",
    fontSize: 20,
    lineHeight: 28,
  },
  countdownLabel: {
    fontFamily: "REGULAR",
    fontSize: 12,
    color: THEME.TEXT_SUB,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginVertical: 8,
  },
  fab: {
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