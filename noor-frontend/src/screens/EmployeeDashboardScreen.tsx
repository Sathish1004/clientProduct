import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, StatusBar, RefreshControl, StyleSheet, FlatList, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { useNavigation } from '@react-navigation/native';

const EmployeeDashboardScreen = () => {
    const { user, logout } = useContext(AuthContext);
    const navigation = useNavigation<any>();
    const [stats, setStats] = useState({ pending: 0, completed: 0, sites: 0 });
    const [sites, setSites] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('Dashboard');
    const { width } = useWindowDimensions();

    // Notifications
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notificationDropdownVisible, setNotificationDropdownVisible] = useState(false);

    useEffect(() => {
        fetchData();
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await api.get('/notifications');
            setNotifications(response.data.notifications);
            setUnreadCount(response.data.unreadCount);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const handleNotificationClick = async (notification: any) => {
        try {
            if (!notification.is_read) {
                await api.put(`/notifications/${notification.id}/read`);
                setUnreadCount(prev => Math.max(0, prev - 1));
                setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: 1 } : n));
            }
            setNotificationDropdownVisible(false);

            // Navigate based on type/content if needed
            // For ASSIGNMENT, we could navigate to AssignedSites or specifically the project
            // For now, just close the dropdown as the message is informational
            if (notification.type === 'ASSIGNMENT') {
                navigation.navigate('AssignedSites');
            }
        } catch (error) {
            console.error('Error handling notification:', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, sitesRes] = await Promise.all([
                api.get('/employee/dashboard-stats'),
                api.get('/sites/assigned')
            ]);
            setStats(statsRes.data);
            setSites(sitesRes.data || []);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Quick Status Box Component (Matching Admin)
    const StatusBox = ({ label, icon, color = '#8B0000', count, onPress }: any) => (
        <TouchableOpacity
            style={styles.statusBox}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.statusHeader}>
                <View style={[styles.statusIcon, { backgroundColor: color + '15' }]}>
                    <Ionicons name={icon} size={20} color={color} />
                </View>
                <Text style={[styles.statusCount, { color: color }]}>{count}</Text>
            </View>
            <Text style={styles.statusLabel}>{label}</Text>
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <View>
                <Text style={styles.headerTitle}>Noor Constructions</Text>
                <Text style={styles.headerSubtitle}>Employee Portal</Text>
            </View>
            <View style={styles.headerRight}>
                <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => setNotificationDropdownVisible(!notificationDropdownVisible)}
                >
                    <Ionicons name="notifications-outline" size={24} color="#374151" />
                    {unreadCount > 0 && (
                        <View style={{
                            position: 'absolute',
                            top: 0, right: 0,
                            backgroundColor: '#D32F2F',
                            borderRadius: 6, width: 12, height: 12,
                            alignItems: 'center', justifyContent: 'center'
                        }} />
                    )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.profileBtn} onPress={logout}>
                    <Text style={styles.profileText}>{user?.name?.charAt(0) || 'E'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {renderHeader()}

            {/* Notification Dropdown */}
            {notificationDropdownVisible && (
                <View style={{
                    position: 'absolute',
                    top: 60,
                    right: 20,
                    width: 300,
                    maxHeight: 400,
                    backgroundColor: '#fff',
                    borderRadius: 8,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 10,
                    zIndex: 1001,
                    borderWidth: 1,
                    borderColor: '#f3f4f6'
                }}>
                    <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Notifications</Text>
                        {unreadCount > 0 && (
                            <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                                <Text style={{ color: '#b91c1c', fontSize: 10, fontWeight: 'bold' }}>{unreadCount} New</Text>
                            </View>
                        )}
                    </View>

                    <ScrollView style={{ maxHeight: 300 }}>
                        {notifications.length > 0 ? (
                            notifications.map((notif) => (
                                <TouchableOpacity
                                    key={notif.id}
                                    style={{
                                        padding: 12,
                                        borderBottomWidth: 1,
                                        borderBottomColor: '#f9fafb',
                                        backgroundColor: notif.is_read ? '#fff' : '#fef2f2'
                                    }}
                                    onPress={() => handleNotificationClick(notif)}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '500' }}>
                                            {notif.project_name}
                                        </Text>
                                        <Text style={{ fontSize: 10, color: '#9ca3af' }}>
                                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                    <Text style={{ fontSize: 13, color: '#1f2937', fontWeight: notif.is_read ? 'normal' : '600' }}>
                                        {notif.message}
                                    </Text>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={{ color: '#9ca3af' }}>No notifications</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            )}

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
            >
                {/* Status Cards */}
                <View style={styles.statusGrid}>
                    <StatusBox
                        label="Pending Tasks"
                        icon="time-outline"
                        color="#D32F2F"
                        count={stats.pending}
                        onPress={() => navigation.navigate('EmployeeTasks')} // Or relevant screen
                    />
                    <StatusBox
                        label="Completed"
                        icon="checkmark-done-circle-outline"
                        color="#388E3C"
                        count={stats.completed}
                    />
                    <StatusBox
                        label="Active Sites"
                        icon="business-outline"
                        color="#1976D2"
                        count={stats.sites}
                    />
                </View>

                {/* Active Projects List */}
                <Text style={styles.sectionTitle}>Active Projects</Text>
                <View style={styles.listContainer}>
                    {sites.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No active projects assigned</Text>
                        </View>
                    ) : (
                        sites.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.projectListItem}
                                onPress={() => navigation.navigate('AssignedSites')} // Navigate to list/details
                            >
                                <View style={styles.listIcon}>
                                    <Ionicons name="business-outline" size={24} color="#8B0000" />
                                </View>
                                <View style={styles.listContent}>
                                    <Text style={styles.listTitle}>{item.name}</Text>
                                    <Text style={styles.listSub}>{item.location}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#ccc" />
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('Dashboard')}>
                    <Ionicons name="grid-outline" size={22} color={activeTab === 'Dashboard' ? '#8B0000' : '#9ca3af'} />
                    <Text style={[styles.navText, activeTab === 'Dashboard' && styles.navTextActive]}>Dashboard</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('EmployeeTasks')}>
                    <Ionicons name="list-outline" size={22} color={activeTab === 'Tasks' ? '#8B0000' : '#9ca3af'} />
                    <Text style={[styles.navText, activeTab === 'Tasks' && styles.navTextActive]}>My Tasks</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem} onPress={() => alert('Profile coming soon')}>
                    <Ionicons name="person-outline" size={22} color={activeTab === 'Profile' ? '#8B0000' : '#9ca3af'} />
                    <Text style={[styles.navText, activeTab === 'Profile' && styles.navTextActive]}>Profile</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
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
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBtn: {
        padding: 4,
    },
    profileBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },
    profileText: {
        color: '#B91C1C',
        fontWeight: '700',
        fontSize: 14,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    statusGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statusBox: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    statusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    statusIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusCount: {
        fontSize: 18,
        fontWeight: '700',
    },
    statusLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
    },
    listContainer: {
        backgroundColor: 'transparent',
    },
    projectListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    listIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    listContent: {
        flex: 1,
    },
    listTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    listSub: {
        fontSize: 13,
        color: '#6B7280',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingBottom: 24, // Safe area hint
    },
    navItem: {
        alignItems: 'center',
    },
    navText: {
        fontSize: 10,
        marginTop: 4,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    navTextActive: {
        color: '#8B0000',
        fontWeight: '700',
    },
});

export default EmployeeDashboardScreen;
