import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

import { useFocusEffect } from '@react-navigation/native';

const EmployeeProjectDetailsScreen = ({ route, navigation }: any) => {
    const { siteId, siteName } = route.params;
    const { user } = useContext(AuthContext);
    const [phases, setPhases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState('Tasks');

    const fetchProjectDetails = async () => {
        try {
            const [phasesRes, tasksRes] = await Promise.all([
                api.get(`/sites/${siteId}/phases`),
                api.get('/tasks/assigned')
            ]);

            const allPhases = phasesRes.data.phases || [];
            const myTasks: any[] = tasksRes.data.tasks || [];

            // Filter tasks for this site
            const siteTasks = myTasks.filter(t => t.site_id === Number(siteId));

            // Filter phases: relevant if assigned to user OR contains assigned tasks
            const relevantPhases = allPhases.filter((p: any) => {
                const isPhaseAssigned = p.assigned_to === user?.id;
                const hasTaskAssigned = siteTasks.some(t => t.phase_id === p.id);
                return isPhaseAssigned || hasTaskAssigned;
            }).map((p: any) => ({
                ...p,
                myTasks: siteTasks.filter(t => t.phase_id === p.id)
            }));

            setPhases(relevantPhases);
        } catch (error) {
            console.error('Error fetching project details:', error);
            Alert.alert('Error', 'Failed to load project details');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchProjectDetails();
        }, [siteId])
    );

    const handleViewProgress = (phase: any) => {
        navigation.navigate('StageProgress', { phaseId: phase.id, siteName });
    };

    const renderPhaseItem = ({ item, index }: any) => {
        const isPhaseAssigned = item.assigned_to === user?.id;

        // Status Color Logic
        let statusColor = '#F59E0B'; // Pending/Ongoing
        if (item.status === 'Completed') statusColor = '#10B981';
        if (item.status === 'Delayed') statusColor = '#EF4444';

        return (
            <View style={styles.phaseCard}>
                <View style={[styles.phaseHeader, { borderLeftColor: statusColor }]}>
                    <View style={styles.headerContent}>
                        <View style={styles.numberBadge}>
                            <Text style={styles.numberText}>{item.order_num || index + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.phaseName}>{item.name}</Text>
                            <Text style={styles.phaseDates}>
                                {item.start_date ? new Date(item.start_date).toLocaleDateString() : 'TBD'} - {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'TBD'}
                            </Text>
                        </View>
                        {isPhaseAssigned && (
                            <View style={styles.meBadge}>
                                <Text style={styles.meBadgeText}>PHASE LEAD</Text>
                            </View>
                        )}
                    </View>

                    {/* Phase Progress Bar */}
                    <View style={styles.progressRow}>
                        <Text style={{ fontSize: 12, color: '#6B7280' }}>Phase Progress: <Text style={{ fontWeight: '700', color: '#111827' }}>{item.progress || 0}%</Text></Text>
                        <View style={styles.miniBarBg}>
                            <View style={[styles.miniBarFill, { width: `${item.progress || 0}%`, backgroundColor: statusColor }]} />
                        </View>
                    </View>
                </View>

                {/* My Tasks List */}
                {item.myTasks && item.myTasks.length > 0 && (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 }}>
                        {item.myTasks.map((task: any) => (
                            <TouchableOpacity
                                key={task.id}
                                style={styles.taskItem}
                                onPress={() => navigation.navigate('EmployeeTaskDetail', { taskId: task.id })}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.taskTitle}>{task.name}</Text>
                                    <Text style={styles.taskDate}>
                                        Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No Due Date'}
                                    </Text>
                                </View>
                                <View style={[
                                    styles.taskStatusBadge,
                                    { backgroundColor: task.status === 'completed' ? '#DCFCE7' : '#F3F4F6' }
                                ]}>
                                    <Text style={[
                                        styles.taskStatusText,
                                        { color: task.status === 'completed' ? '#166534' : '#4B5563' }
                                    ]}>
                                        {task.status === 'completed' ? 'Completed' : 'Pending'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Actions */}
                <View style={styles.actionRow}>
                    <View style={[styles.statusTag, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.statusTagText, { color: statusColor }]}>{item.status || 'Pending'}</Text>
                    </View>

                    {isPhaseAssigned ? (
                        <TouchableOpacity
                            style={styles.viewProgressBtn}
                            onPress={() => handleViewProgress(item)}
                        >
                            <Ionicons name="bar-chart-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
                            <Text style={styles.btnText}>Manage Phase</Text>
                        </TouchableOpacity>
                    ) : (
                        <View />
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

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'Tasks' && styles.activeTabButton]}
                    onPress={() => setActiveTab('Tasks')}
                >
                    <Text style={[styles.tabText, activeTab === 'Tasks' && styles.activeTabText]}>Tasks</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'Materials' && styles.activeTabButton]}
                    onPress={() => setActiveTab('Materials')}
                >
                    <Text style={[styles.tabText, activeTab === 'Materials' && styles.activeTabText]}>Materials</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#8B0000" />
                </View>
            ) : (
                <>
                    {activeTab === 'Tasks' ? (
                        <FlatList
                            data={phases}
                            renderItem={renderPhaseItem}
                            keyExtractor={(item) => item.id.toString()}
                            contentContainerStyle={styles.listContent}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>No assigned tasks or phases found.</Text>
                                </View>
                            }
                        />
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="construct-outline" size={48} color="#D1D5DB" />
                            <Text style={[styles.emptyText, { marginTop: 12 }]}>No materials assigned yet.</Text>
                        </View>
                    )}
                </>
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
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        backgroundColor: '#fff',
    },
    tabButton: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 20,
        marginRight: 10,
        backgroundColor: '#F3F4F6',
    },
    activeTabButton: {
        backgroundColor: '#FEE2E2',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    activeTabText: {
        color: '#8B0000',
    },
    taskItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    taskTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    taskDate: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    taskStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    taskStatusText: {
        fontSize: 10,
        fontWeight: '700',
    },
});

export default EmployeeProjectDetailsScreen;
