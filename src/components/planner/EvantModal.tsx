import React, { useState, useEffect } from "react"
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    Alert
} from "react-native"
import DateTimePicker from '@react-native-community/datetimepicker'
import THEME from "../../../theme"
import type { EvenType } from "../../screens/PlannerScreen"
import { addDoc, collection, doc, setDoc } from "firebase/firestore"
import { auth, db } from "../../../firebaseConfig"

interface EventModalProps {
    visible: boolean
    onClose: () => void
    selectedEvent?: EvenType | null
    onSuccess: () => void,
    allEvents: EvenType[]
}

export default function EventModal({ visible, onClose, selectedEvent, onSuccess, allEvents }: EventModalProps) {
    const isEditing = !!selectedEvent
    const [isSaving, setIsSaving] = useState(false)
    const [showPicker, setShowPicker] = useState<'date' | 'start' | 'end' | null>(null)

    const [formData, setFormData] = useState<Partial<EvenType>>({
        title: '',
        date: '',
        start: 8.0,
        end: 9.0,
        description: '',
    })

    useEffect(() => {
        if (visible) {
            setFormData({
                title: selectedEvent?.title || '',
                date: selectedEvent?.date || new Date().toLocaleDateString('th-TH'),
                start: selectedEvent?.start || 8.0,
                end: selectedEvent?.end || 9.0,
                description: selectedEvent?.description || '',
            })
        }
    }, [visible, selectedEvent])

    const handleChange = (field: keyof EvenType, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleDateChange = (event: any, selectedDate?: Date) => {
        const currentPicker = showPicker;
        setShowPicker(null)

        if (event.type === 'set' && selectedDate) {
            if (currentPicker === 'date') {

                handleChange('date', selectedDate.toLocaleDateString('th-TH'))
            } else if (currentPicker === 'start') {
                const hours = selectedDate.getHours();
                const minutes = selectedDate.getMinutes();
                const numericTime = parseFloat(`${hours}.${minutes < 10 ? '0' + minutes : minutes}`);
                handleChange('start', numericTime);
            } else if (currentPicker === 'end') {
                const hours = selectedDate.getHours();
                const minutes = selectedDate.getMinutes();
                const numericTime = parseFloat(`${hours}.${minutes < 10 ? '0' + minutes : minutes}`);
                handleChange('end', numericTime)
            }
        }
    }

    const handleSave = async () => {
        if (!formData.start || !formData.end) {
            Alert.alert('ข้อผิดพลาด', 'กรุณาเลือกเวลาเริ่มต้นและเวลาสิ้นสุด')
            return
        }
        if (formData.start !== undefined && formData.end !== undefined && formData.start >= formData.end) {
            Alert.alert('ข้อผิดพลาด', 'เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด')
            return
        }
        if (!formData.title || formData.title.trim() === '') {
            Alert.alert('ข้อผิดพลาด', 'กรุณากรอกหัวข้อกิจกรรม')
            return
        }
        // เชคว่าเพิ่ม อีเว้น ชนกันมั้ย
        const isOverlap = isEditing ?
            allEvents.find(e => {
                return e.date === formData.date && e.start < (formData.end ?? 9.0) && e.end > (formData.start ?? 8.0) && e.id !== selectedEvent?.id
            })
            : allEvents.find(e => {
                return e.date === formData.date && e.start < (formData.end ?? 9.0) && e.end > (formData.start ?? 8.0)
            })

        if (isOverlap) {
            Alert.alert('ข้อผิดพลาด', 'กิจกรรมนี้มีเวลาซ้อนกับกิจกรรมอื่น')
            return
        }

        try {
            setIsSaving(true)

            if (isEditing && selectedEvent) {
                await setDoc(doc(db, 'users', auth.currentUser?.uid as string, 'events', selectedEvent.id), {
                    ...formData,
                    status: selectedEvent.status,
                    userId: auth.currentUser?.uid as string
                } as EvenType)
            } else {
                await addDoc(collection(db, 'users', auth.currentUser?.uid as string, 'events'), {
                    ...formData,
                    status: 'not_done',
                    userId: auth.currentUser?.uid as string
                } as EvenType)
            }

            onSuccess()
            onClose()
        } catch (error) {
            Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกกิจกรรมได้ กรุณาลองใหม่อีกครั้ง')
            setIsSaving(false)
        } finally {
            setIsSaving(false)
        }
    }

    const formattimeString = (time: number) => {
        const [hour, minute] = String(time).split('.')
        const hours = parseInt(hour)
        const minutes = parseInt(minute || '0')
        return `${hours}:${minutes < 10 ? '0' + minutes : minutes}`;
    }

    return (
        <Modal
            visible={visible}
            onRequestClose={onClose}
            animationType="fade"
            transparent={true}
            statusBarTranslucent={true}
            navigationBarTranslucent={true}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.overlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.keyboardView}
                    >
                        <View style={styles.modalContainer}>
                            <View style={styles.header}>
                                <Text style={styles.headerTitle}>
                                    {isEditing ? 'แก้ไขกิจกรรม' : 'เพิ่มกิจกรรมใหม่'}
                                </Text>
                            </View>

                            <View style={styles.formContent}>
                                <Text style={styles.label}>หัวข้อกิจกรรม</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.title}
                                    onChangeText={(text) => handleChange('title', text)}
                                    placeholder="เช่น อ่านหนังสือสอบ"
                                    placeholderTextColor={THEME.TEXT_SUB}
                                />

                                <Text style={styles.label}>วันที่</Text>
                                <TouchableOpacity
                                    style={styles.input}
                                    activeOpacity={0.7}
                                    onPress={() => setShowPicker('date')}
                                >
                                    <Text style={{ color: formData.date ? THEME.TEXT_MAIN : THEME.TEXT_SUB, fontFamily: 'REGULAR' }}>
                                        {formData.date || 'เลือกวันที่'}
                                    </Text>
                                </TouchableOpacity>

                                <View style={styles.row}>
                                    <View style={styles.flex1}>
                                        <Text style={styles.label}>เวลาเริ่ม (น.)</Text>
                                        <TouchableOpacity
                                            style={styles.input}
                                            activeOpacity={0.7}
                                            onPress={() => setShowPicker('start')}
                                        >
                                            <Text style={{ color: THEME.TEXT_MAIN, fontFamily: 'REGULAR' }}>
                                                {formData.start !== undefined ? formattimeString(formData.start) : '-'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={{ width: 16 }} />
                                    <View style={styles.flex1}>
                                        <Text style={styles.label}>เวลาสิ้นสุด (น.)</Text>
                                        <TouchableOpacity
                                            style={styles.input}
                                            activeOpacity={0.7}
                                            onPress={() => setShowPicker('end')}
                                        >
                                            <Text style={{ color: THEME.TEXT_MAIN, fontFamily: 'REGULAR' }}>
                                                {formData.end !== undefined ? formattimeString(formData.end) : '-'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <Text style={styles.label}>รายละเอียด</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={formData.description}
                                    onChangeText={(text) => handleChange('description', text)}
                                    placeholder="เพิ่มรายละเอียดเพิ่มเติม..."
                                    placeholderTextColor={THEME.TEXT_SUB}
                                    multiline
                                    textAlignVertical="top"
                                />
                            </View>

                            <View style={styles.footer}>
                                <TouchableOpacity
                                    style={[styles.btn, styles.btnCancel]}
                                    onPress={onClose}
                                    disabled={isSaving}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.btnCancelText}>ยกเลิก</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.btn, styles.btnSave]}
                                    onPress={handleSave}
                                    disabled={isSaving}
                                    activeOpacity={0.8}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <Text style={styles.btnSaveText}>บันทึก</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>

            {showPicker && (
                <DateTimePicker
                    value={new Date()}
                    mode={showPicker === 'date' ? 'date' : 'time'}
                    is24Hour={true}
                    display="default"
                    onChange={handleDateChange}
                />
            )}
        </Modal>
    )
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyboardView: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalContainer: {
        width: '90%',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    header: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: 'BOLD',
        fontSize: 18,
        color: THEME.TEXT_MAIN,
    },
    formContent: {
        padding: 20,
    },
    label: {
        fontFamily: 'BOLD',
        fontSize: 14,
        color: THEME.TEXT_MAIN,
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        backgroundColor: THEME.CARD_BG,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontFamily: 'REGULAR',
        fontSize: 14,
        color: THEME.TEXT_MAIN,
    },
    textArea: {
        height: 100,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    flex1: {
        flex: 1,
    },
    footer: {
        flexDirection: 'row',
        padding: 20,
        paddingTop: 0,
        gap: 12,
    },
    btn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnCancel: {
        backgroundColor: '#F3F4F6',
    },
    btnSave: {
        backgroundColor: THEME.PRIMARY,
    },
    btnCancelText: {
        fontFamily: 'BOLD',
        fontSize: 14,
        color: THEME.TEXT_SUB,
    },
    btnSaveText: {
        fontFamily: 'BOLD',
        fontSize: 14,
        color: '#FFFFFF',
    }
})