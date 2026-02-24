import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  TextInput, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

import { auth, db } from '../../firebaseConfig';
import THEME from '../../theme';

export default function ProfileScreen() {
  const user = auth.currentUser;
  const userEmail = user?.email || 'ไม่พบข้อมูลอีเมล';

  const [name, setName] = useState('');
  const [faculty, setFaculty] = useState('');
  const [year, setYear] = useState('');

  const [isFetching, setIsFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setName(data.name || '');
          setFaculty(data.faculty || '');
          setYear(data.year || '');
        }
      } catch (error) {
        Alert.alert('ข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลผู้ใช้ได้');
      } finally {
        setIsFetching(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, {
        name: name.trim(),
        faculty: faculty.trim(),
        year: year.trim()
      }, { merge: true });
      
      Alert.alert('สำเร็จ', 'บันทึกข้อมูลเรียบร้อยแล้ว');
    } catch (error) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = () => {
    if (!user) return;
    Alert.alert(
      'ยืนยันการลบข้อมูล',
      'คุณต้องการลบข้อมูลทั้งหมดใช่หรือไม่? ข้อมูลนี้ไม่สามารถกู้คืนได้',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { 
          text: 'ลบข้อมูล', 
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const docRef = doc(db, 'users', user.uid);
              await deleteDoc(docRef);
              setName('');
              setFaculty('');
              setYear('');
              Alert.alert('สำเร็จ', 'ลบข้อมูลเรียบร้อยแล้ว');
            } catch (error) {
              Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'ออกจากระบบ',
      'คุณต้องการออกจากระบบใช่หรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ออกจากระบบ',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถออกจากระบบได้ในขณะนี้');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (isFetching) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={THEME.PRIMARY} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>โปรไฟล์ส่วนตัว</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={40} color={THEME.PRIMARY} />
          </View>
          <Text style={styles.emailLabel}>ล็อกอินผ่านอีเมล</Text>
          <Text style={styles.emailText}>{userEmail}</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.inputLabel}>ชื่อ - นามสกุล</Text>
          <TextInput
            style={styles.input}
            placeholder="กรอกชื่อของคุณ"
            placeholderTextColor={THEME.TEXT_SUB}
            value={name}
            onChangeText={setName}
            editable={!isLoading}
          />

          <Text style={styles.inputLabel}>คณะ</Text>
          <TextInput
            style={styles.input}
            placeholder="เช่น วิทยาศาสตร์"
            placeholderTextColor={THEME.TEXT_SUB}
            value={faculty}
            onChangeText={setFaculty}
            editable={!isLoading}
          />

          <Text style={styles.inputLabel}>ชั้นปี</Text>
          <TextInput
            style={styles.input}
            placeholder="เช่น 3"
            placeholderTextColor={THEME.TEXT_SUB}
            keyboardType="number-pad"
            value={year}
            onChangeText={setYear}
            editable={!isLoading}
          />

          <TouchableOpacity 
            style={[styles.buttonPrimary, isLoading && styles.disabledButton]} 
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={THEME.BACKGROUND} />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color={THEME.BACKGROUND} style={styles.buttonIcon} />
                <Text style={styles.buttonPrimaryText}>บันทึกข้อมูล</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButtonOutline} onPress={handleLogout} disabled={isLoading}>
          <Ionicons name="log-out-outline" size={20} color={THEME.PRIMARY} />
          <Text style={styles.logoutButtonOutlineText}>ออกจากระบบ</Text>
        </TouchableOpacity>

        <View style={styles.dangerZone}>
          <TouchableOpacity onPress={handleClearData} disabled={isLoading}>
            <Text style={styles.dangerZoneText}>ลบข้อมูลทั้งหมด</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.BACKGROUND,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.BACKGROUND,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  headerContainer: {
    marginBottom: 30,
  },
  headerTitle: {
    fontFamily: 'BOLD',
    fontSize: 28,
    color: THEME.TEXT_MAIN,
  },
  profileCard: {
    backgroundColor: THEME.CARD_BG,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: THEME.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.SECONDARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emailLabel: {
    fontFamily: 'REGULAR',
    fontSize: 14,
    color: THEME.TEXT_SUB,
    marginBottom: 4,
  },
  emailText: {
    fontFamily: 'BOLD',
    fontSize: 18,
    color: THEME.PRIMARY,
  },
  formContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: 'BOLD',
    fontSize: 14,
    color: THEME.TEXT_MAIN,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    fontFamily: 'REGULAR',
    backgroundColor: THEME.CARD_BG,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: THEME.TEXT_MAIN,
    marginBottom: 20,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonPrimary: {
    flexDirection: 'row',
    backgroundColor: THEME.PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 10,
  },
  buttonPrimaryText: {
    fontFamily: 'BOLD',
    color: THEME.BACKGROUND,
    fontSize: 16,
  },
  logoutButtonOutline: {
    flexDirection: 'row',
    backgroundColor: THEME.BACKGROUND,
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME.SECONDARY,
    marginBottom: 30,
  },
  logoutButtonOutlineText: {
    fontFamily: 'BOLD',
    color: THEME.PRIMARY,
    fontSize: 16,
    marginLeft: 8,
  },
  dangerZone: {
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  dangerZoneText: {
    fontFamily: 'REGULAR',
    color: THEME.TEXT_SUB,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  disabledButton: {
    opacity: 0.7,
  },
  bottomPadding: {
    height: 120,
  }
});