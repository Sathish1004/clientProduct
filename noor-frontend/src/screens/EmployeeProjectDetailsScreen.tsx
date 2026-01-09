import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const EmployeeProjectDetailsScreen = ({ route, navigation }: any) => {
    const { siteId, siteName } = route.params;
    const { user } = useContext(AuthContext);
    const [phases, setPhases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPhases();
    }, [siteId]);

    const fetchPhases = async () => {
        try {
            const response = await api.get(`/sites/${siteId}/phases`);
            // Assuming response.data is an array of phases or object { phases: [] }
            setPhases(Array.isArray(response.data) ? response.data : response.data.phases || []);
        } catch (error) {
            console.error('Error fetching phases:', error);
            Alert.alert('Error', 'Failed to load project timeline');
        } finally {
            setLoading(false);
        }
    };

    const handleViewProgress = (phase: any) => {
        navigation.navigate('StageProgress', { phaseId: phase.id, siteName });
    };

    const renderPhaseItem = ({ item, index }: any) => {
        const isAssignedToMe = item.assigned_employee_id === user?.id;

        // Status Color Logic
        let statusColor = '#F59E0B'; // Pending/Ongoing
        if (item.status === 'Completed') statusColor = '#10B981';
        if (item.status === 'Delayed') statusColor = '#EF4444';

        return (
            <View style={styles.phaseCard}>
                <View style={[styles.phaseHeader, { borderLeftColor: statusColor }]}>
                    <View style={styles.headerContent}>
                        <View style={styles.numberBadge}>
                            <Text style={styles.numberText}>{index + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.phaseName}>{item.name}</Text>
                            <Text style={styles.phaseDates}>
                                {item.start_date ? new Date(item.start_date).toLocaleDateString() : 'TBD'} - {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'TBD'}
                            </Text>
                        </View>
                        {isAssignedToMe && (
                            <View style={styles.meBadge}>
                                <Text style={styles.meBadgeText}>ASSIGNED</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.progressRow}>
                        <Text style={{ fontSize: 12, color: '#6B7280' }}>Progress: <Text style={{ fontWeight: '700', color: '#111827' }}>{item.progress}%</Text></Text>
                        {/* Simple bar */}
                        <View style={styles.miniBarBg}>
                            <View style={[styles.miniBarFill, { width: `${item.progress}%`, backgroundColor: statusColor }]} />
                        </View>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                    <View style={[styles.statusTag, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.statusTagText, { color: statusColor }]}>{item.status || 'Pending'}</Text>
                    </View>

                    {isAssignedToMe ? (
                        <TouchableOpacity
                            style={styles.viewProgressBtn}
                            onPress={() => handleViewProgress(item)}
                        >
                            <Ionicons name="bar-chart-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
                            <Text style={styles.btnText}>View Progress</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.disabledBtn} disabled>
                            <Text style={styles.disabledBtnText}>Locked</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>{siteName || 'Project Details'}</Text>
                    <Text style={styles.headerSubtitle}>Project Timeline</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#8B0000" />
                </View>
            ) : (
                <FlatList
                    data={phases}
                    renderItem={renderPhaseItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No stages found for this project.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#6B7280',
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    phaseCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
    },
    phaseHeader: {
        padding: 16,
        borderLeftWidth: 4,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    numberBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    numberText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6B7280',
    },
    phaseName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 2,
    },
    phaseDates: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    meBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    meBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#166534',
    },
    progressRow: {
        marginTop: 4,
    },
    miniBarBg: {
        height: 4,
        backgroundColor: '#F3F4F6',
        borderRadius: 2,
        marginTop: 6,
        overflow: 'hidden',
    },
    miniBarFill: {
        height: '100%',
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    statusTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusTagText: {
        fontSize: 12,
        fontWeight: '600',
    },
    viewProgressBtn: {
        backgroundColor: '#8B0000',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    btnText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 13,
    },
    disabledBtn: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    disabledBtnText: {
        color: '#9CA3AF',
        fontWeight: '600',
        fontSize: 13,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#9CA3AF',
        fontSize: 14,
    }
});

export default EmployeeProjectDetailsScreen;
