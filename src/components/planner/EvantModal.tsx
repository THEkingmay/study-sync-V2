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
    Keyboard
} from "react-native"
import DateTimePicker from '@react-native-community/datetimepicker'
import THEME from "../../../theme"
import type { EvenType } from "../../screens/PlannerScreen"

interface EventModalProps {
    visible: boolean
    onClose: () => void
    selectedEvent?: EvenType | null
    onSuccess : ()=>void
}

export default function EventModal({ visible, onClose, selectedEvent, onSuccess }: EventModalProps) {
    const isEditing = !!selectedEvent
    const [isSaving, setIsSaving] = useState(false)
    const [showDatePicker, setShowDatePicker] = useState(false)

    const [formData, setFormData] = useState<Partial<EvenType>>({
        title: '',
        date: '',
        start: 0,
        end: 0,
        description: '',
    })

    useEffect(() => {
        if (visible) {
            setFormData({
                title: selectedEvent?.title || '',
                date: selectedEvent?.date || new Date().toLocaleDateString('th-TH'),
                start: selectedEvent?.start || 8,
                end: selectedEvent?.end || 9,
                description: selectedEvent?.description || '',
            })
        }
    }, [visible, selectedEvent])

    const handleChange = (field: keyof EvenType, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false)
        if (selectedDate) {
            handleChange('date', selectedDate.toLocaleDateString('th-TH'))
        }
    }

    const handleSave = async () => {
        if (!formData.title || !formData.date) return

        setIsSaving(true)
        await new Promise(resolve => setTimeout(resolve, 1000))
        setIsSaving(false)
        onSuccess()
        onClose()
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
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={{ color: formData.date ? THEME.TEXT_MAIN : THEME.TEXT_SUB, fontFamily: 'REGULAR' }}>
                                        {formData.date || 'เลือกวันที่'}
                                    </Text>
                                </TouchableOpacity>

                                {showDatePicker && (
                                    <DateTimePicker
                                        value={new Date()}
                                        mode="date"
                                        display="default"
                                        onChange={handleDateChange}
                                    />
                                )}

                                <View style={styles.row}>
                                    <View style={styles.flex1}>
                                        <Text style={styles.label}>เวลาเริ่ม (น.)</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={formData.start?.toString()}
                                            onChangeText={(text) => handleChange('start', parseInt(text) || 0)}
                                            keyboardType="numeric"
                                            maxLength={2}
                                        />
                                    </View>
                                    <View style={{ width: 16 }} />
                                    <View style={styles.flex1}>
                                        <Text style={styles.label}>เวลาสิ้นสุด (น.)</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={formData.end?.toString()}
                                            onChangeText={(text) => handleChange('end', parseInt(text) || 0)}
                                            keyboardType="numeric"
                                            maxLength={2}
                                        />
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