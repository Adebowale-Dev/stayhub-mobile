import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, StatusBar, Modal, Switch, Image, } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text, TextInput, ActivityIndicator, Divider, useTheme, } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { studentAPI, authAPI } from '../../services/api';
import { APP_CONFIG } from '../../constants/config';
import { useThemeStore } from '../../store/themeStore';
import type { NotificationPreferences, NotificationSettings } from '../../types';
import { Reveal } from '../../components/ui/Reveal';
import { getPushNotificationsUnavailableReason, isPushNotificationsSupported, registerForPushNotificationsAsync, unregisterStoredPushTokenAsync, } from '../../services/pushNotifications';
const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
    pushEnabled: true,
    emailEscalationEnabled: true,
    invitationCreated: true,
    invitationUpdates: true,
    invitationExpired: true,
    paymentUpdates: true,
    reservationUpdates: true,
};
const buildFallbackNotificationSettings = (preferences?: Partial<NotificationPreferences>): NotificationSettings => ({
    preferences: {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...(preferences ?? {}),
    },
    devices: [],
    registeredDevicesCount: 0,
    hasActiveDevice: false,
    lastRegisteredAt: null,
});
export default function ProfileScreen() {
    const user = useAuthStore((state) => state.user);
    const updateUser = useAuthStore((state) => state.updateUser);
    const logout = useAuthStore((state) => state.logout);
    const router = useRouter();
    const theme = useTheme();
    const isDark = useThemeStore((s) => s.isDark);
    const setTheme = useThemeStore((s) => s.setTheme);
    const dynText = { color: theme.colors.onSurface };
    const dynTextSec = { color: theme.colors.onSurfaceVariant };
    const dynSep = { backgroundColor: theme.colors.surfaceVariant };
    const getDeptName = (dept: any): string => {
        if (!dept)
            return '';
        if (typeof dept === 'object')
            return dept.name ?? dept.code ?? '';
        return dept;
    };
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [phone, setPhone] = useState(user?.phone ?? user?.phoneNumber ?? '');
    const [department, setDepartment] = useState(getDeptName(user?.department));
    const [level, setLevel] = useState(user?.level ?? '');
    const [uploading, setUploading] = useState(false);
    const [pwModalVisible, setPwModalVisible] = useState(false);
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [pwSaving, setPwSaving] = useState(false);
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(buildFallbackNotificationSettings(user?.notificationPreferences));
    const [notificationBusy, setNotificationBusy] = useState<keyof NotificationPreferences | 'reconnect' | null>(null);
    const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            try {
                const [profileResult, settingsResult] = await Promise.allSettled([
                    studentAPI.getProfile(),
                    studentAPI.getNotificationSettings(),
                ]);
                const student = profileResult.status === 'fulfilled'
                    ? (profileResult.value.data as any).data?.student ?? (profileResult.value.data as any).student
                    : null;
                if (student) {
                    updateUser(student);
                    setPhone(student.phone ?? student.phoneNumber ?? '');
                    setDepartment(getDeptName(student.department));
                    setLevel(student.level ?? '');
                    if (student.theme)
                        await setTheme(student.theme === 'dark');
                }
                if (settingsResult.status === 'fulfilled') {
                    const settings = (settingsResult.value.data as any).data ?? buildFallbackNotificationSettings();
                    setNotificationSettings(settings);
                    updateUser({
                        notificationPreferences: settings.preferences,
                        ...(settings.theme ? { theme: settings.theme } : {}),
                    });
                }
                else {
                    setNotificationSettings(buildFallbackNotificationSettings(student?.notificationPreferences));
                }
            }
            catch {
            }
            finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);
    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await studentAPI.updateProfile({ phoneNumber: phone, department, level });
            const updated = (res.data as any).data?.student ?? (res.data as any).student;
            if (updated)
                updateUser(updated);
            setEditing(false);
            Alert.alert('Success', 'Profile updated successfully.');
        }
        catch (e: any) {
            Alert.alert('Error', e.response?.data?.message ?? 'Failed to update profile.');
        }
        finally {
            setSaving(false);
        }
    };
    const handleLogout = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await unregisterStoredPushTokenAsync(async (token) => {
                            await studentAPI.unregisterPushDevice(token);
                        });
                    }
                    catch { }
                    try {
                        await authAPI.logout();
                    }
                    catch { }
                    await logout();
                    router.replace('/(auth)/login');
                },
            },
        ]);
    };
    const handleChangePassword = async () => {
        if (!currentPw || !newPw || !confirmPw) {
            Alert.alert('Error', 'Please fill in all fields.');
            return;
        }
        if (newPw.length < 6) {
            Alert.alert('Error', 'New password must be at least 6 characters.');
            return;
        }
        if (newPw !== confirmPw) {
            Alert.alert('Error', 'New passwords do not match.');
            return;
        }
        setPwSaving(true);
        try {
            await authAPI.changePassword({
                currentPassword: currentPw,
                newPassword: newPw,
                confirmPassword: confirmPw,
            });
            setPwModalVisible(false);
            setCurrentPw('');
            setNewPw('');
            setConfirmPw('');
            Alert.alert('Success', 'Password changed successfully.');
        }
        catch (e: any) {
            Alert.alert('Error', e.response?.data?.message ?? 'Failed to change password. Please try again.');
        }
        finally {
            setPwSaving(false);
        }
    };
    const closePwModal = () => {
        setPwModalVisible(false);
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
        setShowCurrentPw(false);
        setShowNewPw(false);
        setShowConfirmPw(false);
    };
    const handleThemeToggle = async (newValue: boolean) => {
        await setTheme(newValue);
        try {
            await studentAPI.updateProfile({ theme: newValue ? 'dark' : 'light' });
        }
        catch { }
    };
    const applyNotificationSettings = (settings: NotificationSettings) => {
        setNotificationSettings(settings);
        updateUser({
            notificationPreferences: settings.preferences,
            ...(settings.theme ? { theme: settings.theme } : {}),
        });
    };
    const syncPushDevice = async (preferences: NotificationPreferences) => {
        const result = await registerForPushNotificationsAsync(preferences);
        if (result.status !== 'registered' || !result.token) {
            setNotificationMessage(result.message ?? 'Push notifications are not ready on this device yet.');
            return result;
        }
        const response = await studentAPI.registerPushDevice({
            token: result.token,
            platform: result.platform ?? Platform.OS,
            appOwnership: result.appOwnership ?? null,
            deviceName: result.deviceName ?? null,
            projectId: result.projectId ?? null,
        });
        const nextSettings = (response.data as any).data as NotificationSettings;
        applyNotificationSettings(nextSettings);
        setNotificationMessage('Push alerts are active on this device.');
        return result;
    };
    const handleNotificationToggle = async (key: keyof NotificationPreferences, value: boolean) => {
        const previousSettings = notificationSettings;
        const optimisticSettings: NotificationSettings = {
            ...notificationSettings,
            preferences: {
                ...notificationSettings.preferences,
                [key]: value,
            },
        };
        setNotificationBusy(key);
        setNotificationSettings(optimisticSettings);
        try {
            const response = await studentAPI.updateNotificationPreferences({
                [key]: value,
            });
            const updatedSettings = (response.data as any).data as NotificationSettings;
            applyNotificationSettings(updatedSettings);
            if (key === 'pushEnabled') {
                if (value) {
                    const result = await syncPushDevice(updatedSettings.preferences);
                    if (result.status === 'denied') {
                        Alert.alert('Permission Needed', result.message ?? 'Allow notifications in your device settings to receive room alerts.');
                    }
                    else if (result.status === 'unsupported') {
                        Alert.alert('Development Build Needed', result.message ??
                            'Push notifications are not available in Expo Go. Use a development build instead.');
                    }
                }
                else {
                    await unregisterStoredPushTokenAsync(async (token) => {
                        await studentAPI.unregisterPushDevice(token);
                    });
                    const refreshed = await studentAPI.getNotificationSettings();
                    applyNotificationSettings((refreshed.data as any).data as NotificationSettings);
                    setNotificationMessage('Push alerts have been turned off for this device.');
                }
            }
        }
        catch (e: any) {
            setNotificationSettings(previousSettings);
            Alert.alert('Error', e.response?.data?.message ?? 'Failed to update notification settings.');
        }
        finally {
            setNotificationBusy(null);
        }
    };
    const handleReconnectDevice = async () => {
        if (!notificationSettings.preferences.pushEnabled) {
            Alert.alert('Push Alerts Off', 'Turn on push alerts first, then reconnect this device.');
            return;
        }
        if (!APP_CONFIG.EAS_PROJECT_ID) {
            Alert.alert('Expo Project ID Needed', 'Add EXPO_EAS_PROJECT_ID to your mobile environment before reconnecting this device for push alerts.');
            return;
        }
        setNotificationBusy('reconnect');
        try {
            const result = await syncPushDevice(notificationSettings.preferences);
            if (result.status === 'denied') {
                Alert.alert('Permission Needed', result.message ?? 'Allow notifications in your device settings to receive room alerts.');
            }
            else if (result.status === 'unsupported') {
                Alert.alert('Development Build Needed', result.message ??
                    'Push notifications are not available in Expo Go. Use a development build instead.');
            }
        }
        catch (e: any) {
            Alert.alert('Error', e.response?.data?.message ?? 'Failed to reconnect this device.');
        }
        finally {
            setNotificationBusy(null);
        }
    };
    const handleNotificationPairToggle = async (firstKey: keyof NotificationPreferences, secondKey: keyof NotificationPreferences, value: boolean) => {
        const previousSettings = notificationSettings;
        const optimisticSettings: NotificationSettings = {
            ...notificationSettings,
            preferences: {
                ...notificationSettings.preferences,
                [firstKey]: value,
                [secondKey]: value,
            },
        };
        setNotificationBusy(firstKey);
        setNotificationSettings(optimisticSettings);
        try {
            const response = await studentAPI.updateNotificationPreferences({
                [firstKey]: value,
                [secondKey]: value,
            });
            applyNotificationSettings((response.data as any).data as NotificationSettings);
        }
        catch (e: any) {
            setNotificationSettings(previousSettings);
            Alert.alert('Error', e.response?.data?.message ?? 'Failed to update notification settings.');
        }
        finally {
            setNotificationBusy(null);
        }
    };
    const pickAndUpload = async (source: 'camera' | 'library') => {
        try {
            let result: ImagePicker.ImagePickerResult;
            if (source === 'camera') {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission needed', 'Camera access is required to take a photo.');
                    return;
                }
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.7,
                });
            }
            else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission needed', 'Photo library access is required.');
                    return;
                }
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.7,
                });
            }
            if (result.canceled)
                return;
            const asset = result.assets[0];
            const mimeType = asset.mimeType ?? 'image/jpeg';
            const ext = mimeType.split('/')[1] ?? 'jpg';
            const fileName = asset.fileName ?? `avatar_${Date.now()}.${ext}`;
            const formData = new FormData();
            formData.append('picture', {
                uri: asset.uri,
                type: mimeType,
                name: fileName,
            } as any);
            setUploading(true);
            const res = await studentAPI.uploadProfilePicture(formData);
            const updated = (res.data as any).data?.student ?? (res.data as any).student;
            if (updated)
                updateUser(updated);
            Alert.alert('Success', 'Profile picture updated.');
        }
        catch (e: any) {
            const msg = e.response?.data?.message ??
                e.message ??
                'Failed to upload picture.';
            Alert.alert('Upload Error', msg);
        }
        finally {
            setUploading(false);
        }
    };
    const handleRemovePicture = async () => {
        setUploading(true);
        try {
            const res = await studentAPI.updateProfile({ profilePicture: null });
            const updated = (res.data as any).data?.student ?? (res.data as any).student;
            if (updated)
                updateUser(updated);
        }
        catch (e: any) {
            Alert.alert('Error', e.response?.data?.message ?? 'Failed to remove picture.');
        }
        finally {
            setUploading(false);
        }
    };
    const handleAvatarPress = () => {
        const options: any[] = [
            { text: 'Take Photo', onPress: () => pickAndUpload('camera') },
            { text: 'Choose from Library', onPress: () => pickAndUpload('library') },
        ];
        if (user?.profilePicture) {
            options.push({ text: 'Remove Photo', style: 'destructive', onPress: handleRemovePicture });
        }
        options.push({ text: 'Cancel', style: 'cancel' });
        Alert.alert('Profile Picture', 'Choose an option', options);
    };
    const initials = user
        ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`
        : 'SH';
    const deptName = getDeptName(user?.department);
    const notificationPreferences = notificationSettings.preferences;
    const notificationStatusText = !isPushNotificationsSupported()
        ? getPushNotificationsUnavailableReason() ??
            'Push notifications are not available in this build.'
        : !APP_CONFIG.EAS_PROJECT_ID
            ? 'Add an Expo project ID to finish push setup for builds.'
            : !notificationPreferences.pushEnabled
                ? 'Push alerts are turned off.'
                : notificationSettings.hasActiveDevice
                    ? `Active on ${notificationSettings.registeredDevicesCount} device${notificationSettings.registeredDevicesCount === 1 ? '' : 's'}.`
                    : notificationMessage || 'Enable permission and reconnect this device to receive alerts.';
    const notificationMetaText = notificationSettings.lastRegisteredAt
        ? `Last synced ${new Date(notificationSettings.lastRegisteredAt).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        })}`
        : 'Urgent invites and expiry alerts will still fall back to email.';
    const notificationSummary = !notificationPreferences.pushEnabled
        ? 'Push alerts off'
        : notificationSettings.hasActiveDevice
            ? `${notificationSettings.registeredDevicesCount} device${notificationSettings.registeredDevicesCount === 1 ? '' : 's'} linked`
            : 'Needs setup';
    if (loading) {
        return (<View style={styles.center}>
        <ActivityIndicator size="large" color="#1565C0"/>
      </View>);
    }
    return (<>
      <StatusBar barStyle="light-content" backgroundColor="#1565C0"/>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          <View style={styles.hero}>
            <View style={styles.bubble1}/>
            <View style={styles.bubble2}/>
            <View style={styles.bubble3}/>

            <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.85} disabled={uploading} style={styles.avatarWrap}>
              <View style={styles.avatarRing}>
                {user?.profilePicture ? (<Image source={{ uri: user.profilePicture }} style={styles.avatarImage}/>) : (<View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>)}
              </View>

              
              {uploading ? (<View style={styles.avatarOverlay}>
                  <ActivityIndicator size="small" color="#fff"/>
                </View>) : (<View style={styles.cameraBadge}>
                  <MaterialCommunityIcons name="camera" size={13} color="#fff"/>
                </View>)}
            </TouchableOpacity>

            <Text style={styles.heroName}>{user?.firstName} {user?.lastName}</Text>
            <Text style={styles.heroMatric}>{user?.matricNumber}</Text>
            {user?.email ? <Text style={styles.heroEmail}>{user.email}</Text> : null}
            <View style={styles.heroPillRow}>
              {deptName ? (<View style={styles.heroPill}>
                  <Text style={styles.heroPillText}>{deptName}</Text>
                </View>) : null}
              {user?.level ? (<View style={styles.heroPill}>
                  <Text style={styles.heroPillText}>{user.level} Level</Text>
                </View>) : null}
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>{isDark ? 'Dark mode' : 'Light mode'}</Text>
              </View>
            </View>
          </View>

          <Reveal delay={60}>
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.summaryLabel, dynTextSec]}>Department</Text>
                <Text style={[styles.summaryValue, dynText]} numberOfLines={2}>
                  {deptName || 'Add department'}
                </Text>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.summaryLabel, dynTextSec]}>Level</Text>
                <Text style={[styles.summaryValue, dynText]}>
                  {user?.level ? `${user.level} Level` : 'Add level'}
                </Text>
              </View>

              <View style={[styles.summaryCardWide, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.summaryWideHeader}>
                  <Text style={[styles.summaryLabel, dynTextSec]}>Notification status</Text>
                  <View style={styles.summaryBadge}>
                    <Text style={styles.summaryBadgeText}>{notificationPreferences.pushEnabled ? 'LIVE' : 'OFF'}</Text>
                  </View>
                </View>
                <Text style={[styles.summaryValue, dynText]}>{notificationSummary}</Text>
                <Text style={[styles.summaryMeta, dynTextSec]}>{notificationMetaText}</Text>
              </View>
            </View>
          </Reveal>

          
          <Reveal delay={130}>
            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, dynText]}>Student Information</Text>
                {!editing && (<TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                    <MaterialCommunityIcons name="pencil-outline" size={14} color="#1565C0"/>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>)}
              </View>

            {[
            { label: 'First Name', value: user?.firstName },
            { label: 'Last Name', value: user?.lastName },
            { label: 'Matric Number', value: user?.matricNumber },
            { label: 'Email', value: user?.email },
            { label: 'Gender', value: user?.gender, capitalize: true },
        ].map((field, i) => (<View key={field.label}>
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, dynTextSec]}>{field.label}</Text>
                  <Text style={[styles.fieldValue, field.capitalize && { textTransform: 'capitalize' }, dynText]}>
                    {field.value ?? '-'}
                  </Text>
                </View>
                {i < 4 && <View style={[styles.sep, dynSep]}/>}
              </View>))}

            <View style={[styles.sep, dynSep]}/>

              {editing ? (<View style={styles.editBlock}>
                  <TextInput mode="outlined" label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} disabled={saving} outlineColor="#E0E0E0" activeOutlineColor="#1565C0"/>
                  <TextInput mode="outlined" label="Department" value={department} onChangeText={setDepartment} style={styles.input} disabled={saving} outlineColor="#E0E0E0" activeOutlineColor="#1565C0"/>
                  <TextInput mode="outlined" label="Level" value={level} onChangeText={setLevel} keyboardType="numeric" style={styles.input} disabled={saving} placeholder="e.g. 300" outlineColor="#E0E0E0" activeOutlineColor="#1565C0"/>
                  <View style={styles.editActions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)} disabled={saving}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                      {saving
                  ? <ActivityIndicator size={16} color="#fff"/>
                  : <Text style={styles.saveBtnText}>Save Changes</Text>}
                    </TouchableOpacity>
                  </View>
                </View>) : (<>
                  {[
                  { label: 'Phone', value: user?.phone ?? user?.phoneNumber },
                  { label: 'Department', value: deptName },
                  { label: 'Level', value: user?.level ? `${user.level} Level` : undefined },
              ].map((field, i) => (<View key={field.label}>
                      <View style={styles.field}>
                        <Text style={[styles.fieldLabel, dynTextSec]}>{field.label}</Text>
                        <Text style={[styles.fieldValue, dynText]}>{field.value || 'Not added yet'}</Text>
                      </View>
                      {i < 2 && <View style={[styles.sep, dynSep]}/>}
                    </View>))}
                </>)}
            </View>
          </Reveal>

          
          <Reveal delay={210}>
            <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, dynText]}>Settings</Text>
              </View>

            
            <Text style={[styles.settingSection, dynTextSec]}>Security</Text>

            <TouchableOpacity style={styles.settingRow} onPress={() => setPwModalVisible(true)} activeOpacity={0.7}>
              <View style={[styles.settingIconWrap, { backgroundColor: '#E3F2FD' }]}>
                <MaterialCommunityIcons name="lock-outline" size={18} color="#1565C0"/>
              </View>
              <Text style={[styles.settingLabel, dynText]}>Change Password</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#BDBDBD"/>
            </TouchableOpacity>

            <View style={[styles.sep, dynSep]}/>

            
            <Text style={[styles.settingSection, dynTextSec, { marginTop: 14 }]}>Appearance</Text>

            <View style={styles.settingRow}>
              <View style={[styles.settingIconWrap, { backgroundColor: isDark ? '#1A237E' : '#E8EAF6' }]}>
                <MaterialCommunityIcons name={isDark ? 'weather-night' : 'white-balance-sunny'} size={18} color={isDark ? '#7986CB' : '#3949AB'}/>
              </View>
              <Text style={[styles.settingLabel, dynText]}>Dark Mode</Text>
              <Switch value={isDark} onValueChange={handleThemeToggle} trackColor={{ false: '#E0E0E0', true: '#42A5F5' }} thumbColor={isDark ? '#1565C0' : '#f4f3f4'}/>
            </View>

            <View style={[styles.sep, dynSep]}/>

            <Text style={[styles.settingSection, dynTextSec, { marginTop: 14 }]}>Notifications</Text>

            <View style={styles.settingRow}>
              <View style={[styles.settingIconWrap, { backgroundColor: '#E8F5E9' }]}>
                <MaterialCommunityIcons name="bell-ring-outline" size={18} color="#2E7D32"/>
              </View>
              <View style={styles.settingCopy}>
                <Text style={[styles.settingLabel, dynText]}>Push Alerts</Text>
                <Text style={[styles.settingHint, dynTextSec]}>{notificationStatusText}</Text>
              </View>
              <Switch value={notificationPreferences.pushEnabled} onValueChange={(value) => handleNotificationToggle('pushEnabled', value)} trackColor={{ false: '#E0E0E0', true: '#66BB6A' }} thumbColor={notificationPreferences.pushEnabled ? '#2E7D32' : '#f4f3f4'} disabled={notificationBusy === 'pushEnabled'}/>
            </View>

            <View style={[styles.sep, dynSep]}/>

            <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={handleReconnectDevice} disabled={notificationBusy === 'reconnect'}>
              <View style={[styles.settingIconWrap, { backgroundColor: '#E3F2FD' }]}>
                <MaterialCommunityIcons name="cellphone-link" size={18} color="#1565C0"/>
              </View>
              <View style={styles.settingCopy}>
                <Text style={[styles.settingLabel, dynText]}>Reconnect This Device</Text>
                <Text style={[styles.settingHint, dynTextSec]}>{notificationMetaText}</Text>
              </View>
              {notificationBusy === 'reconnect' ? (<ActivityIndicator size={18} color="#1565C0"/>) : (<MaterialCommunityIcons name="chevron-right" size={20} color="#BDBDBD"/>)}
            </TouchableOpacity>

            <View style={[styles.sep, dynSep]}/>

            <View style={styles.settingRow}>
              <View style={[styles.settingIconWrap, { backgroundColor: '#FFF3E0' }]}>
                <MaterialCommunityIcons name="email-sync-outline" size={18} color="#EF6C00"/>
              </View>
              <View style={styles.settingCopy}>
                <Text style={[styles.settingLabel, dynText]}>Email Backup</Text>
                <Text style={[styles.settingHint, dynTextSec]}>
                  Send email too when push is unavailable or an invitation is urgent.
                </Text>
              </View>
              <Switch value={notificationPreferences.emailEscalationEnabled} onValueChange={(value) => handleNotificationToggle('emailEscalationEnabled', value)} trackColor={{ false: '#E0E0E0', true: '#FFB74D' }} thumbColor={notificationPreferences.emailEscalationEnabled ? '#EF6C00' : '#f4f3f4'} disabled={notificationBusy === 'emailEscalationEnabled'}/>
            </View>

            <View style={[styles.sep, dynSep]}/>

            <View style={styles.settingRow}>
              <View style={[styles.settingIconWrap, { backgroundColor: '#E8EAF6' }]}>
                <MaterialCommunityIcons name="account-multiple-outline" size={18} color="#3949AB"/>
              </View>
              <View style={styles.settingCopy}>
                <Text style={[styles.settingLabel, dynText]}>Room Invite Alerts</Text>
                <Text style={[styles.settingHint, dynTextSec]}>
                  Get notified immediately when a friend reserves a bed for you.
                </Text>
              </View>
              <Switch value={notificationPreferences.invitationCreated} onValueChange={(value) => handleNotificationToggle('invitationCreated', value)} trackColor={{ false: '#E0E0E0', true: '#9FA8DA' }} thumbColor={notificationPreferences.invitationCreated ? '#3949AB' : '#f4f3f4'} disabled={notificationBusy === 'invitationCreated'}/>
            </View>

            <View style={[styles.sep, dynSep]}/>

            <View style={styles.settingRow}>
              <View style={[styles.settingIconWrap, { backgroundColor: '#FCE4EC' }]}>
                <MaterialCommunityIcons name="account-check-outline" size={18} color="#C2185B"/>
              </View>
              <View style={styles.settingCopy}>
                <Text style={[styles.settingLabel, dynText]}>Invite Responses & Expiry</Text>
                <Text style={[styles.settingHint, dynTextSec]}>
                  See when friends approve, reject, or allow an invite to expire.
                </Text>
              </View>
              <Switch value={notificationPreferences.invitationUpdates && notificationPreferences.invitationExpired} onValueChange={(value) => handleNotificationPairToggle('invitationUpdates', 'invitationExpired', value)} trackColor={{ false: '#E0E0E0', true: '#F48FB1' }} thumbColor={notificationPreferences.invitationUpdates && notificationPreferences.invitationExpired
            ? '#C2185B'
            : '#f4f3f4'} disabled={notificationBusy === 'invitationUpdates'}/>
            </View>

            <View style={[styles.sep, dynSep]}/>

            <View style={styles.settingRow}>
              <View style={[styles.settingIconWrap, { backgroundColor: '#E0F2F1' }]}>
                <MaterialCommunityIcons name="credit-card-check-outline" size={18} color="#00796B"/>
              </View>
              <View style={styles.settingCopy}>
                <Text style={[styles.settingLabel, dynText]}>Payment & Reservation Updates</Text>
                <Text style={[styles.settingHint, dynTextSec]}>
                  Keep payment confirmation and confirmed-room updates on this phone.
                </Text>
              </View>
              <Switch value={notificationPreferences.paymentUpdates && notificationPreferences.reservationUpdates} onValueChange={(value) => handleNotificationPairToggle('paymentUpdates', 'reservationUpdates', value)} trackColor={{ false: '#E0E0E0', true: '#80CBC4' }} thumbColor={notificationPreferences.paymentUpdates && notificationPreferences.reservationUpdates
            ? '#00796B'
            : '#f4f3f4'} disabled={notificationBusy === 'paymentUpdates'}/>
            </View>

            <View style={[styles.sep, dynSep]}/>
            <Text style={[styles.settingSection, dynTextSec, { marginTop: 14 }]}>Support & Info</Text>

            <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={() => Alert.alert('Help & Support', 'For assistance, please contact us:\n\nEmail: support@stayhub.com\n\nOffice hours:\nMon - Fri, 8:00am - 5:00pm')}>
              <View style={[styles.settingIconWrap, { backgroundColor: '#E8F5E9' }]}>
                <MaterialCommunityIcons name="headset" size={18} color="#2E7D32"/>
              </View>
              <Text style={[styles.settingLabel, dynText]}>Help & Support</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#BDBDBD"/>
            </TouchableOpacity>

            <View style={[styles.sep, dynSep]}/>

            <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={() => Alert.alert('About StayHub', `StayHub Mobile\nVersion ${APP_CONFIG.VERSION}\n\nA smart hostel reservation platform for students. Book your room, manage reservations, and pay seamlessly in one place.`)}>
              <View style={[styles.settingIconWrap, { backgroundColor: '#F3E5F5' }]}>
                <MaterialCommunityIcons name="information-outline" size={18} color="#7B1FA2"/>
              </View>
              <Text style={[styles.settingLabel, dynText]}>About StayHub</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#BDBDBD"/>
            </TouchableOpacity>

            <View style={[styles.sep, dynSep]}/>

            
            <Text style={[styles.settingSection, dynTextSec, { marginTop: 14 }]}>Account</Text>

              <TouchableOpacity style={styles.settingRow} onPress={handleLogout} activeOpacity={0.7}>
                <View style={[styles.settingIconWrap, { backgroundColor: '#FFEBEE' }]}>
                  <MaterialCommunityIcons name="logout" size={18} color="#C62828"/>
                </View>
                <Text style={[styles.settingLabel, { color: '#C62828' }]}>Sign Out</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#BDBDBD"/>
              </TouchableOpacity>
            </View>
          </Reveal>
        </ScrollView>
      </KeyboardAvoidingView>

      
      <Modal visible={pwModalVisible} transparent animationType="slide" onRequestClose={closePwModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closePwModal}/>
          <View style={[styles.modalBox, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHandle}/>
            <Text style={styles.modalTitle}>Change Password</Text>
            <Text style={styles.modalSubtitle}>Enter your current password, then choose a new one.</Text>
            <Divider style={{ marginBottom: 20, marginTop: 4 }}/>

            <TextInput mode="outlined" label="Current Password" value={currentPw} onChangeText={setCurrentPw} secureTextEntry={!showCurrentPw} right={<TextInput.Icon icon={showCurrentPw ? 'eye-off-outline' : 'eye-outline'} onPress={() => setShowCurrentPw((v) => !v)}/>} style={styles.input} disabled={pwSaving} outlineColor="#E0E0E0" activeOutlineColor="#1565C0"/>

            <TextInput mode="outlined" label="New Password" value={newPw} onChangeText={setNewPw} secureTextEntry={!showNewPw} right={<TextInput.Icon icon={showNewPw ? 'eye-off-outline' : 'eye-outline'} onPress={() => setShowNewPw((v) => !v)}/>} style={styles.input} disabled={pwSaving} outlineColor="#E0E0E0" activeOutlineColor="#1565C0"/>

            <TextInput mode="outlined" label="Confirm New Password" value={confirmPw} onChangeText={setConfirmPw} secureTextEntry={!showConfirmPw} right={<TextInput.Icon icon={showConfirmPw ? 'eye-off-outline' : 'eye-outline'} onPress={() => setShowConfirmPw((v) => !v)}/>} style={styles.input} disabled={pwSaving} outlineColor="#E0E0E0" activeOutlineColor="#1565C0"/>

            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closePwModal} disabled={pwSaving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, pwSaving && { opacity: 0.7 }]} onPress={handleChangePassword} disabled={pwSaving}>
                {pwSaving
            ? <ActivityIndicator size={16} color="#fff"/>
            : <Text style={styles.saveBtnText}>Update</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>);
}
const styles = StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { paddingBottom: 40 },
    hero: {
        backgroundColor: '#1565C0',
        alignItems: 'center',
        paddingTop: 32,
        paddingBottom: 36,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        overflow: 'hidden',
    },
    bubble1: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.06)',
        top: -60,
        right: -50,
    },
    bubble2: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.05)',
        bottom: -40,
        left: -20,
    },
    bubble3: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.08)',
        top: 36,
        right: 64,
    },
    avatarRing: {
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.35)',
        padding: 3,
        marginBottom: 14,
    },
    avatar: {
        flex: 1,
        borderRadius: 40,
        backgroundColor: '#42A5F5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { color: '#fff', fontWeight: '800', fontSize: 28 },
    avatarImage: { width: '100%', height: '100%', borderRadius: 40 },
    avatarWrap: { position: 'relative', marginBottom: 14, alignSelf: 'center' },
    avatarOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 44,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#1565C0',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    heroName: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 4 },
    heroMatric: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 3 },
    heroEmail: { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
    heroPillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
        marginTop: 14,
        paddingHorizontal: 24,
    },
    heroPill: {
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.14)',
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    heroPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    summaryGrid: {
        paddingHorizontal: 18,
        paddingTop: 22,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    summaryCard: {
        width: '47%',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 12,
        elevation: 3,
    },
    summaryCardWide: {
        width: '100%',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 12,
        elevation: 3,
    },
    summaryWideHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        gap: 10,
    },
    summaryLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '800',
        lineHeight: 22,
    },
    summaryMeta: {
        fontSize: 12,
        lineHeight: 18,
        marginTop: 6,
    },
    summaryBadge: {
        borderRadius: 999,
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    summaryBadgeText: {
        color: '#1565C0',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.6,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        marginHorizontal: 18,
        marginTop: 22,
        paddingHorizontal: 18,
        paddingBottom: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 16,
        paddingBottom: 14,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
    editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    editBtnText: { fontSize: 12, color: '#1565C0', fontWeight: '600' },
    field: { paddingVertical: 12 },
    fieldLabel: { fontSize: 11, color: '#9E9E9E', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
    fieldValue: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
    sep: { height: 1, backgroundColor: '#F5F5F5' },
    editBlock: { paddingTop: 8 },
    input: { marginBottom: 12, backgroundColor: '#fff', fontSize: 14 },
    editActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    cancelBtn: {
        flex: 1,
        height: 46,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtnText: { color: '#666', fontWeight: '600', fontSize: 14 },
    saveBtn: {
        flex: 1,
        height: 46,
        borderRadius: 12,
        backgroundColor: '#1565C0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    settingSection: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9E9E9E',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 6,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 11,
        gap: 12,
    },
    settingIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingLabel: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: '#1A1A2E',
    },
    settingCopy: {
        flex: 1,
        gap: 2,
    },
    settingHint: {
        fontSize: 12,
        lineHeight: 17,
        color: '#757575',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    modalBox: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingBottom: 32,
        paddingTop: 12,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E0E0E0',
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalTitle: { fontWeight: '700', fontSize: 18, color: '#1A1A2E', marginBottom: 2 },
    modalSubtitle: { fontSize: 13, color: '#9E9E9E', marginBottom: 4 },
});
