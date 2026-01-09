import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, StyleSheet, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const LoginScreen = ({ navigation }: any) => {
    const { login } = useContext(AuthContext);
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!identifier || !password) {
            setError('Please enter email/phone and password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/login', { identifier, password });
            const { token, user } = response.data;
            login(token, user);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Login Card */}
                    <View style={styles.loginCard}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.logoContainer}>
                                <View style={styles.logoIcon}>
                                    <Ionicons name="business" size={40} color="#8B0000" />
                                </View>
                            </View>
                            <Text style={styles.title}>Welcome</Text>
                            <Text style={styles.subtitle}>Sign in to your account</Text>
                        </View>

                        {/* Login Form */}
                        <View style={styles.formContainer}>
                            {error ? (
                                <View style={styles.errorContainer}>
                                    <Ionicons name="alert-circle-outline" size={20} color="#D32F2F" />
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            ) : null}

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Email or Phone</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="person-outline" size={20} color="#1A1A1A" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter email or phone"
                                        placeholderTextColor="#999"
                                        value={identifier}
                                        onChangeText={setIdentifier}
                                        keyboardType="default"
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Password</Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="lock-closed-outline" size={20} color="#1A1A1A" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter your password"
                                        placeholderTextColor="#999"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        style={styles.eyeButton}
                                    >
                                        <Ionicons
                                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                                            size={20}
                                            color="#666"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                                onPress={handleLogin}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#ffffff" size="small" />
                                ) : (
                                    <Text style={styles.loginButtonText}>LOGIN</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            NOOR <Text style={styles.brandName}>BUILDERS</Text>
                        </Text>
                        <Text style={styles.copyright}>© 2026 All Rights Reserved</Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 40,
        alignItems: 'center',
        minHeight: '100%',
    },
    loginCard: {
        width: '90%',
        maxWidth: 420,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingVertical: 40,
        paddingHorizontal: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
        width: '100%',
    },
    logoContainer: {
        marginBottom: 20,
    },
    logoIcon: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: '#FAFAFA',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#000000',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#666666',
        letterSpacing: 0.5,
    },
    formContainer: {
        width: '100%',
        marginBottom: 20,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
    },
    errorText: {
        color: '#D32F2F',
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    inputGroup: {
        marginBottom: 24,
    },
    inputLabel: {
        color: '#000000',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        paddingVertical: 8,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#000000',
        paddingVertical: 8,
    },
    eyeButton: {
        padding: 8,
    },
    loginButton: {
        backgroundColor: '#8B0000',
        paddingVertical: 18,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
        shadowColor: '#8B0000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    footer: {
        alignItems: 'center',
        marginTop: 'auto',
    },
    footerText: {
        color: '#000000',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 2,
        marginBottom: 4,
    },
    brandName: {
        color: '#8B0000',
        fontWeight: '800',
    },
    copyright: {
        color: '#999999',
        fontSize: 12,
    },
});

export default LoginScreen;
