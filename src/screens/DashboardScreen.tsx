import React, { useCallback, useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Pressable, Modal, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import THEME from "../../theme";
import { auth, db } from "../../firebaseConfig";
import { addDoc, collection, doc, getDoc, getDocs, sum } from "firebase/firestore";
import { NativeBottomTabScreenProps } from "@react-navigation/bottom-tabs/unstable";
import { RootTabsParamsLists } from "../../App";
import DAYS_OF_WEEK from "../constants/day";
import { ExamType, StudyResponseType ,StudyType } from "./TimetableScreen";
import type { EvenType, StudyPlanType } from "./PlannerScreen";

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

const QuickAddModal = ({visible , onClose , onSuccess} : { visible: boolean, onClose: () => void, onSuccess: () => void }) =>{
  const [eventName , setEventName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAdd = async () => {
    if(!eventName.trim()){
      Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่อกิจกรรม')
      return
    }

    setIsSubmitting(true)
    const payload ={ 
            date : '',
            start : '',
            end:'',
            title : eventName,
            description : '',
            userId : auth.currentUser?.uid as string,
            status :'not_done',
            createdAt :new Date().toISOString()
        }

    try{
      await addDoc(collection(db, 'users', auth.currentUser?.uid as string, 'events'), {
            ...payload
      })  
      setEventName('')
      Alert.alert('สำเร็จ', 'เพิ่มกิจกรรมเรียบร้อยแล้ว', [
        {
          text: 'ตรวจสอบ',
          onPress: () => {
            onSuccess()
          }
        }
      ])
    }catch(err){
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเพิ่มกิจกรรมได้')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
      navigationBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>เพิ่มกิจกรรมอย่างรวดเร็ว</Text>
          <TextInput  
            style={styles.modalInput} 
            placeholder="ชื่อกิจกรรม"
            value={eventName}
            onChangeText={setEventName}
            editable={!isSubmitting}
          />
          <View style={{ flexDirection : 'row' , justifyContent : 'flex-end' , gap : 12 , marginTop : 20}}>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={onClose}
              disabled={isSubmitting}
            >  
              <Text style={styles.modalCloseButtonText}>ปิด</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalAddButton, isSubmitting && { opacity: 0.5 }]} 
              onPress={handleAdd}
              disabled={isSubmitting}
            >
              <Text style={styles.modalAddButtonText}>
                {isSubmitting ? 'กำลังเพิ่ม...' : 'เพิ่ม'}
              </Text>  
            </TouchableOpacity>
          </View>
        </View>
      </View> 
    </Modal>
  );
}

export default function DashboardScreen({ navigation }: Props) {

  const [openQuickAddModal , setOpenQuickAddModal] = useState(false); 

  const [loadingUser, setLoadingUser] = useState<boolean>(true);
  const [loadingClass, setLoadingClass] = useState<boolean>(true);
  const [loadingExams, setLoadingExams] = useState<boolean>(true);
  const [loadingEventSummary, setLoadingEventSummary] = useState<boolean>(true);

  const [userName, setUserName] = useState<string>('');
  const [nextClass, setNextClass] = useState<Partial<StudyType> | null>(null)

  const [allExams, setAllExams] = useState<ExamTypeDashboard[]>([])
  const [sevenDaysExams, setSevenDaysExam] = useState<Partial<ExamTypeDashboard>[]>([])
  const [selectedFilter, setSelectedFilter] = useState<'week' | 'month'>('week')

  const [allEvent, setAllEvent] = useState<EvenType[]>([])
  const [allStudyPlan, setAllStudyPlan] = useState<StudyPlanType[]>([])

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
      const resClassData: StudyResponseType[] = studySnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as StudyResponseType));

      const today = new Date()
      const todayIndex = today.getDay()

      const allClasss : StudyType[] = []
      resClassData.forEach(classItem => {
        classItem.dates.forEach(date => {
          allClasss.push({
            id: classItem.id,
            class_code: classItem.class_code,
            class_name: classItem.class_name,
            room: classItem.room,
            sec: date.sec,
            professor_name: classItem.professor_name,
            day: date.day,
            start: date.start,
            end: date.end,
            userId: classItem.userId
          })
      })
    })


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
      setAllExams(tmp)
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

  const fetchEventSummary = async (isActive: boolean) => {
    try {
      setLoadingEventSummary(true);
      const uid = auth.currentUser?.uid
      if (!uid) return null

      const fetchEvent = getDocs(collection(db, 'users', uid, 'events'));
      const fetchStudyPlan = getDocs(collection(db, 'users', uid, 'study_plans'));

      const [eventSnap, studyPlanSnap] = await Promise.all([fetchEvent, fetchStudyPlan]);

      const allEvents: EvenType[] = eventSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EvenType));

      const allStudyPlans: StudyPlanType[] = studyPlanSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as StudyPlanType));

      setAllEvent(allEvents);
      setAllStudyPlan(allStudyPlans);

    } catch (error) {
      console.error("Error fetching event summary:", error);
    } finally {
      if (isActive) setLoadingEventSummary(false);
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
      fetchEventSummary(isActive);
      getTimeNow()

      return () => {
        isActive = false;
      };
    }, [])
  );

  const renderEventSummary =  (filter: 'week' | 'month') => {
    const filteredEvents = allEvent.filter(event => {
      const [day, month, year] = event.date.split('/')
      const eventDate = new Date(Number(year), Number(month) - 1, Number(day)).setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const ONE_DAY_MILLI = 24 * 60 * 60 * 1000
      const dayleft = (eventDate - today.getTime()) / ONE_DAY_MILLI
      return dayleft >= 0 && ((filter === 'week' && dayleft <= 7) || (filter === 'month' && dayleft <= 30))
    })

    const filteredStudyPlans = allStudyPlan.filter(plan => {
      const [day, month, year] = plan.date.split('/')
      const planDate = new Date(Number(year), Number(month) - 1, Number(day)).setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const ONE_DAY_MILLI = 24 * 60 * 60 * 1000
      const dayleft = (planDate - today.getTime()) / ONE_DAY_MILLI
      return dayleft >= 0 && ((filter === 'week' && dayleft <= 7) || (filter === 'month' && dayleft <= 30))
    })

    const filteredExam = allExams.filter(exam => {
      const [day, month, year] = exam.date.split('/')
      const examDate = new Date(Number(year), Number(month) - 1, Number(day)).setHours(0, 0, 0, 0)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const ONE_DAY_MILLI = 24 * 60 * 60 * 1000
      const dayleft = (examDate - today.getTime()) / ONE_DAY_MILLI
      return dayleft >= 0 && ((filter === 'week' && dayleft <= 7) || (filter === 'month' && dayleft <= 30))
    }
    )

    const renderDateRange = () => {
      const today = new Date();
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
      const startDate = today.toLocaleDateString('th-TH', options);

      let endDate: string;
      if (filter === 'week') {
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        endDate = nextWeek.toLocaleDateString('th-TH', options);
        return `กิจกรรมระหว่าง ${startDate} - ${endDate}`;
      }
      if (filter === 'month') {
        const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        endDate = nextMonth.toLocaleDateString('th-TH', options);
        return `กิจกรรมระหว่าง ${startDate} - ${endDate}`;
      }
      return `กิจกรรมระหว่าง ${startDate}`;
    }
    if (loadingEventSummary) {
      return (
        <View style={[styles.card, { backgroundColor: THEME.BACKGROUND, borderColor: THEME.CARD_BG, borderWidth: 1 }]}>
          <SkeletonItem width={'100%'} height={20} style={{ marginBottom: 12 }} />
          <SkeletonItem width={'80%'} height={28} style={{ marginBottom: 8 }} />
          <SkeletonItem width={'60%'} height={20} />
        </View>
      );
    }
    if (filteredEvents.length === 0 && filteredStudyPlans.length === 0 && filteredExam.length === 0 && !loadingEventSummary) {
      return (
        <View style={[styles.card, styles.emptyCard]}>
          <Text style={styles.emptyStateText}>ไม่พบกิจกรรมสำหรับ {filter === 'week' ? '1 สัปดาห์หน้า' : '1 เดือนหน้า'}</Text>
        </View>
      );
    }
    return (
      <View style={styles.card}>
        {/* Date Range */}
        <Text style={styles.dateRangeText}>{renderDateRange()}</Text>

        {/* Events Section */}
        {filteredEvents && filteredEvents.length > 0 && (
          <View style={[styles.summarySection, { marginBottom: 5 , backgroundColor : THEME.BACKGROUND, padding: 16, borderRadius: 12}]}>
            <Text style={styles.summaryHeader}>กิจกรรม</Text>
            {filteredEvents.map((event, index) => (
              <View key={event.id}>
                <View style={styles.summaryItem}>
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryTitle}>{event.title}</Text>
                    <Text style={styles.summaryDate}>{event.date}</Text>
                  </View>
                </View>
                {index < filteredEvents.length - 1 && <View style={styles.summaryDivider} />}
              </View>
            ))}
          </View>
        )}

        {/* Study Plans Section */}
        {filteredStudyPlans && filteredStudyPlans.length > 0 && (
          <View style={[styles.summarySection, { marginBottom: 5 , backgroundColor : THEME.BACKGROUND, padding: 16, borderRadius: 12}]}>
            <Text style={styles.summaryHeader}>แผนการเรียน</Text>
            {filteredStudyPlans.map((plan, index) => (
              <View key={plan.id}>
                <View style={styles.summaryItem}>
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryTitle}>{plan.title}</Text>
                    <Text style={styles.summaryDate}>{plan.date}</Text>
                  </View>
                </View>
                {index < filteredStudyPlans.length - 1 && <View style={styles.summaryDivider} />}
              </View>
            ))}
          </View>
        )}

        {/* Exams Section */}
        {filteredExam && filteredExam.length > 0 && (
          <View style={[styles.summarySection, { marginBottom: 0 , backgroundColor : THEME.BACKGROUND, padding: 16, borderRadius: 12}]}>
            <Text style={styles.summaryHeader}>การสอบ</Text>
            {filteredExam.map((exam, index) => (
              <View key={exam.id}>
                <View style={styles.summaryItem}>
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryTitle}>{exam.class_name}</Text>
                    <Text style={styles.summaryDate}>{exam.date} เวลา {exam.start} - {exam.end} น.</Text>
                  </View>
                  <View style={[styles.summaryBadge, { backgroundColor: THEME.ERROR + '20' }]}>
                    <Text style={[styles.summaryBadgeText, { color: THEME.ERROR }]}>{exam.type}</Text>
                  </View>
                </View>
                {index < filteredExam.length - 1 && <View style={styles.summaryDivider} />}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }
  const formattimeString = (time: number) => {
        if(time === 0) return '00:00'
        const [hour, minute] = String(time).split('.')
        const hourString = hour.padStart(2, '0')
        const minuteString = minute ? minute.padEnd(2, '0').slice(0, 2) : '00';
        return `${hourString}:${minuteString}`
    }
return (
  <SafeAreaView style={styles.container}>
    <QuickAddModal visible={openQuickAddModal} onClose={() => setOpenQuickAddModal(false)} onSuccess={() => { setOpenQuickAddModal(false); fetchEventSummary(true) }} />
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
          onPress={() => setOpenQuickAddModal(true)} 
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
              {nextClass.day} เวลา  {formattimeString(nextClass.start ?? 0)} น. - {formattimeString(nextClass.end ?? 0)} น.
              </Text>
            </View>
            <Text style={styles.courseName}>{nextClass.class_name}</Text>
            <Text style={styles.location}>ห้อง {nextClass.room}</Text>
            <Text style={styles.location}>หมู่เรียน {nextClass.sec}</Text>
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
                    <Text style={styles.examDetailText}>วันที่ {ex.date}</Text>
                    <Text style={styles.examDetailText}>เวลา {formattimeString(ex.start ?? 0)} - {formattimeString(ex.end ?? 0) } น.</Text>
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


      {/* filter section week , month */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>สรุปสิ่งที่ต้องทำ</Text>
        {/* seletion 1สับปดาหน้า หรือ 1เดือนหน้า */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Pressable
            onPress={() => setSelectedFilter('week')}
            style={({ pressed }) => [
              {
                backgroundColor: pressed ? THEME.PRIMARY + '20' : THEME.PRIMARY + '10',
              },
              {
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 12,
                alignSelf: 'flex-start',
                marginBottom: 16,
                backgroundColor: selectedFilter === 'week' ? THEME.PRIMARY + '30' : THEME.PRIMARY + '10',
                borderWidth: selectedFilter === 'week' ? 1 : 0,
                borderColor: selectedFilter === 'week' ? THEME.PRIMARY : 'transparent',
              }
            ]}>
            <Text style={{
              fontFamily: "BOLD",
              fontSize: 14,
              color: THEME.PRIMARY,
            }}>1 สัปดาห์หน้า</Text>
          </Pressable>
          <Pressable
            onPress={() => setSelectedFilter('month')}
            style={({ pressed }) => [
              {
                backgroundColor: pressed ? THEME.PRIMARY + '20' : THEME.PRIMARY + '10',
              },
              {
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 12, alignSelf: 'flex-start',
                marginBottom: 16,
                backgroundColor: selectedFilter === 'month' ? THEME.PRIMARY + '30' : THEME.PRIMARY + '10',
                borderWidth: selectedFilter === 'month' ? 1 : 0,
                borderColor: selectedFilter === 'month' ? THEME.PRIMARY : 'transparent',
              }
            ]}>
            <Text style={{
              fontFamily: "BOLD",
              fontSize: 14,
              color: THEME.PRIMARY,
            }}>1 เดือนหน้า</Text>

          </Pressable>
        </View>
        {renderEventSummary(selectedFilter)}
      </View>

    </ScrollView>
  
  </SafeAreaView>
);
}

const styles = StyleSheet.create({
  modalCloseButton :{
    backgroundColor: THEME.CARD_BG,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalCloseButtonText : {
    fontFamily: "BOLD",
    fontSize: 14,
    color: THEME.TEXT_MAIN, 
  },
  modalAddButton :{
    backgroundColor: THEME.SECONDARY,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalAddButtonText : {
    fontFamily: "BOLD",
    fontSize: 14,
    color: THEME.TEXT_MAIN, 
  },  
  modalOverlay : {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent : {
    backgroundColor: THEME.CARD_BG,
    borderRadius: 16,
    padding: 24,
    width: '80%',
  },
  modalTitle : {
    fontFamily: "BOLD",
    fontSize: 18,
    color: THEME.TEXT_MAIN,
    marginBottom: 16,
  },
  modalInput : {
    backgroundColor: THEME.BACKGROUND,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: "REGULAR",
    fontSize: 14,
    color: THEME.TEXT_MAIN,
  },
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
  summarySection: {
    marginBottom: 16,
  },
  summaryHeader: {  
    fontFamily: "BOLD",
    fontSize: 16,
    color: THEME.TEXT_MAIN,
    marginBottom: 12,
  },
  dateRangeText: {
    fontFamily: "BOLD",
    fontSize: 14, 
    color: THEME.TEXT_SUB,
    marginBottom: 12,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginVertical: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontFamily: "BOLD",
    fontSize: 14,
    color: THEME.TEXT_MAIN,
    marginBottom: 2,
  },
  summaryDate: {
    fontFamily: "REGULAR",
    fontSize: 12,
    color: THEME.TEXT_SUB,
  },
  summaryBadge: {
    backgroundColor: THEME.PRIMARY + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12, 
  },
  summaryBadgeText: {
    fontFamily: "BOLD", 
    fontSize: 10,
    color: THEME.PRIMARY,
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