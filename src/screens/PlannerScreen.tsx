import React, { useCallback, useEffect, useState } from "react"
import { SafeAreaView } from "react-native-safe-area-context"
import { TouchableOpacity, View, Text, Alert, ActivityIndicator, FlatList, StyleSheet } from "react-native"

import THEME from "../../theme"
import StudyPlanModal from "../components/planner/StudyPlanModal"
import EventModal from "../components/planner/EvantModal"
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore"
import { auth, db } from "../../firebaseConfig"
import { useFocusEffect } from "@react-navigation/native"

export type EvenType = {
    id: string,
    title: string,
    date: string,
    start: number,
    end: number,
    description: string,
    status: 'not_done' | 'done',
    userId: string
}

export type StudyPlanType = {
    id: string,
    title: string,
    description: string,
    date: string,
    start: number,
    end: number,
    status: 'not_started' | "done"
    userId: string
}

export default function PlannerScreen() {
    const [loading, setLoading] = useState(true)
    const [selectMode, setSelectMode] = useState<'event' | 'study_plan'>('event')
    const [openModal, setOpenModal] = useState(false)

    const [event, setEvent] = useState<EvenType[]>([])
    const [selectedEvent, setSelectedEvent] = useState<EvenType | null>(null)

    const [studyPlan, setStudyPlan] = useState<StudyPlanType[]>([])
    const [selectedStudyPlan, setSelectedStudyPlan] = useState<StudyPlanType | null>(null)

    const fetchEvent = async () => {
        try {
            const eventSnap = await getDocs(collection(db, 'users', auth.currentUser?.uid as string, 'events'))
            const eventList = eventSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as EvenType))

            const sortedEvents = eventList.sort((a, b) => {
                const [dayA, monthA, yearA] = a.date.split('/').map(Number)
                const [dayB, monthB, yearB] = b.date.split('/').map(Number)
                const dateA = new Date(yearA, monthA - 1, dayA)
                const dateB = new Date(yearB, monthB - 1, dayB)
                // ถ้าวันเดียวกันให้เรียงตามเวลาเริ่มต้น
                if (dateA.getTime() === dateB.getTime()) {
                    return a.start - b.start
                }
                return dateA.getTime() - dateB.getTime()
            })

            setEvent(sortedEvents)

        } catch (error) {
            Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดกิจกรรมได้ กรุณาลองใหม่อีกครั้ง')
        }
    }

    const fetchStudyPlan = async () => {
        try {
            const planSnap = await getDocs(collection(db, 'users', auth.currentUser?.uid as string, 'study_plans'))
            const planList = planSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as StudyPlanType))

            const sortedPlans = planList.sort((a, b) => {
                const [dayA, monthA, yearA] = a.date.split('/').map(Number)
                const [dayB, monthB, yearB] = b.date.split('/').map(Number)
                const dateA = new Date(yearA, monthA - 1, dayA)
                const dateB = new Date(yearB, monthB - 1, dayB)
                // ถ้าวันเดียวกันให้เรียงตามเวลาเริ่มต้น
                if (dateA.getTime() === dateB.getTime()) {
                    return a.start - b.start
                }
                return dateA.getTime() - dateB.getTime()
            })

            setStudyPlan(sortedPlans)
        } catch (error) {
            Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดแผนการเรียนได้ กรุณาลองใหม่อีกครั้ง')
        }
    }

    useFocusEffect(
        useCallback(() => {
            const loadData = async () => {
                try {
                    setLoading(true)
                    await Promise.all([fetchEvent(), fetchStudyPlan()])
                } catch (error) {
                    Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง')
                } finally {
                    setLoading(false)
                }
            }
            loadData()
        }, [])
    )

    const toggleEventStatus = async (id: string) => {
        const newStatus = event.find(e => e.id === id)?.status === 'done' ? 'not_done' : 'done'
        setEvent(prev => prev.map(e => {
            if (e.id === id) {
                return { ...e, status: newStatus }
            }
            return e
        }))
        try {
            const eventRef = doc(db, 'users', auth.currentUser?.uid as string, 'events', id)
            setDoc(eventRef, { status: newStatus }, { merge: true })
        } catch (error) {
            Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่อีกครั้ง')
        }
    }

    const handleDeleteEvent = (id: string) => {
        Alert.alert(
            'ยืนยันการลบ',
            'คุณแน่ใจว่าต้องการลบกิจกรรมนี้หรือไม่?',
            [
                { text: 'ยกเลิก', style: 'cancel' },
                {
                    text: 'ลบ',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'users', auth.currentUser?.uid as string, 'events', id))
                            setEvent(prev => prev.filter(e => e.id !== id))
                        } catch (error) {
                            Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลบกิจกรรมได้ กรุณาลองใหม่อีกครั้ง')
                        }
                    }
                }
            ]
        )
    }

    const toggleStudyPlanStatus = async (id: string) => {
        const newStatus = studyPlan.find(p => p.id === id)?.status === 'done' ? 'not_started' : 'done'
        setStudyPlan(prev => prev.map(p => {
            if (p.id === id) {
                return { ...p, status: newStatus }
            }
            return p
        }))
        try {
            const planRef = doc(db, 'users', auth.currentUser?.uid as string, 'study_plans', id)
            await setDoc(planRef, { status: newStatus }, { merge: true })
        } catch (error) {
            Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถอัปเดตสถานะแผนการเรียนได้ กรุณาลองใหม่อีกครั้ง')
        }
    }

    const handleDeleteStudyPlan = (id: string) => {
        Alert.alert(
            'ยืนยันการลบ',
            'คุณแน่ใจว่าต้องการลบแผนการเรียนนี้หรือไม่?',
            [
                { text: 'ยกเลิก', style: 'cancel' },
                {
                    text: 'ลบ',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'users', auth.currentUser?.uid as string, 'study_plans', id))
                            setStudyPlan(prev => prev.filter(p => p.id !== id))
                        } catch (error) {
                            Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลบแผนการเรียนได้ กรุณาลองใหม่อีกครั้ง')
                        }
                    }
                }
            ]
        )
    }

    const formattimeString = (time: number) => {
        const [hour, minute] = String(time).split('.')
        const hourString = hour.padStart(2, '0')
        const minuteString = minute ? minute.padEnd(2, '0').slice(0, 2) : '00';
        return `${hourString}:${minuteString}`
    }

    const renderEventItem = (item: EvenType) => {
        const isDone = item.status === 'done'
        return (
            <View style={styles.eventRow}>
                <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => toggleEventStatus(item.id)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.checkbox, isDone && styles.checkboxActive]}>
                        {isDone && <View style={styles.checkboxInner} />}
                    </View>
                </TouchableOpacity>

                <View style={styles.eventContent}>
                    <Text style={[styles.eventTitle, isDone && styles.textMuted]}>
                        {item.title}
                    </Text>
                    {item.description ? (
                        <Text style={[styles.descriptionText, isDone && styles.textMuted]}>
                            {item.description}
                        </Text>
                    ) : null}
                    <Text style={[styles.eventTime, isDone && styles.textMuted]}>
                        {item.date} • {formattimeString(item.start)} - {formattimeString(item.end)}
                    </Text>
                </View>

                <View style={styles.eventActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => {
                        setSelectedEvent(item)
                        setOpenModal(true)
                    }}>
                        <Text style={styles.actionTextEdit}>แก้ไข</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleDeleteEvent(item.id)}
                        style={styles.actionBtn}>
                        <Text style={styles.actionTextDelete}>ลบ</Text>
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    const renderStudyPlanItem = (item: StudyPlanType) => {
        const isDone = item.status === 'done'
        return (
            <View style={styles.eventRow}>
                <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => toggleStudyPlanStatus(item.id)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.checkbox, isDone && styles.checkboxActive]}>
                        {isDone && <View style={styles.checkboxInner} />}
                    </View>
                </TouchableOpacity>

                <View style={styles.eventContent}>
                    <Text style={[styles.eventTitle, isDone && styles.textMuted]}>
                        {item.title}
                    </Text>
                    {item.description ? (
                        <Text style={[styles.descriptionText, isDone && styles.textMuted]}>
                            {item.description}
                        </Text>
                    ) : null}
                    <Text style={[styles.eventTime, isDone && styles.textMuted]}>
                        {item.date} • {formattimeString(item.start)} - {formattimeString(item.end)}
                    </Text>
                </View>

                <View style={styles.eventActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => {
                        setSelectedStudyPlan(item)
                        setOpenModal(true)
                    }}>
                        <Text style={styles.actionTextEdit}>แก้ไข</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleDeleteStudyPlan(item.id)}
                        style={styles.actionBtn}>
                        <Text style={styles.actionTextDelete}>ลบ</Text>
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>จัดการกิจกรรม</Text>
                <TouchableOpacity
                    style={styles.addBtn}
                    activeOpacity={0.8}
                    onPress={() => setOpenModal(true)}
                >
                    <Text style={styles.addBtnText}>+ เพิ่มข้อมูล</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.topNav}>
                <View style={styles.switcher}>
                    <TouchableOpacity
                        style={[styles.switchBtn, selectMode === 'event' && styles.switchBtnActive]}
                        activeOpacity={0.9}
                        onPress={() => setSelectMode('event')}
                    >
                        <Text style={[styles.switchText, selectMode === 'event' && styles.switchTextActive]}>กิจกรรม</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        activeOpacity={0.9}
                        style={[styles.switchBtn, selectMode === 'study_plan' && styles.switchBtnActive]}
                        onPress={() => setSelectMode('study_plan')}
                    >
                        <Text style={[styles.switchText, selectMode === 'study_plan' && styles.switchTextActive]}>แผนการเรียน</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color={THEME.PRIMARY} />
                </View>
            ) : (
                <FlatList
                    data={selectMode === 'study_plan' ? studyPlan : event as any}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) =>
                        selectMode === 'study_plan'
                            ? renderStudyPlanItem(item as StudyPlanType)
                            : renderEventItem(item as EvenType)
                    }
                    ListEmptyComponent={<Text style={styles.emptyText}>ไม่มีข้อมูล</Text>}
                />
            )}

            <EventModal
                visible={openModal && selectMode === 'event'}
                onClose={() => { setOpenModal(false); setSelectedEvent(null) }}
                selectedEvent={selectedEvent}
                onSuccess={() => {
                    fetchEvent()
                    setSelectedEvent(null)
                }}
                allEvents={event}
            />
            <StudyPlanModal
                visible={openModal && selectMode === 'study_plan'}
                onClose={() => { setOpenModal(false); setSelectedStudyPlan(null) }}
                selectStudyPlan={selectedStudyPlan}
                allPlan={studyPlan}
                onSuccess={() => {
                    fetchStudyPlan()
                    setSelectedStudyPlan(null)
                }}
            />
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.BACKGROUND,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontFamily: 'BOLD',
        fontSize: 24,
        color: THEME.TEXT_MAIN,
    },
    addBtn: {
        backgroundColor: THEME.PRIMARY,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: THEME.PRIMARY,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    addBtnText: {
        fontFamily: 'BOLD',
        color: '#FFFFFF',
        fontSize: 14,
    },
    topNav: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    switcher: {
        flexDirection: 'row',
        backgroundColor: THEME.CARD_BG,
        borderRadius: 25,
        padding: 4,
    },
    switchBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 21,
    },
    switchBtnActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    switchText: {
        fontFamily: 'REGULAR',
        fontSize: 14,
        color: THEME.TEXT_SUB,
    },
    switchTextActive: {
        fontFamily: 'BOLD',
        color: THEME.PRIMARY,
    },
    centerBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    eventRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    checkboxContainer: {
        marginRight: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxActive: {
        borderColor: THEME.PRIMARY,
    },
    checkboxInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: THEME.PRIMARY,
    },
    eventContent: {
        flex: 1,
        justifyContent: 'center',
    },
    eventTitle: {
        fontFamily: 'BOLD',
        fontSize: 16,
        color: THEME.TEXT_MAIN,
        marginBottom: 4,
    },
    descriptionText: {
        fontFamily: 'REGULAR',
        fontSize: 14,
        color: THEME.TEXT_SUB,
        marginBottom: 4,
    },
    eventTime: {
        fontFamily: 'REGULAR',
        fontSize: 13,
        color: THEME.TEXT_SUB,
    },
    textMuted: {
        color: '#9CA3AF',
        textDecorationLine: 'line-through',
    },
    eventActions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    actionBtn: {
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    actionTextEdit: {
        fontFamily: 'BOLD',
        fontSize: 13,
        color: '#3B82F6',
    },
    actionTextDelete: {
        fontFamily: 'BOLD',
        fontSize: 13,
        color: THEME.ERROR,
    },
    emptyText: {
        fontFamily: 'REGULAR',
        fontSize: 16,
        color: THEME.TEXT_SUB,
        textAlign: 'center',
        marginTop: 40,
    },
})