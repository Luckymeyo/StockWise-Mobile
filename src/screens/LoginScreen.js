import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { colors } from '../theme/colors';
import PrimaryButton from '../components/PrimaryButton';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.title}>Login</Text>
        <Text style={styles.subtitle}>Log in using your registered account</Text>

        <Text style={styles.label}>Username</Text>
        <TextInput
          placeholder="your@email.com"
          placeholderTextColor="#9BA6AE"
          value={username}
          onChangeText={setUsername}
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          placeholder="••••••••"
          placeholderTextColor="#9BA6AE"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        <PrimaryButton title="Login" onPress={() => navigation.replace('Home')} />

        <Pressable style={styles.secondary} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.secondaryText}>Register</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    backgroundColor: colors.bg
  },
  card: {
    backgroundColor: colors.card,
    padding: 24,
    borderRadius: 20,
    gap: 8,
    shadowColor: colors.shadow,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { color: colors.sub, textAlign: 'center', marginBottom: 12 },
  label: { color: colors.text, marginTop: 8, fontWeight: '600' },
  input: {
    backgroundColor: colors.input,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  secondary: { paddingVertical: 12 },
  secondaryText: { color: colors.sub, textAlign: 'center' }
});
