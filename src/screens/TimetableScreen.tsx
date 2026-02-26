import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, Pressable } from "react-native";
import THEME from "../../theme";
import { db, auth } from "../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { SafeAreaView } from "react-native-safe-area-context";
import StudyClassModal from "../components/StudyClassModal";
import ExamModal from "../components/ExamModal";

export type StudyType = {
    id: string;
    class_code: string;
    class_name: string;
    room: string;
    sec: string,
    professor_name: string;
    day: string;
    start: number;
    end: number;
    userId: string;
};

export type ExamType = {
    id: string;
    class_id: string;
    date: string,
    start: number;
    end: number;
    type: 'mid' | 'final'
    userId: string;
};

const DAYS_OF_WEEK = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

export default function TimetableScreen() {
    const [selectMode, setSelectMode] = useState<'study' | 'exam'>('study');
    const [study, setStudy] = useState<StudyType[]>([]);
    const [selectedClass, setSelClass] = useState<StudyType | null>(null);
    const [exam, setExam] = useState<ExamType[]>([]);
    const [selectedExam, setSelExam] = useState<ExamType | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isOpenModal, setIsOpenModal] = useState<{ study: boolean, exam: boolean }>({ study: false, exam: false });

    const fetchStudy = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            Alert.alert("ข้อผิดพลาด", "ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่");
            setLoading(false);
            return;
        }
        const studySnap = await getDocs(collection(db, 'users', userId, 'class'));
        const studyData: StudyType[] = studySnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as StudyType));
        setStudy(studyData);
    };

    const fetchExam = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            Alert.alert("ข้อผิดพลาด", "ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่");
            setLoading(false);
            return;
        }
        const examSnap = await getDocs(collection(db, 'users', userId, 'exam'));
        const examData: ExamType[] = examSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ExamType));
        setExam(examData);
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            await Promise.all([fetchStudy(), fetchExam()]);
        } catch (error) {
            Alert.alert("ข้อผิดพลาด", "ไม่สามารถดึงข้อมูลได้ในขณะนี้");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatTimeDisplay = (numTime: number) => {
        const timeStr = numTime.toFixed(2);
        const [hours, minutes] = timeStr.split('.');
        return `${hours.padStart(2, '0')}:${minutes}`;
    };

    const renderStudy = () => (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {study.length === 0 && <Text style={styles.emptyText}>ไม่มีตารางเรียน</Text>}
            {DAYS_OF_WEEK.map(day => {
                const classesForDay = study.filter(item => item.day === day).sort((a, b) => a.start - b.start);
                if (classesForDay.length === 0) return null;

                return (
                    <View key={`study-${day}`} style={styles.dayBlock}>
                        <Text style={styles.dayHeading}>{day}</Text>
                        {classesForDay.map((cls, index) => (
                            <Pressable
                                key={cls.id}
                                onPress={() => { setIsOpenModal({ ...isOpenModal, study: true }); setSelClass(cls); }}
                                style={({ pressed }) => [styles.timelineRow, pressed && styles.pressedState]}
                            >
                                <View style={styles.timeCol}>
                                    <Text style={styles.timeStart}>{formatTimeDisplay(cls.start)}</Text>
                                    <Text style={styles.timeEnd}>{formatTimeDisplay(cls.end)}</Text>
                                </View>

                                <View style={styles.timelineDivider}>
                                    <View style={styles.timelineDot} />
                                    {index !== classesForDay.length - 1 && <View style={styles.timelineLine} />}
                                </View>

                                <View style={[styles.contentCol, styles.studyContent]}>
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.subjectCode}>{cls.class_code}</Text>
                                        <View style={styles.secBadge}>
                                            <Text style={styles.secText}>Sec {cls.sec}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.subjectName}>{cls.class_name}</Text>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailText}>📍 {cls.room}</Text>
                                        <Text style={styles.detailText}>👤 {cls.professor_name}</Text>
                                    </View>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                );
            })}
        </ScrollView>
    );

    const renderExam = () => {
        const sortedExams = [...exam].sort((a, b) => a.date.localeCompare(b.date));
        return (
            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                {sortedExams.length === 0 ? (
                    <Text style={styles.emptyText}>ไม่มีตารางสอบ</Text>
                ) : (
                    sortedExams.map((ex, index) => {
                        const relatedClass = study.find(s => s.id === ex.class_id);
                        const isMidterm = ex.type.toLowerCase() === 'mid';

                        return (
                            <Pressable
                                key={ex.id}
                                onPress={() => { setIsOpenModal({ study: false, exam: true }); setSelExam(ex); }}
                                style={({ pressed }) => [styles.timelineRow, pressed && styles.pressedState]}
                            >
                                <View style={{
                                    width: 80,
                                    alignItems: 'flex-end',
                                    paddingTop: 2
                                }}>
                                    <Text style={styles.examDate}>{ex.date}</Text>
                                    <Text style={styles.timeStart}>{formatTimeDisplay(ex.start)}</Text>
                                    <Text style={styles.timeEnd}>{formatTimeDisplay(ex.end)}</Text>
                                </View>

                                <View style={styles.timelineDivider}>
                                    <View style={[styles.timelineDot, isMidterm ? styles.midDot : styles.finalDot]} />
                                    {index !== sortedExams.length - 1 && <View style={styles.timelineLine} />}
                                </View>

                                <View style={[styles.contentCol, isMidterm ? styles.midContent : styles.finalContent]}>
                                    <View style={styles.examHeader}>
                                        <Text style={styles.subjectCode}>{relatedClass?.class_code || '-'}</Text>
                                        <View style={[styles.examBadge, isMidterm ? styles.midBadge : styles.finalBadge]}>
                                            <Text style={[styles.examType, isMidterm ? styles.midText : styles.finalText]}>
                                                {ex.type.toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.subjectName}>{relatedClass?.class_name || 'ไม่ระบุชื่อวิชา'}</Text>
                                </View>
                            </Pressable>
                        )
                    })
                )}
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>ตารางของฉัน</Text>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => setIsOpenModal({ study: selectMode === 'study', exam: selectMode === 'exam' })}
                >
                    <Text style={styles.addBtnText}>+ เพิ่มข้อมูล</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.topNav}>
                <View style={styles.switcher}>
                    <TouchableOpacity
                        style={[styles.switchBtn, selectMode === 'study' && styles.switchBtnActive]}
                        onPress={() => setSelectMode('study')}
                    >
                        <Text style={[styles.switchText, selectMode === 'study' && styles.switchTextActive]}>ตารางเรียน</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.switchBtn, selectMode === 'exam' && styles.switchBtnActive]}
                        onPress={() => setSelectMode('exam')}
                    >
                        <Text style={[styles.switchText, selectMode === 'exam' && styles.switchTextActive]}>ตารางสอบ</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={styles.centerBox}><ActivityIndicator size="large" color={THEME.PRIMARY} /></View>
            ) : (
                selectMode === 'study' ? renderStudy() : renderExam()
            )}

            <StudyClassModal
                visible={isOpenModal.study}
                onClose={() => { setIsOpenModal({ study: false, exam: false }); setSelClass(null); }}
                selectedClass={selectedClass}
                allClass={study}
                onSuccess={() => {
                    setIsOpenModal({ study: false, exam: false });
                    setSelClass(null);
                    fetchStudy();
                    fetchExam();
                }}
            />
            <ExamModal
                visible={isOpenModal.exam}
                onClose={() => { setIsOpenModal({ study: false, exam: false }); setSelExam(null); }}
                selectedExam={selectedExam}
                allClass={study}
                allExam={exam}
                onSuccess={() => {
                    setIsOpenModal({ study: false, exam: false });
                    setSelExam(null);
                    fetchExam();
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFC'
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 8,
        backgroundColor: '#FAFAFC',
    },
    headerTitle: {
        fontSize: 28,
        fontFamily: 'BOLD',
        color: '#1A1A1A',
        letterSpacing: -0.5,
    },
    topNav: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#FAFAFC',
        borderBottomWidth: 1,
        borderColor: '#EFEFEF',
    },
    switcher: {
        flexDirection: 'row',
        backgroundColor: '#EEEEF0',
        borderRadius: 12,
        padding: 4,
    },
    switchBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10
    },
    switchBtnActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2
    },
    switchText: {
        fontSize: 15,
        color: '#737373',
        fontFamily: 'REGULAR',
    },
    switchTextActive: {
        color: '#1A1A1A',
        fontFamily: 'BOLD',
    },
    addBtn: {
        backgroundColor: THEME.PRIMARY,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 20,
        shadowColor: THEME.PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    addBtnText: {
        color: '#FFFFFF',
        fontFamily: 'BOLD',
        fontSize: 14
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 80
    },
    emptyText: {
        textAlign: 'center',
        color: '#A0A0A0',
        marginTop: 60,
        fontSize: 16,
        fontFamily: 'REGULAR',
    },
    dayBlock: {
        marginBottom: 36,
        borderBottomWidth: 0.5,
        borderBottomColor: THEME.SECONDARY
    },
    dayHeading: {
        fontSize: 20,
        fontFamily: 'BOLD',
        color: '#1A1A1A',
        marginBottom: 16,
        letterSpacing: -0.5
    },
    timelineRow: {
        flexDirection: 'row',
        marginBottom: 20
    },
    pressedState: {
        opacity: 0.7,
        transform: [{ scale: 0.98 }]
    },
    timeCol: {
        width: 50,
        alignItems: 'flex-end',
        paddingTop: 2
    },
    timeStart: {
        fontSize: 14,
        fontFamily: 'BOLD',
        color: '#1A1A1A'
    },
    timeEnd: {
        fontSize: 12,
        color: '#8E8E93',
        marginTop: 4,
        fontFamily: 'REGULAR',
    },
    examDate: {
        fontSize: 12,
        fontFamily: 'BOLD',
        color: THEME.PRIMARY,
        marginBottom: 6
    },
    timelineDivider: {
        width: 24,
        alignItems: 'center',
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: THEME.PRIMARY,
        marginTop: 4,
        borderWidth: 3,
        borderColor: '#E8E8FF',
    },
    midDot: { backgroundColor: '#FF922B', borderColor: '#FFF0E0' },
    finalDot: { backgroundColor: '#FA5252', borderColor: '#FFE5E5' },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: '#EEEEF0',
        marginTop: 4,
        marginBottom: -24,
    },
    contentCol: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    studyContent: {
        borderLeftWidth: 4,
        borderLeftColor: THEME.PRIMARY,
    },
    midContent: {
        borderLeftWidth: 4,
        borderLeftColor: '#FF922B',
        backgroundColor: '#FFFDF9',
    },
    finalContent: {
        borderLeftWidth: 4,
        borderLeftColor: '#FA5252',
        backgroundColor: '#FFF9F9',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    secBadge: {
        backgroundColor: '#F2F2F7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    secText: {
        fontSize: 12,
        fontFamily: 'BOLD',
        color: '#666666',
    },
    examHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    examBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    midBadge: { backgroundColor: '#FFF0E0' },
    finalBadge: { backgroundColor: '#FFE5E5' },
    subjectCode: {
        fontSize: 14,
        fontFamily: 'BOLD',
        color: '#4A4A4A',
    },
    subjectName: {
        fontSize: 15,
        fontFamily: 'BOLD',
        color: '#1A1A1A',
        lineHeight: 22,
        marginBottom: 10
    },
    detailRow: {
        flexDirection: 'column',
        gap: 4,
    },
    detailText: {
        fontSize: 13,
        color: '#666666',
        fontFamily: 'REGULAR',
    },
    examType: {
        fontSize: 12,
        fontFamily: 'BOLD',
    },
    midText: { color: '#E8590C' },
    finalText: { color: '#C92A2A' },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    }
});