import React, { useEffect, useState } from "react";
import {
    Modal, Platform, View, Text, TextInput,
    TouchableOpacity, StyleSheet, KeyboardAvoidingView,
    Alert,
    Pressable
} from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { ExamType, StudyType } from "../screens/TimetableScreen";
import THEME from "../../theme";
import { Picker } from "@react-native-picker/picker";
import { addDoc, collection, deleteDoc, doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";


interface ModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    selectedExam?: ExamType | null;
    allClass: StudyType[];
    allExam: ExamType[]
}

export default function ExamModal({ visible, onClose, onSuccess, selectedExam, allClass, allExam }: ModalProps) {

    const filterClass = Object.values(
        allClass.reduce((acc, item) => {
            acc[item.class_code] = item;
            return acc;
        }, {} as Record<string, typeof allClass[0]>)
    );

    const isEditing = !!selectedExam;

    const [formData, setFormData] = useState({
        class_id: '',
        date: '',
        start: 8,
        end: 9,
        type: 'mid' as "mid" | "final"
    });
    const [selectClassCode, setSelClassCode] = useState<string>('')

    const [showPicker, setShowPicker] = useState<'date' | 'start' | 'end' | null>(null);

    const [loading, setLoading] = useState<boolean>(false)
    const [isDeleting, setIsDeleting] = useState<boolean>(false)

    useEffect(() => {
        if (visible) {
            if (selectedExam) {
                if (!allClass.length || !selectedExam) return
                setSelClassCode(allClass.find(c => c.id === selectedExam.class_id)?.class_code ?? '')
                setFormData({
                    class_id: selectedExam.class_id,
                    date: selectedExam.date,
                    start: selectedExam.start,
                    end: selectedExam.end,
                    type: selectedExam.type
                });
            } else {
                setFormData({
                    class_id: '',
                    date: '',
                    start: 8,
                    end: 9,
                    type: 'mid'
                });
            }
        }
    }, [visible, selectedExam]);

    const handleChange = (field: keyof typeof formData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleTimeChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(null);
        }

        // Handle case where user cancels the picker
        if (!selectedDate) {
            setShowPicker(null);
            return;
        }

        if (showPicker === 'end' || showPicker === 'start') {
            const hours = selectedDate.getHours();
            const minutes = selectedDate.getMinutes();
            const numericTime = parseFloat(`${hours}.${minutes < 10 ? '0' + minutes : minutes}`);
            handleChange(showPicker, numericTime);
        } else if (showPicker === 'date') {
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
            const year = selectedDate.getFullYear();
            handleChange('date', `${day}/${month}/${year}`);
        }
    };

    const formatTimeDisplay = (numTime: number) => {
        const timeStr = numTime.toFixed(2);
        return timeStr.replace('.', ':');
    };

    const validateData = () => {
        if (!selectClassCode || !formData.date || !formData.type) {
            Alert.alert("แจ้งเตือน", 'กรุณากรอกข้อมูลให้ครบถ้วน')
            return false
        }
        if (formData.start >= formData.end) {
            Alert.alert("แจ้งเตือน", 'เวลาเริ่มต้องน้อยกว่าเวลาจบ')
            return false
        }
        return true
    }

    const handleSave = async () => {
        if (isEditing) return;
        if (!validateData()) return
        // เชคว่าซ้ำกันมั้ย 
        const examInDay = allExam.filter(ex => ex.date === formData.date)
        // check overlap
        if (examInDay) {
            const overlapExam = examInDay.find(ex => ex.start < formData.end && ex.end > formData.start)
            if (overlapExam) {
                Alert.alert("การแจ้งเตือน", "ห้ามเลือกเวลาสอบชนกัน")
                return
            }
        }
        // ห้ามเลือกวิชาซ้ำ
        const isSame = allExam.find(ex => allClass.find(c => c.id === ex.class_id)?.class_code === selectClassCode && ex.type === formData.type)
        if (isSame) {
            Alert.alert("แจ้งเตือน", "ห้ามเลือกวิชาและประเภทการสอบซ้ำ")
            return
        }

        // save
        try {
            setLoading(true)
            if (!auth.currentUser?.uid) return

            const payload = {
                ...formData,
                userId: auth.currentUser.uid,
                class_id: allClass.find(c => c.class_code === selectClassCode)?.id
            }

            await addDoc(collection(db, "users", auth.currentUser.uid, "exam"), payload)

            if (onSuccess) onSuccess()

        } catch (err) {
            Alert.alert("เกิดข้อผิดพลาด", (err as Error).message)
        } finally {
            setLoading(false)
        }
    };

    const handleUpdate = async () => {
        if (!isEditing) return;
        if (!validateData()) return
        // เชคว่าซ้ำกันมั้ย 
        const examInDay = allExam.filter(ex => ex.date === formData.date && ex.id !== selectedExam.id)
        // check overlap
        if (examInDay) {
            const overlapExam = examInDay.find(ex => ex.start < formData.end && ex.end > formData.start && ex.id !== selectedExam.id)
            if (overlapExam) {
                Alert.alert("การแจ้งเตือน", "ห้ามเลือกเวลาสอบวนกัน")
                return
            }
        }
        // ห้ามเลือกวิชาซ้ำ
        const isSame = allExam.find(ex => allClass.find(c => c.id === ex.class_id)?.class_code === selectClassCode && ex.type === formData.type && ex.id !== selectedExam.id)
        if (isSame) {
            Alert.alert("แจ้งเตือน", "ห้ามเลือกวิชาและประเภทการสอบซ้ำ")
            return
        }
        // save
        try {
            setLoading(true)
            if (!auth.currentUser?.uid) return
            const payload = {
                ...formData,
                userId: auth.currentUser.uid,
                class_id: allClass.find(c => c.class_code === selectClassCode)?.id
            }
            await setDoc(doc(db, "users", auth.currentUser.uid, "exam", selectedExam.id), payload)

            if (onSuccess) onSuccess()

        } catch (err) {
            Alert.alert("เกิดข้อผิดพลาด", (err as Error).message)
        } finally {
            setLoading(false)
        }
    };

    const handleDeleteExam = () => {
        if (!auth.currentUser?.uid) {
            Alert.alert("ข้อผิดพลาด", "ไม่พบบัญชีผู้ใช้");
            return;
        }

        Alert.alert(
            "ยืนยันการลบ",
            `คุณแน่ใจหรือไม่ว่าต้องการลบการสอบนี้ ?\nข้อมูลที่ลบแล้วไม่สามารถกู้คืนได้`,
            [
                {
                    text: "ยกเลิก",
                    style: "cancel"
                },
                {
                    text: "ลบการสอบ",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setIsDeleting(true);
                            if (!selectedExam) return
                            await deleteDoc(doc(db, 'users', auth.currentUser!.uid, 'exam', selectedExam.id));

                            if (onSuccess) onSuccess();
                            onClose();
                        } catch (err) {
                            Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถลบข้อมูลได้ในขณะนี้");
                            console.error("Delete Error: ", err);
                        } finally {
                            setIsDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent={true}
            navigationBarTranslucent={true}
        >
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                            <Text style={styles.title}>{isEditing ? 'แก้ไขตารางสอบ' : 'เพิ่มตารางสอบ'}</Text>
                        </View>
                        {selectedExam && (
                            <Pressable
                                disabled={isDeleting}
                                onPress={handleDeleteExam}
                                style={({ pressed }) => ({
                                    marginLeft: 10,
                                    borderColor: THEME.ERROR,
                                    borderWidth: 1,
                                    paddingVertical: 6,     
                                    paddingHorizontal: 12,  
                                    borderRadius: 20,
                                    alignItems: 'center',
                                    justifyContent: 'center', 
                                    opacity: pressed || isDeleting ? 0.5 : 1 
                                })}
                            >
                                <Text style={{
                                    color: THEME.ERROR,
                                    fontFamily: 'BOLD',
                                    fontSize: 16,
                                }}>
                                    {isDeleting ? 'กำลังลบ...' : 'ลบการสอบนี้'}
                                </Text>
                            </Pressable>
                        )}
                    </View>

                    <Text style={styles.sectionLabel}>วิชาสอบ</Text>
                    <Picker
                        style={styles.input}
                        selectedValue={selectClassCode}
                        onValueChange={(itemValue) => {
                            setSelClassCode(itemValue)
                        }}
                    >
                        <Picker.Item label="-- กรุณาเลือก --" value="" />
                        {
                            filterClass.map((cls) =>
                                <Picker.Item label={cls.class_name} value={cls.class_code} />
                            )
                        }
                    </Picker>


                    {/* Type Selector */}

                    <View style={styles.typeContainer}>
                        <TouchableOpacity
                            style={[styles.typeButton, formData.type === 'mid' && styles.typeActive]}
                            onPress={() => handleChange('type', 'mid')}
                        >
                            <Text style={[styles.typeText, formData.type === 'mid' && styles.typeTextActive]}>มิดเทอม</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.typeButton, formData.type === 'final' && styles.typeActive]}
                            onPress={() => handleChange('type', 'final')}
                        >
                            <Text style={[styles.typeText, formData.type === 'final' && styles.typeTextActive]}>ไฟนอล</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionLabel}>วันที่และเวลาสอบ</Text>
                    {/* Date Button */}
                    <TouchableOpacity style={styles.pickerButton} onPress={() => setShowPicker('date')}>
                        <Text style={styles.pickerLabel}>วันที่สอบ</Text>
                        <Text style={styles.pickerValue}>{formData.date || 'เลือกวัน'}</Text>
                    </TouchableOpacity>

                    {/* Time Buttons */}
                    <View style={styles.timeContainer}>
                        <TouchableOpacity
                            style={styles.timeButton}
                            onPress={() => setShowPicker('start')}
                        >
                            <Text style={styles.timeLabel}>เวลาเริ่ม</Text>
                            <Text style={styles.timeValue}>{formatTimeDisplay(formData.start)}</Text>
                        </TouchableOpacity>

                        <Text style={styles.timeToText}>ถึง</Text>

                        <TouchableOpacity
                            style={styles.timeButton}
                            onPress={() => setShowPicker('end')}
                        >
                            <Text style={styles.timeLabel}>เวลาสิ้นสุด</Text>
                            <Text style={styles.timeValue}>{formatTimeDisplay(formData.end)}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose} disabled={loading}>
                            <Text style={styles.cancelText}>ยกเลิก</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.saveButton]}
                            onPress={isEditing ? handleUpdate : handleSave}
                            disabled={loading}
                        >
                            <Text style={styles.saveText}>{loading ? "กำลังบันทึก..." : 'บันทึก'}</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </KeyboardAvoidingView>

            {/* DateTimePicker Overlay */}
            {showPicker && (
                <DateTimePicker
                    value={new Date()}
                    mode={showPicker === 'date' ? 'date' : 'time'}
                    is24Hour={true}
                    display="default"
                    onChange={handleTimeChange}
                />
            )}
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalContainer: {
        width: '100%',
        maxHeight: '90%',
        backgroundColor: THEME.BACKGROUND,
        borderRadius: 12,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    title: {
        fontFamily: 'BOLD',
        fontSize: 20,
        color: THEME.PRIMARY,
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        fontFamily: 'REGULAR',
        borderWidth: 1,
        borderColor: THEME.CARD_BG,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
        color: THEME.TEXT_MAIN,
        backgroundColor: THEME.CARD_BG,
    },
    sectionLabel: {
        fontFamily: 'BOLD',
        fontSize: 16,
        color: THEME.TEXT_MAIN,
        marginBottom: 8,
        marginTop: 4,
    },
    typeContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: THEME.SECONDARY,
        backgroundColor: THEME.BACKGROUND,
        alignItems: 'center',
    },
    typeActive: {
        backgroundColor: THEME.PRIMARY,
        borderColor: THEME.PRIMARY,
    },
    typeText: {
        fontFamily: 'REGULAR',
        color: THEME.TEXT_SUB,
    },
    typeTextActive: {
        fontFamily: 'BOLD',
        color: THEME.BACKGROUND,
    },
    pickerButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: THEME.CARD_BG,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: THEME.CARD_BG,
        marginBottom: 16,
    },
    pickerLabel: {
        fontFamily: 'REGULAR',
        fontSize: 12,
        color: THEME.TEXT_SUB,
        marginBottom: 4,
    },
    pickerValue: {
        fontFamily: 'BOLD',
        fontSize: 18,
        color: THEME.PRIMARY,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24, // เพิ่ม margin ด้านล่างก่อนถึงปุ่มกด
    },
    timeButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: THEME.CARD_BG,
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        backgroundColor: THEME.CARD_BG,
    },
    timeLabel: {
        fontFamily: 'REGULAR',
        fontSize: 12,
        color: THEME.TEXT_SUB,
        marginBottom: 4,
    },
    timeValue: {
        fontFamily: 'BOLD',
        fontSize: 18,
        color: THEME.PRIMARY,
    },
    timeToText: {
        fontFamily: 'REGULAR',
        marginHorizontal: 16,
        color: THEME.TEXT_SUB,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 25,
        alignItems: 'center',
        marginHorizontal: 8,
    },
    cancelButton: {
        backgroundColor: THEME.BACKGROUND,
        borderWidth: 1.5,
        borderColor: THEME.SECONDARY,
    },
    cancelText: {
        fontFamily: 'BOLD',
        color: THEME.PRIMARY,
        fontSize: 16,
    },
    saveButton: {
        backgroundColor: THEME.PRIMARY,
        shadowColor: THEME.PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 4,
    },
    saveText: {
        fontFamily: 'BOLD',
        color: THEME.BACKGROUND,
        fontSize: 16,
    },
});