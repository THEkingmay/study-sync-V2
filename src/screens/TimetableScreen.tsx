import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, Pressable } from "react-native";
import THEME from "../../theme";
import { db, auth } from "../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { SafeAreaView } from "react-native-safe-area-context";
import StudyClassModal from "../components/StudyClassModal";

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
    class_code: string;
    class_name: string;
    day: string;
    start: number;
    end: number;
    userId: string;
};

const DAYS_OF_WEEK = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

export default function TimetableScreen() {
    const [selectMode, setSelectMode] = useState<'study' | 'exam'>('study');

    const [study, setStudy] = useState<StudyType[]>([]);
    const [selectedClass, setSelClass] = useState<StudyType | null>(null)

    const [exam, setExam] = useState<ExamType[]>([]);

    const [loading, setLoading] = useState<boolean>(true);
    const [isOpenModal, setIsOpenModal] = useState<{ study: boolean, exam: boolean }>({ study: false, exam: false })

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
    }

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

    }
    const fetchData = async () => {

        try {
            setLoading(true);
            await Promise.all([fetchStudy(), fetchExam()]);

        } catch (error) {
            console.error("Error fetching timetable:", error);
            Alert.alert("ข้อผิดพลาด", "ไม่สามารถดึงข้อมูลได้ในขณะนี้");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const renderStudy = () => {
        const formatTimeDisplay = (numTime: number) => {
            const timeStr = numTime.toFixed(2);
            const [hours, minutes] = timeStr.split('.');
            const paddedHours = hours.padStart(2, '0');
            return `${paddedHours}:${minutes}`;
        };
        return (
            <ScrollView contentContainerStyle={styles.listContent}>
                {study.length === 0 && <Text style={styles.emptyText}>ยังไม่มีข้อมูลตารางเรียน</Text>}
                {DAYS_OF_WEEK.map(day => {
                    const classesForDay = study.filter(item => item.day === day);

                    if (classesForDay.length === 0) return null;

                    classesForDay.sort((a, b) => a.start - b.start);

                    return (
                        <View key={`study-${day}`} style={styles.dayGroup}>
                            <Text style={styles.dayTitle}>{day}</Text>
                            {classesForDay.map(cls => (
                                <Pressable
                                    onPress={() => { setIsOpenModal({ ...isOpenModal, study: true }); setSelClass(cls) }}
                                    key={cls.id}
                                    style={styles.card}
                                >
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.classCode}>{cls.class_code} | {cls.sec}</Text>
                                        <Text style={styles.timeText}>
                                            {formatTimeDisplay(cls.start)} - {formatTimeDisplay(cls.end)} น.
                                        </Text>
                                    </View>
                                    <Text style={styles.className}>{cls.class_name}</Text>
                                    <Text style={styles.subText}>ห้อง: {cls.room} | อ.: {cls.professor_name}</Text>
                                </Pressable>
                            ))}
                        </View>
                    );
                })}
            </ScrollView>
        );
    };

    const renderExam = () => {
        return (
            <ScrollView contentContainerStyle={styles.listContent}>
                {exam.length === 0 ? (
                    <Text style={styles.emptyText}>ยังไม่มีข้อมูลตารางสอบ</Text>
                ) : (
                    exam.map(ex => (
                        <View key={ex.id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.classCode}>{ex.class_code}</Text>
                                <Text style={styles.timeText}>วัน{ex.day} {ex.start} - {ex.end}</Text>
                            </View>
                            <Text style={styles.className}>{ex.class_name}</Text>
                        </View>
                    ))
                )}
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, selectMode === 'study' && styles.activeTab]}
                    onPress={() => setSelectMode('study')}
                >
                    <Text style={[styles.tabText, selectMode === 'study' && styles.activeTabText]}>
                        ตารางเรียน
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabButton, selectMode === 'exam' && styles.activeTab]}
                    onPress={() => setSelectMode('exam')}
                >
                    <Text style={[styles.tabText, selectMode === 'exam' && styles.activeTabText]}>
                        ตารางสอบ
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Add Button */}
            <View style={styles.actionContainer}>
                {selectMode === 'study' ? (
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => setIsOpenModal({ ...isOpenModal, study: true })}
                    >
                        <Text style={styles.addButtonText}>+ เพิ่มตารางเรียน</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => setIsOpenModal({ ...isOpenModal, exam: true })}
                    >
                        <Text style={styles.addButtonText}>+ เพิ่มตารางสอบ</Text>
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={THEME.PRIMARY} />
                </View>
            ) : (
                selectMode === 'study' ? renderStudy() : renderExam()
            )}
            <StudyClassModal
                visible={isOpenModal.study}
                onClose={() => { setIsOpenModal({ study: false, exam: false }); setSelClass(null) }}
                selectedClass={selectedClass}
                allClass={study}
                onSuccess={() => {
                    setIsOpenModal({ study: false, exam: false });
                    setSelClass(null);
                    fetchStudy()
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    actionContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,

    },
    addButton: {
        backgroundColor: THEME.CARD_BG, // ใช้สีรองเพื่อให้ไม่แย่งความสนใจจากปุ่ม Tab
        paddingVertical: 12,
        borderRadius: 50,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: THEME.PRIMARY,
        borderStyle: 'dashed', // เส้นประช่วยสื่อถึงการ "เพิ่ม" ข้อมูลใหม่
    },
    addButtonText: {
        fontFamily: 'BOLD',
        color: THEME.PRIMARY,
        fontSize: 16,
    },
    container: {
        flex: 1,
        backgroundColor: THEME.BACKGROUND,
    },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        margin: 16,
        backgroundColor: THEME.CARD_BG,
        borderRadius: 8,
        overflow: 'hidden',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    activeTab: {
        backgroundColor: THEME.PRIMARY,
    },
    tabText: {
        fontFamily: 'REGULAR',
        color: THEME.TEXT_SUB,
        fontSize: 16,
    },
    activeTabText: {
        fontFamily: 'BOLD',
        color: THEME.BACKGROUND,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    dayGroup: {
        marginBottom: 20,
    },
    dayTitle: {
        fontFamily: 'BOLD',
        fontSize: 18,
        color: THEME.PRIMARY,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: THEME.SECONDARY,
        paddingBottom: 4,
    },
    card: {
        backgroundColor: THEME.BACKGROUND,
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: THEME.CARD_BG,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    classCode: {
        fontFamily: 'BOLD',
        fontSize: 16,
        color: THEME.TEXT_MAIN,
    },
    timeText: {
        fontFamily: 'BOLD',
        fontSize: 14,
        color: THEME.PRIMARY,
    },
    className: {
        fontFamily: 'REGULAR',
        fontSize: 15,
        color: THEME.TEXT_MAIN,
        marginBottom: 4,
    },
    subText: {
        fontFamily: 'REGULAR',
        fontSize: 13,
        color: THEME.TEXT_SUB,
    },
    emptyText: {
        fontFamily: 'REGULAR',
        textAlign: 'center',
        color: THEME.TEXT_SUB,
        marginTop: 40,
    }
});