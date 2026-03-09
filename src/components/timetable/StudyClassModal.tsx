import React, { useState, useEffect } from "react";
import {
    Modal, Text, View, StyleSheet, TouchableOpacity,
    TextInput, KeyboardAvoidingView, Platform, ScrollView,
    Alert,
    Pressable
} from "react-native";
import THEME from "../../../theme";
import type { StudyResponseType } from "../../screens/TimetableScreen";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from "@react-native-picker/picker";
import { addDoc, collection, deleteDoc, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db, auth } from "../../../firebaseConfig";
import DAYS_OF_WEEK from "../../constants/day";

interface DateEntry {
    day: string;
    start: number;
    end: number;
    sec: string;
}

interface FormData {
    class_code: string;
    class_name: string;
    room: string;
    professor_name: string;
    dates: DateEntry[];
}

interface ModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    selectedClass?: StudyResponseType | null;
    allClass: StudyResponseType[]
}

const defaultFormData: FormData = {
    class_code: '',
    class_name: '',
    room: '',
    professor_name: '',
    dates: [{ day: 'จันทร์', start: 8.0, end: 9.0, sec: '' }],
};

export default function StudyClassModal({ visible, onClose, onSuccess, selectedClass, allClass }: ModalProps) {
    const isEditing = !!selectedClass;

    const [formData, setFormData] = useState<FormData>({ ...defaultFormData });
    const [isSaving, setIsSaving] = useState<boolean>(false)
    const [isDeleting, setIsDeleting] = useState<boolean>(false)
    const [activeDateIndex, setActiveDateIndex] = useState<number>(0)

    // State สำหรับควบคุมการแสดงผล Time Picker
    const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);

    useEffect(() => {
        if (visible) {
            if (selectedClass) {
                setFormData({
                    class_code: selectedClass.class_code,
                    class_name: selectedClass.class_name,
                    room: selectedClass.room,
                    professor_name: selectedClass.professor_name,
                    dates: selectedClass.dates.map(d => ({
                        ...d,
                        sec: (d as any).sec ?? (selectedClass as any).sec ?? '',
                    })),
                });
            } else {
                setFormData({ ...defaultFormData, dates: [{ day: 'จันทร์', start: 8.0, end: 9.0, sec: '' }] });
            }
            setActiveDateIndex(0);
        }
    }, [visible, selectedClass]);

    const handleChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleDateFieldChange = (index: number, field: keyof DateEntry, value: string | number) => {
        setFormData(prev => {
            const newDates = [...prev.dates];
            newDates[index] = { ...newDates[index], [field]: value };
            return { ...prev, dates: newDates };
        });
    };

    const addDateEntry = () => {
        setFormData(prev => ({
            ...prev,
            dates: [...prev.dates, { day: 'จันทร์', start: 8.0, end: 9.0, sec: '' }]
        }));
        setActiveDateIndex(formData.dates.length);
    };

    const removeDateEntry = (index: number) => {
        if (formData.dates.length <= 1) {
            Alert.alert('ข้อผิดพลาด', 'ต้องมีอย่างน้อย 1 วันเรียน');
            return;
        }
        setFormData(prev => ({
            ...prev,
            dates: prev.dates.filter((_, i) => i !== index)
        }));
        setActiveDateIndex(Math.max(0, activeDateIndex - 1));
    };

    const handleTimeChange = (_event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(null);
        }

        if (selectedDate && showPicker) {
            const hours = selectedDate.getHours();
            const minutes = selectedDate.getMinutes();
            const numericTime = parseFloat(`${hours}.${minutes < 10 ? '0' + minutes : minutes}`);
            handleDateFieldChange(activeDateIndex, showPicker, numericTime);
        }
    };

    // แปลง number กลับเป็น string สำหรับแสดงผลบนปุ่ม
    const formatTimeDisplay = (numTime: number) => {
        if (isNaN(numTime)) return '--:--';
        const timeStr = numTime.toFixed(2);
        return timeStr.replace('.', ':');
    };

    const validateDates = (excludeId?: string): boolean => {
        // Validate each date entry
        for (let i = 0; i < formData.dates.length; i++) {
            const dateEntry = formData.dates[i];
            if (dateEntry.start >= dateEntry.end) {
                Alert.alert('ข้อผิดพลาด', `วันที่ ${i + 1}: เวลาเริ่มต้องน้อยกว่าเวลาจบ`);
                return false;
            }
        }

        // Check for internal overlap (within the same form's dates)
        for (let i = 0; i < formData.dates.length; i++) {
            for (let j = i + 1; j < formData.dates.length; j++) {
                if (formData.dates[i].day === formData.dates[j].day &&
                    formData.dates[i].start < formData.dates[j].end &&
                    formData.dates[i].end > formData.dates[j].start) {
                    Alert.alert('ข้อผิดพลาด', `วันเรียนที่ ${i + 1} และ ${j + 1} มีเวลาซ้อนกัน`);
                    return false;
                }
            }
        }

        // Check for overlap with existing classes
        for (const dateEntry of formData.dates) {
            for (const existingClass of allClass) {
                if (excludeId && existingClass.id === excludeId) continue;
                for (const existingDate of existingClass.dates) {
                    if (existingDate.day === dateEntry.day &&
                        existingDate.start < dateEntry.end &&
                        existingDate.end > dateEntry.start) {
                        Alert.alert('ข้อผิดพลาด', `วัน${dateEntry.day} เวลา ${formatTimeDisplay(dateEntry.start)}-${formatTimeDisplay(dateEntry.end)} ซ้อนกับวิชา ${existingClass.class_name}`);
                        return false;
                    }
                }
            }
        }

        return true;
    };

    const handleSave = async () => {

        if (!formData.class_code || !formData.class_name) {
            Alert.alert('ข้อผิดพลาด', 'กรุณากรอกรหัสวิชาและชื่อวิชา')
            return
        }

        // validate exit class code
        const exitClass = allClass.find(c => c.class_code === formData.class_code)
        if (exitClass) {
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเพิ่มวิชาซ้ำได้')
            return
        }

        if (!validateDates()) return;

        try {
            setIsSaving(true)
            if (!auth.currentUser?.uid) {
                throw new Error("ไม่พบบัญชีผู้ใช้")
            }
            await addDoc(collection(db, 'users', auth.currentUser.uid, 'class'), {
                ...formData,
                userId: auth.currentUser.uid
            })
            setFormData({ ...defaultFormData, dates: [{ day: 'จันทร์', start: 8.0, end: 9.0, sec: '' }] });

            if (onSuccess) onSuccess()

        } catch (err) {
            Alert.alert("เกิดข้อผิดพลาด", (err as Error).message)
        } finally {
            setIsSaving(false)
        }
    };

    const handleUpdate = async () => {
        if (!formData.class_code || !formData.class_name) {
            Alert.alert('ข้อผิดพลาด', 'กรุณากรอกรหัสวิชาและชื่อวิชา')
            return
        }

        // validate exit class code
        const exitClass = allClass.find(c => c.class_code === formData.class_code && c.id !== selectedClass?.id)
        if (exitClass) {
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเพิ่มวิชาซ้ำได้')
            return
        }

        if (!validateDates(selectedClass?.id)) return;

        try {
            setIsSaving(true)
            if (!auth.currentUser?.uid) {
                throw new Error("ไม่พบบัญชีผู้ใช้")
            }
            if (!selectedClass?.id) return
            await setDoc(doc(db, 'users', auth.currentUser.uid, 'class', selectedClass.id), {
                ...formData,
                userId: auth.currentUser.uid
            })
            setFormData({ ...defaultFormData, dates: [{ day: 'จันทร์', start: 8.0, end: 9.0, sec: '' }] });

            if (onSuccess) onSuccess()

        } catch (err) {
            Alert.alert("เกิดข้อผิดพลาด", (err as Error).message)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteClass = () => {
        if (!selectedClass?.id) return;
        if (!auth.currentUser?.uid) {
            Alert.alert("ข้อผิดพลาด", "ไม่พบบัญชีผู้ใช้");
            return;
        }

        Alert.alert(
            "ยืนยันการลบ",
            `คุณแน่ใจหรือไม่ว่าต้องการลบวิชา ${selectedClass.class_name}?\nข้อมูลที่ลบแล้วไม่สามารถกู้คืนได้`,
            [
                {
                    text: "ยกเลิก",
                    style: "cancel"
                },
                {
                    text: "ลบวิชาเรียน",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setIsDeleting(true);

                            await deleteDoc(doc(db, 'users', auth.currentUser!.uid, 'class', selectedClass.id));

                            // ลบทุกการสอบที่มี class_code ตรงกัน
                            const examRef = collection(db, 'users', auth.currentUser!.uid, 'exam');
                            const q = query(examRef, where("class_id", "==", selectedClass.id));
                            const querySnapshot = await getDocs(q);

                            const deletePromises = querySnapshot.docs.map(document =>
                                deleteDoc(document.ref)
                            );
                            await Promise.all(deletePromises);

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
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
                <View

                    style={styles.modalContainer}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <Text style={styles.title}>
                            {isEditing ? "แก้ไขตารางเรียน" : "เพิ่มตารางเรียน"}
                        </Text>
                        {selectedClass && (
                            <Pressable
                                disabled={isDeleting}
                                onPress={handleDeleteClass}
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
                                    {isDeleting ? 'กำลังลบ...' : 'ลบวิชานี้'}
                                </Text>
                            </Pressable>
                        )}
                    </View>

                    <ScrollView
                        style={styles.formScroll}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <TextInput
                            style={styles.input}
                            placeholder="รหัสวิชา (เช่น 01204311)"
                            placeholderTextColor={THEME.TEXT_SUB}
                            value={formData.class_code}
                            onChangeText={(text) => handleChange('class_code', text)}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="ชื่อวิชา"
                            placeholderTextColor={THEME.TEXT_SUB}
                            value={formData.class_name}
                            onChangeText={(text) => handleChange('class_name', text)}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="ห้องเรียน"
                            placeholderTextColor={THEME.TEXT_SUB}
                            value={formData.room}
                            onChangeText={(text) => handleChange('room', text)}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="ชื่อผู้สอน"
                            placeholderTextColor={THEME.TEXT_SUB}
                            value={formData.professor_name}
                            onChangeText={(text) => handleChange('professor_name', text)}
                        />

                        {formData.dates.map((dateEntry, index) => (
                            <View key={index} style={{ marginBottom: 16, padding: 12, backgroundColor: activeDateIndex === index ? THEME.CARD_BG : 'transparent', borderRadius: 8, borderWidth: 1, borderColor: THEME.CARD_BG }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={styles.sectionLabel}>วันเรียนที่ {index + 1}</Text>
                                    {formData.dates.length > 1 && (
                                        <TouchableOpacity onPress={() => removeDateEntry(index)}>
                                            <Text style={{ color: THEME.ERROR, fontFamily: 'BOLD', fontSize: 14 }}>ลบ</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <TextInput
                                    style={styles.input}
                                    placeholder="หมู่เรียน เช่น 701"
                                    placeholderTextColor={THEME.TEXT_SUB}
                                    value={dateEntry.sec}
                                    onChangeText={(text) => handleDateFieldChange(index, 'sec', text)}
                                />

                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={dateEntry.day}
                                        onValueChange={(itemValue) => handleDateFieldChange(index, 'day', itemValue)}
                                        style={styles.picker}
                                        dropdownIconColor={THEME.PRIMARY}
                                    >
                                        {DAYS_OF_WEEK.map((day) => (
                                            <Picker.Item
                                                key={day}
                                                label={day}
                                                value={day}
                                                color={THEME.TEXT_MAIN}
                                            />
                                        ))}
                                    </Picker>
                                </View>

                                <Text style={[styles.sectionLabel, { marginTop: 0 }]}>เวลาเรียน</Text>
                                <View style={styles.timeContainer}>
                                    <TouchableOpacity
                                        style={styles.timeButton}
                                        onPress={() => { setActiveDateIndex(index); setShowPicker('start'); }}
                                    >
                                        <Text style={styles.timeLabel}>เริ่ม</Text>
                                        <Text style={styles.timeValue}>{formatTimeDisplay(dateEntry.start)}</Text>
                                    </TouchableOpacity>

                                    <Text style={styles.timeToText}>ถึง</Text>

                                    <TouchableOpacity
                                        style={styles.timeButton}
                                        onPress={() => { setActiveDateIndex(index); setShowPicker('end'); }}
                                    >
                                        <Text style={styles.timeLabel}>สิ้นสุด</Text>
                                        <Text style={styles.timeValue}>{formatTimeDisplay(dateEntry.end)}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity
                            style={{ alignItems: 'center', paddingVertical: 10, borderWidth: 1, borderColor: THEME.PRIMARY, borderRadius: 8, borderStyle: 'dashed', marginBottom: 16 }}
                            onPress={addDateEntry}
                        >
                            <Text style={{ color: THEME.PRIMARY, fontFamily: 'BOLD', fontSize: 16 }}>+ เพิ่มวันเรียน</Text>
                        </TouchableOpacity>

                        {showPicker && (
                            <DateTimePicker
                                value={new Date()}
                                mode="time"
                                is24Hour={true}
                                display="default"
                                onChange={handleTimeChange}
                            />
                        )}

                    </ScrollView>

                    {/* Action Buttons */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity disabled={isSaving} style={[styles.button, styles.cancelButton]} onPress={onClose}>
                            <Text style={styles.cancelText}>ยกเลิก</Text>
                        </TouchableOpacity>

                        <TouchableOpacity disabled={isSaving} style={[styles.button, styles.saveButton]} onPress={selectedClass ? handleUpdate : handleSave}>
                            <Text style={styles.saveText}>{isSaving ? 'กำลังบันทึก' : 'บันทึก'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
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
        maxHeight: '90%', // จำกัดความสูงไม่ให้ล้นจอ
        backgroundColor: THEME.BACKGROUND,
        borderRadius: 12,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: THEME.CARD_BG,
        borderRadius: 8,
        backgroundColor: THEME.CARD_BG,
        marginBottom: 16,
        overflow: 'hidden', // ช่วยเก็บขอบ Picker ไม่ให้ทะลุรัศมี borderRadius
    },
    picker: {
        height: 50,
        width: '100%',
        color: THEME.TEXT_MAIN,
    },
    formScroll: {
        marginBottom: 16,
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
    dayContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8, // ใช้ gap แทน margin เพื่อความสะดวก (รองรับ React Native เวอร์ชั่นใหม่ๆ)
        marginBottom: 16,
    },
    dayButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: THEME.SECONDARY,
        backgroundColor: THEME.BACKGROUND,
    },
    dayButtonActive: {
        backgroundColor: THEME.PRIMARY,
        borderColor: THEME.PRIMARY,
    },
    dayText: {
        fontFamily: 'REGULAR',
        color: THEME.TEXT_SUB,
    },
    dayTextActive: {
        fontFamily: 'BOLD',
        color: THEME.BACKGROUND,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
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