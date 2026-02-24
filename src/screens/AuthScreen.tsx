import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { auth } from '../../firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

import THEME from '../../theme';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAuthentication = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      let message = 'เกิดข้อผิดพลาด โปรดลองอีกครั้ง';
      if (error.code === 'auth/invalid-email') message = 'รูปแบบอีเมลไม่ถูกต้อง';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') message = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      if (error.code === 'auth/email-already-in-use') message = 'อีเมลนี้ถูกใช้งานแล้ว';
      if (error.code === 'auth/weak-password') message = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
      
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.formContainer}>
          <Text style={styles.headerTitle}>
            {isLogin ? 'ยินดีต้อนรับกลับมา' : 'สร้างบัญชีใหม่'}
          </Text>
          
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <TextInput
            style={styles.input}
            placeholder="อีเมล"
            placeholderTextColor={THEME.TEXT_SUB}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!isLoading}
          />
          
          <TextInput
            style={styles.input}
            placeholder="รหัสผ่าน"
            placeholderTextColor={THEME.TEXT_SUB}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
          />

          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={handleAuthentication}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={THEME.BACKGROUND} />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.toggleContainer} 
            onPress={() => {
              setIsLogin(!isLogin);
              setErrorMessage('');
              setPassword('');
            }}
            disabled={isLoading}
          >
            <Text style={styles.toggleText}>
              {isLogin ? 'ยังไม่มีบัญชีใช่ไหม? ' : 'มีบัญชีอยู่แล้ว? '}
              <Text style={styles.toggleTextBold}>
                {isLogin ? 'สมัครเลย' : 'เข้าสู่ระบบ'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.BACKGROUND,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  formContainer: {
    width: '100%',
  },
  headerTitle: {
    fontFamily: 'BOLD',
    fontSize: 28,
    color: THEME.PRIMARY,
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    fontFamily: 'REGULAR',
    backgroundColor: THEME.CARD_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: THEME.TEXT_MAIN,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.SECONDARY,
  },
  button: {
    backgroundColor: THEME.PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: THEME.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: THEME.SECONDARY,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontFamily: 'BOLD',
    color: THEME.BACKGROUND,
    fontSize: 16,
  },
  toggleContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  toggleText: {
    fontFamily: 'REGULAR',
    color: THEME.TEXT_SUB,
    fontSize: 14,
  },
  toggleTextBold: {
    fontFamily: 'BOLD',
    color: THEME.PRIMARY,
  },
  errorText: {
    fontFamily: 'REGULAR',
    color: THEME.ERROR,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
  }
});