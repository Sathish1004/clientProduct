import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const HomeScreen = () => {
    const navigation = useNavigation();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <Image
                        source={require('../../assets/noor-builders-logo.png')}
                        style={styles.headerLogo}
                        resizeMode="contain"
                    />
                </View>

                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <Image
                        source={require('../../assets/noor-builders-logo.png')}
                        style={styles.heroLogo}
                        resizeMode="contain"
                    />

                    <Text style={styles.tagline}>Customer Satisfaction Is Our Priority</Text>
                    <Text style={styles.supportingText}>Building Trust. Delivering Quality.</Text>

                    {/* Login Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.adminButton}
                            onPress={() => navigation.navigate('Login' as never)}
                        >
                            <Text style={styles.adminButtonText}>Admin Login</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.employeeButton}
                            onPress={() => navigation.navigate('Login' as never)}
                        >
                            <Text style={styles.employeeButtonText}>Employee Login</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>© 2026 Noor Builders</Text>
                    <Text style={styles.footerTagline}>Customer Satisfaction Is Our Priority</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        flexGrow: 1,
    },
    header: {
        paddingVertical: 20,
        paddingHorizontal: 24,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerLogo: {
        width: 180,
        height: 60,
    },
    heroSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 60,
        backgroundColor: '#FAFAFA',
    },
    heroLogo: {
        width: 320,
        height: 320,
        marginBottom: 32,
    },
    tagline: {
        fontSize: 24,
        fontWeight: '700',
        color: '#C62828',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    supportingText: {
        fontSize: 18,
        fontWeight: '500',
        color: '#374151',
        textAlign: 'center',
        marginBottom: 48,
    },
    buttonContainer: {
        width: '100%',
        maxWidth: 400,
        gap: 16,
    },
    adminButton: {
        backgroundColor: '#C62828',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 8,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    adminButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    employeeButton: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#C62828',
    },
    employeeButtonText: {
        color: '#C62828',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    footer: {
        paddingVertical: 32,
        paddingHorizontal: 24,
        backgroundColor: '#F9FAFB',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },
    footerTagline: {
        fontSize: 12,
        color: '#9CA3AF',
        fontStyle: 'italic',
    },
});

export default HomeScreen;
