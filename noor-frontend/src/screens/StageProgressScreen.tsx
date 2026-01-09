
import React, { useState, useEffect, useContext } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Image, Modal, Platform, Alert, PermissionsAndroid
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio, Video, ResizeMode } from 'expo-av';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

const StageProgressScreen = ({ route, navigation }: any) => {
    const { phaseId, taskId, siteName } = route.params || {};
    const { user } = useContext(AuthContext);
    const [phase, setPhase] = useState<any>(null);
    const [todos, setTodos] = useState<any[]>([]);
    const [subTasks, setSubTasks] = useState<any[]>([]);
    const [updates, setUpdates] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Todo Input
    const [todoText, setTodoText] = useState('');

    // Chat Input
    const [messageText, setMessageText] = useState('');
    const [mediaUri, setMediaUri] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | null>(null);
    const [recording, setRecording] = useState<Audio.Recording | undefined>(undefined);
    const [cameraVisible, setCameraVisible] = useState(false);
    const [cameraRef, setCameraRef] = useState<any>(null);
    const [isRecordingVideo, setIsRecordingVideo] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();

    // Update Modal
    const [updateModalVisible, setUpdateModalVisible] = useState(false);
    const [newProgress, setNewProgress] = useState('');
    const [updateMessage, setUpdateMessage] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images', 'videos'],
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setMediaUri(result.assets[0].uri);
            setMediaType(result.assets[0].type === 'video' ? 'video' : 'image');
        }
    };

    const startRecording = async () => {
        try {
            const { granted } = await Audio.requestPermissionsAsync();
            if (!granted) return;

            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(recording);
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async () => {
        setRecording(undefined);
        await recording?.stopAndUnloadAsync();
        const uri = recording?.getURI();
        if (uri) {
            setMediaUri(uri);
            setMediaType('audio');
        }
    };

    const handleVideoRecord = async () => {
        if (cameraRef && !isRecordingVideo) {
            setIsRecordingVideo(true);
            try {
                const video = await cameraRef.recordAsync({ maxDuration: 60 });
                setMediaUri(video.uri);
                setMediaType('video');
                setCameraVisible(false);
                setIsRecordingVideo(false);
            } catch (e) {
                console.error(e);
                setIsRecordingVideo(false);
            }
        } else if (isRecordingVideo) {
            cameraRef?.stopRecording();
            setIsRecordingVideo(false);
        }
    };

    const uploadMedia = async (uri: string, type: string) => {
        try {
            const formData = new FormData();
            const mimeType = type === 'image' ? 'image/jpeg' : type === 'video' ? 'video/mp4' : 'audio/m4a';
            const ext = type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : 'm4a';

            if (Platform.OS === 'web') {
                console.log('[Web Upload] Fetching URI:', uri);
                const response = await fetch(uri);
                const blob = await response.blob();
                console.log('[Web Upload] Blob:', blob);

                // Ensure blob has correct type
                const file = new File([blob], `upload.${ext}`, { type: mimeType });
                formData.append('file', file);
            } else {
                formData.append('file', {
                    uri,
                    name: `upload.${ext}`,
                    type: mimeType
                } as any);
            }

            console.log('[Upload] Sending FormData...');
            const response = await api.post('/upload', formData, {
                headers: {
                    'Content-Type': undefined, // Forces Axios/Browser to set correct multipart/form-data with boundary
                },
                transformRequest: (data, headers) => {
                    return data; // Prevent Axios from stringifying FormData
                }
            });

            return response.data.url;
        } catch (error) {
            console.error('[Upload Error]', error);
            throw error;
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            if (!phaseId && !taskId) {
                Alert.alert("Error", "Invalid Context");
                navigation.goBack();
                return;
            }
            fetchData();
        }, [phaseId, taskId])
    );

    const fetchData = async () => {
        try {
            if (taskId) {
                // TASK MODE
                console.log(`[StageProgress] Fetching Task Details for ID: ${taskId}`);
                const response = await api.get(`/tasks/${taskId}`);
                const taskData = response.data.task;

                // Set Phase Data (Partial or Derived)
                setPhase({
                    id: taskData.phase_id,
                    name: `Stage: ${taskData.phase_name || 'Details'}`,
                    site_name: taskData.site_name
                });

                // Isolate Task
                setSubTasks([taskData]);
                setTodos(response.data.todos || []);
                setUpdates(response.data.updates || []);
                setMessages(response.data.messages || []);

            } else {
                // STAGE MODE (Legacy)
                console.log(`[StageProgress] Fetching Phase Details for ID: ${phaseId}`);
                const response = await api.get(`/phases/${phaseId}/details`);
                setPhase(response.data.phase);
                setTodos(response.data.todos);
                setSubTasks(response.data.subTasks || []);
                setUpdates(response.data.updates);
                setMessages(response.data.messages);
            }
        } catch (error) {
            console.error('Error fetching details:', error);
            Alert.alert("Error", "Failed to load details");
        } finally {
            setLoading(false);
        }
    };

    const isAdmin = user?.role === 'admin' || user?.role === 'Admin';
    // Check if user is assigned to the PHASE itself OR any task in this phase
    const isAssigned = isAdmin
        || (phase?.assigned_to === user?.id)
        || (subTasks && subTasks.some(t => t.assignments && t.assignments.some((a: any) => a.id === user?.id)));

    const handleCompleteTask = async (task: any) => {
        // STRICT PERMISSION CHECK: Only Assigned Employee or Admin
        const userIsAssigned = task.assignments && task.assignments.some((a: any) => a.id === user?.id);

        if (!isAdmin && !userIsAssigned) {
            Alert.alert("Restricted Access", `This task is restricted to assigned employees only.`);
            return;
        }

        if (task.status === 'Completed' || task.status === 'waiting_for_approval') return; // Already done or pending

        try {
            // Submit progress as 100% to trigger approval workflow
            await api.post(`/tasks/${task.id}/updates`, {
                progress: 100,
                note: 'Task marked as completed'
            });

            // Optimistic update
            setSubTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'waiting_for_approval', progress: 100 } : t));

            Alert.alert("Success", "Task submitted for admin approval");
        } catch (error) {
            console.error('Error completing task:', error);
            Alert.alert("Error", "Failed to submit task for approval");
        }
    };

    const handleApproveTask = async (task: any) => {
        try {
            await api.put(`/tasks/${task.id}/approve`);
            setSubTasks((prev: any[]) => prev.map(t => t.id === task.id ? { ...t, status: 'Completed' } : t));
            Alert.alert("Success", "Task approved and marked as completed.");
        } catch (error) {
            console.error('Error approving task:', error);
            Alert.alert("Error", "Failed to approve task");
        }
    };

    const handleRejectTask = async (task: any) => {
        try {
            await api.put(`/tasks/${task.id}/reject`, { reason: 'Admin requested changes' });
            setSubTasks((prev: any[]) => prev.map(t => t.id === task.id ? { ...t, status: 'In Progress' } : t));
            Alert.alert("Success", "Changes requested. Task reverted to In Progress.");
        } catch (error) {
            console.error('Error rejecting task:', error);
            Alert.alert("Error", "Failed to reject task");
        }
    };

    const handleAddTodo = async () => {
        if (!isAssigned) {
            Alert.alert("Action Restricted", "You must assign an employee to add todos.");
            return;
        }
        if (!todoText.trim()) return;
        try {
            await api.post(`/phases/${phaseId}/todos`, { content: todoText });
            setTodoText('');
            fetchData();
        } catch (error) {
            console.error('Error adding todo:', error);
        }
    };

    const handleToggleTodo = async (todoId: number) => {
        if (!isAssigned) {
            Alert.alert("Action Restricted", "You must assign an employee to update todos.");
            return;
        }
        try {
            await api.put(`/phases/todos/${todoId}/toggle`);
            // Optimistic update
            setTodos(prev => prev.map(t => t.id === todoId ? { ...t, is_completed: !t.is_completed } : t));
        } catch (error) {
            console.error('Error toggling todo:', error);
        }
    };




    const handleSubmitUpdate = async () => {
        if (!newProgress || !updateMessage.trim()) {
            Alert.alert("Error", "Please enter progress percentage and a message");
            return;
        }

        const prog = parseInt(newProgress);
        if (isNaN(prog) || prog < 0 || prog > 100) {
            Alert.alert("Error", "Progress must be between 0 and 100");
            return;
        }

        try {
            setSubmitLoading(true);
            await api.post(`/phases/${phaseId}/updates`, {
                progress: prog,
                message: updateMessage
            });

            // Optimistic Update
            setPhase((prev: any) => ({
                ...prev,
                progress: prog,
                status: prog === 100 ? 'waiting_for_approval' : (prog === 0 ? 'not_started' : 'in_progress')
            }));

            setUpdateModalVisible(false);
            setNewProgress('');
            setUpdateMessage('');
            fetchData();
        } catch (error) {
            console.error('Error adding update:', error);
            Alert.alert("Error", "Failed to submit update");
        } finally {
            setSubmitLoading(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B0000" />
            </SafeAreaView>
        );
    }



    const handleSendMessage = async () => {
        if (!messageText.trim() && !mediaUri && !recording) return;

        try {
            let uploadedUrl = null;
            if (mediaUri && mediaType) {
                uploadedUrl = await uploadMedia(mediaUri, mediaType);
            }

            const payload = {
                content: messageText,
                type: mediaType || 'text',
                mediaUrl: uploadedUrl
            };

            if (taskId) {
                // TASK Chat
                await api.post(`/tasks/${taskId}/messages`, payload);
            } else {
                // STAGE Chat
                await api.post(`/phases/${phaseId}/messages`, payload);
            }

            setMessageText('');
            setMediaUri(null);
            setMediaType(null);

            // Refresh
            fetchData();
        } catch (error) {
            console.error('Error sending message:', error);
            Alert.alert("Error", "Failed to send message");
        }
    };

    const getStatusColor = (status: string) => {
        if (status === 'achieved') return '#10B981'; // Green
        if (status === 'waiting_for_approval') return '#F59E0B'; // Yellow
        if (status === 'delayed') return '#EF4444'; // Red
        if (status === 'not_started' || status === 'pending') return '#9CA3AF'; // Gray
        return '#3B82F6'; // Blue (In Progress)
    };

    const handleApprovePhase = async () => {
        try {
            await api.put(`/phases/${phaseId}/approve`);
            setPhase((prev: any) => ({ ...prev, status: 'achieved', progress: 100 }));
            Alert.alert("Success", "Stage marked as Achieved");
        } catch (error) {
            console.error('Error approving phase:', error);
            Alert.alert("Error", "Failed to approve phase");
        }
    };

    const displayStatus = (status: string) => {
        if (status === 'waiting_for_approval') return 'Waiting for Approval';
        if (status === 'achieved') return 'Achieved';
        if (status === 'not_started' || status === 'pending') return 'Not Started';
        return status?.replace('_', ' ') || 'In Progress';
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{phase?.name || 'Stage Progress'}</Text>

                {/* Admin Approve Action */}
                {isAdmin && phase?.status === 'waiting_for_approval' ? (
                    <TouchableOpacity
                        style={{ backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}
                        onPress={handleApprovePhase}
                    >
                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Approve / Achieved</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity>
                            <Ionicons name="notifications-outline" size={24} color="#374151" />
                        </TouchableOpacity>
                        <TouchableOpacity>
                            <Ionicons name="ellipsis-vertical" size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Assigned Section */}
                <View style={styles.sectionCard}>
                    <View style={styles.assignedRow}>
                        {/* Phase Header - Removed Assignment Badge */}
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(phase?.status) + '20', alignSelf: 'flex-start' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(phase?.status) }]}>
                                {displayStatus(phase?.status)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.datesRow}>
                        <View>
                            <Text style={styles.label}>START DATE</Text>
                            <Text style={styles.value}>{phase?.start_date ? new Date(phase.start_date).toLocaleDateString() : 'N/A'}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.label}>DUE DATE</Text>
                            <Text style={styles.value}>{phase?.due_date ? new Date(phase.due_date).toLocaleDateString() : 'N/A'}</Text>
                        </View>
                    </View>


                </View>

                {/* Subtasks (Required Tasks) */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>STAGE TASKS</Text>
                    {subTasks.map((task, index) => {
                        const userIsAssigned = task.assignments && task.assignments.some((a: any) => a.id === user?.id);
                        const canComplete = isAdmin || userIsAssigned;

                        return (
                            <View key={index} style={styles.todoItem}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.todoText, task.status === 'Completed' && styles.todoTextDone]}>
                                        {task.name}
                                    </Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                        {task.assignments && task.assignments.length > 0 ? (
                                            task.assignments.map((assignee: any) => (
                                                <View key={assignee.id} style={{
                                                    backgroundColor: '#EFF6FF',
                                                    paddingHorizontal: 6,
                                                    paddingVertical: 2,
                                                    borderRadius: 4,
                                                }}>
                                                    <Text style={{ color: '#1E40AF', fontSize: 10, fontWeight: '500' }}>
                                                        {assignee.name}
                                                    </Text>
                                                </View>
                                            ))
                                        ) : (
                                            <Text style={{ fontSize: 10, color: '#9CA3AF', fontStyle: 'italic' }}>Unassigned</Text>
                                        )}
                                    </View>
                                </View>

                                {/* Action: Button or Badge */}
                                {task.status === 'Completed' ? (
                                    <View style={{ backgroundColor: '#DEF7EC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                                        <Text style={{ color: '#03543F', fontWeight: 'bold', fontSize: 12 }}>Completed</Text>
                                    </View>
                                ) : task.status === 'waiting_for_approval' ? (
                                    isAdmin ? (
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            {/* Reject Button */}
                                            <TouchableOpacity
                                                style={{ backgroundColor: '#FEE2E2', padding: 8, borderRadius: 20, borderWidth: 1, borderColor: '#EF4444' }}
                                                onPress={() => handleRejectTask(task)}
                                            >
                                                <Ionicons name="close" size={16} color="#EF4444" />
                                            </TouchableOpacity>

                                            {/* Approve Button */}
                                            <TouchableOpacity
                                                style={{ backgroundColor: '#D1FAE5', padding: 8, borderRadius: 20, borderWidth: 1, borderColor: '#10B981' }}
                                                onPress={() => handleApproveTask(task)}
                                            >
                                                <Ionicons name="checkmark" size={16} color="#10B981" />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                                            <Text style={{ color: '#92400E', fontWeight: 'bold', fontSize: 12 }}>Pending Approval</Text>
                                        </View>
                                    )
                                ) : (
                                    /* HIDE FOR ADMIN: Only Assigned Employee can submit for approval */
                                    !isAdmin && canComplete && task.status !== 'waiting_for_approval' && (
                                        <TouchableOpacity
                                            style={{ backgroundColor: '#1E40AF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }}
                                            onPress={() => handleCompleteTask(task)}
                                        >
                                            <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 12 }}>Mark Completed</Text>
                                        </TouchableOpacity>
                                    )
                                )}
                            </View>
                        );
                    })}
                    {subTasks.length === 0 && <Text style={styles.emptyTextSimple}>No tasks defined</Text>}
                </View>

                {/* Ad-hoc Todo List */}
                <View style={[styles.sectionCard, { marginTop: 16 }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>ADDITIONAL TO-DOS</Text>
                        <TouchableOpacity onPress={handleAddTodo}>
                            <Ionicons name="add-circle" size={24} color="#8B0000" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.addTodoRow}>
                        <TextInput
                            style={styles.todoInput}
                            placeholder="Add item..."
                            value={todoText}
                            onChangeText={setTodoText}
                            onSubmitEditing={handleAddTodo}
                        />
                    </View>

                    {todos.map((todo, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.todoItem}
                            onPress={() => handleToggleTodo(todo.id)}
                        >
                            <Ionicons
                                name={todo.is_completed ? "checkbox" : "square-outline"}
                                size={20}
                                color={todo.is_completed ? "#10B981" : "#9CA3AF"}
                            />
                            <Text style={[styles.todoText, todo.is_completed && styles.todoTextDone]}>
                                {todo.content}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    {todos.length === 0 && <Text style={styles.emptyTextSimple}>No items</Text>}
                </View>

                {/* Unified Activity Feed */}
                <View style={styles.feedContainer}>
                    <Text style={styles.sectionTitle}>ACTIVITY & UPDATES</Text>

                    {(() => {
                        const feed = [
                            ...updates.map(u => ({ ...u, type: 'update' })),
                            ...messages.map(m => ({ ...m, type: 'message' }))
                        ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                        if (feed.length === 0) {
                            return <Text style={styles.emptyTextSimple}>No activity yet</Text>;
                        }

                        return feed.map((item, idx) => {
                            if (item.type === 'update') {
                                return (
                                    <View key={`u-${idx}`} style={styles.updateCard}>
                                        <View style={styles.updateHeader}>
                                            <Text style={styles.updateUser}>{item.employee_name || 'Employee'}</Text>
                                            <Text style={styles.updateTime}>{new Date(item.created_at).toLocaleString()}</Text>
                                        </View>
                                        <View style={styles.progressChangeBadge}>
                                            <Text style={styles.progressChangeText}>
                                                {item.previous_progress}% → {item.new_progress}%
                                            </Text>
                                        </View>
                                        <Text style={styles.updateMessage}>{item.message}</Text>
                                    </View>
                                );
                            } else {
                                const isMe = user && item.sender_id === user.id;
                                return (
                                    <View key={`m-${idx}`} style={[
                                        styles.messageBubble,
                                        isMe ? styles.myMessage : styles.otherMessage
                                    ]}>
                                        {!isMe && <Text style={styles.senderName}>{item.sender_name}</Text>}

                                        {/* Text Content */}
                                        {item.content ? (
                                            <Text style={isMe ? styles.myMessageText : styles.otherMessageText}>
                                                {item.content}
                                            </Text>
                                        ) : null}

                                        {/* Media Content */}
                                        {item.media_url && (
                                            <View style={{ marginTop: item.content ? 8 : 0 }}>
                                                {item.type === 'image' && (
                                                    <Image
                                                        source={{ uri: api.defaults.baseURL + item.media_url }}
                                                        style={{ width: 200, height: 200, borderRadius: 8 }}
                                                        resizeMode="cover"
                                                    />
                                                )}
                                                {item.type === 'video' && (
                                                    <Video
                                                        source={{ uri: api.defaults.baseURL + item.media_url }}
                                                        style={{ width: 200, height: 200, borderRadius: 8 }}
                                                        useNativeControls
                                                        resizeMode={ResizeMode.CONTAIN}
                                                        isLooping={false}
                                                    />
                                                )}
                                                {item.type === 'audio' && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.1)', padding: 8, borderRadius: 16 }}>
                                                        <Ionicons name="mic" size={24} color={isMe ? "#FFF" : "#374151"} />
                                                        <Text style={{ color: isMe ? "#FFF" : "#374151", fontSize: 12 }}>Audio Note (Tap to play)</Text>
                                                        {/* Note: Full audio player implementation requires state tracking for each message. For now, we show a placeholder player. */}
                                                    </View>
                                                )}
                                            </View>
                                        )}

                                        <Text style={styles.messageTime}>
                                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                );
                            }
                        });
                    })()}
                </View>

            </ScrollView>

            {/* Bottom Input Area or Unassigned Banner */}
            {/* Show Input if User is Admin OR Assigned to at least one task */}
            {(isAdmin || isAssigned) ? (
                <>
                    {mediaUri && (
                        <View style={styles.mediaPreview}>
                            <Text style={{ fontSize: 12, color: '#6B7280' }}>Attached: {mediaType}</Text>
                            <TouchableOpacity onPress={() => { setMediaUri(null); setMediaType(null); }}>
                                <Ionicons name="close-circle" size={20} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.inputArea}>
                        <TouchableOpacity
                            style={styles.addProgressButton}
                            onPress={() => setUpdateModalVisible(true)}
                        >
                            <Ionicons name="add" size={20} color="#FFF" />
                            <Text style={styles.addProgressText}>Add Progress</Text>
                        </TouchableOpacity>

                        {/* Message Input */}
                        <View style={styles.messageInputContainer}>
                            <TextInput
                                style={styles.messageInput}
                                placeholder="Message..."
                                value={messageText}
                                onChangeText={setMessageText}
                            />
                            <TouchableOpacity onPress={pickImage}>
                                <Ionicons name="image-outline" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setCameraVisible(true)}>
                                <Ionicons name="videocam-outline" size={20} color="#6B7280" style={{ marginRight: 8 }} />
                            </TouchableOpacity>
                        </View>

                        {/* Mic / Send Button */}
                        <TouchableOpacity
                            style={[styles.micButton, recording && { backgroundColor: '#FEE2E2' }]}
                            onPress={messageText.trim() || mediaUri ? handleSendMessage : (recording ? stopRecording : startRecording)}
                            onLongPress={!messageText.trim() && !mediaUri ? startRecording : undefined}
                        >
                            <Ionicons
                                name={messageText.trim() || mediaUri ? "send" : (recording ? "stop" : "mic")}
                                size={20}
                                color={recording ? "#EF4444" : "#6B7280"}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Camera Modal */}
                    <Modal visible={cameraVisible} animationType="slide">
                        <CameraView style={{ flex: 1 }} ref={ref => setCameraRef(ref)} mode="video">
                            <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end', padding: 20 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <TouchableOpacity onPress={() => setCameraVisible(false)} style={{ padding: 20 }}>
                                        <Text style={{ color: '#FFF', fontSize: 18 }}>Close</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleVideoRecord}
                                        style={{
                                            width: 70, height: 70, borderRadius: 35,
                                            backgroundColor: isRecordingVideo ? '#EF4444' : '#FFF',
                                            borderWidth: 4, borderColor: '#D1D5DB'
                                        }}
                                    />
                                    <View style={{ width: 60 }} />
                                </View>
                            </SafeAreaView>
                        </CameraView>
                    </Modal>
                </>
            ) : (
                <View style={{ padding: 20, backgroundColor: '#FEF2F2', borderTopWidth: 1, borderTopColor: '#FECACA', alignItems: 'center' }}>
                    <Ionicons name="alert-circle-outline" size={24} color="#DC2626" style={{ marginBottom: 4 }} />
                    <Text style={{ color: '#DC2626', fontWeight: '600', fontSize: 14 }}>Assign an employee to start progress</Text>
                </View>
            )}

            {/* Add Progress Modal */}
            <Modal
                transparent={true}
                visible={updateModalVisible}
                onRequestClose={() => setUpdateModalVisible(false)}
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Progress Update</Text>

                        <Text style={styles.modalLabel}>New Progress (%)</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="e.g. 50"
                            keyboardType="numeric"
                            value={newProgress}
                            onChangeText={setNewProgress}
                        />

                        <Text style={styles.modalLabel}>Message</Text>
                        <TextInput
                            style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                            placeholder="Describe what was done..."
                            multiline
                            value={updateMessage}
                            onChangeText={setUpdateMessage}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setUpdateModalVisible(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalSaveBtn, submitLoading && styles.disabledBtn]}
                                onPress={handleSubmitUpdate}
                                disabled={submitLoading}
                            >
                                <Text style={styles.modalSaveText}>
                                    {submitLoading ? 'Submitting...' : 'Submit Update'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        flex: 1,
        marginLeft: 12,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 80,
    },
    sectionCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    assignedRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center', // Centered vertically
        marginBottom: 20,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#8B0000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
    label: {
        fontSize: 10,
        color: '#6B7280',
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    value: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    datesRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    progressSection: {
        marginBottom: 4,
    },
    progressValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
    progressBarBg: {
        height: 10,
        backgroundColor: '#F3F4F6',
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#10B981', // Green
        borderRadius: 5,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    addTodoRow: {
        marginBottom: 12,
    },
    todoInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#111827'
    },
    todoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 4,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    todoText: {
        fontSize: 15,
        color: '#374151',
    },
    todoTextDone: {
        color: '#9CA3AF',
        textDecorationLine: 'line-through',
    },
    emptyTextSimple: {
        fontSize: 13,
        color: '#9CA3AF',
        fontStyle: 'italic',
        marginTop: 8,
        textAlign: 'center',
    },
    feedContainer: {
        marginTop: 24,
        paddingBottom: 20
    },
    inputArea: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        alignItems: 'center',
        gap: 8
    },
    addProgressButton: {
        backgroundColor: '#7C3AED', // Purple-ish from user image
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 4
    },
    addProgressText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 12
    },
    messageInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        backgroundColor: '#FFF',
        height: 40
    },
    messageInput: {
        flex: 1,
        height: '100%',
        fontSize: 14,
        color: '#111827'
    },
    micButton: {
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center'
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 24,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
        color: '#111827',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalCancelBtn: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
    },
    modalSaveBtn: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: '#8B0000',
        borderRadius: 8,
    },
    modalCancelText: {
        color: '#4B5563',
        fontWeight: '600',
    },
    modalSaveText: {
        color: '#FFF',
        fontWeight: '600',
    },
    // Restored Styles
    updateCard: {
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#10B981', // Green accent
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    updateHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    updateUser: {
        fontWeight: '700',
        fontSize: 14,
        color: '#111827',
    },
    updateTime: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    progressChangeBadge: {
        backgroundColor: '#ECFDF5',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 8,
    },
    progressChangeText: {
        color: '#047857',
        fontSize: 12,
        fontWeight: '700',
    },
    updateMessage: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 8,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#DCFCE7', // Light green
        borderBottomRightRadius: 2,
    },
    otherMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFF',
        borderBottomLeftRadius: 2,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    myMessageText: {
        color: '#064E3B',
    },
    otherMessageText: {
        color: '#1F2937',
    },
    senderName: {
        fontSize: 10,
        color: '#6B7280',
        marginBottom: 4,
        fontWeight: '600',
    },
    messageTime: {
        fontSize: 9,
        color: '#9CA3AF',
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    mediaPreview: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        padding: 8,
        marginHorizontal: 16,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    disabledBtn: {
        opacity: 0.7,
        backgroundColor: '#9CA3AF'
    }
});

export default StageProgressScreen;
