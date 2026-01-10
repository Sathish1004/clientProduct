import React, { useContext, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, StyleSheet, StatusBar, TextInput, FlatList, Modal, Alert, Platform, useWindowDimensions } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import StageProgressScreen from './StageProgressScreen';

// Dummy Data for Projects Project List
const PROJECTS = [
    { id: '1', name: 'City Center Mall', location: 'Doha, Qatar', progress: 75, in: '1.2M', out: '800k' },
    { id: '2', name: 'Al Wakrah Stadium', location: 'Al Wakrah', progress: 45, in: '3.5M', out: '2.1M' },
    { id: '3', name: 'West Bay Tower', location: 'West Bay', progress: 90, in: '850k', out: '600k' },
    { id: '4', name: 'Pearl Residential', location: 'The Pearl', progress: 30, in: '2.0M', out: '1.5M' },
];

// --- Custom Components ---

// Custom Toast Component
const CustomToast = ({ visible, message, type, onHide }: { visible: boolean, message: string, type: 'success' | 'error', onHide: () => void }) => {
    useEffect(() => {
        if (visible) {
            const timer = setTimeout(onHide, 3000);
            return () => clearTimeout(timer);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <View style={[
            styles.toastContainer,
            type === 'success' ? styles.toastSuccess : styles.toastError
        ]}>
            <Ionicons
                name={type === 'success' ? "checkmark-circle" : "alert-circle"}
                size={24}
                color="#fff"
            />
            <Text style={styles.toastText}>{message}</Text>
        </View>
    );
};

// Custom Date Picker Modal
const CustomDatePicker = ({ visible, onClose, onSelect, title }: { visible: boolean, onClose: () => void, onSelect: (date: string) => void, title: string }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const generateDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = getDaysInMonth(currentDate);

        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }
        return days;
    };

    const handlePreviousMonth = () => {
        setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
    };

    const handleDateSelect = (day: number) => {
        if (!day) return;
        const selected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        // Format: DD/MM/YYYY
        const formatted = `${String(day).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;
        onSelect(formatted);
        onClose();
    };

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <View style={styles.datePickerOverlay}>
                <View style={styles.datePickerContent}>
                    <View style={styles.datePickerHeader}>
                        <Text style={styles.datePickerTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.calendarHeader}>
                        <TouchableOpacity onPress={handlePreviousMonth}>
                            <Ionicons name="chevron-back" size={24} color="#374151" />
                        </TouchableOpacity>
                        <Text style={styles.monthYearText}>{months[currentDate.getMonth()]} {currentDate.getFullYear()}</Text>
                        <TouchableOpacity onPress={handleNextMonth}>
                            <Ionicons name="chevron-forward" size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.weekDaysRow}>
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                            <Text key={day} style={styles.weekDayText}>{day}</Text>
                        ))}
                    </View>

                    <View style={styles.daysGrid}>
                        {generateDays().map((day, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.dayCell, !day && styles.emptyCell]}
                                onPress={() => day && handleDateSelect(day)}
                                disabled={!day}
                            >
                                <Text style={styles.dayText}>{day}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const AdminDashboardScreen = () => {
    const { user, logout } = useContext(AuthContext);
    const handleLogout = () => { logout(); };
    const navigation = useNavigation<any>();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [expandedPhaseIds, setExpandedPhaseIds] = useState<number[]>([]);

    const togglePhase = (phaseId: number) => {
        setExpandedPhaseIds(prev =>
            prev.includes(phaseId)
                ? prev.filter(id => id !== phaseId)
                : [...prev, phaseId]
        );
    };

    // Profile Dropdown State
    const [profileMenuVisible, setProfileMenuVisible] = useState(false);

    // Notification State
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notificationDropdownVisible, setNotificationDropdownVisible] = useState(false);

    // Stage Options Menu State
    const [stageOptionsVisible, setStageOptionsVisible] = useState(false);
    const [selectedStageOption, setSelectedStageOption] = useState<{ id: number, name: string } | null>(null);

    const fetchNotifications = async () => {
        try {
            const response = await api.get('/notifications');
            setNotifications(response.data.notifications);
            setUnreadCount(response.data.unreadCount);
        } catch (error) {
            console.error('Error details:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    const handleNotificationClick = async (notification: any) => {
        try {
            // Mark as read
            if (!notification.is_read) {
                await api.put(`/notifications/${notification.id}/read`);
                setUnreadCount(prev => Math.max(0, prev - 1));
                setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: 1 } : n));
            }

            setNotificationDropdownVisible(false);

            // Navigate to Project
            if (notification.project_id) {
                const project = sites.find(s => s.id === notification.project_id);
                // If project not found in current list (maybe pagination?), try to fetch or just ignore
                // ideally we should fetch specifically if missing, but for now assuming it's in sites list (fetched on mount)

                if (project) {
                    setSelectedSite(project);
                    await fetchProjectDetails(project.id);
                    setProjectModalVisible(true);

                    // If Phase ID is present, try to expand it (need to wait for fetch?)
                    // fetchProjectDetails is async, so safely we can set expandedPhaseId
                    if (notification.phase_id) {
                        setExpandedPhaseIds([notification.phase_id]);
                        // Also switch to 'Tasks' tab if it's a task update
                        setActiveProjectTab('Tasks');
                    }
                } else {
                    // Fetch site specifically if not in list (fallback)
                    try {
                        const res = await api.get(`/sites/${notification.project_id}`);
                        // setSites... maybe update list?
                        setSelectedSite(res.data);
                        await fetchProjectDetails(notification.project_id);
                        setProjectModalVisible(true);
                        if (notification.phase_id) {
                            setExpandedPhaseIds([notification.phase_id]);
                            setActiveProjectTab('Tasks');
                        }
                    } catch (e) { console.error("Cannot find project", e); }
                }
            }
        } catch (error) {
            console.error('Error handling notification click:', error);
        }
    };

    // Project Modal State (List)
    const [projectModalVisible, setProjectModalVisible] = useState(false);
    const [sites, setSites] = useState<any[]>([]);
    const [selectedSite, setSelectedSite] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingSiteId, setEditingSiteId] = useState<number | null>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [sitePickerVisible, setSitePickerVisible] = useState(false);
    const [settingsPhases, setSettingsPhases] = useState<any[]>([]);

    // Project Detail Data
    const [projectPhases, setProjectPhases] = useState<any[]>([]);
    const [projectTasks, setProjectTasks] = useState<any[]>([]);
    const [projectLoading, setProjectLoading] = useState(false);

    const [phaseModalVisible, setPhaseModalVisible] = useState(false);
    const [newPhaseName, setNewPhaseName] = useState('');
    const [newPhaseSNo, setNewPhaseSNo] = useState('');
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [taskModalVisible, setTaskModalVisible] = useState(false);
    const [addTaskModalVisible, setAddTaskModalVisible] = useState(false);
    const [newTaskName, setNewTaskName] = useState('');
    const [activePhaseId, setActivePhaseId] = useState<number | null>(null);
    const [editPhaseModalVisible, setEditPhaseModalVisible] = useState(false);
    const [editingPhaseId, setEditingPhaseId] = useState<number | null>(null);
    const [editingPhaseName, setEditingPhaseName] = useState('');
    const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');
    const [datePicker, setDatePicker] = useState<{
        visible: boolean,
        field: 'task_start' | 'task_due' | 'project_start' | 'project_end' | null,
        title: string
    }>({ visible: false, field: null, title: 'Select Date' });

    // Employee State
    const [employeeModalVisible, setEmployeeModalVisible] = useState(false);
    const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
    const [newEmployee, setNewEmployee] = useState<{
        name: string;
        email: string;
        password: string;
        phone: string;
        role: 'Admin' | 'Supervisor' | 'Worker' | 'Engineer';
        status: 'Active' | 'Inactive';
    }>({ name: '', email: '', password: '', phone: '', role: 'Worker', status: 'Active' });

    // Task Details Mode State (Full Page)
    const [taskDetailsMode, setTaskDetailsMode] = useState<{
        active: boolean;
        projectId: number | null;
        projectName: string;
        taskId: number | null;
        taskName: string;
        phaseName?: string;
    }>({ active: false, projectId: null, projectName: '', taskId: null, taskName: '', phaseName: '' });

    // Date Picker State for Task Details
    const [datePickerConfig, setDatePickerConfig] = useState({ visible: false, field: '', title: '' });
    const [assignmentPickerVisible, setAssignmentPickerVisible] = useState(false);

    // Project Settings Modal State
    const [projectSettingsVisible, setProjectSettingsVisible] = useState(false);

    // Chat / Stage Progress Modal State
    const [chatPhaseId, setChatPhaseId] = useState<number | null>(null);
    const [chatTaskId, setChatTaskId] = useState<number | null>(null);
    const [chatSiteName, setChatSiteName] = useState<string>('');

    const isFocused = useIsFocused();

    // Fetch Sites on Mount or when Modal opens
    useEffect(() => {
        fetchSites();
        fetchEmployees();
    }, []);

    // Auto-refresh project details when screen gains focus (e.g. returning from assignment)
    useEffect(() => {
        if (isFocused && selectedSite && projectModalVisible) {
            if (selectedSite?.id) fetchProjectDetails(selectedSite.id);
        }
    }, [isFocused]);

    const fetchEmployees = async () => {
        try {
            const response = await api.get('/employees');
            setEmployees(response.data.employees || []);
        } catch (error) {
            console.log('Error fetching employees:', error);
        }
    };

    const fetchSites = async () => {
        setLoading(true);
        try {
            const response = await api.get('/sites');
            setSites(response.data.sites || []);
        } catch (error) {
            console.log('Error fetching sites:', error);
        } finally {
            setLoading(false);
        }
    };

    // Quick Status Box Component
    const StatusBox = ({ label, icon, color = '#8B0000', onPress }: { label: string, icon: any, color?: string, onPress?: () => void }) => (
        <TouchableOpacity style={styles.newStatusCard} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.statusCardIconContainer}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <Text style={styles.statusCardLabel}>{label}</Text>
        </TouchableOpacity>
    );

    const handleProjectClick = () => {
        setProjectModalVisible(true);
        fetchSites(); // Refresh data when opening
    };

    const handleCloseModal = () => {
        setProjectModalVisible(false);
        setSelectedSite(null); // Reset selection on close
        setProjectPhases([]);
        setProjectTasks([]);

        setExpandedPhaseIds([]);
        setPhaseModalVisible(false);
        setNewPhaseName('');
        setNewPhaseSNo('');
    };



    const fetchProjectDetails = async (siteId: number) => {
        setProjectLoading(true);
        try {
            const response = await api.get(`/sites/${siteId}`);
            const phases = response.data.phases || [];
            setProjectPhases(phases);
            setProjectTasks(response.data.tasks || []);

            // Auto-expand first phase if available
            if (phases.length > 0) {
                setExpandedPhaseIds([phases[0].id]);
            }
        } catch (error) {
            console.error('Error fetching project details:', error);
            showToast('Failed to load project details', 'error');
        } finally {
            setProjectLoading(false);
        }
    };

    const handleAddPhase = async () => {
        if (!newPhaseName.trim()) {
            showToast('Please enter a stage name', 'error');
            return;
        }

        try {
            await api.post('/phases', {
                siteId: selectedSite.id,
                name: newPhaseName,
                orderNum: newPhaseSNo || projectPhases.length + 1
            });
            showToast('Stage added successfully', 'success');
            setPhaseModalVisible(false);
            setNewPhaseName('');
            setNewPhaseSNo('');
            fetchProjectDetails(selectedSite.id); // Refresh

            // Refresh settings view if open
            if (projectSettingsVisible && selectedSite?.id) {
                const response = await api.get(`/sites/${selectedSite.id}`);
                if (response.data.phases) {
                    setSettingsPhases(response.data.phases);
                }
            }
        } catch (error) {
            console.error('Error adding phase:', error);
            showToast('Failed to add stage', 'error');
        }
    };


    const handleDeletePhase = async (phaseId: number, phaseName: string) => {
        const confirmDelete = Platform.OS === 'web'
            ? window.confirm(`Are you sure you want to delete the "${phaseName}" stage? This will also delete all tasks inside it.`)
            : await new Promise(resolve => {
                Alert.alert(
                    "Delete Stage",
                    `Are you sure you want to delete "${phaseName}"? All tasks inside will be lost.`,
                    [
                        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                        { text: "Delete", style: "destructive", onPress: () => resolve(true) }
                    ]
                );
            });

        if (!confirmDelete) return;

        try {
            await api.delete(`/phases/${phaseId}`);
            showToast('Stage deleted successfully', 'success');
            if (selectedSite?.id) fetchProjectDetails(selectedSite.id);

            // Refresh settings view if open
            if (projectSettingsVisible && selectedSite?.id) {
                const response = await api.get(`/sites/${selectedSite.id}`);
                if (response.data.phases) {
                    setSettingsPhases(response.data.phases);
                }
            }
        } catch (error) {
            console.error('Error deleting phase:', error);
            showToast('Failed to delete stage', 'error');
        }
    };

    const handleDeleteTask = async (taskId: number, taskName: string) => {
        const confirmDelete = Platform.OS === 'web'
            ? window.confirm(`Are you sure you want to delete "${taskName}"?`)
            : await new Promise(resolve => {
                Alert.alert(
                    "Delete Task",
                    `Are you sure you want to delete "${taskName}"?`,
                    [
                        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                        { text: "Delete", style: "destructive", onPress: () => resolve(true) }
                    ]
                );
            });

        if (!confirmDelete) return;

        try {
            await api.delete(`/tasks/${taskId}`);
            showToast('Task deleted successfully', 'success');
            if (selectedSite?.id) fetchProjectDetails(selectedSite.id);
        } catch (error) {
            console.error('Error deleting task:', error);
            showToast('Failed to delete task', 'error');
        }
    };

    const handleAddTask = async () => {
        if (!newTaskName.trim() || !activePhaseId) {
            showToast('Please enter a task name', 'error');
            return;
        }

        try {
            await api.post('/tasks', {
                siteId: selectedSite.id,
                phaseId: activePhaseId,
                name: newTaskName
            });
            showToast('Task added successfully', 'success');
            setAddTaskModalVisible(false);
            setNewTaskName('');
            if (selectedSite?.id) fetchProjectDetails(selectedSite.id);
        } catch (error) {
            console.error('Error adding task:', error);
            showToast('Failed to add task', 'error');
        }
    };

    const handleUpdateTask = async () => {
        if (!selectedTask) return;

        try {
            const updatedData = {
                name: selectedTask.name,
                status: selectedTask.status,
                start_date: selectedTask.start_date,
                due_date: selectedTask.due_date,
                amount: selectedTask.amount,
                assigned_to: selectedTask.assigneeIds || []
            };

            console.log('Sending Update:', updatedData);

            await api.put(`/tasks/${selectedTask.id}`, updatedData);

            showToast('Task updated successfully', 'success');
            setTaskDetailsMode({ ...taskDetailsMode, active: false }); // Close full page
            setTaskModalVisible(false); // Ensure old modal is closed

            // NAVIGATION FIX: Return to Project -> Tasks view
            setActiveTab('Dashboard');
            setProjectModalVisible(true);
            setActiveProjectTab('Tasks');

            // Ensure the specific project is still selected (it should be in state, but safe to verify)
            if (selectedSite?.id) {
                if (selectedSite?.id) fetchProjectDetails(selectedSite.id);
            }
        } catch (error: any) {
            console.error('Error updating task:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to update task';
            showToast(errorMessage, 'error');
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'TBD';
        return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Project Details Tabs
    const [activeProjectTab, setActiveProjectTab] = useState<'Tasks' | 'Transactions' | 'Materials' | 'Files'>('Tasks');
    const TABS = ['Tasks', 'Transactions', 'Materials', 'Files'];

    // Create Project Modal State
    const [createModalVisible, setCreateModalVisible] = useState(false);

    // Toast State
    const [toast, setToast] = useState<{ visible: boolean, message: string, type: 'success' | 'error' }>({
        visible: false, message: '', type: 'success'
    });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ visible: true, message, type });
    };

    const hideToast = () => {
        setToast(prev => ({ ...prev, visible: false }));
    };


    const openDatePicker = (field: 'task_start' | 'task_due' | 'project_start' | 'project_end', title: string) => {
        setDatePicker({ visible: true, field, title });
    };

    const handleDateConfirm = (formattedDate: string) => {
        if (datePicker.field === 'task_start' && selectedTask) {
            setSelectedTask({ ...selectedTask, start_date: formattedDate });
        } else if (datePicker.field === 'task_due' && selectedTask) {
            setSelectedTask({ ...selectedTask, due_date: formattedDate });
        } else if (datePicker.field === 'project_start') {
            setFormData({ ...formData, startDate: formattedDate });
        } else if (datePicker.field === 'project_end') {
            setFormData({ ...formData, endDate: formattedDate });
        }
        setDatePicker(prev => ({ ...prev, visible: false }));
    };

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        city: '',
        state: '',
        country: '',
        clientName: '',
        clientCompany: '',
        clientEmail: '',
        clientPhone: '',
        startDate: '',
        endDate: '',
        budget: '',
        siteFunds: ''
    });

    // State for Task Assignment / Details Modal
    // (States are already defined above around line 240-280)

    const handleCreateProject = () => {
        setIsEditing(false);
        setEditingSiteId(null);
        setCreateModalVisible(true);
    };

    const handleOpenSettings = async (site: any) => {
        setIsEditing(true);
        setEditingSiteId(site.id);
        setSelectedSite(site);

        const formatForForm = (dateIso: string) => {
            if (!dateIso) return '';
            const d = new Date(dateIso);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        };

        setFormData({
            name: site.name || '',
            address: site.location || '',
            city: site.city || '',
            state: site.state || '',
            country: site.country || '',
            clientName: site.client_name || '',
            clientCompany: site.client_company || '',
            clientEmail: site.client_email || '',
            clientPhone: site.client_phone || '',
            startDate: formatForForm(site.start_date),
            endDate: formatForForm(site.end_date),
            budget: site.budget ? String(site.budget) : '',
            siteFunds: site.site_funds ? String(site.site_funds) : ''
        });

        setProjectSettingsVisible(true);

        // Fetch full site details including phases
        try {
            const response = await api.get(`/sites/${site.id}`);
            if (response.data.phases) {
                setSettingsPhases(response.data.phases);
            }
        } catch (error) {
            console.error('Error fetching site details for settings:', error);
        }
    };

    const handleEditProject = (site: any) => {
        handleOpenSettings(site);
        setProjectSettingsVisible(false); // Close settings if navigating to the specific edit modal
        setCreateModalVisible(true);
    };

    const handleCloseCreateModal = () => {
        setCreateModalVisible(false);
        setIsEditing(false);
        setEditingSiteId(null);
        setFormData({
            name: '', address: '', city: '', state: '', country: '',
            clientName: '', clientCompany: '', clientEmail: '', clientPhone: '',
            startDate: '', endDate: '', budget: '', siteFunds: ''
        });
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Convert DD/MM/YYYY to YYYY-MM-DD
    const formatDateForApi = (dateStr: string) => {
        if (!dateStr) return null;
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month}-${day}`;
    };

    const submitCreateProject = async (shouldClose = true) => {
        if (!formData.name || !formData.address) {
            alert('Please fill in required fields');
            return;
        }

        try {
            const payload = {
                ...formData,
                location: formData.address,
                startDate: formatDateForApi(formData.startDate),
                endDate: formatDateForApi(formData.endDate),
                site_funds: formData.siteFunds,
                phaseUpdates: settingsPhases.map(p => ({ id: p.id, budget: parseFloat(String(p.budget)) || 0 }))
            };

            if (isEditing && editingSiteId) {
                const response = await api.put(`/sites/${editingSiteId}`, payload);
                if (response.status === 200) {
                    showToast('Project updated successfully', 'success');
                    fetchSites();
                    if (shouldClose) handleCloseCreateModal();
                    // Update selected site to reflect changes immediately if in detail view
                    setSelectedSite((prev: any) => ({
                        ...prev,
                        ...payload,
                        start_date: payload.startDate,
                        end_date: payload.endDate,
                        client_name: payload.clientName,
                        client_email: payload.clientEmail,
                        client_phone: payload.clientPhone,
                        budget: payload.budget,
                        site_funds: payload.site_funds
                    }));
                }
            } else {
                const response = await api.post('/sites', payload);
                if (response.status === 201) {
                    showToast('Project created successfully', 'success');
                    fetchSites();
                    if (shouldClose) handleCloseCreateModal();
                }
            }
        } catch (error) {
            console.error('Error saving project:', error);
            showToast(isEditing ? 'Failed to update project' : 'Failed to create project', 'error');
        }
    };

    const handleSaveEmployee = async () => {
        if (!newEmployee.name || !newEmployee.phone || !newEmployee.role) {
            showToast('Name, Phone, and Role are required', 'error');
            return;
        }

        if (!editingEmployeeId && !newEmployee.password) {
            showToast('Password is required for new employees', 'error');
            return;
        }

        try {
            // Transform role to lowercase for backend consistency if needed, 
            // but backend enum supports lowercase. Let's keep consistent.
            // Actually backend enum has 'admin', 'employee', 'supervisor', 'worker', 'engineer'.
            // Frontend uses Title Case 'Admin', 'Supervisor'... Map it.
            const payload = {
                ...newEmployee,
                role: newEmployee.role.toLowerCase(), // Ensure lowercase for backend enum
                status: newEmployee.status
            };

            if (editingEmployeeId) {
                await api.put(`/employees/${editingEmployeeId}`, payload);
                showToast('Employee updated successfully', 'success');
            } else {
                await api.post('/employees', payload);
                showToast('Employee added successfully', 'success');
            }

            setEmployeeModalVisible(false);
            setNewEmployee({ name: '', email: '', password: '', phone: '', role: 'Worker', status: 'Active' });
            setEditingEmployeeId(null);
            fetchEmployees();
        } catch (error: any) {
            console.error('Error saving employee:', error);
            showToast(error.response?.data?.message || 'Failed to save employee', 'error');
        }
    };

    const handleEditEmployee = (employee: any) => {
        // Map backend role to frontend Title Case
        const mapRole = (r: string) => {
            if (!r) return 'Worker';
            const lower = r.toLowerCase();
            if (lower === 'admin') return 'Admin';
            if (lower === 'supervisor') return 'Supervisor';
            if (lower === 'engineer') return 'Engineer';
            return 'Worker';
        };

        setNewEmployee({
            name: employee.name,
            email: employee.email || '',
            password: '',
            phone: employee.phone || '',
            role: mapRole(employee.role),
            status: employee.status === 'Inactive' ? 'Inactive' : 'Active'
        });
        setEditingEmployeeId(employee.id);
        setEmployeeModalVisible(true);
    };

    const handleDeleteEmployee = async (id: number, name: string) => {
        const confirmDelete = Platform.OS === 'web'
            ? window.confirm(`Are you sure you want to delete employee "${name}"?`)
            : await new Promise(resolve => {
                Alert.alert(
                    "Delete Employee",
                    `Are you sure you want to delete "${name}"?`,
                    [
                        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                        { text: "Delete", style: "destructive", onPress: () => resolve(true) }
                    ]
                );
            });

        if (!confirmDelete) return;

        try {
            await api.delete(`/employees/${id}`);
            showToast('Employee deleted successfully', 'success');
            fetchEmployees();
        } catch (error: any) {
            console.error('Error deleting employee:', error);
            showToast('Failed to delete employee', 'error');
        }
    };

    const handleUpdatePhase = async () => {
        if (!editingPhaseName.trim()) {
            showToast('Phase name is required', 'error');
            return;
        }

        try {
            // Find current phase to keep order_num
            const currentPhase = projectPhases.find(p => p.id === editingPhaseId);
            const order_num = currentPhase?.order_num || projectPhases.length;

            await api.put(`/phases/${editingPhaseId}`, {
                name: editingPhaseName,
                order_num: order_num
            });

            showToast('Phase updated successfully', 'success');
            setEditPhaseModalVisible(false);
            setEditingPhaseId(null);
            setEditingPhaseName('');
            if (selectedSite?.id) fetchProjectDetails(selectedSite.id);
        } catch (error: any) {
            console.error('Error updating phase:', error);
            showToast('Failed to update phase', 'error');
        }
    };

    const handleAssignTask = (task: any, phase: any) => {
        // Initialize assigneeIds from existing assignments if available
        // Backend returns assignments as {id, name, role}, where id is the employee id
        const currentAssigneeIds = task.assignments ? task.assignments.map((a: any) => a.id) : [];

        setSelectedTask({
            ...task,
            phase_id: phase.id,
            assigneeIds: currentAssigneeIds
        });
        setTaskDetailsMode({
            active: true,
            projectId: selectedSite?.id,
            projectName: selectedSite?.name,
            taskId: task.id,
            taskName: task.name,
            phaseName: phase.name
        });
        setProjectModalVisible(false); // Close Modal -> Full Page
        setActiveTab('Workers'); // Use Workers tab space for rendering full page
    };

    const handleApproveTask = async (task: any) => {
        try {
            await api.put(`/tasks/${task.id}/approve`);
            setTaskModalVisible(false);
            if (selectedSite?.id) fetchProjectDetails(selectedSite.id);
            Alert.alert('Success', 'Task approved and marked as completed.');
        } catch (error) {
            console.error('Error approving task:', error);
            Alert.alert('Error', 'Failed to approve task');
        }
    };

    const handleRejectTask = async (task: any) => {
        try {
            // Simplified reject for now (no reason prompt yet, or hardcoded)
            await api.put(`/tasks/${task.id}/reject`, { reason: 'Admin requested changes' });
            setTaskModalVisible(false);
            if (selectedSite?.id) fetchProjectDetails(selectedSite.id);
            Alert.alert('Success', 'Changes requested. Task reverted to In Progress.');
        } catch (error) {
            console.error('Error rejecting task:', error);
            Alert.alert('Error', 'Failed to reject task');
        }
    };


    const confirmDeleteTask = async (taskId: number) => {
        const handleDelete = async () => {
            try {
                await api.delete(`/tasks/${taskId}`);
                showToast('Task deleted successfully', 'success');
                if (selectedSite?.id) {
                    if (selectedSite?.id) fetchProjectDetails(selectedSite.id);
                }
            } catch (error) {
                console.error('Error deleting task:', error);
                Alert.alert('Error', 'Failed to delete task');
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
                handleDelete();
            }
        } else {
            Alert.alert(
                'Delete Task',
                'Are you sure you want to delete this task? This action cannot be undone.',
                [
                    {
                        text: 'Cancel',
                        style: 'cancel'
                    },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: handleDelete
                    }
                ]
            );
        }
    };

    const renderEmployeeItem = ({ item }: { item: any }) => (
        <View style={styles.employeeCard}>
            <View style={styles.employeeInfo}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                    </Text>
                </View>
                <View>
                    <Text style={styles.employeeName}>{item.name}</Text>
                    <Text style={styles.employeeRole}>{item.role}</Text>
                </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.iconButton} onPress={() => handleEditEmployee(item)}>
                    <MaterialIcons name="edit" size={20} color="#4B5563" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={() => handleDeleteEmployee(item.id, item.name)}>
                    <MaterialIcons name="delete" size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderTaskDetailsPage = () => {
        if (!taskDetailsMode.active || !selectedTask) return null;

        const openDatePicker = (field: 'start_date' | 'due_date', title: string) => {
            setDatePickerConfig({ visible: true, field, title });
        };

        return (
            <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
                    <TouchableOpacity
                        onPress={() => {
                            setTaskDetailsMode({ active: false, projectId: null, projectName: '', taskId: null, taskName: '', phaseName: '' });
                            setActiveTab('Dashboard');
                            setProjectModalVisible(true);
                            if (selectedSite?.id) fetchProjectDetails(selectedSite.id);
                        }}
                        style={{ padding: 8, marginRight: 8 }}
                    >
                        <Ionicons name="arrow-back" size={24} color="#374151" />
                    </TouchableOpacity>
                    <View>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Task Details</Text>
                        <Text style={{ fontSize: 12, color: '#6b7280' }}>
                            {taskDetailsMode.projectName} {'>'} {taskDetailsMode.phaseName}
                        </Text>
                    </View>
                </View>

                <ScrollView style={{ padding: 20 }}>
                    <View style={styles.formSection}>
                        <Text style={styles.fieldLabel}>Task Name</Text>
                        <TextInput
                            style={styles.inputField}
                            value={selectedTask.name}
                            onChangeText={(val) => setSelectedTask({ ...selectedTask, name: val })}
                        />

                        <Text style={styles.fieldLabel}>Status</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                            {['Not Started', 'In Progress'].map(status => (
                                <TouchableOpacity
                                    key={status}
                                    style={[
                                        styles.statusOption,
                                        selectedTask.status === status && styles.statusOptionActive,
                                        selectedTask.status === status && status === 'In Progress' && styles.statusBtnProgress,
                                        { flex: 1, alignItems: 'center', paddingVertical: 12 }
                                    ]}
                                    onPress={() => setSelectedTask({ ...selectedTask, status })}
                                >
                                    <Text style={[
                                        styles.statusOptionText,
                                        selectedTask.status === status && styles.statusOptionTextActive
                                    ]}>{status}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.fieldLabel}>Assigned Employees</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                            {selectedTask.assigneeIds?.map((id: number) => {
                                const emp = employees.find(e => e.id === id);
                                return (
                                    <View key={id} style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        backgroundColor: '#E0E7FF',
                                        paddingVertical: 6,
                                        paddingHorizontal: 12,
                                        borderRadius: 20,
                                        borderWidth: 1,
                                        borderColor: '#C7D2FE'
                                    }}>
                                        <Text style={{ marginRight: 6, color: '#3730A3', fontWeight: '500' }}>{emp?.name || 'Unknown'}</Text>
                                        <TouchableOpacity onPress={() => {
                                            setSelectedTask({
                                                ...selectedTask,
                                                assigneeIds: selectedTask.assigneeIds.filter((aid: number) => aid !== id)
                                            });
                                        }}>
                                            <Ionicons name="close-circle" size={18} color="#6366F1" />
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}

                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}
                                onPress={() => setAssignmentPickerVisible(true)}
                            >
                                <Ionicons name="add-circle" size={24} color="#8B0000" />
                                <Text style={{ color: '#8B0000', fontWeight: '600', marginLeft: 4 }}>Assignee</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.fieldLabel}>Start Date</Text>
                                <TouchableOpacity
                                    style={styles.dateSelector}
                                    onPress={() => openDatePicker('start_date', 'Select Start Date')}
                                >
                                    <Text>{selectedTask.start_date ? new Date(selectedTask.start_date).toLocaleDateString() : 'TBD'}</Text>
                                    <Ionicons name="calendar-outline" size={18} color="#6b7280" />
                                </TouchableOpacity>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.fieldLabel}>Due Date</Text>
                                <TouchableOpacity
                                    style={styles.dateSelector}
                                    onPress={() => openDatePicker('due_date', 'Select Due Date')}
                                >
                                    <Text>{selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'TBD'}</Text>
                                    <Ionicons name="calendar-outline" size={18} color="#6b7280" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Amount / Budget</Text>
                        <TextInput
                            style={styles.inputField}
                            value={selectedTask.amount?.toString() || ''}
                            onChangeText={(val) => setSelectedTask({ ...selectedTask, amount: val })}
                            keyboardType="numeric"
                            placeholder="0.00"
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleUpdateTask}
                    >
                        <Text style={styles.submitButtonText}>Update Task</Text>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>

                <CustomDatePicker
                    visible={datePickerConfig.visible}
                    title={datePickerConfig.title}
                    onClose={() => setDatePickerConfig(prev => ({ ...prev, visible: false }))}
                    onSelect={(dateStr) => {
                        const [d, m, y] = dateStr.split('/');
                        const isoDate = `${y}-${m}-${d}`;
                        if (datePickerConfig.field) {
                            setSelectedTask({ ...selectedTask, [datePickerConfig.field]: isoDate });
                        }
                    }}
                />

                {/* Assignment Picker Modal */}
                <Modal
                    visible={assignmentPickerVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setAssignmentPickerVisible(false)}
                >
                    <TouchableOpacity
                        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
                        activeOpacity={1}
                        onPress={() => setAssignmentPickerVisible(false)}
                    >
                        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '80%', maxHeight: '60%' }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Select Employee</Text>
                            <ScrollView>
                                {employees.filter(e => e.status === 'Active' && !selectedTask.assigneeIds?.includes(e.id)).map(emp => (
                                    <TouchableOpacity
                                        key={emp.id}
                                        style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center' }}
                                        onPress={() => {
                                            setSelectedTask({
                                                ...selectedTask,
                                                assigneeIds: [...(selectedTask.assigneeIds || []), emp.id]
                                            });
                                            setAssignmentPickerVisible(false);
                                        }}
                                    >
                                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                            <Text style={{ color: '#3730A3', fontWeight: 'bold' }}>{emp.name.charAt(0)}</Text>
                                        </View>
                                        <View>
                                            <Text style={{ fontSize: 16, color: '#111827' }}>{emp.name}</Text>
                                            <Text style={{ fontSize: 12, color: '#6b7280' }}>{emp.role}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                                {employees.filter(e => e.status === 'Active' && !selectedTask.assigneeIds?.includes(e.id)).length === 0 && (
                                    <Text style={{ textAlign: 'center', color: '#6b7280', padding: 20 }}>No more employees to assign</Text>
                                )}
                            </ScrollView>
                            <TouchableOpacity
                                style={{ marginTop: 16, padding: 12, backgroundColor: '#f3f4f6', borderRadius: 8, alignItems: 'center' }}
                                onPress={() => setAssignmentPickerVisible(false)}
                            >
                                <Text style={{ color: '#374151', fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'default'} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Noor Construction</Text>
                    <Text style={styles.headerSubtitle}>Admin Dashboard</Text>
                </View>

                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.headerIconButton}
                        onPress={() => setNotificationDropdownVisible(!notificationDropdownVisible)}
                    >
                        <Ionicons name="notifications-outline" size={22} color="#374151" />
                        {
                            unreadCount > 0 && (
                                <View style={styles.newNotificationBadge}>
                                    <Text style={styles.notificationBadgeText}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </Text>
                                </View>
                            )
                        }
                    </TouchableOpacity >

                    <TouchableOpacity
                        style={styles.headerIconButton}
                        onPress={() => {
                            logout();
                            navigation.navigate('Login' as never);
                        }}
                    >
                        <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.headerProfileAvatar}
                        onPress={async () => {
                            Alert.alert(
                                'Logout',
                                'Are you sure you want to logout?',
                                [
                                    {
                                        text: 'Cancel',
                                        style: 'cancel'
                                    },
                                    {
                                        text: 'Logout',
                                        style: 'destructive',
                                        onPress: () => {
                                            logout();
                                            navigation.navigate('Login' as never);
                                        }
                                    }
                                ]
                            );
                        }}
                    >
                        <Text style={styles.avatarTextInitial}>A</Text>
                    </TouchableOpacity>
                </View >
            </View >

            {/* Notification Dropdown */}
            {
                notificationDropdownVisible && (
                    <View style={{
                        position: 'absolute',
                        top: 60,
                        right: 20,
                        width: 300,
                        backgroundColor: '#fff',
                        borderRadius: 12,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 12,
                        elevation: 8,
                        zIndex: 1000,
                        maxHeight: 400
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>Notifications</Text>
                            <TouchableOpacity onPress={() => setNotificationDropdownVisible(false)}>
                                <Ionicons name="close" size={20} color="#6b7280" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 340 }}>
                            {notifications.length > 0 ? (
                                notifications.map((notification) => (
                                    <TouchableOpacity
                                        key={notification.id}
                                        style={{
                                            padding: 12,
                                            borderBottomWidth: 1,
                                            borderBottomColor: '#f3f4f6',
                                            backgroundColor: notification.is_read ? '#fff' : '#fef2f2'
                                        }}
                                        onPress={() => handleNotificationClick(notification)}
                                    >
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#8B0000' }}>
                                                {notification.project_name || 'System'}
                                            </Text>
                                            <Text style={{ fontSize: 10, color: '#9ca3af' }}>
                                                {new Date(notification.created_at).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <Text style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>
                                            {notification.message}
                                        </Text>
                                        <Text style={{ fontSize: 11, color: '#6b7280' }}>
                                            {notification.type.replace('_', ' ')}
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
                )
            }

            {/* Main Content Area */}
            <View style={styles.newMainContent}>
                {activeTab === 'Dashboard' && (
                    <View style={{ flex: 1 }}>
                        {/* Summary Cards Row */}
                        <View style={styles.newStatusRow}>
                            <StatusBox
                                label="Employees"
                                icon="people-outline"
                                onPress={() => setActiveTab('Workers')}
                            />
                            <StatusBox
                                label="Reports"
                                icon="bar-chart-outline"
                                onPress={() => showToast('Reports feature coming soon')}
                            />
                            <StatusBox
                                label="Expenses"
                                icon="cash-outline"
                                onPress={() => showToast('Expenses feature coming soon')}
                            />
                        </View>

                        {/* Search and Filters */}
                        <View style={styles.newSearchSection}>
                            <TouchableOpacity
                                style={styles.newFilterChip}
                                onPress={() => {
                                    setIsEditing(false);
                                    setEditingSiteId(null);
                                    setCreateModalVisible(true);
                                }}
                            >
                                <Ionicons name="add-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                                <Text style={styles.filterChipText}>Site</Text>
                            </TouchableOpacity>
                            <View style={styles.newSearchBar}>
                                <Ionicons name="search-outline" size={18} color="#9ca3af" />
                                <TextInput
                                    style={styles.newSearchInput}
                                    placeholder="Search..."
                                    value={dashboardSearchQuery}
                                    onChangeText={setDashboardSearchQuery}
                                />
                            </View>
                            <TouchableOpacity
                                style={styles.newFilterIconButton}
                                onPress={() => {
                                    setIsEditing(false);
                                    setEditingSiteId(null);
                                    setCreateModalVisible(true);
                                }}
                            >
                                <Ionicons name="options-outline" size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.newActiveProjectsTitle}>Active Projects</Text>

                        {/* Active Projects List */}
                        <FlatList
                            data={sites.filter(s => s.name.toLowerCase().includes(dashboardSearchQuery.toLowerCase()))}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.newProjectRow}
                                    onPress={() => {
                                        setSelectedSite(item);
                                        fetchProjectDetails(item.id);
                                        setProjectModalVisible(true);
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.newProjectName}>{item.name}</Text>
                                        <Text style={styles.newProjectLocation}>{item.location || 'No location'}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <View style={styles.newEmptyState}>
                                    <Text style={styles.newEmptyText}>No active projects found</Text>
                                </View>
                            }
                            contentContainerStyle={{ paddingBottom: 20 }}
                        />
                    </View>
                )}

                {/* WORKERS TAB - Repurposed for Full Page Views if needed */}
                {activeTab === 'Workers' && (
                    taskDetailsMode.active ? renderTaskDetailsPage() : (
                        <View style={{ flex: 1, padding: 20 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <Text style={{ fontSize: 24, fontWeight: '700', color: '#111827' }}>Workers</Text>
                                <TouchableOpacity
                                    style={{ backgroundColor: '#8B0000', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                                    onPress={() => {
                                        setNewEmployee({ name: '', email: '', password: '', phone: '', role: 'Worker', status: 'Active' });
                                        setEditingEmployeeId(null);
                                        setEmployeeModalVisible(true);
                                    }}
                                >
                                    <Ionicons name="add" size={20} color="#fff" />
                                    <Text style={{ color: '#fff', fontWeight: '600' }}>Add Worker</Text>
                                </TouchableOpacity>
                            </View>

                            <FlatList
                                data={employees}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={renderEmployeeItem}
                                contentContainerStyle={{ paddingBottom: 80 }}
                                ListEmptyComponent={
                                    <View style={{ alignItems: 'center', marginTop: 50 }}>
                                        <Text style={{ color: '#6b7280' }}>No employees found.</Text>
                                    </View>
                                }
                            />
                        </View>
                    )
                )}
            </View>



            {/* Project Details Modal */}
            <Modal
                visible={projectModalVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setProjectModalVisible(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setProjectModalVisible(false)}>
                            <Ionicons name="arrow-back" size={24} color="#374151" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>{selectedSite?.name}</Text>
                        <TouchableOpacity
                            style={styles.detailsButton}
                            onPress={() => handleOpenSettings(selectedSite)}
                        >
                            <Text style={styles.detailsButtonText}>Details</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Project Sub-Tabs */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalTabsContainer}>
                        {['Tasks', 'Transactions', 'Materials', 'Files'].map(tab => (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.modalTab, activeProjectTab === tab && styles.modalTabActive]}
                                onPress={() => setActiveProjectTab(tab as any)}
                            >
                                <Text style={[styles.modalTabText, activeProjectTab === tab && styles.modalTabTextActive]}>{tab}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <ScrollView style={styles.modalBody}>
                        {activeProjectTab === 'Tasks' && (
                            <View style={styles.tabContentContainer}>
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={styles.tabSectionTitle}>Construction Stages</Text>
                                    <TouchableOpacity style={styles.addButtonSmall} onPress={() => setPhaseModalVisible(true)}>
                                        <Ionicons name="add" size={18} color="#fff" />
                                        <Text style={styles.addButtonTextSmall}>Add Stage</Text>
                                    </TouchableOpacity>
                                </View>

                                {projectPhases.length === 0 ? (
                                    <View style={styles.emptyTabState}>
                                        <Ionicons name="layers-outline" size={48} color="#e5e7eb" />
                                        <Text style={styles.emptyTabText}>No stages defined</Text>
                                    </View>
                                ) : (
                                    projectPhases.map((phase, index) => {
                                        const tasksInPhase = projectTasks.filter(t => t.phase_id === phase.id);
                                        const isExpanded = expandedPhaseIds.includes(phase.id);
                                        const completedTasks = tasksInPhase.filter(t => t.status === 'Completed').length;
                                        const totalTasks = tasksInPhase.length;
                                        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                                        return (
                                            <View key={phase.id} style={styles.phaseContainer}>
                                                <TouchableOpacity
                                                    style={[styles.phaseHeader, isExpanded ? styles.phaseHeaderExpanded : styles.phaseHeaderCollapsed, isMobile && { flexDirection: 'column', alignItems: 'stretch', gap: 12 }]}
                                                    onPress={() => togglePhase(phase.id)}
                                                    activeOpacity={0.9}
                                                >
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, width: isMobile ? '100%' : 'auto', flex: isMobile ? 0 : 1 }}>
                                                        <View style={styles.phaseBadge}>
                                                            <Text style={styles.phaseBadgeText}>{index + 1}</Text>
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={styles.phaseTitle} numberOfLines={2}>{phase.name}</Text>
                                                            <Text style={styles.phaseSubtitle}>{completedTasks}/{totalTasks} Completed • {progress}%</Text>
                                                        </View>
                                                    </View>

                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end', width: isMobile ? '100%' : 'auto', paddingTop: isMobile ? 8 : 0, borderTopWidth: isMobile ? 1 : 0, borderTopColor: isMobile ? 'rgba(255,255,255,0.2)' : 'transparent' }}>

                                                        <TouchableOpacity
                                                            style={styles.iconButton}
                                                            onPress={() => {
                                                                setSelectedStageOption({ id: phase.id, name: phase.name });
                                                                setStageOptionsVisible(true);
                                                            }}
                                                        >
                                                            <Ionicons name="ellipsis-vertical" size={18} color="#fff" />
                                                        </TouchableOpacity>
                                                        <View style={styles.iconButton}>
                                                            <Ionicons
                                                                name={isExpanded ? "chevron-up" : "chevron-down"}
                                                                size={20}
                                                                color="#fff"
                                                            />
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>

                                                {isExpanded && (
                                                    <View style={styles.taskList}>
                                                        {tasksInPhase.length > 0 ? (
                                                            tasksInPhase.map((task) => <View key={task.id} style={[styles.taskItem, isMobile && { flexDirection: 'column', alignItems: 'stretch', gap: 12 }]}>
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, width: isMobile ? '100%' : 'auto', flex: isMobile ? 0 : 1, minWidth: 200 }}>
                                                                    <TouchableOpacity
                                                                        style={[styles.radioButton, task.status === 'Completed' && styles.radioButtonSelected]}
                                                                    />
                                                                    <TouchableOpacity
                                                                        style={{ flex: 1 }}
                                                                        onPress={() => {
                                                                            // Open Stage Progress / Chat View via Modal (to overlay over Project Modal)
                                                                            setChatPhaseId(phase.id);
                                                                            setChatTaskId(task.id);
                                                                            setChatSiteName(selectedSite?.name || 'Site');
                                                                        }}
                                                                    >
                                                                        {task.status === 'waiting_for_approval' && (
                                                                            <View style={{
                                                                                backgroundColor: '#FEF9C3',
                                                                                alignSelf: 'flex-start',
                                                                                paddingHorizontal: 8,
                                                                                paddingVertical: 2,
                                                                                borderRadius: 4,
                                                                                marginBottom: 4,
                                                                                borderWidth: 1,
                                                                                borderColor: '#FDE047'
                                                                            }}>
                                                                                <Text style={{ color: '#854D0E', fontSize: 10, fontWeight: 'bold' }}>🟡 Completed – Approval Pending</Text>
                                                                            </View>
                                                                        )}
                                                                        <Text style={styles.taskTitle}>{task.name}</Text>
                                                                        <Text style={styles.taskSubtitle}>{task.status}</Text>
                                                                    </TouchableOpacity>
                                                                </View>

                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: isMobile ? 'space-between' : 'flex-end', width: isMobile ? '100%' : 'auto' }}>
                                                                    {user?.role === 'admin' && (
                                                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                                                            {task.assignments && task.assignments.length > 0 ? (
                                                                                <>
                                                                                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                                                        {task.assignments.map((assignment: any) => (
                                                                                            <View key={assignment.id} style={styles.employeeNameBadge}>
                                                                                                <Text style={{ fontSize: 10 }}>👷</Text>
                                                                                                <Text style={styles.employeeNameText}>
                                                                                                    {assignment.name ? assignment.name.split(' ')[0] : 'Unknown'}
                                                                                                </Text>
                                                                                            </View>
                                                                                        ))}
                                                                                        {task.due_date && (
                                                                                            <View style={[styles.employeeNameBadge, { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }]}>
                                                                                                <Text style={{ fontSize: 10 }}>📅</Text>
                                                                                                <Text style={[styles.employeeNameText, { color: '#374151' }]}>
                                                                                                    Due: {new Date(task.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                                                </Text>
                                                                                            </View>
                                                                                        )}
                                                                                    </View>
                                                                                </>
                                                                            ) : null}

                                                                            <TouchableOpacity
                                                                                style={styles.addAssigneeBtn}
                                                                                onPress={() => handleAssignTask(task, phase)}
                                                                            >
                                                                                <Ionicons name="pencil" size={16} color="#374151" />
                                                                            </TouchableOpacity>
                                                                        </View>
                                                                    )}





                                                                    <TouchableOpacity style={styles.iconButton} onPress={() => confirmDeleteTask(task.id)}>
                                                                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                                                                    </TouchableOpacity>
                                                                </View>
                                                            </View>
                                                            )
                                                        ) : (
                                                            <Text style={styles.noTasksText}>No tasks in this stage</Text>
                                                        )}

                                                        <TouchableOpacity
                                                            style={styles.addTaskBtn}
                                                            onPress={() => {
                                                                setActivePhaseId(phase.id);
                                                                setNewTaskName('');
                                                                setAddTaskModalVisible(true);
                                                            }}
                                                        >
                                                            <Ionicons name="add-circle-outline" size={20} color="#8B0000" />
                                                            <Text style={styles.addTaskTextSmall}>Add Task to this Stage</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                )}

                                            </View>
                                        );
                                    })
                                )}
                            </View>
                        )
                        }

                        {activeProjectTab === 'Transactions' && (
                            <View style={styles.tabContentContainer}>
                                <Text style={styles.tabSectionTitle}>Transactions</Text>
                                <View style={styles.emptyTabState}>
                                    <Ionicons name="wallet-outline" size={48} color="#e5e7eb" />
                                    <Text style={styles.emptyTabText}>No transactions found</Text>
                                </View>
                            </View>
                        )}

                        {
                            activeProjectTab === 'Materials' && (
                                <View style={styles.tabContentContainer}>
                                    <View style={styles.sectionHeaderRow}>
                                        <Text style={styles.tabSectionTitle}>Materials</Text>
                                        <TouchableOpacity style={styles.addButtonSmall}>
                                            <Ionicons name="add" size={18} color="#fff" />
                                            <Text style={styles.addButtonTextSmall}>Add</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.emptyTabState}>
                                        <Ionicons name="cube-outline" size={48} color="#e5e7eb" />
                                        <Text style={styles.emptyTabText}>No materials tracked</Text>
                                    </View>
                                </View>
                            )
                        }

                        {
                            activeProjectTab === 'Files' && (
                                <View style={styles.tabContentContainer}>
                                    <View style={styles.sectionHeaderRow}>
                                        <Text style={styles.tabSectionTitle}>Project Files</Text>
                                        <TouchableOpacity style={styles.addButtonSmall}>
                                            <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                                            <Text style={styles.addButtonTextSmall}>Upload</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.emptyTabState}>
                                        <Ionicons name="document-text-outline" size={48} color="#e5e7eb" />
                                        <Text style={styles.emptyTabText}>No files uploaded</Text>
                                    </View>
                                </View>
                            )
                        }
                    </ScrollView >
                </SafeAreaView>
            </Modal>

            {/* Add Phase Modal (Small) */}
            <Modal
                visible={phaseModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setPhaseModalVisible(false)}
            >
                <View style={styles.miniModalOverlay}>
                    <View style={styles.miniModalContent}>
                        <Text style={styles.miniModalTitle}>Add New Construction Stage</Text>
                        <TextInput
                            style={styles.miniModalInput}
                            placeholder="Enter stage name (e.g. Roof Top)"
                            value={newPhaseName}
                            onChangeText={setNewPhaseName}
                            autoFocus={true}
                        />
                        <Text style={styles.miniModalLabel}>Serial Number (S.No)</Text>
                        <TextInput
                            style={styles.miniModalInput}
                            placeholder={`Default: ${projectPhases.length + 1}`}
                            value={newPhaseSNo}
                            onChangeText={setNewPhaseSNo}
                            keyboardType="number-pad"
                        />
                        <View style={styles.miniModalActions}>
                            <TouchableOpacity
                                style={[styles.miniModalBtn, styles.miniModalCancelBtn]}
                                onPress={() => setPhaseModalVisible(false)}
                            >
                                <Text style={styles.miniModalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.miniModalBtn, styles.miniModalSaveBtn]}
                                onPress={handleAddPhase}
                            >
                                <Text style={styles.miniModalSaveText}>Add Stage</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Edit Phase Modal */}
            <Modal
                visible={editPhaseModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setEditPhaseModalVisible(false)}
            >
                <View style={styles.miniModalOverlay}>
                    <View style={styles.miniModalContent}>
                        <Text style={styles.miniModalTitle}>Edit Construction Stage</Text>
                        <TextInput
                            style={styles.miniModalInput}
                            placeholder="Enter stage name"
                            value={editingPhaseName}
                            onChangeText={setEditingPhaseName}
                            autoFocus={true}
                        />
                        <View style={styles.miniModalActions}>
                            <TouchableOpacity
                                style={[styles.miniModalBtn, styles.miniModalCancelBtn]}
                                onPress={() => setEditPhaseModalVisible(false)}
                            >
                                <Text style={styles.miniModalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.miniModalBtn, styles.miniModalSaveBtn]}
                                onPress={handleUpdatePhase}
                            >
                                <Text style={styles.miniModalSaveText}>Update</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add Task Modal (Small) */}
            <Modal
                visible={addTaskModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setAddTaskModalVisible(false)}
            >
                <View style={styles.miniModalOverlay}>
                    <View style={styles.miniModalContent}>
                        <Text style={styles.miniModalTitle}>Add New Task</Text>
                        <TextInput
                            style={styles.miniModalInput}
                            placeholder="Enter task name (e.g. Site Plan Approval)"
                            value={newTaskName}
                            onChangeText={setNewTaskName}
                            autoFocus={true}
                        />
                        <View style={styles.miniModalActions}>
                            <TouchableOpacity
                                style={[styles.miniModalBtn, styles.miniModalCancelBtn]}
                                onPress={() => setAddTaskModalVisible(false)}
                            >
                                <Text style={styles.miniModalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.miniModalBtn, styles.miniModalSaveBtn]}
                                onPress={handleAddTask}
                            >
                                <Text style={styles.miniModalSaveText}>Add Task</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Task Edit / Update Modal (Full) */}
            <Modal
                visible={taskModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setTaskModalVisible(false)}
            >
                <View style={styles.fullModalOverlay}>
                    <View style={styles.fullModalContent}>
                        <View style={styles.fullModalHeader}>
                            <Text style={styles.fullModalTitle}>Task Details</Text>
                            <TouchableOpacity onPress={() => setTaskModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.fullModalBody}>
                            {selectedTask && (
                                <>
                                    <Text style={styles.fieldLabel}>Task Name</Text>
                                    <TextInput
                                        style={[styles.fullModalInput, user?.role !== 'admin' && styles.disabledInput]}
                                        value={selectedTask.name}
                                        onChangeText={(val) => setSelectedTask({ ...selectedTask, name: val })}
                                        editable={user?.role === 'admin'}
                                    />

                                    <Text style={styles.fieldLabel}>Status</Text>
                                    <View style={styles.taskStatusRow}>
                                        {['Not Started', 'In Progress', 'Completed'].map(status => (
                                            <TouchableOpacity
                                                key={status}
                                                style={[
                                                    styles.statusOption,
                                                    selectedTask.status === status && styles.statusOptionActive,
                                                    selectedTask.status === status && status === 'Completed' && styles.statusBtnCompleted,
                                                    selectedTask.status === status && status === 'In Progress' && styles.statusBtnProgress,
                                                ]}
                                                onPress={() => setSelectedTask({ ...selectedTask, status })}
                                            >
                                                <Text style={[
                                                    styles.statusOptionText,
                                                    selectedTask.status === status && styles.statusOptionTextActive
                                                ]}>{status}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    {user?.role === 'admin' ? (
                                        <>
                                            <Text style={styles.fieldLabel}>Assigned Employee</Text>
                                            <View style={styles.pickerContainer}>
                                                <select
                                                    style={styles.htmlSelect}
                                                    value={selectedTask.employee_id || ''}
                                                    onChange={(e) => setSelectedTask({ ...selectedTask, employee_id: e.target.value })}
                                                >
                                                    <option value="">Unassigned</option>
                                                    {employees.map(emp => (
                                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                                    ))}
                                                </select>
                                            </View>

                                            <View style={styles.modalRow}>
                                                <View style={{ flex: 1, marginRight: 8 }}>
                                                    <Text style={styles.fieldLabel}>Start Date</Text>
                                                    <TouchableOpacity
                                                        style={styles.dateSelector}
                                                        onPress={() => openDatePicker('task_start', 'Select Start Date')}
                                                    >
                                                        <Text>{formatDate(selectedTask.start_date)}</Text>
                                                        <Ionicons name="calendar-outline" size={18} color="#6b7280" />
                                                    </TouchableOpacity>
                                                </View>
                                                <View style={{ flex: 1, marginLeft: 8 }}>
                                                    <Text style={styles.fieldLabel}>Due Date</Text>
                                                    <TouchableOpacity
                                                        style={styles.dateSelector}
                                                        onPress={() => openDatePicker('task_due', 'Select Due Date')}
                                                    >
                                                        <Text>{formatDate(selectedTask.due_date)}</Text>
                                                        <Ionicons name="calendar-outline" size={18} color="#6b7280" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>

                                            <Text style={styles.fieldLabel}>Amount / Budget</Text>
                                            <TextInput
                                                style={styles.fullModalInput}
                                                value={selectedTask.amount?.toString() || ''}
                                                onChangeText={(val) => setSelectedTask({ ...selectedTask, amount: val })}
                                                keyboardType="numeric"
                                                placeholder="₹ 0.00"
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <Text style={styles.fieldLabel}>Delay Reason (Optional)</Text>
                                            <TextInput
                                                style={styles.fullModalInput}
                                                value={selectedTask.delay_reason || ''}
                                                onChangeText={(val) => setSelectedTask({ ...selectedTask, delay_reason: val })}
                                                placeholder="Enter reason if task is delayed"
                                                multiline
                                            />
                                        </>
                                    )}
                                </>
                            )}
                        </ScrollView>



                        <View style={styles.fullModalFooter}>
                            {selectedTask?.status === 'waiting_for_approval' ? (
                                <View style={{ flexDirection: 'row', gap: 12, flex: 1 }}>
                                    <TouchableOpacity
                                        style={[styles.fullModalCancelBtn, { backgroundColor: '#FEF2F2', borderColor: '#EF4444', flex: 1 }]}
                                        onPress={() => handleRejectTask(selectedTask)}
                                    >
                                        <Text style={[styles.fullModalCancelText, { color: '#EF4444' }]}>Request Changes</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.fullModalSaveBtn, { backgroundColor: '#059669', flex: 1 }]}
                                        onPress={() => handleApproveTask(selectedTask)}
                                    >
                                        <Text style={styles.fullModalSaveText}>Approve</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={styles.fullModalCancelBtn}
                                        onPress={() => setTaskModalVisible(false)}
                                    >
                                        <Text style={styles.fullModalCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.fullModalSaveBtn}
                                        onPress={handleUpdateTask}
                                    >
                                        <Text style={styles.fullModalSaveText}>Update Task</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>


            {/* Bottom Navigation */}
            < View style={styles.newBottomNav} >
                <TouchableOpacity
                    style={styles.newNavItem}
                    onPress={() => setActiveTab('Dashboard')}
                >
                    <Ionicons
                        name="grid-outline"
                        size={22}
                        color={activeTab === 'Dashboard' ? '#8B0000' : '#9ca3af'}
                    />
                    <Text style={[styles.newNavText, activeTab === 'Dashboard' && styles.newNavTextActive]}>Dashboard</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.newNavItem}
                    onPress={() => setActiveTab('Workers')}
                >
                    <Ionicons
                        name="people-outline"
                        size={22}
                        color={activeTab === 'Workers' ? '#8B0000' : '#9ca3af'}
                    />
                    <Text style={[styles.newNavText, activeTab === 'Workers' && styles.newNavTextActive]}>Workers</Text>
                </TouchableOpacity>
            </View >



            {/* Create Project Modal */}
            <Modal
                visible={createModalVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={handleCloseCreateModal}
            >
                <SafeAreaView style={styles.createModalContainer}>
                    <View style={styles.createModalHeader}>
                        <View>
                            <Text style={styles.createModalTitle}>{isEditing ? 'Edit Project' : 'Create New Project'}</Text>
                            <Text style={styles.createModalSubtitle}>{isEditing ? 'Modify site and project details' : 'Enter site and project details'}</Text>
                        </View>
                        <TouchableOpacity onPress={handleCloseCreateModal} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.formContainer} contentContainerStyle={{ paddingBottom: 40 }}>

                        {/* Section 1: Site / Project Details */}
                        <View style={styles.formSection}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="business-outline" size={20} color="#8B0000" />
                                <Text style={styles.sectionTitle}>Project / Site Details</Text>
                            </View>

                            <Text style={styles.inputLabel}>Project Name <Text style={styles.required}>*</Text></Text>
                            <TextInput
                                style={styles.inputField}
                                placeholder="e.g. City Center Mall"
                                placeholderTextColor="#9ca3af"
                                value={formData.name}
                                onChangeText={(t) => handleInputChange('name', t)}
                            />

                            <Text style={styles.inputLabel}>Site Location (Address) <Text style={styles.required}>*</Text></Text>
                            <TextInput
                                style={styles.inputField}
                                placeholder="Enter full site address"
                                placeholderTextColor="#9ca3af"
                                value={formData.address}
                                onChangeText={(t) => handleInputChange('address', t)}
                            />
                        </View>

                        {/* Section 2: Client Details */}
                        <View style={styles.formSection}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="person-outline" size={20} color="#8B0000" />
                                <Text style={styles.sectionTitle}>Client Details</Text>
                            </View>

                            <Text style={styles.inputLabel}>Client Name <Text style={styles.required}>*</Text></Text>
                            <TextInput
                                style={styles.inputField}
                                placeholder="Full Name"
                                placeholderTextColor="#9ca3af"
                                value={formData.clientName}
                                onChangeText={(t) => handleInputChange('clientName', t)}
                            />



                            <Text style={styles.inputLabel}>Email Address</Text>
                            <TextInput
                                style={styles.inputField}
                                placeholder="client@example.com"
                                keyboardType="email-address"
                                placeholderTextColor="#9ca3af"
                                value={formData.clientEmail}
                                onChangeText={(t) => handleInputChange('clientEmail', t)}
                            />

                            <Text style={styles.inputLabel}>Phone Number</Text>
                            <TextInput
                                style={styles.inputField}
                                placeholder="+974 1234 5678"
                                keyboardType="phone-pad"
                                placeholderTextColor="#9ca3af"
                                value={formData.clientPhone}
                                onChangeText={(t) => handleInputChange('clientPhone', t)}
                            />
                        </View>

                        {/* Section 3: Timeline & Budget */}
                        <View style={styles.formSection}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="time-outline" size={20} color="#8B0000" />
                                <Text style={styles.sectionTitle}>Timeline & Budget</Text>
                            </View>

                            <View style={styles.rowInputs}>
                                <View style={styles.halfInput}>
                                    <Text style={styles.inputLabel}>Start Date</Text>
                                    <TouchableOpacity
                                        style={styles.currentInputContainer}
                                        onPress={() => openDatePicker('project_start', 'Start Date')}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.currencyInput, { paddingVertical: 12, color: formData.startDate ? '#000' : '#9ca3af' }]}>
                                            {formData.startDate || 'DD/MM/YYYY'}
                                        </Text>
                                        <Ionicons name="calendar-outline" size={20} color="#6b7280" style={{ marginRight: 12 }} />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.halfInput}>
                                    <Text style={styles.inputLabel}>End Date</Text>
                                    <TouchableOpacity
                                        style={styles.currentInputContainer}
                                        onPress={() => openDatePicker('project_end', 'End Date')}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.currencyInput, { paddingVertical: 12, color: formData.endDate ? '#000' : '#9ca3af' }]}>
                                            {formData.endDate || 'DD/MM/YYYY'}
                                        </Text>
                                        <Ionicons name="calendar-outline" size={20} color="#6b7280" style={{ marginRight: 12 }} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={{ marginTop: 16 }}>
                                <Text style={styles.inputLabel}>Total Budget</Text>
                                <View style={styles.currentInputContainer}>
                                    <Text style={styles.currencyPrefix}>QAR</Text>
                                    <TextInput
                                        style={styles.currencyInput}
                                        placeholder="1,000,000"
                                        keyboardType="numeric"
                                        placeholderTextColor="#9ca3af"
                                        value={formData.budget}
                                        onChangeText={(t) => handleInputChange('budget', t)}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.formActions}>
                            <TouchableOpacity style={styles.cancelButton} onPress={handleCloseCreateModal}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.submitButton} onPress={() => submitCreateProject()}>
                                <Text style={styles.submitButtonText}>{isEditing ? 'Update Project' : 'Create Project'}</Text>
                            </TouchableOpacity>
                        </View>

                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Custom Components Overlay (Moved to end for correct layering) */}
            < CustomToast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={hideToast}
            />

            <CustomDatePicker
                visible={datePicker.visible}
                title={datePicker.title}
                onClose={() => setDatePicker(prev => ({ ...prev, visible: false }))}
                onSelect={handleDateConfirm}
            />

            {/* Stage Progress / Chat Modal - Renders on top of everything */}
            <Modal
                visible={!!chatPhaseId}
                animationType="slide"
                onRequestClose={() => {
                    setChatPhaseId(null);
                    setChatTaskId(null);
                }}
            >
                {chatPhaseId && (
                    <StageProgressScreen
                        route={{ params: { phaseId: chatPhaseId, taskId: chatTaskId, siteName: chatSiteName } }}
                        navigation={{
                            goBack: () => {
                                setChatPhaseId(null);
                                setChatTaskId(null);
                            },
                            navigate: navigation.navigate // Pass through navigate just in case
                        }}
                    />
                )}
            </Modal>

            {/* Project Settings Modal - Editable Version */}
            <Modal
                visible={projectSettingsVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setProjectSettingsVisible(false)}
            >
                <SafeAreaView style={styles.settingsModalContainer}>
                    <View style={styles.settingsHeader}>
                        <TouchableOpacity onPress={() => setProjectSettingsVisible(false)}>
                            <Ionicons name="arrow-back" size={24} color="#374151" />
                        </TouchableOpacity>
                        <Text style={styles.settingsHeaderTitle}>Configuration Details</Text>
                        <TouchableOpacity
                            style={styles.saveSettingsBtn}
                            onPress={async () => {
                                await submitCreateProject();
                                setProjectSettingsVisible(false);
                            }}
                        >
                            <Text style={styles.saveSettingsText}>Save</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.settingsContent}>
                        {/* 1. Main Project Details */}
                        <View style={styles.settingsCard}>
                            <View style={styles.cardHeaderRow}>
                                <Text style={styles.cardTitle}>Project Information</Text>
                                <Ionicons name="business" size={18} color="#8B0000" />
                            </View>

                            <View style={{ marginBottom: 16 }}>
                                <Text style={styles.settingsLabel}>Project Name</Text>
                                <TextInput
                                    style={styles.settingsInput}
                                    value={formData.name}
                                    onChangeText={(t) => handleInputChange('name', t)}
                                    placeholder="Enter Project Name"
                                    placeholderTextColor="#94a3b8"
                                />
                            </View>

                            <View style={{ marginBottom: 16 }}>
                                <Text style={styles.settingsLabel}>Site Location</Text>
                                <TextInput
                                    style={styles.settingsInput}
                                    value={formData.address}
                                    onChangeText={(t) => handleInputChange('address', t)}
                                    placeholder="Enter Full Address"
                                    placeholderTextColor="#94a3b8"
                                />
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.settingsLabel}>Start Date</Text>
                                    <TouchableOpacity
                                        style={styles.settingsInputContainer}
                                        onPress={() => openDatePicker('project_start', 'Start Date')}
                                    >
                                        <Text style={styles.settingsInputText}>{formData.startDate || 'DD/MM/YYYY'}</Text>
                                        <Ionicons name="calendar-outline" size={16} color="#64748b" />
                                    </TouchableOpacity>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.settingsLabel}>End Date</Text>
                                    <TouchableOpacity
                                        style={styles.settingsInputContainer}
                                        onPress={() => openDatePicker('project_end', 'End Date')}
                                    >
                                        <Text style={styles.settingsInputText}>{formData.endDate || 'DD/MM/YYYY'}</Text>
                                        <Ionicons name="calendar-outline" size={16} color="#64748b" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* 2. Client Details Card */}
                        <View style={styles.settingsCard}>
                            <View style={styles.cardHeaderRow}>
                                <Text style={styles.cardTitle}>Client Details</Text>
                                <Ionicons name="person" size={18} color="#8B0000" />
                            </View>

                            <View style={isMobile ? { flexDirection: 'column' } : { flexDirection: 'row', gap: 16 }}>
                                <View style={{ flex: 1, marginBottom: 12 }}>
                                    <Text style={styles.settingsLabel}>Client Name</Text>
                                    <TextInput
                                        style={styles.settingsInput}
                                        value={formData.clientName}
                                        onChangeText={(t) => handleInputChange('clientName', t)}
                                        placeholder="Name"
                                        placeholderTextColor="#94a3b8"
                                    />
                                </View>
                                <View style={{ flex: 1, marginBottom: 12 }}>
                                    <Text style={styles.settingsLabel}>Phone Number</Text>
                                    <TextInput
                                        style={styles.settingsInput}
                                        value={formData.clientPhone}
                                        onChangeText={(t) => handleInputChange('clientPhone', t)}
                                        keyboardType="phone-pad"
                                        placeholder="Phone"
                                        placeholderTextColor="#94a3b8"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.settingsLabel}>Email Address</Text>
                                    <TextInput
                                        style={styles.settingsInput}
                                        value={formData.clientEmail}
                                        onChangeText={(t) => handleInputChange('clientEmail', t)}
                                        keyboardType="email-address"
                                        placeholder="Email"
                                        placeholderTextColor="#94a3b8"
                                    />
                                </View>
                            </View>
                        </View>

                        {/* 3. Stage Wise Amount Allocation Card */}
                        <View style={[styles.settingsCard, { marginTop: 16 }]}>
                            <View style={styles.cardHeaderRow}>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={styles.cardTitle}>Stage Wise Amount Allocation</Text>
                                        <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7', paddingVertical: 2, paddingHorizontal: 8 }]}>
                                            <Text style={[styles.statusText, { color: '#166534', fontSize: 10 }]}>Ongoing</Text>
                                        </View>
                                    </View>
                                    <Text style={{ fontSize: 12, color: '#64748b' }}>Project Value: QAR {(parseFloat(formData.budget) || 0).toLocaleString()} • {settingsPhases.length} Stages</Text>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: '#f1f5f9',
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            borderRadius: 8,
                                            justifyContent: 'center'
                                        }}
                                        onPress={() => setSitePickerVisible(true)}
                                    >
                                        <Ionicons name="swap-horizontal" size={18} color="#64748b" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: '#166534',
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            borderRadius: 8,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 6,
                                            elevation: 2,
                                            shadowColor: '#000',
                                            shadowOffset: { width: 0, height: 1 },
                                            shadowOpacity: 0.1,
                                            shadowRadius: 2
                                        }}
                                        onPress={() => setPhaseModalVisible(true)}
                                    >
                                        <Ionicons name="add-circle" size={18} color="#fff" />
                                        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Add Stage</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Project Value & Allocation Progress */}
                            <View style={{ marginTop: 20, backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' }}>
                                <View style={isMobile ? { flexDirection: 'column' } : { flexDirection: 'row', gap: 16, marginBottom: 16 }}>
                                    <View style={{ flex: 1, marginBottom: isMobile ? 12 : 0 }}>
                                        <Text style={[styles.settingsLabel, { marginBottom: 6 }]}>Master Project Value (Total Budget)</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12 }}>
                                            <Text style={{ color: '#8B0000', fontSize: 14, fontWeight: '700', marginRight: 6 }}>QAR</Text>
                                            <TextInput
                                                style={{ flex: 1, paddingVertical: 12, fontSize: 16, fontWeight: '800', color: '#8B0000' }}
                                                value={formData.budget}
                                                onChangeText={(t) => {
                                                    handleInputChange('budget', t);
                                                    handleInputChange('siteFunds', t);
                                                }}
                                                keyboardType="numeric"
                                                placeholder="0.00"
                                            />
                                        </View>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.settingsLabel, { marginBottom: 6 }]}>Allocation Progress</Text>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
                                            <Text style={{ fontSize: 18, fontWeight: '800', color: '#166534' }}>
                                                {Math.min(100, (settingsPhases.reduce((sum, p) => sum + (parseFloat(String(p.budget)) || 0), 0) / (parseFloat(formData.budget) || 1) * 100)).toFixed(1)}%
                                            </Text>
                                        </View>
                                        <View style={{ height: 10, backgroundColor: '#e2e8f0', borderRadius: 5, overflow: 'hidden' }}>
                                            <View
                                                style={{
                                                    height: '100%',
                                                    width: `${Math.min(100, (settingsPhases.reduce((sum, p) => sum + (parseFloat(String(p.budget)) || 0), 0) / (parseFloat(formData.budget) || 1) * 100))}%`,
                                                    backgroundColor: settingsPhases.reduce((sum, p) => sum + (parseFloat(String(p.budget)) || 0), 0) > (parseFloat(formData.budget) || 0) ? '#ef4444' : '#166534',
                                                    borderRadius: 5
                                                }}
                                            />
                                        </View>
                                    </View>
                                </View>

                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <View style={{ flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                                        <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 }}>Allocated</Text>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#166534' }}>QAR {settingsPhases.reduce((sum, p) => sum + (parseFloat(String(p.budget)) || 0), 0).toLocaleString()}</Text>
                                    </View>
                                    <View style={{ flex: 1, backgroundColor: settingsPhases.reduce((sum, p) => sum + (parseFloat(String(p.budget)) || 0), 0) > (parseFloat(formData.budget) || 0) ? '#fef2f2' : '#f0fdf4', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: settingsPhases.reduce((sum, p) => sum + (parseFloat(String(p.budget)) || 0), 0) > (parseFloat(formData.budget) || 0) ? '#fecaca' : '#bbf7d0' }}>
                                        <Text style={{ fontSize: 10, color: settingsPhases.reduce((sum, p) => sum + (parseFloat(String(p.budget)) || 0), 0) > (parseFloat(formData.budget) || 0) ? '#b91c1c' : '#15803d', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 }}>Remaining</Text>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: settingsPhases.reduce((sum, p) => sum + (parseFloat(String(p.budget)) || 0), 0) > (parseFloat(formData.budget) || 0) ? '#ef4444' : '#166534' }}>
                                            QAR {Math.max(0, (parseFloat(formData.budget) || 0) - settingsPhases.reduce((sum, p) => sum + (parseFloat(String(p.budget)) || 0), 0)).toLocaleString()}
                                        </Text>
                                    </View>
                                </View>

                                {settingsPhases.reduce((sum, p) => sum + (parseFloat(String(p.budget)) || 0), 0) > (parseFloat(formData.budget) || 0) && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: '#fef2f2', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#fee2e2' }}>
                                        <Ionicons name="warning" size={16} color="#ef4444" />
                                        <Text style={{ fontSize: 12, color: '#b91c1c', fontWeight: '600' }}>Warning: Allocation exceeds project limit</Text>
                                    </View>
                                )}
                            </View>

                            <View style={{ marginTop: 12 }}>
                                {settingsPhases.map((phase, index) => (
                                    <View key={phase.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#64748b' }}>{index + 1}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                <Text style={[styles.settingsLabel, { marginBottom: 0 }]}>{phase.name}</Text>
                                                <View style={{ backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#166534' }}>
                                                        {((parseFloat(String(phase.budget)) || 0) / (parseFloat(formData.budget) || 1) * 100).toFixed(1)}%
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12 }}>
                                                    <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: '600', marginRight: 6 }}>QAR</Text>
                                                    <TextInput
                                                        style={{ flex: 1, paddingVertical: 10, fontSize: 15, fontWeight: '700', color: '#1e293b' }}
                                                        value={String(phase.budget || '')}
                                                        onChangeText={(val) => setSettingsPhases(prev => prev.map(p => p.id === phase.id ? { ...p, budget: val } : p))}
                                                        keyboardType="numeric"
                                                        placeholder="0.00"
                                                        placeholderTextColor="#cbd5e1"
                                                    />
                                                </View>
                                                <TouchableOpacity
                                                    onPress={() => submitCreateProject(false)}
                                                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}
                                                >
                                                    <Ionicons name="save" size={18} color="#059669" />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => handleDeletePhase(phase.id, phase.name)}
                                                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <Ionicons name="trash" size={18} color="#ef4444" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Save Configuration Button */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#ECFDF5',
                                borderWidth: 1,
                                borderColor: '#059669',
                                borderRadius: 12,
                                paddingVertical: 14,
                                paddingHorizontal: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginTop: 16,
                                marginBottom: 32
                            }}
                            onPress={async () => {
                                await submitCreateProject();
                                setProjectSettingsVisible(false);
                            }}
                        >
                            <View>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#047857' }}>Save Configuration</Text>
                                <Text style={{ fontSize: 10, color: '#059669', marginTop: 2 }}>Update all project details</Text>
                            </View>
                            <Ionicons name="save-outline" size={24} color="#059669" />
                        </TouchableOpacity>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            <Modal
                visible={sitePickerVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSitePickerVisible(false)}
            >
                <View style={styles.datePickerOverlay}>
                    <View style={[styles.datePickerContent, { maxHeight: 500, width: '90%' }]}>
                        <View style={styles.datePickerHeader}>
                            <Text style={styles.datePickerTitle}>Select Site</Text>
                            <TouchableOpacity onPress={() => setSitePickerVisible(false)}>
                                <Ionicons name="close" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {sites.map((site: any) => (
                                <TouchableOpacity
                                    key={site.id}
                                    style={{
                                        padding: 16,
                                        borderBottomWidth: 1,
                                        borderBottomColor: '#f3f4f6',
                                        backgroundColor: editingSiteId === site.id ? '#f8fafc' : 'transparent'
                                    }}
                                    onPress={() => {
                                        handleOpenSettings(site);
                                        setSitePickerVisible(false);
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View>
                                            <Text style={{ fontSize: 16, color: '#111827', fontWeight: editingSiteId === site.id ? '700' : '400' }}>
                                                {site.name}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: '#6b7280' }}>{site.location || 'No Location'}</Text>
                                        </View>
                                        <Text style={{ fontSize: 14, color: '#8B0000', fontWeight: 'bold' }}>
                                            QAR {Number(site.budget || 0).toLocaleString()}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                            {sites.length === 0 && (
                                <Text style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>No sites found</Text>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Employee/Worker Modal */}
            <Modal
                visible={employeeModalVisible}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setEmployeeModalVisible(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setEmployeeModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#374151" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>{editingEmployeeId ? 'Edit Worker' : 'Add Worker'}</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <ScrollView style={{ flex: 1, padding: 20 }}>
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Name *</Text>
                            <TextInput
                                style={{
                                    borderWidth: 1,
                                    borderColor: '#D1D5DB',
                                    borderRadius: 8,
                                    padding: 12,
                                    fontSize: 14,
                                    color: '#111827'
                                }}
                                placeholder="Enter worker name"
                                value={newEmployee.name}
                                onChangeText={(text) => setNewEmployee({ ...newEmployee, name: text })}
                            />
                        </View>

                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Email *</Text>
                            <TextInput
                                style={{
                                    borderWidth: 1,
                                    borderColor: '#D1D5DB',
                                    borderRadius: 8,
                                    padding: 12,
                                    fontSize: 14,
                                    color: '#111827'
                                }}
                                placeholder="Enter email address"
                                value={newEmployee.email}
                                onChangeText={(text) => setNewEmployee({ ...newEmployee, email: text })}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        {!editingEmployeeId && (
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Password *</Text>
                                <TextInput
                                    style={{
                                        borderWidth: 1,
                                        borderColor: '#D1D5DB',
                                        borderRadius: 8,
                                        padding: 12,
                                        fontSize: 14,
                                        color: '#111827'
                                    }}
                                    placeholder="Enter password"
                                    value={newEmployee.password}
                                    onChangeText={(text) => setNewEmployee({ ...newEmployee, password: text })}
                                    secureTextEntry
                                />
                            </View>
                        )}

                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Phone</Text>
                            <TextInput
                                style={{
                                    borderWidth: 1,
                                    borderColor: '#D1D5DB',
                                    borderRadius: 8,
                                    padding: 12,
                                    fontSize: 14,
                                    color: '#111827'
                                }}
                                placeholder="Enter phone number"
                                value={newEmployee.phone}
                                onChangeText={(text) => setNewEmployee({ ...newEmployee, phone: text })}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Role *</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {(['Worker', 'Engineer', 'Supervisor', 'Admin'] as const).map((role) => (
                                    <TouchableOpacity
                                        key={role}
                                        style={{
                                            paddingHorizontal: 16,
                                            paddingVertical: 10,
                                            borderRadius: 8,
                                            borderWidth: 1,
                                            borderColor: newEmployee.role === role ? '#8B0000' : '#D1D5DB',
                                            backgroundColor: newEmployee.role === role ? '#FEF2F2' : '#FFF'
                                        }}
                                        onPress={() => setNewEmployee({ ...newEmployee, role })}
                                    >
                                        <Text style={{
                                            color: newEmployee.role === role ? '#8B0000' : '#6B7280',
                                            fontWeight: newEmployee.role === role ? '600' : '400'
                                        }}>
                                            {role}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={{ marginBottom: 24 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Status</Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {(['Active', 'Inactive'] as const).map((status) => (
                                    <TouchableOpacity
                                        key={status}
                                        style={{
                                            flex: 1,
                                            paddingVertical: 10,
                                            borderRadius: 8,
                                            borderWidth: 1,
                                            borderColor: newEmployee.status === status ? '#8B0000' : '#D1D5DB',
                                            backgroundColor: newEmployee.status === status ? '#FEF2F2' : '#FFF',
                                            alignItems: 'center'
                                        }}
                                        onPress={() => setNewEmployee({ ...newEmployee, status })}
                                    >
                                        <Text style={{
                                            color: newEmployee.status === status ? '#8B0000' : '#6B7280',
                                            fontWeight: newEmployee.status === status ? '600' : '400'
                                        }}>
                                            {status}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <TouchableOpacity
                            style={{
                                backgroundColor: '#8B0000',
                                padding: 16,
                                borderRadius: 8,
                                alignItems: 'center',
                                marginBottom: 40
                            }}
                            onPress={async () => {
                                if (!newEmployee.name || !newEmployee.email || !newEmployee.phone || (!editingEmployeeId && !newEmployee.password)) {
                                    Alert.alert('Error', 'Please fill in all required fields (Name, Email, Phone, Role, Password)');
                                    return;
                                }

                                const payload = {
                                    ...newEmployee,
                                    role: newEmployee.role.toLowerCase()
                                };

                                try {
                                    if (editingEmployeeId) {
                                        await api.put(`/employees/${editingEmployeeId}`, payload);
                                        showToast('Worker updated successfully', 'success');
                                    } else {
                                        await api.post('/employees', payload);
                                        showToast('Worker added successfully', 'success');
                                    }
                                    setEmployeeModalVisible(false);
                                    fetchEmployees();
                                } catch (error: any) {
                                    console.error('Error saving employee:', error);
                                    Alert.alert('Error', error.response?.data?.message || 'Failed to save worker');
                                }
                            }}
                        >
                            <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 16 }}>
                                {editingEmployeeId ? 'Update Worker' : 'Add Worker'}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Stage Options Menu Modal */}
            <Modal
                visible={stageOptionsVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setStageOptionsVisible(false)}
            >
                <TouchableOpacity
                    style={styles.menuOverlay}
                    activeOpacity={1}
                    onPress={() => setStageOptionsVisible(false)}
                >
                    <View style={styles.menuContainer}>
                        {/* Add Task Option */}
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                if (selectedStageOption) {
                                    setStageOptionsVisible(false);
                                    setActivePhaseId(selectedStageOption.id);
                                    setNewTaskName('');
                                    setAddTaskModalVisible(true);
                                }
                            }}
                        >
                            <Ionicons name="add-circle-outline" size={20} color="#374151" />
                            <Text style={styles.menuItemText}>Add Task</Text>
                        </TouchableOpacity>

                        {/* Edit Stage Option */}
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                if (selectedStageOption) {
                                    setStageOptionsVisible(false);
                                    setEditingPhaseId(selectedStageOption.id);
                                    setEditingPhaseName(selectedStageOption.name);
                                    setEditPhaseModalVisible(true);
                                }
                            }}
                        >
                            <Ionicons name="pencil-outline" size={20} color="#374151" />
                            <Text style={styles.menuItemText}>Edit Stage</Text>
                        </TouchableOpacity>

                        {/* Delete Stage Option */}
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                if (selectedStageOption) {
                                    setStageOptionsVisible(false);
                                    const handleDeleteStage = async () => {
                                        try {
                                            await api.delete(`/phases/${selectedStageOption.id}`);
                                            showToast('Stage deleted successfully', 'success');
                                            if (selectedSite?.id) fetchProjectDetails(selectedSite.id);
                                        } catch (error) {
                                            console.error('Error deleting stage:', error);
                                            Alert.alert('Error', 'Failed to delete stage');
                                        }
                                    };

                                    if (Platform.OS === 'web') {
                                        if (window.confirm(`Are you sure you want to delete stage "${selectedStageOption.name}"?`)) {
                                            handleDeleteStage();
                                        }
                                    } else {
                                        Alert.alert('Delete Stage', `Are you sure you want to delete stage "${selectedStageOption.name}"?`, [
                                            { text: 'Cancel', style: 'cancel' },
                                            { text: 'Delete', style: 'destructive', onPress: handleDeleteStage }
                                        ]);
                                    }
                                }
                            }}
                        >
                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                            <Text style={[styles.menuItemText, styles.menuItemDestructive]}>Delete Stage</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    header: {
        height: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    headerButton: {
        padding: 8,
    },
    headerTitleContainer: {
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1e293b',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerIconButton: {
        padding: 4,
        position: 'relative',
    },
    newNotificationBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#ef4444',
        minWidth: 14,
        height: 14,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#fff',
    },
    notificationBadgeText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: 'bold',
    },
    headerProfileAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    avatarTextInitial: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },

    newMainContent: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },

    newStatusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginTop: 20,
        gap: 12,
    },
    newStatusCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#f3f4f6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    statusCardIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#fef2f2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    statusCardLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
    },

    newSearchSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginTop: 20,
        gap: 8,
    },
    newFilterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8B0000',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
        shadowColor: '#8B0000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    newSearchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 44,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    newSearchInput: {
        flex: 1,
        fontSize: 13,
        marginLeft: 8,
        color: '#1f2937',
    },
    newFilterIconButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },

    newActiveProjectsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginHorizontal: 16,
        marginTop: 24,
        marginBottom: 12,
    },
    newProjectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 18,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    newProjectName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 4,
    },
    newProjectLocation: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
    newEmptyState: {
        padding: 40,
        alignItems: 'center',
    },
    newEmptyText: {
        fontSize: 14,
        color: '#9ca3af',
    },

    newBottomNav: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        gap: 80,
    },
    newNavItem: {
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    newNavText: {
        fontSize: 11,
        marginTop: 5,
        color: '#94a3b8',
        fontWeight: '600',
    },
    newNavTextActive: {
        color: '#8B0000',
        fontWeight: '800',
    },

    /* UTILITY STYLES - RESTORED */
    toastContainer: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        backgroundColor: '#333',
        borderRadius: 8,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 9999,
        elevation: 10,
    },
    toastSuccess: {
        backgroundColor: '#10b981',
    },
    toastError: {
        backgroundColor: '#ef4444',
    },
    toastText: {
        color: '#fff',
        marginLeft: 12,
        fontSize: 14,
        fontWeight: '600',
    },
    datePickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    datePickerContent: {
        width: '90%',
        maxWidth: 340, // Limit width for desktop
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        alignSelf: 'center', // Center properly
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    datePickerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    monthYearText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    weekDaysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    weekDayText: {
        width: 32,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
        color: '#9ca3af',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    dayCell: {
        width: 38,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
        borderRadius: 19,
    },
    emptyCell: {
        width: 38,
        height: 38,
    },
    dayText: {
        fontSize: 14,
        color: '#374151',
    },
    settingsModalContainer: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    settingsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    settingsHeaderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    settingsContent: {
        padding: 16,
    },
    settingsCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    settingsProjectHeader: {
        marginBottom: 16,
    },
    settingsProjectName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    settingsInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    settingsInfoText: {
        fontSize: 14,
        color: '#4b5563',
        marginLeft: 8,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    settingsLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748b',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    settingsInput: {
        fontSize: 15,
        color: '#1e293b',
        fontWeight: '600',
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    settingsInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    settingsInputText: {
        fontSize: 15,
        color: '#1e293b',
        fontWeight: '600',
    },
    saveSettingsBtn: {
        backgroundColor: '#8B0000',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 10,
        shadowColor: '#8B0000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    saveSettingsText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 14,
        textTransform: 'uppercase',
    },
    dangerZoneBtn: {
        backgroundColor: '#fef2f2',
        padding: 20,
        borderRadius: 16,
        marginTop: 24,
        marginBottom: 40,
        borderWidth: 1,
        borderColor: '#fee2e2',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dangerZoneTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#991b1b',
        marginBottom: 4,
    },
    dangerZoneSubtitle: {
        fontSize: 13,
        color: '#b91c1c',
        opacity: 0.8,
    },
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    // Action Row Styles
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 16,
        gap: 12,
    },
    addProjectBtn: {
        borderWidth: 1,
        borderColor: '#8B0000',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#fff1f2',
    },
    addProjectBtnText: {
        color: '#8B0000',
        fontWeight: '700',
        fontSize: 14,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#f3f4f6',
        borderRadius: 8,
        height: 44,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        paddingHorizontal: 10,
        fontSize: 14,
        color: '#1f2937',
    },
    filterBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#f3f4f6',
        borderRadius: 8,
    },
    // Styles for Project Modal Refactor
    // projectSection: { ... } - removed
    // mainProjectCard: { ... } - removed
    // projectCardIcon: { ... } - removed
    // projectCardContent: { ... } - removed
    // mainProjectTitle: { ... } - removed
    // mainProjectSubtitle: { ... } - removed

    modalContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    closeButton: {
        padding: 8,
    },
    projectHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },

    projectTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTabItem: {
        borderBottomColor: '#8B0000',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6b7280',
    },
    activeTabText: {
        color: '#8B0000',
        fontWeight: '700',
    },
    projectContent: {
        flex: 1,
        backgroundColor: '#fff', // White background as requested
    },
    tabContentContainer: {
        padding: 16,
    },
    tabSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    addButtonSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8B0000',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    addButtonTextSmall: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },

    // New Assign Team Button Style
    assignTeamBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#000000', // Black Background
        borderRadius: 20,
        marginRight: 12,
    },
    assignTeamText: {
        marginLeft: 6,
        color: '#FFFFFF', // White Text
        fontWeight: '600',
        fontSize: 12,
    },
    emptyTabState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTabText: {
        fontSize: 16,
        color: '#9ca3af',
        marginTop: 12,
    },
    placeholderBox: {
        padding: 20,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    subPlaceholderText: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 4,
    },
    textLink: {
        marginTop: 12,
    },
    linkText: {
        color: '#8B0000',
        fontWeight: '600',
    },

    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    detailsButton: {
        backgroundColor: '#f8fafc',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    detailsButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    listContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    projectListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    listIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fef2f2',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    listContent: {
        flex: 1,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    listSub: {
        fontSize: 13,
        color: '#6b7280',
    },

    detailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    detailTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#111827',
        flex: 1,
        marginRight: 12,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    detailSection: {
        backgroundColor: '#f9fafb',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    detailText: {
        fontSize: 15,
        color: '#374151',
        marginLeft: 12,
        fontWeight: '500',
    },
    sectionDivider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginBottom: 24,
    },
    statGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 32,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statNumber: {
        fontSize: 32,
        fontWeight: '800',
        color: '#8B0000',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    backToListBtn: {
        paddingVertical: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        marginBottom: 40,
    },
    backToListText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#4b5563',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#9ca3af',
        marginTop: 12,
    },
    // Phase Accordion Styles
    phaseAccordion: {
        marginBottom: 12,
        borderRadius: 12,
        // overflow: 'hidden', // Removed to allow menu to show
        borderWidth: 1,
        borderColor: '#E5E7EB', // gray-200
        backgroundColor: '#FFFFFF',
        zIndex: 1, // Default z-index
        // NativeWind-like Shadow (Light Green)
        shadowColor: "#10b981", // Light Green Shadow as requested
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    phaseHeaderDark: { // Default State (Red Theme)
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#8B0000', // Brand Red
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        borderWidth: 1,
        borderColor: '#991b1b', // Darker Red Border
    },
    phaseHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    phaseDeleteBtn: {
        padding: 8,
        marginRight: 8,
    },
    phaseHeaderExpanded: {
        borderBottomWidth: 1,
        borderBottomColor: '#b91c1c', // slightly lighter red for divider
    },
    addTaskBtnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginTop: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#e5e7eb',
        borderRadius: 8,
        justifyContent: 'center',
        backgroundColor: '#F9FAFB',
    },
    addTaskTextSmall: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8B0000',
        marginLeft: 8,
    },
    // Completed Phase Styles
    phaseAccordionCompleted: {
        borderColor: '#10b981', // green-500
        backgroundColor: '#ecfdf5', // green-50
        // Green Shadow / Blur Effect
        shadowColor: "#059669",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    phaseHeaderCompleted: {
        backgroundColor: '#ecfdf5', // green-50
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        // No border width here, rely on container
    },
    completedBadgeIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#d1fae5', // green-100
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    // Red Badge for Default State (Inverted)
    phaseNumberBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFFFFF', // White Badge
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    phaseNumberText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#8B0000', // Red Text
    },
    phaseTitleCompleted: {
        fontSize: 16,
        fontWeight: '700',
        color: '#064e3b', // green-900
    },
    phaseSubtitleCompleted: {
        fontSize: 12,
        color: '#047857', // green-700
        marginTop: 2,
    },
    achievedPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#d1fae5', // green-100
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#34d399', // green-400
        marginRight: 12,
    },
    achievedDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#059669', // green-600
        marginRight: 6,
    },
    achievedText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#059669', // green-600
    },
    // Full Modal Styles (for Task Details)
    fullModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    fullModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '85%',
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    fullModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    fullModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    fullModalBody: {
        padding: 20,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4b5563',
        marginBottom: 8,
        marginTop: 16,
    },
    fullModalInput: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        color: '#1f2937',
        backgroundColor: '#F9FAFB',
    },
    disabledInput: {
        backgroundColor: '#F3F4F6',
        color: '#6B7280',
    },
    taskStatusRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 8,
    },
    statusOption: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    statusOptionActive: {
        borderColor: '#3b82f6',
        backgroundColor: '#eff6ff',
    },
    statusBtnProgress: {
        borderColor: '#f59e0b',
        backgroundColor: '#fffbeb',
    },
    statusBtnCompleted: {
        borderColor: '#10b981',
        backgroundColor: '#ecfdf5',
    },
    statusOptionText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
    },
    statusOptionTextActive: {
        color: '#1f2937',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        backgroundColor: '#F9FAFB',
        overflow: 'hidden',
    },
    htmlSelect: {
        width: '100%',
        padding: 12,
        fontSize: 16,
        borderWidth: 0,
        backgroundColor: 'transparent',
    },
    modalRow: {
        flexDirection: 'row',
        marginTop: 4,
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        padding: 12,
        backgroundColor: '#F9FAFB',
    },
    fullModalFooter: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    fullModalCancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    fullModalSaveBtn: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#8B0000',
    },
    fullModalCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4b5563',
    },
    fullModalSaveText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    phaseTitleWhite: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF', // Reverted to White
    },
    phaseSubtitleLight: {
        fontSize: 12,
        color: '#f3f4f6', // gray-100 (Light for Red BG)
        marginTop: 2,
    },
    taskDropdownSection: {
        backgroundColor: '#F9FAFB', // Very light grey
        paddingBottom: 8,
    },
    taskListIndented: {
        paddingHorizontal: 12,
    },
    taskItemRefined: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        marginTop: 8,
        marginHorizontal: 4,
    },
    noTasksInPhase: {
        textAlign: 'center',
        padding: 20,
        color: '#9CA3AF',
        fontSize: 14,
        fontStyle: 'italic',
    },
    taskStatusIcon: {
        marginRight: 12,
        width: 24,
        alignItems: 'center',
    },
    taskName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#374151',
    },
    taskCompletedText: {
        textDecorationLine: 'line-through',
        color: '#9ca3af',
    },
    taskStatusText: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    taskActions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    taskActionBtn: {
        padding: 6,
        marginLeft: 4,
    },
    addStageBtnSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    addStageBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#8B0000',
        marginLeft: 4,
    },
    // Mini Modal Styles (for Add Phase)
    miniModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    miniModalContent: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    miniModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 16,
    },
    miniModalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4b5563',
        marginBottom: 8,
    },
    miniModalInput: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: '#374151',
        marginBottom: 20,
        backgroundColor: '#F9FAFB',
    },
    miniModalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    miniModalBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        minWidth: 100,
        alignItems: 'center',
    },
    miniModalCancelBtn: {
        backgroundColor: '#F3F4F6',
    },
    miniModalSaveBtn: {
        backgroundColor: '#8B0000',
    },
    miniModalCancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
    miniModalSaveText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    // Create Project Form Styles
    createModalContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    createModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        backgroundColor: '#FFFFFF',
    },
    createModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    createModalSubtitle: {
        fontSize: 13,
        color: '#6b7280',
        marginTop: 2,
    },
    formContainer: {
        padding: 20,
    },
    formSection: {
        marginBottom: 24,
        backgroundColor: '#ffffff',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
    },
    required: {
        color: '#ef4444',
    },
    inputField: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#111827',
        marginBottom: 16,
    },
    rowInputs: {
        flexDirection: 'row',
        gap: 16,
    },
    halfInput: {
        flex: 1,
    },
    currentInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        overflow: 'hidden',
    },
    currencyPrefix: {
        paddingHorizontal: 12,
        color: '#6b7280',
        fontSize: 14,
        fontWeight: '500',
        backgroundColor: '#f3f4f6',
        paddingVertical: 12,
        borderRightWidth: 1,
        borderRightColor: '#e5e7eb',
    },
    currencyInput: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#111827',
    },
    formActions: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 8,
    },
    submitButton: {
        flex: 1,
        backgroundColor: '#8B0000',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },

    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        color: '#374151',
        fontSize: 15,
        fontWeight: '600',
    },
    employeeCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 2,
    },
    employeeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E5E7EB', // Gray-200
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151', // Gray-700
        textAlign: 'center',
        includeFontPadding: false,
    },
    employeeName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827', // Gray-900
    },
    employeeRole: {
        fontSize: 14,
        color: '#6B7280', // Gray-500
    },
    assignBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,

        flexDirection: 'row',
        alignItems: 'center',
    },
    assignBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
    },
    // Restored/Missing Styles
    topNav: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#fff',
        gap: 12,
    },
    topNavItem: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
    },
    topNavItemActive: {
        backgroundColor: '#8B0000',
    },
    topNavText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4b5563',
    },
    topNavTextActive: {
        color: '#fff',
    },
    modalTabsContainer: {
        maxHeight: 50,
        backgroundColor: '#f9fafb',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingHorizontal: 10,
    },
    modalTab: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginRight: 4,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    modalTabActive: {
        borderBottomColor: '#8B0000',
    },
    modalTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
    },
    modalTabTextActive: {
        color: '#8B0000',
    },
    modalBody: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    phaseContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        overflow: 'hidden',
    },
    phaseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#8B0000', // Dark Red
    },
    phaseHeaderCollapsed: {
        // Keep standard border radius
    },
    phaseBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    phaseBadgeText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#8B0000',
    },
    phaseTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 2,
    },
    phaseSubtitle: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
    },

    taskList: {
        padding: 16,
        backgroundColor: '#fff',
    },
    taskItem: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        paddingVertical: 12,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        rowGap: 8
    },
    taskTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    taskSubtitle: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    radioButton: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#d1d5db',
    },
    radioButtonSelected: {
        borderColor: '#059669',
        backgroundColor: '#059669',
    },
    taskActionButton: {
        backgroundColor: '#8B0000',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    taskActionText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    iconButton: {
        padding: 6,
    },

    statusPill: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusCompleted: {
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0',
    },
    statusProgress: {
        backgroundColor: '#eff6ff',
        borderColor: '#bfdbfe',
    },
    statusPending: {
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca',
    },
    statusTextCompleted: { color: '#059669' },
    statusTextProgress: { color: '#2563eb' },
    assignedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#059669', // Green
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    assignedBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    addAssigneeBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    miniAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FDE047', // Yellow-300
        borderWidth: 1,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    miniAvatarText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#854D0E', // Yellow-800
    },
    statusTextPending: { color: '#dc2626' },

    noTasksText: {
        fontSize: 13,
        color: '#9ca3af',
        fontStyle: 'italic',
        marginBottom: 12,
    },
    addTaskBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderStyle: 'dashed',
        borderRadius: 8,
        marginTop: 4,
        gap: 6,
    },
    employeeNameBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fecaca', // Light Red Border
    },
    employeeNameText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#374151',
    },
    // Menu Modal Styles
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 8,
        width: 250,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
    },
    menuItemText: {
        marginLeft: 12,
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    menuItemDestructive: {
        color: '#EF4444',
    },

});

export default AdminDashboardScreen;
