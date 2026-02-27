import React, { useState, useEffect } from "react";
import {
    Modal, Text, View, StyleSheet, TouchableOpacity,
    TextInput, KeyboardAvoidingView, Platform, ScrollView,
    Alert,
    Pressable
} from "react-native";
import THEME from "../../../theme";
import type { StudyType } from "../../screens/TimetableScreen";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from "@react-native-picker/picker";
import { addDoc, collection, deleteDoc, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db, auth } from "../../../firebaseConfig";
import DAYS_OF_WEEK from "../../constants/day";

interface ModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    selectedClass?: StudyType | null;
    allClass: StudyType[]
}

export default function StudyClassModal({ visible, onClose, onSuccess, selectedClass, allClass }: ModalProps) {
    const isEditing = !!selectedClass;

    const [formData, setFormData] = useState({
        class_code: '',
        class_name: '',
        room: '',
        sec: '',
        professor_name: '',
        day: 'จันทร์',
        start: 8.0,
        end: 9.0
    });
    const [isSaving, setIsSaving] = useState<boolean>(false)
    const [isDeleting, setIsDeleting] = useState<boolean>(false)

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
                    day: selectedClass.day,
                    start: selectedClass.start,
                    end: selectedClass.end,
                    sec: selectedClass.sec
                });
            } else {
                setFormData({
                    class_code: '', class_name: '', room: '',
                    professor_name: '', day: 'จันทร์', start: 8.0, end: 9.0, sec: ''
                });
            }
        }
    }, [visible, selectedClass]);

    const handleChange = (field: keyof typeof formData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleTimeChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(null);
        }

        if (selectedDate && showPicker) {
            const hours = selectedDate.getHours();
            const minutes = selectedDate.getMinutes();
            const numericTime = parseFloat(`${hours}.${minutes < 10 ? '0' + minutes : minutes}`);
            handleChange(showPicker, numericTime);
        }
    };

    // แปลง number กลับเป็น string สำหรับแสดงผลบนปุ่ม
    const formatTimeDisplay = (numTime: number) => {
        const timeStr = numTime.toFixed(2);
        return timeStr.replace('.', ':');
    };

    const handleSave = async () => {

        if (!formData.class_code || !formData.class_name) {
            Alert.alert('ข้อผิดพลาด', 'กรุณากรอกรหัสวิชาและชื่อวิชา')
            return
        }

        if (formData.start >= formData.end) {
            Alert.alert('ข้อผิดพลาด', 'เวลาเริ่มต้องน้อยกว่าเวลาจบ')
            return
        }
        // validate exit class code 
        const exitClass = allClass.find(c => c.class_code === formData.class_code && c.sec === formData.sec)
        if (exitClass) {
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเพิ่มวิชาและหมู่ซ้ำได้')
            return
        }
        // validate time
        const overlabClass = allClass.filter(a => a.day === formData.day).find(old => old.start < formData.end && old.end > formData.start)
        if (overlabClass) {
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเพิ่มวิชาเวลาซ้ำกันได้')
            return
        }

        try {
            setIsSaving(true)
            if (!auth.currentUser?.uid) {
                throw new Error("ไม่พบบัญชีผู้ใช้")
            }
            await addDoc(collection(db, 'users', auth.currentUser.uid, 'class'), {
                ...formData,
                userId: auth.currentUser.uid
            })
            setFormData({
                class_code: '', class_name: '', room: '',
                professor_name: '', day: 'จันทร์', start: 8.0, end: 9.0,
                sec: ''
            });

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

        if (formData.start >= formData.end) {
            Alert.alert('ข้อผิดพลาด', 'เวลาเริ่มต้องน้อยกว่าเวลาจบ')
            return
        }
        // validate exit class code 
        const exitClass = allClass.find(c => c.class_code === formData.class_code && c.sec === formData.sec && c.id !== selectedClass?.id)
        if (exitClass) {
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเพิ่มวิชาและหมู่ซ้ำได้')
            return
        }
        // validate time
        const overlabClass = allClass.filter(a => a.day === formData.day).find(old => old.start < formData.end && old.end > formData.start && old.id !== selectedClass?.id)
        if (overlabClass) {
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเพิ่มวิชาเวลาซ้ำกันได้')
            return
        }
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
            setFormData({
                class_code: '', class_name: '', room: '',
                professor_name: '', day: 'จันทร์', start: 8.0, end: 9.0,
                sec: ''
            });

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
                            placeholder="หมู่เรียน เช่น 701"
                            placeholderTextColor={THEME.TEXT_SUB}
                            value={formData.sec}
                            onChangeText={(text) => handleChange('sec', text)}
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

                        <Text style={styles.sectionLabel}>วันเรียน</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={formData.day}
                                onValueChange={(itemValue) => handleChange('day', itemValue)}
                                style={styles.picker}
                                dropdownIconColor={THEME.PRIMARY} // สีไอคอนลูกศรบน Android
                            >
                                {DAYS_OF_WEEK.map((day) => (
                                    <Picker.Item
                                        key={day}
                                        label={day}
                                        value={day}
                                        color={THEME.TEXT_MAIN} // สีตัวอักษรของแต่ละ Item
                                    />
                                ))}
                            </Picker>
                        </View>

                        <Text style={styles.sectionLabel}>เวลาเรียน</Text>
                        <View style={styles.timeContainer}>
                            <TouchableOpacity
                                style={styles.timeButton}
                                onPress={() => setShowPicker('start')}
                            >
                                <Text style={styles.timeLabel}>เริ่ม</Text>
                                <Text style={styles.timeValue}>{formatTimeDisplay(formData.start)}</Text>
                            </TouchableOpacity>

                            <Text style={styles.timeToText}>ถึง</Text>

                            <TouchableOpacity
                                style={styles.timeButton}
                                onPress={() => setShowPicker('end')}
                            >
                                <Text style={styles.timeLabel}>สิ้นสุด</Text>
                                <Text style={styles.timeValue}>{formatTimeDisplay(formData.end)}</Text>
                            </TouchableOpacity>
                        </View>

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