import { Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { App } from '@capacitor/app';
import { Contacts } from '@capacitor-community/contacts';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Network } from '@capacitor/network';
import { LocalNotifications } from '@capacitor/local-notifications';

const isNative = Capacitor.isNativePlatform();

async function isOnline() {
  if (isNative) {
    try {
      const status = await Network.getStatus();
      return Boolean(status && status.connected);
    } catch (e) {
      logDebug('Network.getStatus notice: ' + e.message);
    }
  }
  return typeof navigator !== 'undefined' ? Boolean(navigator.onLine) : true;
}


// ── NOTIFICATION SYSTEM & PREFERENCES ──
const NOTIF_PREFS_KEY = 'vihara_notification_prefs';

function loadNotificationPrefs() {
  const defaults = { fall: true, sos: true, battery: true, goal: true, sedentary: true };
  try {
    const raw = getStorageItem(NOTIF_PREFS_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch (e) {
    return defaults;
  }
}

function saveNotificationPrefs() {
  setStorageItem(NOTIF_PREFS_KEY, JSON.stringify(state.notifPrefs));
}

function renderNotificationToggles() {
  const p = state.notifPrefs || loadNotificationPrefs();
  const tFall = el('notif-toggle-fall'); if (tFall) tFall.checked = p.fall;
  const tSos = el('notif-toggle-sos'); if (tSos) tSos.checked = p.sos;
  const tBat = el('notif-toggle-battery'); if (tBat) tBat.checked = p.battery;
  const tGoal = el('notif-toggle-goal'); if (tGoal) tGoal.checked = p.goal;
  const tSed = el('notif-toggle-sedentary'); if (tSed) tSed.checked = p.sedentary;
}

async function requestNotificationPermission() {
  if (!isNative) {
    if (typeof Notification !== 'undefined') {
      const p = await Notification.requestPermission();
      return p === 'granted';
    }
    return true;
  }
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted';
  } catch (e) {
    logDebug('LocalNotifications permission error: ' + e.message);
    return false;
  }
}

async function initNotificationChannels() {
  if (!isNative) return;
  try {
    await LocalNotifications.createChannel({
      id: 'vihara-fall-channel',
      name: 'Vihara Fall & Safety Alerts',
      description: 'Critical notifications for falls and emergency SOS alerts',
      importance: 5,
      visibility: 1,
      vibration: true
    });
    await LocalNotifications.createChannel({
      id: 'vihara-health-channel',
      name: 'Vihara Biometric Updates',
      description: 'Daily activity goal achievements and battery alerts',
      importance: 4,
      visibility: 1,
      vibration: true
    });
  } catch (e) {
    logDebug('initNotificationChannels error: ' + e.message);
  }
}

async function sendAppNotification({ title, body, channelId = 'vihara-health-channel', id }) {
  if (!id) id = Math.floor(Math.random() * 899999 + 100000);
  logDebug('sendAppNotification: [' + title + '] ' + body);

  if (isNative) {
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: title,
              body: body,
              id: id,
              channelId: channelId,
              schedule: { at: new Date(Date.now() + 150) }
            }
          ]
        });
        return;
      }
    } catch (e) {
      logDebug('LocalNotifications.schedule error: ' + e.message);
    }
  }

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try { new Notification(title, { body }); } catch (e) {}
  }
}

async function onNotificationToggleChange(input) {
  const typeMap = {
    'notif-toggle-fall': 'fall',
    'notif-toggle-sos': 'sos',
    'notif-toggle-battery': 'battery',
    'notif-toggle-goal': 'goal',
    'notif-toggle-sedentary': 'sedentary'
  };
  const key = typeMap[input.id];
  if (!key) return;

  if (input.checked) {
    const granted = await requestNotificationPermission();
    if (!granted) {
      input.checked = false;
      showToast('Notifications disabled in Android Settings.');
      return;
    }
    state.notifPrefs[key] = true;
    saveNotificationPrefs();
    showToast('Notifications enabled for ' + key);
    sendAppNotification({
      title: 'Vihara Band Notifications Active',
      body: 'You will receive real-time alerts for ' + key + ' on your phone.',
      id: 999
    });
  } else {
    state.notifPrefs[key] = false;
    saveNotificationPrefs();
    showToast('Notification muted.');
  }
}

function requestBatteryOptimization() {
  if (isNative && Capacitor.Plugins.ViharaBackground) {
    try {
      Capacitor.Plugins.ViharaBackground.requestBatteryOptimizationExemption();
      showToast('Opening Battery Optimization settings...');
    } catch (e) {
      showToast('Battery settings unavailable');
    }
  } else {
    showToast('Battery optimization setting is available in the Android APK.');
  }
}

// BLE UUIDs - must match your EFR32BG22 firmware gatt_configuration.btconf
const BLE_VIHARA_SERVICE  = '12340000-1234-1234-1234-123456789012';
const BLE_STEP_CHAR       = '12340001-1234-1234-1234-123456789012';
const BLE_FALL_CHAR       = '12340002-1234-1234-1234-123456789012';
const BLE_STATUS_CHAR     = '12340003-1234-1234-1234-123456789012';
const BLE_BATTERY_SERVICE = '0000180f-0000-1000-8000-00805f9b34fb';
const BLE_BATTERY_CHAR    = '00002a19-0000-1000-8000-00805f9b34fb';

const state = {
  steps: 0, stepGoal: 10000, distance: 0, calories: 0, activeMinutes: 0,
  battery: 75, ledColor: '#00C896', unit: 'km',
  connected: false,
  isConnecting: false,
  isReconnecting: false, reconnectAttempts: 0, reconnectTimer: null,
  lastDeviceId: null, lastDeviceName: null,
  bleDevice: null, bleServer: null, bleStepChar: null, bleFallChar: null,
  currentScreen: 'dashboard', toastTimer: null,
  sosTimer: null, sosStart: 0, sosInterval: null,
  todayBaselineSteps: null, lastRawBandSteps: null, currentDateStr: '',
  fallEnabled: true, sensitivity: 'Medium',
  fallAlertTimer: null, fallAlertCountdown: 60,
  fallCount: parseInt(localStorage.getItem('vihara_fall_count') || '0', 10),
  notifPrefs: loadNotificationPrefs(),
  batteryNotifiedToday: false,
  goalNotifiedToday: false,
  sosCount: parseInt(localStorage.getItem('vihara_sos_count') || '0', 10),
  contacts: [],
  weeklySteps: [0,0,0,0,0,0,0],
  badges: [
    { id:'first_sync',  emoji:'\u{1F517}', name:'First Sync',      desc:'Connected to band',           earned:false },
    { id:'step_1k',     emoji:'\u{1F45F}', name:'First Steps',     desc:'Walked 1,000 steps',          earned:false },
    { id:'safety_setup',emoji:'\u{1F6E1}', name:'Safety Guardian', desc:'Set up emergency contacts',   earned:false },
    { id:'step_10k',    emoji:'\u26A1',    name:'Step Master',      desc:'10,000 steps in a day',       earned:false },
    { id:'streak_7',    emoji:'\u{1F525}', name:'Week Warrior',    desc:'7-day step streak',            earned:false },
    { id:'distance_50', emoji:'\u{1F30D}', name:'Explorer',        desc:'50 km total distance',         earned:false },
    { id:'fall_free',   emoji:'\u2705',    name:'Fall-Free Month', desc:'30 days without a fall',       earned:false },
    { id:'early_bird',  emoji:'\u{1F305}', name:'Early Bird',      desc:'Active before 7 AM',           earned:false },
    { id:'calorie_500', emoji:'\u{1F4AA}', name:'Burn Machine',    desc:'500 kcal in one day',          earned:false },
    { id:'week_goal',   emoji:'\u{1F3C6}', name:'Consistent',      desc:'Hit goal 5 days in a row',     earned:false },
    { id:'sos_setup',   emoji:'\u{1F198}', name:'SOS Ready',       desc:'Configured SOS message',       earned:false },
    { id:'insight_chk', emoji:'\u{1F4A1}', name:'Self Aware',      desc:'Checked insights 7 times',     earned:false }
  ],
  recommendations: [],
  userProfile: {
    name: '',
    email: '',
    photoUrl: '',
    googleLinked: false,
    loggedIn: false,
    guestMode: false,
    completedSetup: false,
    age: '',
    height: '',
    weight: '',
    stepGoal: 8000
  },
  isOnboarding: false
};

function getStorageItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch (e) {}
}

function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {}
}

const CONTACTS_KEY = 'vihara_contacts';

function saveContacts() {
  try {
    const data = JSON.stringify(state.contacts || []);
    localStorage.setItem(CONTACTS_KEY, data);
    if (state.contacts.length > 0) unlockBadge('safety_setup');
  } catch(e){ logDebug('saveContacts error: ' + e.message); }
  renderContacts();
}

function loadContacts() {
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        state.contacts = parsed;
        if (state.contacts.length > 0) unlockBadge('safety_setup');
      }
    }
  } catch(e){ logDebug('loadContacts error: ' + e.message); }
}

const USER_PROFILE_KEY = 'vihara_user_profile';

function loadUserProfile() {
  try {
    const raw = getStorageItem(USER_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const rawName = (parsed.name || '').trim();
        const validName = Boolean(rawName.length >= 2 && rawName.toLowerCase() !== 'friend');
        const isSetupComplete = Boolean(parsed.completedSetup && validName);

        if (!isSetupComplete) {
          // If setup was never completed or has stale dummy data, discard completely
          removeStorageItem(USER_PROFILE_KEY);
          state.userProfile = {
            name: '',
            email: '',
            photoUrl: '',
            googleLinked: false,
            loggedIn: false,
            guestMode: false,
            completedSetup: false,
            age: '',
            height: '',
            weight: '',
            stepGoal: 8000
          };
          return;
        }

        state.userProfile = {
          name: rawName,
          email: parsed.email || '',
          photoUrl: parsed.photoUrl || '',
          googleLinked: Boolean(parsed.googleLinked),
          loggedIn: true,
          guestMode: Boolean(parsed.guestMode),
          completedSetup: true,
          age: parsed.age || '',
          height: parsed.height || '',
          weight: parsed.weight || '',
          stepGoal: parseInt(parsed.stepGoal, 10) || 8000
        };
        if (state.userProfile.stepGoal) {
          state.stepGoal = state.userProfile.stepGoal;
          const inp = el('step-goal-input');
          if (inp) inp.value = state.stepGoal;
        }
      }
    } else {
      state.userProfile = {
        name: '',
        email: '',
        photoUrl: '',
        googleLinked: false,
        loggedIn: false,
        guestMode: false,
        completedSetup: false,
        age: '',
        height: '',
        weight: '',
        stepGoal: 8000
      };
    }
    state.lastDeviceId = getStorageItem('vihara_last_device_id') || null;
    state.lastDeviceName = getStorageItem('vihara_last_device_name') || null;
  } catch (e) {
    logDebug('loadUserProfile error: ' + e.message);
  }
}

function saveUserProfile(prof) {
  state.userProfile = { ...state.userProfile, ...prof };
  if (!state.simulationMode) {
    setStorageItem(USER_PROFILE_KEY, JSON.stringify(state.userProfile));
  }
  if (state.userProfile.stepGoal) {
    state.stepGoal = state.userProfile.stepGoal;
    const inp = el('step-goal-input');
    if (inp) inp.value = state.stepGoal;
  }
  renderUserProfile();
  renderDashboard();
  animateRings();
}

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'VB';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'VB';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function renderUserProfile() {
  const rawName = (state.userProfile && state.userProfile.name) ? state.userProfile.name.trim() : '';
  const firstName = rawName ? rawName.split(/\s+/)[0] : 'Welcome';
  
  // Dashboard greeting name
  setText('dash-name', `${firstName} 👋`);
  
  // Settings profile card
  setText('prof-name', rawName || 'Band Member');
  
  const avatarEl = el('prof-avatar');
  if (avatarEl) {
    if (state.userProfile.photoUrl) {
      avatarEl.innerHTML = `<img src="${state.userProfile.photoUrl}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    } else {
      avatarEl.textContent = getInitials(rawName);
    }
  }
  
  const subEl = el('prof-sub');
  if (subEl) {
    if (state.userProfile.googleLinked && state.userProfile.email) {
      subEl.innerHTML = `Google Linked • <span style="color:var(--accent);font-weight:600;">${state.userProfile.email}</span>`;
    } else if (rawName) {
      subEl.textContent = 'Vihara Band Member';
    } else {
      subEl.textContent = 'Tap Edit to set your profile';
    }
  }
  
  updateGoogleCardUI();
}

function updateGoogleCardUI() {
  const cardTitle = el('google-card-title');
  const cardDesc = el('google-card-desc');
  const actionBtn = el('btn-google-action');
  const isLinked = Boolean(state.userProfile && state.userProfile.googleLinked);
  
  if (cardTitle && cardDesc && actionBtn) {
    if (isLinked) {
      cardTitle.textContent = state.userProfile.email ? `Linked: ${state.userProfile.name || 'Google User'}` : 'Google Connected';
      cardDesc.textContent = state.userProfile.email || 'Cloud backup & photo sync active';
      actionBtn.innerHTML = '<span>Linked ✓</span>';
      actionBtn.classList.add('connected');
      actionBtn.onclick = () => { showToast('Google account is linked: ' + (state.userProfile.email || state.userProfile.name)); };
    } else {
      cardTitle.textContent = 'Google Account Sync';
      cardDesc.textContent = 'Sync your name, photo & health profile';
      actionBtn.innerHTML = '<span>Connect</span>';
      actionBtn.classList.remove('connected');
      actionBtn.onclick = loginWithGoogle;
    }
  }
}

async function loginWithGoogle() {
  // Offline check: Google Sign-In requires active internet connection
  const online = await isOnline();
  if (!online) {
    showToast('Check your internet connection and try again.');
    return;
  }

  logDebug('Starting native Firebase Google Sign-In...');
  const btn = el('btn-welcome-google');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = '<span class="pulse-dots"><span></span><span></span><span></span></span> Connecting...';

  try {
    if (isNative) {
      logDebug('Invoking FirebaseAuthentication.signInWithGoogle()...');
      const result = await FirebaseAuthentication.signInWithGoogle();
      logDebug('Firebase sign-in result received: ' + JSON.stringify(result));
      const user = result && result.user ? result.user : null;
      if (user) {
        const realName = user.displayName || user.name || (user.email ? user.email.split('@')[0] : 'Google User');
        const email = user.email || '';
        const normEmail = email ? email.toLowerCase().trim() : '';
        
        state.userProfile.name = realName;
        state.userProfile.email = email;
        state.userProfile.photoUrl = user.photoUrl || user.imageUrl || '';
        state.userProfile.googleLinked = true;
        state.userProfile.loggedIn = true;
        state.userProfile.guestMode = false;

        // Check if biometric metrics were already configured for this Google account
        const savedMetricsRaw = normEmail ? getStorageItem('vihara_saved_metrics_' + normEmail) : null;
        if (savedMetricsRaw) {
          try {
            const savedMetrics = JSON.parse(savedMetricsRaw);
            if (savedMetrics && (savedMetrics.age || savedMetrics.height || savedMetrics.weight || savedMetrics.name)) {
              logDebug('Found existing biometric profile for ' + normEmail + '. Restoring metrics...');
              state.userProfile.name = savedMetrics.name || realName;
              state.userProfile.age = savedMetrics.age || '';
              state.userProfile.height = savedMetrics.height || '';
              state.userProfile.weight = savedMetrics.weight || '';
              state.userProfile.stepGoal = savedMetrics.stepGoal || 8000;
              state.userProfile.completedSetup = true;

              saveUserProfile(state.userProfile);
              showToast(`Welcome back, ${(state.userProfile.name || realName).split(/\s+/)[0]}!`);

              // If band has been paired previously, navigate to dashboard; otherwise go to pairing screen to scan for band
              const pairedDeviceId = state.lastDeviceId || getStorageItem('vihara_last_device_id');
              if (pairedDeviceId) {
                navigateToDashboard();
              } else {
                showPairingScreen();
                startInlineScan();
              }
              return;
            }
          } catch(e) {}
        }

        // First-time setup for this account: open questionnaire with Google name pre-filled
        state.userProfile.completedSetup = false;
        proceedToOnboarding();
        return;
      } else {
        showToast('Google Sign-In: No account selected.');
      }
    } else {
      showToast('Native Firebase Google Sign-In runs in the Android APK.');
    }
  } catch (err) {
    logDebug('Firebase Google Sign-In notice: ' + JSON.stringify(err));
    const fullErrStr = (JSON.stringify(err || {}) + ' ' + (err && (err.message || err.errorMessage) ? (err.message || err.errorMessage) : '')).toLowerCase();
    
    // Check if device is offline or encountered network error
    const currentlyOnline = await isOnline();
    const isNetworkErr = !currentlyOnline ||
                         fullErrStr.includes('network') ||
                         fullErrStr.includes('offline') ||
                         fullErrStr.includes('unreachable') ||
                         fullErrStr.includes('timeout') ||
                         fullErrStr.includes('no internet') ||
                         fullErrStr.includes('code: 7') || // 7 = NETWORK_ERROR in Google Play Services
                         fullErrStr.includes('connection failed') ||
                         fullErrStr.includes('unknownhost');

    if (isNetworkErr) {
      showToast('Check your internet connection and try again.');
      return;
    }

    // Check for user cancellation/dismissal
    const isCancelled = fullErrStr.includes('cancel') ||
                        fullErrStr.includes('cancellation') ||
                        fullErrStr.includes('abort') ||
                        fullErrStr.includes('dismiss') ||
                        fullErrStr.includes('12501') ||
                        fullErrStr.includes('closed') ||
                        fullErrStr.includes('interrupted') ||
                        fullErrStr.includes('no credential') ||
                        fullErrStr.includes('user back');

    if (isCancelled) {
      showToast('Google Sign-In was cancelled.');
    } else if (fullErrStr.includes('developer_error') || fullErrStr.includes('error code: 10')) {
      showToast('Google Sign-In: Configuration mismatch. Please verify SHA-1.');
    } else {
      showToast('Google Sign-In was cancelled.');
    }
  } finally {
    if (btn) btn.innerHTML = originalHtml;
  }
}

function loginAsGuest() {
  // STRICT GATEKEEPER: Do NOT save to localStorage or set completedSetup = true!
  // User MUST submit the questionnaire modal with a valid name to enter the app.
  state.userProfile.guestMode = true;
  state.userProfile.completedSetup = false;
  state.userProfile.loggedIn = false;
  state.userProfile.name = '';
  state.userProfile.googleLinked = false;
  state.userProfile.email = '';
  state.userProfile.photoUrl = '';
  
  // Pre-fill previously entered guest metrics if available for convenience
  const guestMetricsRaw = getStorageItem('vihara_guest_metrics');
  if (guestMetricsRaw) {
    try {
      const gm = JSON.parse(guestMetricsRaw);
      state.userProfile.name = gm.name || '';
      state.userProfile.age = gm.age || '';
      state.userProfile.height = gm.height || '';
      state.userProfile.weight = gm.weight || '';
      state.userProfile.stepGoal = gm.stepGoal || 8000;
    } catch(e) {}
  } else {
    const nameInp = el('inp-prof-name');
    if (nameInp) nameInp.value = '';
  }
  
  showToast('Guest Mode: please confirm your profile.');
  proceedToOnboarding();
}

function proceedToOnboarding() {
  // Keep screen-welcome active underneath so if user closes or cancels modal, they stay on welcome screen
  state.isOnboarding = true;
  openProfileModal(true);
}

function showWelcomeScreen() {
  state.currentScreen = 'welcome';
  const welcome = el('screen-welcome');
  if (welcome) {
    welcome.classList.remove('hidden');
    welcome.classList.add('active');
    welcome.style.opacity = '1';
    welcome.style.pointerEvents = 'all';
  }

  const pairing = el('screen-pairing');
  if (pairing) {
    pairing.classList.remove('active');
    pairing.classList.add('hidden');
    pairing.style.opacity = '0';
    pairing.style.pointerEvents = 'none';
  }

  const mainApp = el('main-app');
  if (mainApp) {
    mainApp.classList.add('hidden');
  }

  // Ensure all modal overlays are hidden so no backdrops linger
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));

  // Pre-reset main-app screens to dashboard so entering main app is always clean
  document.querySelectorAll('.screen-main').forEach(s => s.classList.remove('screen-main--active'));
  const dScreen = el('screen-dashboard'); if (dScreen) dScreen.classList.add('screen-main--active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const nbD = el('nb-dashboard'); if (nbD) nbD.classList.add('active');
}

function showPairingScreen() {
  state.currentScreen = 'pairing';
  const welcome = el('screen-welcome');
  if (welcome) {
    welcome.classList.remove('active');
    welcome.classList.add('hidden');
    welcome.style.opacity = '0';
    welcome.style.pointerEvents = 'none';
  }

  const pairing = el('screen-pairing');
  if (pairing) {
    pairing.classList.remove('hidden');
    pairing.classList.add('active');
    pairing.style.opacity = '1';
    pairing.style.pointerEvents = 'all';
  }

  const mainApp = el('main-app');
  if (mainApp) {
    mainApp.classList.add('hidden');
  }

  // Ensure all modal overlays are hidden
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));

  // Pre-reset main-app screens to dashboard so entering main app is always clean
  document.querySelectorAll('.screen-main').forEach(s => s.classList.remove('screen-main--active'));
  const pScreen = el('screen-dashboard'); if (pScreen) pScreen.classList.add('screen-main--active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const pNbD = el('nb-dashboard'); if (pNbD) pNbD.classList.add('active');
}

async function signOutUser() {
  logDebug('signOutUser() initiated.');

  // 1. If currently in Demo Mode, exit Demo Mode and return to the appropriate screen
  // WITHOUT destroying the user's saved Google credentials!
  if (state.simulationMode) {
    logDebug('signOutUser called while in Demo Mode: exiting simulation cleanly...');
    state.simulationMode = false;
    state.connected = false;

    // Reset demo telemetry in memory
    state.steps = 0;
    state.distance = 0;
    state.calories = 0;
    state.activeMinutes = 0;

    // Retrieve saved Google / real profile from localStorage or memory snapshot
    let realProfile = null;
    const savedRaw = getStorageItem(USER_PROFILE_KEY);
    if (savedRaw) {
      try {
        const parsed = JSON.parse(savedRaw);
        if (parsed && (parsed.loggedIn || parsed.googleLinked || (parsed.name && parsed.name.toLowerCase() !== 'friend' && parsed.name.toLowerCase() !== 'demo member'))) {
          realProfile = parsed;
        }
      } catch(e) {}
    }
    if (!realProfile && state.preDemoProfile) {
      realProfile = state.preDemoProfile;
    }

    // Reset current active screen to dashboard for future transitions
    state.currentScreen = 'dashboard';
    showScreen('dashboard', true);

    const app = el('main-app');
    if (app) app.classList.add('hidden');

    if (realProfile && (realProfile.loggedIn || realProfile.googleLinked)) {
      state.userProfile = realProfile;
      renderUserProfile();
      updateGoogleCardUI();
      showPairingScreen();
      showToast('Exited Demo Mode — Vihara Band Ready');
    } else {
      state.userProfile = {
        name: '', email: '', photoUrl: '', googleLinked: false,
        loggedIn: false, guestMode: false, completedSetup: false,
        age: '', height: '', weight: '', stepGoal: 8000
      };
      renderUserProfile();
      showWelcomeScreen();
      showToast('Exited Demo Mode');
    }
    return;
  }

  // 2. Real User Sign-Out (Non-Demo): Check internet connectivity first
  const online = await isOnline();
  if (!online) {
    showToast('Check your internet connection and try again.');
    return;
  }

  // 3. ATOMIC PURGE: Delete active session immediately from localStorage
  removeStorageItem(USER_PROFILE_KEY);

  // 4. Clear state in memory
  state.userProfile = {
    name: '',
    email: '',
    photoUrl: '',
    googleLinked: false,
    loggedIn: false,
    guestMode: false,
    completedSetup: false,
    age: '',
    height: '',
    weight: '',
    stepGoal: 8000
  };
  state.isOnboarding = false;

  // 5. Cancel any pending reconnect timers & stop LE scans
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }
  state.isReconnecting = false;
  state.reconnectAttempts = 0;

  if (isScanning && isNative) {
    try {
      BleClient.stopLEScan().catch(() => {});
    } catch(e) {}
    isScanning = false;
  }

  // Stop foreground service
  if (isNative) {
    try {
      Capacitor.Plugins.ViharaBackground?.stopService().catch(() => {});
    } catch(e) {}
  }
  // 6. Disconnect Bluetooth band
  if (state.bleDevice && isNative) {
    try {
      BleClient.disconnect(state.bleDevice.deviceId).catch(() => {});
    } catch (e) {}
  }
  state.connected = false;
  state.simulationMode = false;
  state.bleDevice = null;
  state.lastDeviceId = null;
  state.lastDeviceName = null;
  removeStorageItem('vihara_last_device_id');
  removeStorageItem('vihara_last_device_name');
  updateConnectionUI();

  // Reset active screen to dashboard so next login never starts in Settings
  showScreen('dashboard', true);

  // 7. Immediately switch screens to Welcome / Sign-In screen (unhiding welcome screen cleanly)
  showWelcomeScreen();

  renderUserProfile();
  showToast('Signed out of Vihara Band.');

  // 8. Asynchronously clear Firebase Auth and native Android CredentialManager state
  try {
    if (isNative) {
      await FirebaseAuthentication.signOut().catch((err) => {
        logDebug('Firebase signOut notice: ' + (err && err.message ? err.message : err));
      });
    }
  } catch (e) {}
}

function jumpToProfileSection(sectionId) {
  document.querySelectorAll('.prof-tab-btn').forEach(b => b.classList.remove('active'));
  const btnId = 'tab-' + sectionId.replace('sec-prof-', 'sec-');
  const targetBtn = el(btnId);
  if (targetBtn) targetBtn.classList.add('active');
  
  const targetCard = el(sectionId);
  if (targetCard) {
    targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const inp = targetCard.querySelector('input');
    if (inp) setTimeout(() => inp.focus(), 200);
  }
}

function setAgePreset(val) {
  const inp = el('inp-prof-age');
  if (inp) {
    inp.value = val;
    onProfileInputChange();
  }
}

function onProfileInputChange() {
  const nameInp = el('inp-prof-name');
  const rawName = nameInp ? nameInp.value.trim() : '';
  setText('prof-modal-avatar', getInitials(rawName));
  calcProfileCompletion();
}

function calculateBMI(heightCm, weightKg) {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return { val: '--', cat: 'Enter Height & Weight', statusClass: 'normal', advice: 'Calculated Body Mass Index (BMI) dynamically informs calorie burn rates.' };
  }
  const hMeters = heightCm / 100;
  const bmiNum = weightKg / (hMeters * hMeters);
  const formatted = bmiNum.toFixed(1);
  
  if (bmiNum < 18.5) {
    return { val: formatted, cat: 'Underweight', statusClass: 'underweight', advice: 'Slightly low body mass index; regular strength exercises and balanced nutrition recommended.' };
  } else if (bmiNum <= 24.9) {
    return { val: formatted, cat: 'Healthy Weight', statusClass: 'normal', advice: 'Optimal BMI range for cardiovascular longevity, endurance efficiency, and healthy metabolic function.' };
  } else if (bmiNum <= 29.9) {
    return { val: formatted, cat: 'Overweight', statusClass: 'overweight', advice: 'Moderate elevation; 8,000–10,000 daily steps can optimize energy balance and joint support.' };
  } else {
    return { val: formatted, cat: 'High BMI', statusClass: 'overweight', advice: 'Elevated BMI; consistent daily aerobic movement yields immediate heart and blood pressure benefits.' };
  }
}

function onBodyMetricsChange() {
  const hInp = el('inp-prof-height');
  const wInp = el('inp-prof-weight');
  const height = hInp ? parseFloat(hInp.value) : 0;
  const weight = wInp ? parseFloat(wInp.value) : 0;
  
  const res = calculateBMI(height, weight);
  setText('bmi-val', res.val);
  setText('bmi-cat', res.cat);
  setText('bmi-explanation', res.advice);
  
  const pill = el('bmi-score-pill');
  if (pill) {
    pill.classList.remove('normal', 'underweight', 'overweight');
    pill.classList.add(res.statusClass);
  }
  
  calcProfileCompletion();
}

function getStepGoalScienceHint(steps) {
  const s = parseInt(steps, 10) || 8000;
  if (s < 7000) {
    return {
      title: 'Active Baseline',
      cals: '~240 kcal',
      text: '🌱 Great for sedentary desk routines, active recovery, or gradual habit building. Consistently reaching 5,000–6,000 steps maintains joint mobility and glycemic control.'
    };
  } else if (s <= 9500) {
    return {
      title: 'Longevity Sweet Spot',
      cals: '~380 kcal',
      text: '⭐ Lancet & NIH cohort studies show 8,000 steps/day provides the steepest reduction in all-cause mortality and optimal arterial elasticity without excessive joint strain.'
    };
  } else if (s <= 12000) {
    return {
      title: 'Fitness Classic',
      cals: '~480 kcal',
      text: '🔥 The global benchmark for cardiovascular vitality. Burns ~450–520 active kcal daily, promoting deep restorative sleep, lower resting heart rate, and mental endurance.'
    };
  } else {
    return {
      title: 'High Endurance',
      cals: '~640 kcal',
      text: '⚡ Peak athletic volume. Ideal for runners, sports conditioning, and elevated metabolic conditioning. Remember to ensure adequate recovery and hydration!'
    };
  }
}

function updateStepGoalHint(steps) {
  const hint = getStepGoalScienceHint(steps);
  setText('shc-title', hint.title);
  setText('shc-cals-badge', hint.cals);
  setText('shc-body', hint.text);
}

function setGoalPreset(steps) {
  const inp = el('inp-prof-goal');
  if (inp) inp.value = steps;
  
  document.querySelectorAll('.goal-preset-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = el('gbtn-' + steps);
  if (activeBtn) activeBtn.classList.add('active');
  
  updateStepGoalHint(steps);
  calcProfileCompletion();
}

function adjustStepGoal(delta) {
  const inp = el('inp-prof-goal');
  const cur = inp ? (parseInt(inp.value, 10) || 8000) : 8000;
  const next = Math.max(1000, Math.min(50000, cur + delta));
  if (inp) inp.value = next;
  onStepGoalInputChange();
}

function onStepGoalInputChange() {
  const inp = el('inp-prof-goal');
  const val = inp ? (parseInt(inp.value, 10) || 8000) : 8000;
  
  document.querySelectorAll('.goal-preset-btn').forEach(b => b.classList.remove('active'));
  const matchedBtn = el('gbtn-' + val);
  if (matchedBtn) matchedBtn.classList.add('active');
  
  updateStepGoalHint(val);
  calcProfileCompletion();
}

function calcProfileCompletion() {
  const nameInp = el('inp-prof-name');
  const ageInp = el('inp-prof-age');
  const hInp = el('inp-prof-height');
  const wInp = el('inp-prof-weight');
  const goalInp = el('inp-prof-goal');
  
  let score = 0;
  if (nameInp && nameInp.value.trim().length > 0) score += 20;
  if (ageInp && parseInt(ageInp.value, 10) > 0) score += 20;
  if (hInp && parseFloat(hInp.value) > 0) score += 20;
  if (wInp && parseFloat(wInp.value) > 0) score += 20;
  if (goalInp && parseInt(goalInp.value, 10) > 0) score += 20;
  
  setText('prof-completion-badge', `${score}% Complete`);
  const fill = el('prof-progress-fill');
  if (fill) fill.style.width = `${score}%`;
}

function openProfileModal(isFirstRun = false) {
  const modal = el('modal-profile');
  if (!modal) return;
  
  const nameInp = el('inp-prof-name');
  const ageInp = el('inp-prof-age');
  const goalInp = el('inp-prof-goal');
  const heightInp = el('inp-prof-height');
  const weightInp = el('inp-prof-weight');
  
  const p = state.userProfile || {};
  if (nameInp) nameInp.value = p.name || '';
  if (ageInp) ageInp.value = p.age || '';
  if (goalInp) goalInp.value = p.stepGoal || state.stepGoal || 8000;
  if (heightInp) heightInp.value = p.height || '';
  if (weightInp) weightInp.value = p.weight || '';
  
  const titleEl = el('modal-profile-title');
  if (titleEl) {
    titleEl.textContent = isFirstRun ? 'Welcome to Vihara!' : 'Your Profile';
  }
  
  onProfileInputChange();
  onBodyMetricsChange();
  onStepGoalInputChange();
  updateGoogleCardUI();
  calcProfileCompletion();
  
  modal.classList.remove('hidden');
  if (nameInp) {
    setTimeout(() => nameInp.focus(), 200);
  }
}

function saveProfileFromModal() {
  const nameInp = el('inp-prof-name');
  const ageInp = el('inp-prof-age');
  const goalInp = el('inp-prof-goal');
  const heightInp = el('inp-prof-height');
  const weightInp = el('inp-prof-weight');

  const name = nameInp ? nameInp.value.trim() : '';
  
  // STRICT VALIDATION: User must enter a valid name and cannot use 'Friend'
  if (!name || name.length < 2 || name.toLowerCase() === 'friend') {
    showToast('Please enter your full name to proceed.');
    jumpToProfileSection('sec-prof-name');
    if (nameInp) {
      nameInp.focus();
      nameInp.style.borderColor = 'var(--red)';
      setTimeout(() => { nameInp.style.borderColor = ''; }, 2500);
    }
    return;
  }

  const age = ageInp ? parseInt(ageInp.value, 10) || '' : '';
  const stepGoal = goalInp ? Math.max(1000, Math.min(50000, parseInt(goalInp.value, 10) || 8000)) : 8000;
  const height = heightInp ? parseInt(heightInp.value, 10) || '' : '';
  const weight = weightInp ? parseInt(weightInp.value, 10) || '' : '';

  state.userProfile.completedSetup = true;
  state.userProfile.loggedIn = true;
  state.userProfile.name = name;
  state.userProfile.age = age;
  state.userProfile.stepGoal = stepGoal;
  state.userProfile.height = height;
  state.userProfile.weight = weight;

  // Persist biometric metrics per account so returning users never get re-prompted
  if (state.userProfile.googleLinked && state.userProfile.email) {
    const key = 'vihara_saved_metrics_' + state.userProfile.email.toLowerCase().trim();
    setStorageItem(key, JSON.stringify({
      name, age, height, weight, stepGoal
    }));
  } else if (state.userProfile.guestMode) {
    setStorageItem('vihara_guest_metrics', JSON.stringify({
      name, age, height, weight, stepGoal
    }));
  }

  saveUserProfile(state.userProfile);
  closeModal('modal-profile');

  if (state.isOnboarding) {
    state.isOnboarding = false;
    showPairingScreen();
    startInlineScan();
    showToast(`Welcome, ${name.split(/\s+/)[0]}! Let's connect your Vihara Band.`);
  } else {
    showToast(`Profile updated, ${name.split(/\s+/)[0]}!`);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  // Cinematic startup splash sequence
  const splash = el('startup-splash');
  if (splash) {
    const statusLbl = el('splash-status-lbl');
    if (statusLbl) {
      setTimeout(() => { setText('splash-status-lbl', 'Calibrating BMA400 Accelerometer...'); }, 1400);
      setTimeout(() => { setText('splash-status-lbl', 'Establishing Encrypted Bluetooth Mesh...'); }, 2800);
      setTimeout(() => { setText('splash-status-lbl', 'Vihara Band Systems Ready'); }, 4000);
    }

    // Smooth blur & curtain fade out
    setTimeout(() => {
      splash.classList.add('splash-out');
      setTimeout(() => {
        splash.style.display = 'none';
      }, 1000);
    }, 4800);
  }

  loadTheme();
  loadUserProfile();
  initNotificationChannels();
  renderNotificationToggles();
  loadSteps();
  loadContacts();
  loadBadges();
  updateClock();
  setInterval(updateClock, 1000);
  updateGreeting();
  renderUserProfile();
  renderDashBadges();

  logDebug('Vihara app loaded. isNative=' + isNative);

  if (isNative) {
    setupBackButtonListener();
    setupAppStateListener();
    try {
      logDebug('Initializing BleClient...');
      await BleClient.initialize({ androidNeverForLocation: true });
      logDebug('BleClient initialized successfully.');
      
      logDebug('Requesting Bluetooth and Location permissions...');
      await BleClient.requestPermission();
      logDebug('Permissions verified.');
      
      try {
        await BleClient.requestEnable();
        logDebug('Bluetooth enabled successfully.');
      } catch (err) {
        logDebug('Bluetooth enable request bypassed/declined: ' + err.message);
      }
    } catch (e) {
      logDebug('BleClient initialization/permissions failed: ' + e.message);
    }
  }

  // Strict session check: only allow past welcome screen if setup was completed with a real name
  const isSetupComplete = Boolean(
    state.userProfile &&
    state.userProfile.completedSetup &&
    state.userProfile.name &&
    state.userProfile.name.trim().length >= 2 &&
    state.userProfile.name.trim().toLowerCase() !== 'friend'
  );
  const pairedDeviceId = state.lastDeviceId || getStorageItem('vihara_last_device_id');
  if (isSetupComplete && pairedDeviceId) {
    navigateToDashboard();
  } else if (isSetupComplete && !pairedDeviceId) {
    // Completed profile setup but haven't connected/paired a band yet: stay on pairing screen
    showPairingScreen();
    startInlineScan();
  } else {
    // Strictly force user to stay on welcome screen
    showWelcomeScreen();
  }

  const rescanBtn = el('rescan-btn');
  if (rescanBtn) {
    rescanBtn.addEventListener('click', (e) => {
      e.preventDefault();
      startInlineScan();
    });
  }
});

function updateClock() {
  const now = new Date();
  const t = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  setText('sb-time', t);

  // Midnight reset check (Indian Standard Time / local timezone)
  const todayStr = getLocalDateString(now);
  if (state.currentDateStr && state.currentDateStr !== todayStr) {
    logDebug(`Day transition detected at midnight: ${state.currentDateStr} -> ${todayStr}`);
    saveSteps(); // Save final count for yesterday
    state.steps = 0;
    state.currentDateStr = todayStr;
    state.todayBaselineSteps = null; // Reset baseline so we start counting from 0 today
    saveSteps(); // Save today's initial 0 steps
    
    // Refresh UI
    renderDashboard();
    renderTimeline();
    renderWeeklyChart();
    renderMonthlyCalendar();
    renderTrendChart();
    animateRings();
    
    setText('day-date-lbl', now.toLocaleDateString('en-IN',{weekday:'long',month:'short',day:'numeric'}));
    setText('month-lbl', now.toLocaleDateString('en-IN',{month:'long',year:'numeric'}));
  }
}

function setupBackButtonListener() {
  App.addListener('backButton', () => {
    logDebug('Native backButton event triggered');
    const fallAlert = el('fall-alert-overlay');
    const sosOverlay = el('sos-overlay');
    const modalContact = el('modal-contact');
    const modalUnpair = el('modal-unpair');
    const modalProfile = el('modal-profile');

    // Strict Gatekeeper: user cannot bypass welcome screen without completing setup
    if (!state.userProfile || !state.userProfile.completedSetup) {
      if (modalProfile && !modalProfile.classList.contains('hidden')) {
        closeModal('modal-profile');
        return;
      }
      logDebug('Setup incomplete: exiting app via back button');
      App.exitApp();
      return;
    }

    if (fallAlert && !fallAlert.classList.contains('hidden')) {
      cancelFallAlert();
    } else if (sosOverlay && !sosOverlay.classList.contains('hidden')) {
      closeSosOverlay();
    } else if (modalContact && !modalContact.classList.contains('hidden')) {
      closeModal('modal-contact');
    } else if (modalUnpair && !modalUnpair.classList.contains('hidden')) {
      closeModal('modal-unpair');
    } else if (modalProfile && !modalProfile.classList.contains('hidden')) {
      closeModal('modal-profile');
    } else if (state.connected && state.currentScreen !== 'dashboard') {
      showScreen('dashboard');
    } else {
      logDebug('Exiting App via back button');
      App.exitApp();
    }
  });
}

function setupAppStateListener() {
  App.addListener('appStateChange', (appState) => {
    logDebug('Native appStateChange: isActive=' + appState.isActive);
    if (appState.isActive) {
      if (!state.userProfile || !state.userProfile.loggedIn || !state.userProfile.completedSetup) {
        return;
      }
      const mainApp = el('main-app');
      const inMainApp = mainApp && !mainApp.classList.contains('hidden');
      const targetId = state.lastDeviceId || getStorageItem('vihara_last_device_id');
      if (inMainApp && !state.connected && targetId && isNative) {
        logDebug('App resumed from background and band disconnected. Triggering auto-reconnect...');
        attemptAutoReconnect();
      }
    }
  });
}

function getLocalDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const r = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${r}`;
}

function saveSteps() {
  const todayStr = getLocalDateString();
  let history = {};
  try {
    const raw = getStorageItem('vihara_step_history');
    if (raw) history = JSON.parse(raw);
  } catch(e) {}
  
  history[todayStr] = state.steps;
  setStorageItem('vihara_step_history', JSON.stringify(history));

  if (state.todayBaselineSteps !== null) {
    setStorageItem('vihara_today_baseline_' + todayStr, state.todayBaselineSteps);
  } else {
    removeStorageItem('vihara_today_baseline_' + todayStr);
  }

  if (state.lastRawBandSteps !== null) {
    setStorageItem('vihara_last_absolute_steps', state.lastRawBandSteps);
  }
  
  // Recalculate derived metrics
  state.distance      = parseFloat((state.steps * 0.000762).toFixed(2));
  state.calories      = Math.round(state.steps * 0.04);
  state.activeMinutes = Math.min(Math.round(state.steps / 100), 120);
  
  const idx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  state.weeklySteps[idx] = state.steps;
  
  setStorageItem('vihara-steps-today', state.steps);
}

function loadSteps() {
  const todayStr = getLocalDateString();
  state.currentDateStr = todayStr;

  // One-time cleanup of synthetic mock history and reset software step count to 0
  if (getStorageItem('vihara_cleaned_mock_v3') !== 'true') {
    removeStorageItem('vihara-steps-today');
    removeStorageItem('vihara_today_baseline');
    removeStorageItem('vihara_today_baseline_' + todayStr);
    removeStorageItem('vihara_last_absolute_steps');
    const cleanHistory = {};
    cleanHistory[todayStr] = 0;
    setStorageItem('vihara_step_history', JSON.stringify(cleanHistory));
    setStorageItem('vihara_cleaned_mock_v3', 'true');
  }

  let history = {};
  try {
    const raw = getStorageItem('vihara_step_history');
    if (raw) {
      history = JSON.parse(raw);
    } else {
      history = { [todayStr]: 0 };
      setStorageItem('vihara_step_history', JSON.stringify(history));
    }
  } catch(e) {
    history = { [todayStr]: 0 };
    setStorageItem('vihara_step_history', JSON.stringify(history));
  }

  state.steps = history[todayStr] || 0;

  const savedBaseline = getStorageItem('vihara_today_baseline_' + todayStr);
  if (savedBaseline !== null) {
    state.todayBaselineSteps = parseInt(savedBaseline, 10);
  } else {
    state.todayBaselineSteps = null;
  }

  const savedLastAbs = getStorageItem('vihara_last_absolute_steps');
  if (savedLastAbs !== null) {
    state.lastRawBandSteps = parseInt(savedLastAbs, 10);
  } else {
    state.lastRawBandSteps = null;
  }

  state.distance      = parseFloat((state.steps * 0.000762).toFixed(2));
  state.calories      = Math.round(state.steps * 0.04);
  state.activeMinutes = Math.min(Math.round(state.steps / 100), 120);
  state.weeklySteps   = getCurrentWeekSteps(history);
}

function getCurrentWeekSteps(history) {
  const steps = [];
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + diffToMon + i);
    const dateStr = getLocalDateString(d);
    steps.push(history[dateStr] || 0);
  }
  return steps;
}

function getLast30DaysSteps(history) {
  const steps = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = getLocalDateString(d);
    steps.push(history[dateStr] || 0);
  }
  return steps;
}
function updateGreeting() {
  const h = new Date().getHours();
  setText('dash-greeting', h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening');
  renderUserProfile();
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// PAIRING + WEB BLUETOOTH
let discoveredDevices = [];
let isScanning = false;

function startPairingSequence() {
  logDebug('startPairingSequence() triggered. Initiating inline scan...');
  startInlineScan();
}

async function checkBluetoothEnabled() {
  if (!isNative) return true;
  try {
    const isEnabled = await BleClient.isEnabled();
    logDebug('checkBluetoothEnabled isEnabled=' + isEnabled);
    if (!isEnabled) {
      logDebug('Bluetooth is disabled on native device. Prompting user to enable...');
      const modal = el('modal-bluetooth-enable');
      if (modal) modal.classList.remove('hidden');
      return false;
    }
    return true;
  } catch (e) {
    logDebug('BleClient.isEnabled check error: ' + e.message);
    return true;
  }
}

async function requestEnableBluetooth() {
  closeModal('modal-bluetooth-enable');
  if (isNative) {
    try {
      logDebug('Attempting BleClient.requestEnable()...');
      await BleClient.requestEnable();
      showToast('Bluetooth enabled');
      setTimeout(() => {
        startInlineScan();
      }, 500);
    } catch (e) {
      logDebug('BleClient.requestEnable error: ' + e.message);
      try {
        await BleClient.openAppSettings();
      } catch (err) {}
      showToast('Please enable Bluetooth in settings');
    }
  }
}

async function startInlineScan() {
  logDebug('startInlineScan() called.');
  const btOk = await checkBluetoothEnabled();
  if (!btOk) {
    setText('scan-status-text', 'Bluetooth is turned off');
    return;
  }

  if (isScanning) {
    try {
      if (isNative) {
        await BleClient.stopLEScan().catch(() => {});
      }
    } catch(e) {}
    isScanning = false;
  }
  
  discoveredDevices = [];
  renderDiscoveredDevices();
  
  const scanContainer = el('scan-status-container');
  if (scanContainer) scanContainer.style.display = 'flex';
  setText('scan-status-text', 'Scanning for Vihara Bands...');
  
  if (isNative) {
    try {
      isScanning = true;
      logDebug('Starting native BLE scan...');
      await BleClient.requestLEScan(
        {
          services: [BLE_VIHARA_SERVICE]
        },
        (result) => {
          if (result && result.device) {
            const name = result.device.name || 'Vihara Band';
            const devId = result.device.deviceId;
            const rssi = result.rssi || -70;
            addDiscoveredDevice({ deviceId: devId, name: name, rssi: rssi });
          }
        }
      );
    } catch (e) {
      logDebug('Native LE Scan failed: ' + e.message);
      isScanning = false;
      setText('scan-status-text', 'Scan failed: ' + e.message);
    }
  } else {
    isScanning = true;
    logDebug('Starting mock web scan...');
    setTimeout(() => {
      if (!isScanning) return;
      addDiscoveredDevice({ deviceId: 'VB-MOCK-DESKTOP', name: 'Vihara Band [Web Emulator]', rssi: -55 });
      setText('scan-status-text', 'Scan complete (emulator found)');
      isScanning = false;
      const scanContainer = el('scan-status-container');
      if (scanContainer) scanContainer.style.display = 'none';
    }, 1500);
  }
}

function addDiscoveredDevice(device) {
  if (!device || !device.deviceId) return;
  const exists = discoveredDevices.some(d => d.deviceId === device.deviceId);
  if (!exists) {
    discoveredDevices.push(device);
    renderDiscoveredDevices();
  } else {
    const idx = discoveredDevices.findIndex(d => d.deviceId === device.deviceId);
    if (idx !== -1) {
      discoveredDevices[idx].rssi = device.rssi;
      updateDeviceCardBadge(device.deviceId, device.rssi);
    }
  }
}

function updateDeviceCardBadge(deviceId, rssi) {
  const safeId = (deviceId || '').replace(/"/g, '\\"');
  const card = document.querySelector(`.discovered-device-card[data-device-id="${safeId}"]`);
  if (!card) return;
  const badge = card.querySelector('.sig-badge');
  if (!badge) return;
  let sigText = 'Fair';
  let sigColor = '#FFD93D';
  if (rssi > -60) {
    sigText = 'Strong';
    sigColor = '#00C896';
  } else if (rssi < -85) {
    sigText = 'Weak';
    sigColor = '#FF6B6B';
  }
  badge.textContent = sigText;
  badge.style.background = sigColor + '1a';
  badge.style.color = sigColor;
}

function renderDiscoveredDevices() {
  const container = el('device-list-container');
  if (!container) return;
  
  if (discoveredDevices.length === 0) {
    container.innerHTML = `<div class="discovered-devices-empty" style="text-align:center; color:var(--t3); font-size:13px; padding:12px;">No Vihara Bands discovered yet.</div>`;
    return;
  }
  
  container.innerHTML = discoveredDevices.map(d => {
    let sigText = 'Fair';
    let sigColor = '#FFD93D';
    if (d.rssi > -60) {
      sigText = 'Strong';
      sigColor = '#00C896';
    } else if (d.rssi < -85) {
      sigText = 'Weak';
      sigColor = '#FF6B6B';
    }
    
    const safeId = (d.deviceId || '').replace(/"/g, '&quot;');
    const safeName = (d.name || 'Vihara Band').replace(/"/g, '&quot;');

    return `<div data-device-id="${safeId}" data-device-name="${safeName}" class="discovered-device-card">
      <div class="discovered-device-info-left">
        <div class="discovered-device-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v20M5 12h14M17 7L7 17M7 7l10 10"/>
          </svg>
        </div>
        <div class="discovered-device-text-wrap">
          <div class="discovered-device-name">${safeName}</div>
          <div class="discovered-device-id">${safeId}</div>
        </div>
      </div>
      <div class="discovered-device-info-right">
        <span class="sig-badge" style="font-size: 10px; font-weight: bold; background: ${sigColor}1a; color: ${sigColor}; padding: 2px 6px; border-radius: 20px;">${sigText}</span>
      </div>
    </div>`;
  }).join('');

  setupDeviceListListener();
}

function setupDeviceListListener() {
  const container = el('device-list-container');
  if (!container || container._hasDeviceListener) return;
  container._hasDeviceListener = true;

  const handleDeviceSelection = (card) => {
    if (!card) return;
    const deviceId = card.getAttribute('data-device-id');
    const deviceName = card.getAttribute('data-device-name') || 'Vihara Band';
    if (deviceId && !state.isConnecting) {
      logDebug('Device selected via tap/click: ' + deviceName + ' (' + deviceId + ')');
      connectToScannedDevice(deviceId, deviceName);
    }
  };

  container.addEventListener('click', (e) => {
    const card = e.target.closest('.discovered-device-card');
    handleDeviceSelection(card);
  });

  let touchStartY = 0;
  container.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) {
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    if (e.changedTouches && e.changedTouches[0]) {
      const moveDist = Math.abs(e.changedTouches[0].clientY - touchStartY);
      if (moveDist > 10) return; // User was scrolling, ignore tap
    }
    const card = e.target.closest('.discovered-device-card');
    if (card) {
      handleDeviceSelection(card);
    }
  });
}

async function connectToScannedDevice(deviceId, name) {
  if (state.isConnecting) {
    logDebug('connectToScannedDevice: connection already in progress, ignoring call.');
    return;
  }
  state.isConnecting = true;
  logDebug('connectToScannedDevice() called for: ' + name + ' (' + deviceId + ')');
  isScanning = false;
  
  try {
    if (isNative) {
      await BleClient.stopLEScan().catch(() => {});
    }
  } catch(e) {}
  
  el('pair-state-scan').classList.add('hidden');
  el('pair-state-connecting').classList.remove('hidden');
  setConnectingStatus('Connecting to Vihara Band...');
  
  if (deviceId === 'VB-MOCK-DESKTOP') {
    if (!('bluetooth' in navigator)) {
      showToast('Web Bluetooth not supported. Use Chrome.');
      el('pair-state-connecting').classList.add('hidden');
      el('pair-state-scan').classList.remove('hidden');
      state.isConnecting = false;
      return;
    }
    try {
      setConnectingStatus('Opening Bluetooth picker...');
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { name: 'Vihara Band' },
          { namePrefix: 'Vihara' },
          { namePrefix: 'VB-' },
          { services: [BLE_VIHARA_SERVICE] }
        ],
        optionalServices: [BLE_BATTERY_SERVICE]
      });
      device.addEventListener('gattserverdisconnected', onBleDisconnected);
      state.bleDevice = device;

      setConnectingStatus('Connecting to GATT server...');
      const server = await device.gatt.connect();
      state.bleServer = server;

      setConnectingStatus('Discovering services...');
      const service = await server.getPrimaryService(BLE_VIHARA_SERVICE);

      setConnectingStatus('Subscribing to step counter...');
      const stepChar = await service.getCharacteristic(BLE_STEP_CHAR);
      await stepChar.startNotifications();
      stepChar.addEventListener('characteristicvaluechanged', onStepNotify);
      state.bleStepChar = stepChar;
      try { const v = await stepChar.readValue(); applyStepData(v); } catch(e) {}

      setConnectingStatus('Subscribing to fall detector...');
      const fallChar = await service.getCharacteristic(BLE_FALL_CHAR);
      await fallChar.startNotifications();
      fallChar.addEventListener('characteristicvaluechanged', onFallNotify);
      state.bleFallChar = fallChar;

      try {
        const batSvc  = await server.getPrimaryService(BLE_BATTERY_SERVICE);
        const batChar = await batSvc.getCharacteristic(BLE_BATTERY_CHAR);
        state.battery = (await batChar.readValue()).getUint8(0);
      } catch(e) { console.log('Battery service not yet on firmware'); }

      state.connected = true;
      unlockBadge('first_sync');
      setConnectingStatus('Connected! Loading app...');
      setTimeout(launchMainApp, 250);
    } catch(err) {
      state.isConnecting = false;
      logDebug('Web connect failed: ' + err.message);
      el('pair-state-connecting').classList.add('hidden');
      el('pair-state-scan').classList.remove('hidden');
      showToast('Connection failed: ' + err.message);
      startInlineScan();
    } finally {
      if (!state.connected) state.isConnecting = false;
    }
    return;
  }
  
  if (isNative) {
    try {
      setConnectingStatus('Connecting to Vihara Band...');
      logDebug('Connecting to native device: ' + deviceId);
      
      state.bleDevice = { deviceId: deviceId, name: name };
      
      await BleClient.connect(deviceId, onBleDisconnected);
      logDebug('Connected to device successfully!');
      try {
        await BleClient.requestConnectionPriority(deviceId, 0); // 0 = CONNECTION_PRIORITY_BALANCED (30-50ms)
      } catch (pErr) {}
      await sleep(350); // Wait for connection to stabilize

      setConnectingStatus('Subscribing to step counter...');
      logDebug('Starting notifications for steps...');
      await BleClient.startNotifications(
        deviceId,
        BLE_VIHARA_SERVICE,
        BLE_STEP_CHAR,
        (value) => {
          logDebug('Step notify callback triggered');
          applyStepData(value);
        }
      );
      logDebug('Subscribed to steps characteristic.');
      await sleep(350); // Wait before next GATT operation

      try {
        logDebug('Reading initial steps...');
        const v = await BleClient.read(deviceId, BLE_VIHARA_SERVICE, BLE_STEP_CHAR);
        logDebug('Initial steps read: bytes=' + v.byteLength);
        applyStepData(v);
      } catch (e) {
        logDebug('Initial steps read failed: ' + e.message);
      }
      await sleep(350); // Wait before next GATT operation

      setConnectingStatus('Subscribing to fall detector...');
      logDebug('Starting notifications for falls...');
      await BleClient.startNotifications(
        deviceId,
        BLE_VIHARA_SERVICE,
        BLE_FALL_CHAR,
        (value) => {
          logDebug('Fall notify callback triggered');
          onFallNotify(value);
        }
      );
      logDebug('Subscribed to fall characteristic.');
      await sleep(350); // Wait before next GATT operation

      try {
        logDebug('Reading battery level...');
        const batVal = await BleClient.read(deviceId, BLE_BATTERY_SERVICE, BLE_BATTERY_CHAR);
        const batDv = getRobustDataView(batVal);
        state.battery = batDv.getUint8(0);
        logDebug('Battery read value: ' + state.battery + '%');
      } catch (e) {
        logDebug('Battery service read failed: ' + e.message);
      }

      state.connected = true;
      state.isReconnecting = false;
      state.reconnectAttempts = 0;
      if (state.reconnectTimer) {
        clearTimeout(state.reconnectTimer);
        state.reconnectTimer = null;
      }
      state.lastDeviceId = deviceId;
      state.lastDeviceName = name;
      setStorageItem('vihara_last_device_id', deviceId);
      setStorageItem('vihara_last_device_name', name);
      unlockBadge('first_sync');
      setConnectingStatus('Connected! Loading app...');
      logDebug('Launching main app dashboard...');
      setTimeout(launchMainApp, 250);
      
    } catch(err) {
      state.isConnecting = false;
      logDebug('Native connect failed: ' + err.message);
      el('pair-state-connecting').classList.add('hidden');
      el('pair-state-scan').classList.remove('hidden');
      showToast('Connection failed: ' + err.message);
      startInlineScan();
    } finally {
      if (!state.connected) state.isConnecting = false;
    }
  }
}

function setConnectingStatus(msg) {
  const p = document.querySelector('#pair-state-connecting p');
  if (p) p.textContent = msg;
}

// BLE Notification: Step Count (3-byte little-endian from BMA400 STEP_CNT_0/1/2)
function onStepNotify(event) { applyStepData(event.target.value); }

function getRobustDataView(val) {
  if (!val) return new DataView(new ArrayBuffer(0));
  if (val.value !== undefined && val.value !== null) return getRobustDataView(val.value);
  if (val instanceof DataView) return val;
  if (val instanceof ArrayBuffer) return new DataView(val);
  if (ArrayBuffer.isView(val)) return new DataView(val.buffer, val.byteOffset, val.byteLength);
  if (Array.isArray(val)) return new DataView(new Uint8Array(val).buffer);

  if (typeof val === 'string') {
    let str = val.trim();
    // 1. Try Base64 decoding (Capacitor BLE plugin default on Android)
    try {
      const decoded = atob(str);
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i);
      }
      return new DataView(bytes.buffer);
    } catch (e) {}

    // 2. Try Hex string decoding
    if (/^(0x)?[0-9a-fA-F]+$/.test(str) && str.length % 2 === 0) {
      if (str.startsWith('0x') || str.startsWith('0X')) str = str.substring(2);
      const bytes = new Uint8Array(str.length / 2);
      for (let i = 0; i < str.length; i += 2) {
        bytes[i / 2] = parseInt(str.substring(i, i + 2), 16);
      }
      return new DataView(bytes.buffer);
    }
  }
  return new DataView(new ArrayBuffer(0));
}

function applyStepData(value) {
  try {
    const dv = getRobustDataView(value);
    logDebug('applyStepData called. dv length=' + (dv ? dv.byteLength : '0'));
    if (dv.byteLength < 3) {
      logDebug('Warning: Steps DataView length < 3 bytes (' + dv.byteLength + ')');
      return;
    }
    const bandSteps = dv.getUint8(0) | (dv.getUint8(1) << 8) | (dv.getUint8(2) << 16);
    logDebug('Parsed steps from band: ' + bandSteps);
    state.lastRawBandSteps = bandSteps;
    
    // Day-based baseline initialization
    const todayStr = getLocalDateString();
    if (state.todayBaselineSteps === null) {
      const savedBaseline = getStorageItem('vihara_today_baseline_' + todayStr);
      if (savedBaseline !== null) {
        state.todayBaselineSteps = parseInt(savedBaseline, 10) || 0;
      } else {
        // Establish today's baseline from band's lifetime counter
        state.todayBaselineSteps = Math.max(0, bandSteps - (state.steps || 0));
        setStorageItem('vihara_today_baseline_' + todayStr, state.todayBaselineSteps);
      }
      logDebug(`Established baseline: bandSteps=${bandSteps}, baseline=${state.todayBaselineSteps}`);
    }
    
    // If band counter dropped below baseline (e.g. flash wiped/reflashed), reset baseline to 0
    if (bandSteps < state.todayBaselineSteps) {
      state.todayBaselineSteps = 0;
      setStorageItem('vihara_today_baseline_' + todayStr, 0);
      logDebug(`Band counter below baseline, reset baseline to 0`);
    }
    
    const calculatedSteps = Math.max(0, bandSteps - state.todayBaselineSteps);
    if (calculatedSteps !== state.steps) {
      state.steps = calculatedSteps;
      logDebug(`Steps updated from band: ${state.steps}`);
      saveSteps();
    }

    if (state.steps >= 1000)  unlockBadge('step_1k');
    if (state.steps >= 10000) unlockBadge('step_10k');
    updateUIForCurrentScreen();
  } catch (e) {
    logDebug('applyStepData error: ' + e.message);
  }
}

// BLE Notification: Fall/Freefall/SOS Event (1-byte, 0x01 = fall, 0x02 = freefall, 0x03 = Boot Button SOS)
function onFallNotify(eventOrDataView) {
  try {
    const dv = getRobustDataView(eventOrDataView);
    logDebug('onFallNotify called. dv length=' + (dv ? dv.byteLength : '0'));
    if (dv.byteLength < 1) {
      logDebug('Warning: Fall DataView length < 1 byte');
      return;
    }
    const val = dv.getUint8(0);
    logDebug('Parsed notification value: 0x' + val.toString(16).padStart(2, '0'));
    if (val === 0x01 && state.fallEnabled) {
      logDebug('TRIGGERING FALL ALERT!');
      triggerFallAlert();
    } else if (val === 0x02 && state.fallEnabled) {
      showToast('Freefall detected! Monitoring for impact...');
    } else if (val === 0x03) {
      logDebug('TRIGGERING HARDWARE BOOT BUTTON SOS ALERT!');
      showToast('🚨 Emergency SOS triggered from Vihara Band!');
      triggerSOS();
    }
  } catch (e) {
    logDebug('onFallNotify error: ' + e.message);
  }
}

function updateConnectionUI() {
  const dots = document.querySelectorAll('.ble-dot');
  const lbls = document.querySelectorAll('.chip--ble span:last-child');
  const badgeConnected = document.querySelector('.badge-connected');

  if (state.connected) {
    if (dots) dots.forEach(d => d.style.background = 'var(--accent, #00C896)');
    if (lbls) lbls.forEach(l => l.textContent = 'Connected');
    if (badgeConnected) {
      badgeConnected.style.color = 'var(--accent, #00C896)';
      badgeConnected.textContent = '● Connected';
    }
  } else if (state.isReconnecting) {
    if (dots) dots.forEach(d => d.style.background = 'var(--yellow, #FFD93D)');
    if (lbls) lbls.forEach(l => l.textContent = 'Reconnecting...');
    if (badgeConnected) {
      badgeConnected.style.color = 'var(--yellow, #FFD93D)';
      badgeConnected.textContent = '● Reconnecting...';
    }
  } else {
    if (dots) dots.forEach(d => d.style.background = 'var(--red, #FF6B6B)');
    if (lbls) lbls.forEach(l => l.textContent = 'Disconnected');
    if (badgeConnected) {
      badgeConnected.style.color = 'var(--red, #FF6B6B)';
      badgeConnected.textContent = '● Disconnected';
    }
  }
}

// Auto-reconnect on disconnect
function onBleDisconnected(disconnectedId) {
  logDebug('onBleDisconnected() triggered for ' + disconnectedId);
  
  if (state.isConnecting) {
    logDebug('Ignoring onBleDisconnected callback because connection handshake is in progress.');
    return;
  }
  
  state.connected = false;
  updateConnectionUI();

  // If user is logged out or setup is incomplete, ignore disconnect and do not navigate
  if (!state.userProfile || !state.userProfile.loggedIn || !state.userProfile.completedSetup) {
    logDebug('Ignoring BLE disconnect because user is logged out.');
    return;
  }

  const mainApp = el('main-app');
  const inMainApp = mainApp && !mainApp.classList.contains('hidden');

  // If user was NOT on the main app dashboard, return to scan screen
  if (!inMainApp) {
    state.isReconnecting = false;
    state.bleDevice = null;
    showToast('Vihara Band disconnected');
    if (mainApp) {
      mainApp.classList.add('hidden');
    }
    const pairing = el('screen-pairing');
    if (pairing) {
      pairing.classList.add('active');
      pairing.classList.remove('hidden');
    }
    const pairScan = el('pair-state-scan');
    const pairConnecting = el('pair-state-connecting');
    if (pairScan) pairScan.classList.remove('hidden');
    if (pairConnecting) pairConnecting.classList.add('hidden');
    startInlineScan();
    return;
  }

  // If user was on the dashboard, keep dashboard visible and initiate smooth background auto-reconnect
  showToast('Connection lost. Reconnecting...');
  attemptAutoReconnect();
}

async function attemptAutoReconnect() {
  // If user is logged out, never auto-reconnect
  if (!state.userProfile || !state.userProfile.loggedIn || !state.userProfile.completedSetup) {
    logDebug('attemptAutoReconnect() skipped: user is not logged in.');
    return;
  }

  const targetId = state.lastDeviceId || (state.bleDevice && state.bleDevice.deviceId) || getStorageItem('vihara_last_device_id');
  const targetName = state.lastDeviceName || getStorageItem('vihara_last_device_name') || 'Vihara Band';

  if (!targetId || !isNative) {
    logDebug('Auto-reconnect skipped: targetId=' + targetId + ' isNative=' + isNative);
    state.isReconnecting = false;
    updateConnectionUI();
    return;
  }

  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }

  state.isReconnecting = true;
  updateConnectionUI();
  logDebug('Initiating background auto-reconnect to: ' + targetId);

  let success = false;
  try {
    try {
      await BleClient.disconnect(targetId);
      await sleep(150);
    } catch(e) {}

    await BleClient.connect(targetId, onBleDisconnected);
    logDebug('Auto-reconnect BLE connect success! Re-subscribing...');
    try {
      await BleClient.requestConnectionPriority(targetId, 0); // 0 = CONNECTION_PRIORITY_BALANCED
    } catch (pErr) {}
    state.bleDevice = { deviceId: targetId, name: targetName };
    await sleep(350);

    // Re-subscribe to step notifications
    await BleClient.startNotifications(
      targetId,
      BLE_VIHARA_SERVICE,
      BLE_STEP_CHAR,
      (value) => {
        logDebug('Step notify callback triggered after reconnect');
        applyStepData(value);
      }
    );
    await sleep(250);

    // Read initial step count
    try {
      const v = await BleClient.read(targetId, BLE_VIHARA_SERVICE, BLE_STEP_CHAR);
      applyStepData(v);
    } catch(e) {}
    await sleep(250);

    // Re-subscribe to fall notifications
    await BleClient.startNotifications(
      targetId,
      BLE_VIHARA_SERVICE,
      BLE_FALL_CHAR,
      (value) => {
        logDebug('Fall notify callback triggered after reconnect');
        onFallNotify(value);
      }
    );

    // Read battery if available
    try {
      const batVal = await BleClient.read(targetId, BLE_BATTERY_SERVICE, BLE_BATTERY_CHAR);
      const batDv = getRobustDataView(batVal);
      state.battery = batDv.getUint8(0);
    } catch (e) {}

    state.connected = true;
    state.isReconnecting = false;
    state.reconnectAttempts = 0;
    updateConnectionUI();
    showToast('Vihara Band reconnected!');
    logDebug('Auto-reconnect fully restored.');
    success = true;
  } catch (err) {
    logDebug('Auto-reconnect attempt failed: ' + err.message);
  }

  if (!success && !state.connected) {
    state.isReconnecting = true;
    updateConnectionUI();
    state.reconnectAttempts = (state.reconnectAttempts || 0) + 1;
    // Retry backoff: 3s for first 5 attempts, then 7s
    const delay = state.reconnectAttempts <= 5 ? 3000 : 7000;
    logDebug(`Scheduling auto-reconnect attempt #${state.reconnectAttempts + 1} in ${delay}ms`);
    state.reconnectTimer = setTimeout(() => {
      attemptAutoReconnect();
    }, delay);
  }
}

function enterDemoMode() {
  logDebug('enterDemoMode() initiated.');

  // If a real user is currently logged in, preserve their profile
  const savedRaw = getStorageItem(USER_PROFILE_KEY);
  if (savedRaw) {
    try {
      const parsed = JSON.parse(savedRaw);
      if (parsed && (parsed.loggedIn || parsed.googleLinked)) {
        state.preDemoProfile = parsed;
      }
    } catch(e) {}
  } else if (state.userProfile && (state.userProfile.loggedIn || state.userProfile.googleLinked)) {
    state.preDemoProfile = JSON.parse(JSON.stringify(state.userProfile));
  }
  state.connected = true;
  state.simulationMode = true;
  state.battery = 92;
  state.steps = 7420;
  state.distance = 5.65;
  state.calories = 340;
  state.activeMinutes = 48;
  state.weeklySteps = [6200, 7800, 8400, 5900, 9200, 8100, 7420];

  // Configure a clean demo profile so user is NEVER prompted for personal info
  // and real Google credentials are NEVER shown in Settings
  state.userProfile = {
    name: 'Demo Member',
    email: '',
    photoUrl: '',
    googleLinked: false,
    loggedIn: true,
    guestMode: true,
    completedSetup: true,
    age: 28,
    height: 175,
    weight: 68,
    stepGoal: 10000
  };
  state.isOnboarding = false;
  closeModal('modal-profile');
  document.querySelectorAll('.scroll-area').forEach(sa => { sa.scrollTop = 0; });
  renderUserProfile();
  launchMainApp();
  updateSosModeUI();
}

function launchMainApp() {
  logDebug('launchMainApp() initiated.');
  state.connected = true;
  state.isConnecting = false;
  updateConnectionUI();

  // Reset all scroll areas to top
  document.querySelectorAll('.scroll-area').forEach(sa => { sa.scrollTop = 0; });

  // Start background foreground service for 24/7 BLE telemetry tracking
  if (isNative && state.connected && !state.simulationMode) {
    try {
      Capacitor.Plugins.ViharaBackground?.startService().catch(() => {});
    } catch(e) {}
  }

  const pairing = el('screen-pairing');
  if (pairing) {
    pairing.classList.remove('active');
    pairing.classList.add('hidden');
    pairing.style.opacity = '0';
    pairing.style.pointerEvents = 'none';
    pairing.style.transition = '';
  }

  const pairConnecting = el('pair-state-connecting');
  if (pairConnecting) pairConnecting.classList.add('hidden');
  const pairScan = el('pair-state-scan');
  if (pairScan) pairScan.classList.remove('hidden');

  const mainApp = el('main-app');
  if (mainApp) {
    mainApp.classList.remove('hidden');
    mainApp.style.opacity = '1';
    mainApp.style.pointerEvents = 'all';
  }

  // Strictly reset to main dashboard upon connection / reconnection!
  showScreen('dashboard', true);

  try { renderUserProfile(); } catch(e) { logDebug('renderUserProfile err: ' + e); }
  try { renderDashboard(); } catch(e) { logDebug('renderDashboard err: ' + e); }
  try { renderTimeline(); } catch(e) { logDebug('renderTimeline err: ' + e); }
  try { renderWeeklyChart(); } catch(e) { logDebug('renderWeeklyChart err: ' + e); }
  try { renderContacts(); } catch(e) { logDebug('renderContacts err: ' + e); }
  try { renderInsights(); } catch(e) { logDebug('renderInsights err: ' + e); }
  try { renderBadges(); } catch(e) { logDebug('renderBadges err: ' + e); }
  try { renderMonthlyCalendar(); } catch(e) { logDebug('renderMonthlyCalendar err: ' + e); }
  try { renderTrendChart(); } catch(e) { logDebug('renderTrendChart err: ' + e); }
  try { updateDeviceLED(state.ledColor); } catch(e) {}

  const d = new Date();
  setText('day-date-lbl', d.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' }));
  setText('month-lbl', d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }));
  try { setTimeout(animateRings, 300); } catch(e) {}
  if (state.simulationMode) {
    showToast('Demo Mode — Virtual Band Active');
  } else {
    showToast('Vihara Band connected via BLE!');
    if (!state.userProfile.name) {
      setTimeout(() => {
        openProfileModal(true);
      }, 1200);
    }
  }
}

function navigateToDashboard() {
  logDebug('navigateToDashboard() initiated.');

  const welcome = el('screen-welcome');
  if (welcome) {
    welcome.classList.remove('active');
    welcome.classList.add('hidden');
    welcome.style.opacity = '0';
    welcome.style.pointerEvents = 'none';
  }

  const pairing = el('screen-pairing');
  if (pairing) {
    pairing.classList.remove('active');
    pairing.classList.add('hidden');
    pairing.style.opacity = '0';
    pairing.style.pointerEvents = 'none';
    pairing.style.transition = '';
  }

  const pairConnecting = el('pair-state-connecting');
  if (pairConnecting) pairConnecting.classList.add('hidden');
  const pairScan = el('pair-state-scan');
  if (pairScan) pairScan.classList.remove('hidden');

  const mainApp = el('main-app');
  if (mainApp) {
    mainApp.classList.remove('hidden');
    mainApp.style.opacity = '1';
    mainApp.style.pointerEvents = 'all';
  }

  // Ensure modal overlays are hidden
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));

  // Strictly activate only dashboard screen
  showScreen('dashboard', true);

  try { renderUserProfile(); } catch(e) { logDebug('renderUserProfile err: ' + e); }
  try { renderDashboard(); } catch(e) { logDebug('renderDashboard err: ' + e); }
  try { renderTimeline(); } catch(e) { logDebug('renderTimeline err: ' + e); }
  try { renderWeeklyChart(); } catch(e) { logDebug('renderWeeklyChart err: ' + e); }
  try { renderContacts(); } catch(e) { logDebug('renderContacts err: ' + e); }
  try { renderInsights(); } catch(e) { logDebug('renderInsights err: ' + e); }
  try { renderBadges(); } catch(e) { logDebug('renderBadges err: ' + e); }
  try { renderMonthlyCalendar(); } catch(e) { logDebug('renderMonthlyCalendar err: ' + e); }
  try { renderTrendChart(); } catch(e) { logDebug('renderTrendChart err: ' + e); }
  try { updateDeviceLED(state.ledColor); } catch(e) {}
  updateConnectionUI();

  const d = new Date();
  setText('day-date-lbl', d.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' }));
  setText('month-lbl', d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }));
  try { setTimeout(animateRings, 300); } catch(e) {}

  // If a band was previously paired, trigger auto-reconnect in the background
  const targetId = state.lastDeviceId || getStorageItem('vihara_last_device_id');
  if (targetId && !state.connected && isNative) {
    logDebug('Auto-reconnecting to previously paired band: ' + targetId);
    attemptAutoReconnect();
  }
}

// NAVIGATION
const NAV_MAP = {
  dashboard: 'nb-dashboard',
  activity: 'nb-activity',
  sos: 'nb-sos',
  fall: 'nb-sos',
  insights: 'nb-insights',
  settings: 'nb-settings',
  device: 'nb-settings'
};

function showScreen(name, force = false) {
  if (!name) name = 'dashboard';

  // Strictly deactivate and hide ALL main screens in DOM
  document.querySelectorAll('.screen-main').forEach(s => {
    s.classList.remove('screen-main--active');
    s.style.display = 'none';
    s.style.transform = '';
  });
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  state.currentScreen = name;
  const next = el('screen-' + name);
  if (next) {
    next.classList.add('screen-main--active');
    next.style.display = 'block';
    const sa = next.querySelector('.scroll-area');
    if (sa) {
      sa.scrollTop = 0;
    }
  }
  const navId = NAV_MAP[name];
  if (navId) {
    const nb = el(navId);
    if (nb) nb.classList.add('active');
  }

  try {
    if (name === 'activity') { renderWeeklyChart(); renderTimeline('act-timeline-bars'); }
    if (name === 'sos') { renderContacts(); updateSosModeUI(); }
    if (name === 'insights') renderInsights();
    if (name === 'settings') renderUserProfile();
    if (name === 'dashboard') { renderUserProfile(); renderDashboard(); }
  } catch(e) {
    logDebug('showScreen render error: ' + e);
  }
}

function switchTab(screen, tab, btn) {
  document.querySelectorAll('[id^="' + screen + '-tab-"]').forEach(t=>t.classList.add('hidden'));
  const te = el(screen + '-tab-' + tab); if (te) te.classList.remove('hidden');
  btn.closest('.tab-bar').querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if (screen==='act' && tab==='month') renderMonthlyCalendar();
  if (screen==='act' && tab==='week')  renderWeeklyChart();
  if (screen==='ins' && tab==='badges') renderBadges();
  if (screen==='ins' && tab==='trends') renderTrendChart();
  if (screen==='ins' && tab==='overview') renderInsights();
}

// Step number animated count-up
let activeStepAnim = null;
function animateStepNumber(targetVal) {
  const ringEl = el('ring-step-val');
  if (!ringEl) return;
  if (activeStepAnim) cancelAnimationFrame(activeStepAnim);
  const currentText = ringEl.textContent.replace(/,/g, '');
  const startVal = parseInt(currentText, 10) || 0;
  if (startVal === targetVal) {
    ringEl.textContent = fmt(targetVal);
    return;
  }
  const startTime = performance.now();
  const duration = 1100;
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const curVal = Math.round(startVal + (targetVal - startVal) * ease);
    ringEl.textContent = fmt(curVal);
    if (progress < 1) {
      activeStepAnim = requestAnimationFrame(step);
    } else {
      ringEl.textContent = fmt(targetVal);
      activeStepAnim = null;
    }
  }
  activeStepAnim = requestAnimationFrame(step);
}

// DASHBOARD
function renderDashboard() {
  const u = state.unit;
  setText('sv-steps', fmt(state.steps));
  setHTML('sv-dist', state.distance.toFixed(1) + '<small>' + u + '</small>');
  setHTML('sv-cal',  state.calories + '<small>kcal</small>');
  setHTML('sv-act',  state.activeMinutes + '<small>min</small>');
  animateStepNumber(state.steps);
  setText('ring-step-goal', '/ ' + fmt(state.stepGoal) + ' goal');
  setText('dash-bat', state.battery + '%');
  const sp = pct(state.steps, state.stepGoal);
  cssVar('sb-steps','--pct',sp+'%'); cssVar('sb-dist','--pct',pct(state.distance,10)+'%');
  cssVar('sb-cal','--pct',pct(state.calories,600)+'%'); cssVar('sb-act','--pct',pct(state.activeMinutes,60)+'%');
  setText('day-steps', fmt(state.steps));
  setHTML('day-dist', state.distance.toFixed(2) + ' ' + u);
  setText('day-cal',  state.calories + ' kcal');
  setText('day-act',  state.activeMinutes + ' min');
  setText('day-goal-pct', Math.round(sp) + '%');

  // Ring Legend percentages
  const spVal = Math.round(pct(state.steps, state.stepGoal));
  const cpVal = Math.round(pct(state.calories, 600));
  const apVal = Math.round(pct(state.activeMinutes, 60));
  setText('leg-steps-val', 'Steps ' + spVal + '%');
  setText('leg-cals-val',  'Calories ' + cpVal + '%');
  setText('leg-act-val',   'Active ' + apVal + '%');

  const bf=el('bat-fill-large'); if(bf) bf.style.width=state.battery+'%';
  setText('bat-pct-large', state.battery+'%');
  const sbf=el('sb-bat-fill'); if(sbf) sbf.style.width=state.battery+'%';
  setText('sb-bat-pct', state.battery+'%');
  const rem = Math.max(0, state.stepGoal - state.steps);
  setText('dash-insight-text', rem>0 ? fmt(rem)+' more steps to your daily goal!' : 'Daily goal reached! Great job!');
  if (state.steps >= state.stepGoal && !state.goalNotifiedToday && state.notifPrefs && state.notifPrefs.goal) {
    state.goalNotifiedToday = true;
    sendAppNotification({
      title: '🎉 Daily Step Goal Achieved!',
      body: 'Great job! You reached ' + fmt(state.steps) + ' steps today.',
      id: 105
    });
  }
  if (state.battery <= 20 && !state.batteryNotifiedToday && state.notifPrefs && state.notifPrefs.battery) {
    state.batteryNotifiedToday = true;
    sendAppNotification({
      title: '🔋 Vihara Band Low Battery',
      body: 'Band battery is at ' + state.battery + '%. Please place it on the charger.',
      id: 104
    });
  }
}

function animateRings() {
  animRing('ring-steps', 565.49, state.steps/state.stepGoal);
  animRing('ring-cals',  439.82, state.calories/600);
  animRing('ring-act',   314.16, state.activeMinutes/60);
}
function animRing(id, circ, fraction) {
  const e=el(id); if(!e) return;
  e.style.transition='stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)';
  e.style.strokeDashoffset=circ*(1-Math.min(fraction,1));
}

function renderTimeline(tid) {
  const c=el(tid||'timeline-bars'); if(!c) return;
  const data=[15,40,75,90,55,25,65,95,70,50,35,30,80,55,40,18];
  c.innerHTML=data.map(v=>'<div class="tb" style="height:'+v+'%;background:'+(v>=80?'#00C896':v>=50?'#6B8FFF':'rgba(255,255,255,0.1)')+'"></div>').join('');
}

function renderWeeklyChart() {
  const c=el('weekly-chart'); if(!c) return;
  
  let history = {};
  try {
    const raw = getStorageItem('vihara_step_history');
    if (raw) history = JSON.parse(raw);
  } catch(e) {}
  state.weeklySteps = getCurrentWeekSteps(history);
  
  const max=Math.max.apply(null,state.weeklySteps.concat([1]));
  const idx=new Date().getDay()===0?6:new Date().getDay()-1;
  c.innerHTML=state.weeklySteps.map((s,i)=>'<div class="bc-bar'+(i===idx?' today':'')+'" style="height:'+Math.max((s/max)*100,4)+'%" data-steps="'+(s>0?fmt(s):'Rest')+'"></div>').join('');

  // Update Week Summary cards dynamically from authentic steps
  const sum = state.weeklySteps.reduce((a, b) => a + b, 0);
  const activeDays = state.weeklySteps.filter(s => s > 0).length || 1;
  const avg = Math.round(sum / activeDays);
  setText('week-avg-lbl', (avg >= 1000 ? (avg/1000).toFixed(1) + 'k' : avg) + ' avg');
  setText('week-summary-avg', fmt(avg));
  setHTML('week-summary-dist', (sum * 0.000762).toFixed(1) + '<small>' + state.unit + '</small>');
  setHTML('week-summary-cal', fmt(Math.round(sum * 0.04)) + '<small>kcal</small>');
  setHTML('week-summary-act', fmt(Math.round(sum / 100)) + '<small>min</small>');
}

function renderMonthlyCalendar() {
  const c=el('month-calendar'); if(!c) return;
  const now=new Date(), yr=now.getFullYear(), mo=now.getMonth();
  const firstDay=new Date(yr,mo,1).getDay(), dim=new Date(yr,mo+1,0).getDate(), today=now.getDate();
  const cols=['rgba(0,200,150,.08)','rgba(0,200,150,.25)','rgba(0,200,150,.5)','rgba(0,200,150,.75)','#00C896'];
  
  let history = {};
  try {
    const raw = getStorageItem('vihara_step_history');
    if (raw) history = JSON.parse(raw);
  } catch(e) {}
  
  let html='<div class="cal-day empty"></div>'.repeat((firstDay||7)-1);
  let totalSteps = 0;
  let goalDays = 0;
  
  for(let d=1;d<=dim;d++){
    const dStr = `${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const stepsVal = history[dStr] || 0;
    
    if (d <= today) {
      totalSteps += stepsVal;
      if (stepsVal >= 10000) {
        goalDays++;
      }
    }
    
    let lv = 0;
    if (stepsVal >= 10000) lv = 4;
    else if (stepsVal > 8000) lv = 3;
    else if (stepsVal > 5000) lv = 2;
    else if (stepsVal > 2000) lv = 1;
    
    if (d > today) lv = -1; // Future days shaded default
    
    const isCompleted = stepsVal >= 10000 && d <= today;
    const dayClass = isCompleted ? 'cal-day completed' : 'cal-day';
    const checkHtml = isCompleted ? '<span class="cal-check">✓</span>' : '';
    
    html+='<div class="'+dayClass+'" style="background:'+(lv<0?'var(--surf3)':cols[lv])+';border:'+(d===today?'2px solid var(--accent)':'1px solid transparent')+'">'
         +'<span class="cal-num">'+d+'</span>'
         +checkHtml
         +'</div>';
  }
  c.innerHTML=html;
  
  // Calculate dynamic stats
  const totalDist = totalSteps * 0.000762;
  const totalCal = Math.round(totalSteps * 0.04);
  const u = state.unit;
  
  // Render dynamic stats
  const stepsEl = el('month-total-steps');
  if (stepsEl) {
    stepsEl.textContent = totalSteps >= 1000 ? Math.round(totalSteps / 1000) + 'k' : totalSteps;
  }
  const distEl = el('month-total-dist');
  if (distEl) {
    distEl.innerHTML = totalDist.toFixed(1) + '<small>' + u + '</small>';
  }
  const calEl = el('month-total-cal');
  if (calEl) {
    calEl.innerHTML = totalCal.toLocaleString() + '<small>kcal</small>';
  }
  const goalEl = el('month-goal-days');
  if (goalEl) {
    goalEl.innerHTML = goalDays + '<small>/' + today + '</small>';
  }
}

function updateUIForCurrentScreen() {
  if (state.currentScreen === 'dashboard') {
    renderDashboard();
    animateRings();
  } else if (state.currentScreen === 'activity') {
    renderDashboard(); // Updates breakdown cards on Activity today tab
    renderWeeklyChart();
    renderMonthlyCalendar();
    renderTimeline('act-timeline-bars');
  } else if (state.currentScreen === 'insights') {
    renderInsights();
    renderTrendChart();
    renderBadges();
  }
}

function renderTrendChart() {
  const svg = el('trend-chart-svg'); if (!svg) return;
  
  let history = {};
  try {
    const raw = getStorageItem('vihara_step_history');
    if (raw) history = JSON.parse(raw);
  } catch(e) {}
  
  const data = getLast30DaysSteps(history);
  const max = Math.max.apply(null, data);
  const min = Math.min.apply(null, data);
  const W = 300, H = 120, pad = 10;
  
  if (max === 0) {
    // Empty state flat baseline
    svg.innerHTML = '<line x1="10" y1="105" x2="290" y2="105" stroke="rgba(0,200,150,0.2)" stroke-width="2" stroke-dasharray="4 4" />'
      + '<circle cx="290" cy="105" r="3.5" fill="#00C896" />';
    return;
  }

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / (max - min + 1)) * (H - pad * 2);
    return x.toFixed(1) + ',' + y.toFixed(1);
  });
  const area = pad + ',' + (H - pad) + ' ' + pts.join(' ') + ' ' + (W - pad) + ',' + (H - pad);
  svg.innerHTML = '<defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#00C896" stop-opacity=".3"/><stop offset="100%" stop-color="#00C896" stop-opacity=".02"/></linearGradient></defs>'
    + '<polygon points="' + area + '" fill="url(#tg)"/>'
    + '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#00C896" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'
    + '<circle cx="' + pts[29].split(',')[0] + '" cy="' + pts[29].split(',')[1] + '" r="4" fill="#00C896" stroke="#fff" stroke-width="1.5"/>';
}

function getStoredHistory() {
  let history = {};
  try {
    const raw = getStorageItem('vihara_step_history');
    if (raw) history = JSON.parse(raw);
  } catch(e) {}
  const todayStr = getLocalDateString();
  if (typeof state.steps === 'number') {
    history[todayStr] = state.steps;
  }
  return history;
}

function getWeekMetrics(history) {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const currentWeekDays = [];
  const prevWeekDays = [];
  
  // This week (Monday to today)
  for (let i = diffToMon; i <= 0; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dateStr = getLocalDateString(d);
    currentWeekDays.push(history[dateStr] || 0);
  }
  
  // Last week (prior 7 days: diffToMon - 7 to diffToMon - 1)
  for (let i = diffToMon - 7; i < diffToMon; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dateStr = getLocalDateString(d);
    prevWeekDays.push(history[dateStr] || 0);
  }

  const thisWeekTotal = currentWeekDays.reduce((a, b) => a + b, 0);
  const lastWeekTotal = prevWeekDays.reduce((a, b) => a + b, 0);
  const thisWeekAvg = Math.round(thisWeekTotal / Math.max(1, currentWeekDays.length));
  const lastWeekAvg = Math.round(lastWeekTotal / 7);

  return { thisWeekTotal, lastWeekTotal, thisWeekAvg, lastWeekAvg, currentDaysCount: currentWeekDays.length };
}

function renderInsights() {
  const history = getStoredHistory();
  const { thisWeekTotal, lastWeekTotal, thisWeekAvg, lastWeekAvg } = getWeekMetrics(history);
  const u = state.unit;

  // 1. Overview Tab - Weekly Summary Cards
  const weekDist = (thisWeekTotal * 0.000762).toFixed(1);
  const weekTime = Math.round(thisWeekTotal / 100);
  const weekCal  = Math.round(thisWeekTotal * 0.04);

  setText('ins-week-steps', fmt(thisWeekTotal));
  setText('ins-week-dist',  weekDist + u);
  setText('ins-week-time',  weekTime + 'min');
  setText('ins-week-cal',   fmt(weekCal));

  const setDeltaUI = (elId, deltaPct, hasPrior) => {
    const e = el(elId);
    if (!e) return;
    if (!hasPrior) {
      if (thisWeekTotal > 0) {
        e.textContent = 'Active tracking';
        e.className = 'isc-delta positive';
      } else {
        e.textContent = '--';
        e.className = 'isc-delta';
      }
      return;
    }
    const sign = deltaPct >= 0 ? '↑ ' : '↓ ';
    e.textContent = sign + Math.abs(deltaPct) + '% vs last week';
    e.className = 'isc-delta ' + (deltaPct >= 0 ? 'positive' : 'negative');
  };

  const hasPrior = lastWeekTotal > 0;
  const deltaPct = hasPrior ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100) : 0;
  setDeltaUI('ins-week-steps-delta', deltaPct, hasPrior);
  setDeltaUI('ins-week-dist-delta',  deltaPct, hasPrior);
  setDeltaUI('ins-week-time-delta',  deltaPct, hasPrior);
  setDeltaUI('ins-week-cal-delta',   deltaPct, hasPrior);

  // 2. Overview Tab - Dynamic Contextual Recommendations
  const rem = Math.max(0, state.stepGoal - state.steps);
  let recs = [];
  if (state.steps === 0) {
    recs = [
      { icon:'👟', title:'Start Your Daily Walk', sub:'Take your first steps today to activate your activity rings.' },
      { icon:'💧', title:'Stay Hydrated', sub:'Drink a glass of water to kickstart your metabolism.' },
      { icon:'📊', title:'Daily Tracking', sub:'Keep your Vihara Band on to record your movement patterns.' },
      { icon:'🌙', title:'Rest & Recovery', sub:'Consistent sleep hygiene improves daily energy levels.' }
    ];
  } else if (rem > 0) {
    recs = [
      { icon:'👟', title:'Keep Moving Forward', sub: fmt(state.steps) + ' steps logged today. ' + fmt(rem) + ' more to reach your goal!' },
      { icon:'⏱️', title:'Quick Active Break', sub:'A brisk 15-minute walk can add over 1,500 steps.' },
      { icon:'💧', title:'Hydration Check', sub:'Remember to rehydrate after brisk walking.' },
      { icon:'📈', title:'Weekly Momentum', sub:'Every step recorded updates your weekly analytics.' }
    ];
  } else {
    recs = [
      { icon:'🏆', title:'Daily Goal Achieved!', sub:'Outstanding! You exceeded your ' + fmt(state.stepGoal) + ' steps goal today.' },
      { icon:'🔥', title:'Streak in Progress', sub:'Keep up this consistent pace to unlock consistency badges.' },
      { icon:'💧', title:'Recovery Hydration', sub:'Replenish fluids and minerals after hitting your target.' },
      { icon:'🌟', title:'Great Habit Building', sub:'Regular daily movement significantly lowers health risks.' }
    ];
  }
  const rc = el('reco-cards');
  if (rc) {
    rc.innerHTML = recs.map(r => '<div class="reco-card"><div class="reco-card__icon">' + r.icon + '</div><div class="reco-card__body"><div class="reco-card__title">' + r.title + '</div><div class="reco-card__sub">' + r.sub + '</div></div></div>').join('');
  }

  // 3. Trends Tab - Week-over-Week
  setText('wow-last-total', fmt(lastWeekTotal));
  setText('wow-last-avg',   'avg steps/day: ' + fmt(lastWeekAvg));
  setText('wow-this-total', fmt(thisWeekTotal));
  setText('wow-this-avg',   'avg steps/day: ' + fmt(thisWeekAvg));
  const wowDeltaEl = el('wow-delta');
  if (wowDeltaEl) {
    if (hasPrior) {
      wowDeltaEl.textContent = (deltaPct >= 0 ? '+' : '') + deltaPct + '%';
      wowDeltaEl.className = 'cmp-delta ' + (deltaPct >= 0 ? 'positive' : 'negative');
    } else if (thisWeekTotal > 0) {
      wowDeltaEl.textContent = 'Active';
      wowDeltaEl.className = 'cmp-delta positive';
    } else {
      wowDeltaEl.textContent = '--';
      wowDeltaEl.className = 'cmp-delta';
    }
  }

  // 4. Trends Tab - Activity Patterns
  // Best Day calculation
  const dayNames = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  const dayTotals = [0, 0, 0, 0, 0, 0, 0];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  Object.keys(history).forEach(dStr => {
    const val = history[dStr];
    if (val > 0) {
      const dayIdx = new Date(dStr + 'T00:00:00').getDay();
      if (!isNaN(dayIdx)) {
        dayTotals[dayIdx] += val;
        dayCounts[dayIdx]++;
      }
    }
  });
  let bestDayIdx = -1, maxDayAvg = 0;
  for (let i = 0; i < 7; i++) {
    if (dayCounts[i] > 0) {
      const avg = Math.round(dayTotals[i] / dayCounts[i]);
      if (avg > maxDayAvg) {
        maxDayAvg = avg;
        bestDayIdx = i;
      }
    }
  }
  if (bestDayIdx !== -1 && maxDayAvg > 0) {
    setText('pat-best-day', dayNames[bestDayIdx] + ' \u2014 you average ' + fmt(maxDayAvg) + ' steps');
  } else {
    setText('pat-best-day', 'Recording steps to determine your best day');
  }

  // Most Active Time
  if (state.activeMinutes > 0) {
    setText('pat-active-time', state.activeMinutes + ' active minutes recorded today');
  } else {
    setText('pat-active-time', 'Sync regularly to detect peak activity hours');
  }

  // Goal Achievement (last 7 days hit rate)
  const last7 = getLast30DaysSteps(history).slice(-7);
  const hitDays = last7.filter(s => s >= state.stepGoal).length;
  if (hitDays > 0) {
    setText('pat-goal-achievement', 'Hit ' + fmt(state.stepGoal) + ' goal ' + hitDays + ' out of last 7 days');
  } else {
    setText('pat-goal-achievement', '0 out of last 7 days reached ' + fmt(state.stepGoal) + ' goal');
  }

  // Badges and Lifetime Stats
  renderBadges();
  renderTrendChart();
}

function calculateStreaks(history) {
  const dates = Object.keys(history).sort();
  if (dates.length === 0) return { current: 0, best: 0 };
  
  const now = new Date();
  let currentStreak = 0;
  // Check backward from today
  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = getLocalDateString(d);
    const steps = history[dateStr] || 0;
    if (steps > 0) {
      currentStreak++;
    } else if (i === 0) {
      // Today might just be starting, allow yesterday's streak to count
      continue;
    } else {
      break;
    }
  }

  let bestStreak = 0;
  let tempStreak = 0;
  dates.forEach(dStr => {
    if ((history[dStr] || 0) > 0) {
      tempStreak++;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  });

  return { current: currentStreak, best: Math.max(bestStreak, currentStreak) };
}

function renderBadges() {
  const history = getStoredHistory();
  const { current: streak, best: bestStreak } = calculateStreaks(history);
  
  setText('streak-count', String(streak));
  setText('streak-best-val', bestStreak + (bestStreak === 1 ? ' day' : ' days'));

  const lifetimeSteps = Object.values(history).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
  const lifetimeDist = (lifetimeSteps * 0.000762).toFixed(1) + ' ' + state.unit;
  const activeDays = Object.values(history).filter(s => s > 0).length;

  setText('life-total-steps', fmt(lifetimeSteps));
  setText('life-total-dist',  lifetimeDist);
  setText('life-band-days',   activeDays + (activeDays === 1 ? ' day' : ' days'));
  setText('life-falls',       String(state.fallCount || 0));
  setText('life-sos',         String(state.sosCount || 0));

  // Dynamically unlock badges based on authentic achievements
  if (lifetimeSteps >= 1000) unlockBadge('step_1k');
  if (lifetimeSteps >= 10000 || state.steps >= 10000) unlockBadge('step_10k');
  if (lifetimeSteps * 0.000762 >= 50) unlockBadge('distance_50');
  if (bestStreak >= 7) unlockBadge('streak_7');
  if (state.calories >= 500) unlockBadge('calorie_500');

  const grid = el('badges-grid');
  if (grid) {
    grid.innerHTML = state.badges.map(b => '<div class="badge-card ' + (b.earned ? 'earned' : 'locked') + '"><div class="bc-emoji">' + b.emoji + '</div><div class="bc-name">' + b.name + '</div><div class="bc-desc">' + b.desc + '</div>' + (b.earned ? '<span class="bc-earned-tag">Earned</span>' : '<span class="bc-locked-tag">Locked</span>') + '</div>').join('');
  }
  setText('earned-count', state.badges.filter(b => b.earned).length + '/' + state.badges.length);
}

function renderDashBadges() {
  const row = el('badges-dash'); if (!row) return;
  row.innerHTML = state.badges.slice(0, 6).map(b => '<div class="badge-mini ' + (b.earned ? 'earned' : 'locked') + '"><div class="bm-icon">' + b.emoji + '</div><div class="bm-name">' + b.name + '</div></div>').join('');
  setText('badge-count-dash', state.badges.filter(b => b.earned).length + '/' + state.badges.length);
}

const UNLOCKED_BADGES_KEY = 'vihara_unlocked_badges';

function loadBadges() {
  try {
    const raw = getStorageItem(UNLOCKED_BADGES_KEY);
    if (raw) {
      const earnedIds = JSON.parse(raw);
      if (Array.isArray(earnedIds)) {
        state.badges.forEach(b => {
          if (earnedIds.includes(b.id)) {
            b.earned = true;
          }
        });
      }
    }
  } catch (e) {
    logDebug('loadBadges error: ' + e.message);
  }
}

function unlockBadge(id) {
  const b = state.badges.find(b => b.id === id);
  if (!b || b.earned) return;
  b.earned = true;
  try {
    const earnedIds = state.badges.filter(x => x.earned).map(x => x.id);
    setStorageItem(UNLOCKED_BADGES_KEY, JSON.stringify(earnedIds));
  } catch (e) {}
  renderBadges();
  renderDashBadges();
  showToast('Badge unlocked: ' + b.name + '!');
}

// SYNC
async function syncData() {
  const btn = el('qa-sync');
  if (btn) {
    btn.style.opacity = '.5';
    btn.style.pointerEvents = 'none';
    const svg = btn.querySelector('svg');
    if (svg) svg.style.animation = 'spin .8s linear infinite';
  }

  const resetSyncBtn = () => {
    if (btn) {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'all';
      const svg = btn.querySelector('svg');
      if (svg) svg.style.animation = '';
    }
  };

  // Real band mode: verify connection
  if (!state.connected || !state.bleDevice) {
    const targetId = state.lastDeviceId || getStorageItem('vihara_last_device_id');
    if (targetId && isNative) {
      showToast('Band disconnected. Reconnecting to sync...');
      attemptAutoReconnect();
    } else {
      showToast('Vihara Band not connected');
    }
    resetSyncBtn();
    return;
  }

  const withTimeout = (promise, ms, desc) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(desc + ' timed out')), ms))
  ]);

  try {
    if (isNative) {
      // 1. Read Step Count from band
      logDebug('Sync: reading steps from device: ' + state.bleDevice.deviceId);
      const stepVal = await withTimeout(
        BleClient.read(state.bleDevice.deviceId, BLE_VIHARA_SERVICE, BLE_STEP_CHAR),
        4000,
        'Step count read'
      );
      applyStepData(stepVal);

      // 2. Read Battery Level (if available)
      try {
        logDebug('Sync: reading battery level...');
        const batVal = await withTimeout(
          BleClient.read(state.bleDevice.deviceId, BLE_BATTERY_SERVICE, BLE_BATTERY_CHAR),
          2000,
          'Battery read'
        );
        const batDv = getRobustDataView(batVal);
        if (batDv && batDv.byteLength >= 1) {
          state.battery = batDv.getUint8(0);
        }
      } catch (batErr) {
        logDebug('Battery sync skipped: ' + batErr.message);
      }
    } else if (state.bleStepChar) {
      // Web Bluetooth read
      const dv = await withTimeout(state.bleStepChar.readValue(), 4000, 'Step count read');
      applyStepData(dv);
    }

    setText('last-sync-lbl', 'Just now');
    saveSteps();
    updateUIForCurrentScreen();
    renderDashboard();
    animateRings();
    showToast('Synced with band');
  } catch (e) {
    logDebug('Sync failed: ' + e.message);
    showToast('Sync failed: ' + e.message);
  } finally {
    resetSyncBtn();
  }
}

// SOS
const SOS_HOLD_MS=3000;
function startSOS(e) {
  if(e) e.preventDefault();
  el('sos-btn')?.classList.add('holding');
  state.sosStart=Date.now();
  state.sosInterval=setInterval(()=>{
    const elapsed=Date.now()-state.sosStart;
    const p=Math.min((elapsed/SOS_HOLD_MS)*100,100);
    const rem=Math.max(0,Math.ceil((SOS_HOLD_MS-elapsed)/1000));
    const pf=el('sos-prog-fill'); if(pf) pf.style.width=p+'%';
    const pl=el('sos-prog-lbl'); if(pl) pl.textContent=rem>0?'Hold for '+rem+' more second'+(rem!==1?'s':'')+'...':'Sending SOS!';
    if(elapsed>=SOS_HOLD_MS){ clearInterval(state.sosInterval); triggerSOS(); }
  },80);
}
function cancelSOS() {
  el('sos-btn')?.classList.remove('holding');
  clearInterval(state.sosInterval);
  const pf=el('sos-prog-fill'); if(pf) pf.style.width='0%';
  const pl=el('sos-prog-lbl'); if(pl) pl.textContent='Hold for 3 seconds to send alert';
}
function cleanPhone(n){ return (n||'').replace(/[^+\d]/g,''); }
function openPhoneAction(url){
  window.location.href = url;
}
function triggerSOS() { cancelSOS(); logAlert('SOS Alert Sent'); el('sos-overlay')?.classList.remove('hidden'); if('vibrate' in navigator) navigator.vibrate([200,100,200,100,400]); unlockBadge('sos_setup'); callEmergency(true); }
function closeSosOverlay() { el('sos-overlay')?.classList.add('hidden'); }
function sendSmsAll(){
  if(state.contacts.length===0){ showToast('Add emergency contacts first'); return; }
  const nums=state.contacts.map(c=>cleanPhone(c.phone)).join(',');
  const msg=(el('sos-message')?.value||'').trim() || '🚨 EMERGENCY: I may have fallen and need help. Automated SOS from my Vihara Band. Please call me immediately.';
  const sms='sms:'+nums+(msg?'?body='+encodeURIComponent(msg):'');
  openPhoneAction(sms);
}

function logAlert(type) {
  const hist=el('alert-history'); if(!hist) return;
  hist.querySelector('.empty-state')?.remove();
  const now=new Date();
  hist.insertAdjacentHTML('afterbegin','<div class="info-row" style="border-bottom:1px solid var(--border)"><div><div style="font-size:13px;font-weight:600;color:var(--red)">'+type+'</div><div style="font-size:11px;color:var(--t3);margin-top:2px">'+now.toLocaleDateString('en-IN',{month:'short',day:'numeric'})+' - '+now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})+' - '+state.contacts.length+' contacts notified</div></div><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg></div>');
}
function saveSosMessage() { const msg=el('sos-message')?.value?.trim(); if(!msg){ showToast('Please enter a message'); return; } unlockBadge('sos_setup'); showToast('SOS message saved'); }
function sendTestAlert() {
  if(state.contacts.length===0){ showToast('Add emergency contacts first'); return; }
  showToast('Test alert sent to '+state.contacts.length+' contact'+(state.contacts.length!==1?'s':''));
  if (state.notifPrefs && state.notifPrefs.sos) {
    sendAppNotification({
      title: '🚨 Vihara SOS Test Alert',
      body: 'Emergency test alert sent to ' + state.contacts.length + ' registered contact(s).',
      channelId: 'vihara-fall-channel',
      id: 101
    });
  }
}


function updateSosModeUI() {
  const testBox = el('sos-test-container');
  const confirmBox = el('sos-confirmation-card');
  const confirmDesc = el('sos-confirmation-desc');

  if (state.simulationMode) {
    if (testBox) testBox.style.display = 'block';
    if (confirmBox) confirmBox.style.display = 'none';
  } else {
    if (testBox) testBox.style.display = 'none';
    if (confirmBox) {
      confirmBox.style.display = 'flex';
      const count = state.contacts.length;
      if (confirmDesc) {
        if (count > 0) {
          const primary = state.contacts.find(c => c.primary) || state.contacts[0];
          confirmDesc.textContent = 'When SOS is activated or a sudden fall is detected by Vihara Band, ' + primary.name + ' will be called immediately and emergency SMS alerts will be sent to all ' + count + ' configured contact(s).';
        } else {
          confirmDesc.textContent = 'Add at least one emergency contact below so Vihara Band can automatically call and dispatch SMS alerts in an emergency.';
        }
      }
    }
  }
}

// CONTACTS
function renderContacts() {
  updateSosModeUI();
  const c=el('contacts-list'); if(!c) return;
  setText('contacts-count',state.contacts.length+'/3');
  c.innerHTML=state.contacts.map(ct=>{
    const ini=ct.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
    return '<div class="contact-card"><div class="contact-avatar">'+ini+'</div><div class="contact-info"><div class="contact-name">'+ct.name+'</div><div class="contact-phone">'+ct.phone+'</div><div class="contact-tags"><span class="contact-rel">'+ct.relation+'</span>'+(ct.primary?'<span class="contact-primary-badge">Primary</span>':'')+'</div></div><button class="contact-del" onclick="removeContact('+ct.id+')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg></button></div>';
  }).join('');
  const ab=el('add-contact-btn'); if(ab) ab.style.display=state.contacts.length>=3?'none':'flex';
  if(state.contacts.length>0) unlockBadge('safety_setup');
}
function showAddContact() { if(state.contacts.length>=3){ showToast('Maximum 3 contacts'); return; } el('inp-name').value=''; el('inp-phone').value=''; el('modal-contact').classList.remove('hidden'); }

async function pickFromContacts() {
  if(!isNative){ showToast('Select from contacts is available in the Android app'); return; }
  try {
    const status = await Contacts.checkPermissions();
    if (status.contacts !== 'granted') {
      const perm = await Contacts.requestPermissions();
      if (perm.contacts !== 'granted') { showToast('Contacts permission denied'); return; }
    }
    const result = await Contacts.pickContact({ projection: { name: true, phones: true, organization: true } });
    const c = result.contact;
    if(!c){ showToast('No contact selected'); return; }
    const name = (c.name && (c.name.display || (c.name.given? (c.name.given + ' ' + (c.name.family||'')).trim() : ''))) || 'Contact';
    const phones = (c.phones||[]).map(p=>p.number).filter(Boolean);
    if(phones.length===0){ showToast('Selected contact has no phone number'); return; }
    el('inp-name').value = name;
    el('inp-phone').value = phones.length===1 ? phones[0] : phones[0];
    if(phones.length>1) showToast('Multiple numbers - using first. Edit if needed.');
    showToast('Contact selected: ' + name);
  } catch(e) {
    logDebug('pickFromContacts error: ' + e.message);
    showToast('Could not open contacts: ' + e.message);
  }
}
function addContact() {
  const name=el('inp-name').value.trim(), phone=el('inp-phone').value.trim();
  const relation=el('inp-relation').value, primary=el('inp-primary').checked;
  if(!name){ showToast('Enter a name'); return; } if(!phone){ showToast('Enter phone number'); return; }
  if(primary) state.contacts.forEach(c=>c.primary=false);
  state.contacts.push({id:Date.now(),name,phone,relation,primary});
  saveContacts(); closeModal('modal-contact'); showToast(name+' added'); unlockBadge('safety_setup');
}
function removeContact(id) { const ct=state.contacts.find(c=>c.id===id); state.contacts=state.contacts.filter(c=>c.id!==id); saveContacts(); if(ct) showToast(ct.name+' removed'); }

// FALL DETECTION
function toggleFall(input) {
  state.fallEnabled=input.checked;
  const hero=el('fall-hero'), title=el('fall-hero-title'), sub=el('fall-hero-sub');
  if(state.fallEnabled){ hero?.classList.remove('disabled'); if(title) title.textContent='Fall Detection Active'; if(sub) sub.textContent='Monitoring for sudden impacts'; showToast('Fall detection enabled'); }
  else { hero?.classList.add('disabled'); if(title) title.textContent='Fall Detection Off'; if(sub) sub.textContent='Enable to monitor for falls'; showToast('Fall detection disabled'); }
}
function setSens(btn,level) {
  document.querySelectorAll('.sens-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); state.sensitivity=level;
  setText('sens-desc',{Low:'Detects major falls only.',Medium:'Detects significant falls. Recommended.',High:'High sensitivity for elderly users.'}[level]);
  showToast('Sensitivity: '+level);
}
function simulateFall() { if(!state.fallEnabled){ showToast('Enable fall detection first'); return; } showToast('Simulating fall alert...'); setTimeout(triggerFallAlert,800); }

function triggerFallAlert() {
  const overlay=el('fall-alert-overlay'); if(!overlay) return;
  if (state.notifPrefs && state.notifPrefs.fall) {
    sendAppNotification({
      title: '⚠️ Fall Detected by Vihara Band!',
      body: 'Sudden fall impact detected. 60-second emergency countdown initiated.',
      channelId: 'vihara-fall-channel',
      id: 102
    });
  }
  overlay.classList.remove('hidden');
  state.fallAlertCountdown=60;
  const fill=el('fa-countdown-fill'); if(fill) fill.style.width='100%';
  if('vibrate' in navigator) navigator.vibrate([300,100,300]);
  updateFallCountdown();
  state.fallAlertTimer=setInterval(()=>{ state.fallAlertCountdown--; updateFallCountdown(); if(state.fallAlertCountdown<=0){ clearInterval(state.fallAlertTimer); autoSendFallAlert(); } },1000);
}
function updateFallCountdown() { setText('fa-countdown',state.fallAlertCountdown); const fill=el('fa-countdown-fill'); if(fill) fill.style.width=((state.fallAlertCountdown/60)*100)+'%'; }
function cancelFallAlert() { clearInterval(state.fallAlertTimer); el('fall-alert-overlay')?.classList.add('hidden'); showToast('False alarm cancelled - you are safe!'); }

function autoSendFallAlert() {
  el('fall-alert-overlay')?.classList.add('hidden'); state.fallCount++;
  if (state.notifPrefs && state.notifPrefs.fall) {
    sendAppNotification({
      title: '🚨 Emergency Fall Alert Dispatched',
      body: 'Automated emergency SMS/call triggered to your primary contact.',
      channelId: 'vihara-fall-channel',
      id: 103
    });
  }
  setText('fall-count',state.fallCount+' this month');
  const fevents=el('fall-events');
  if(fevents){
    fevents.querySelector('.empty-state')?.remove();
    const now=new Date();
    fevents.insertAdjacentHTML('afterbegin','<div class="info-row" style="border-bottom:1px solid var(--border)"><div><div style="font-size:13px;font-weight:600;color:var(--yellow)">Fall Detected</div><div style="font-size:11px;color:var(--t3);margin-top:2px">'+now.toLocaleDateString('en-IN',{month:'short',day:'numeric'})+' - '+now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})+' - Alert to '+state.contacts.length+' contacts</div></div><span style="font-size:11px;color:var(--red);font-weight:600">Auto</span></div>');
  }
  logAlert('Fall Alert Sent'); showToast('Fall alert sent to contacts!');
}
function callEmergency(auto) {
  const p=state.contacts.find(c=>c.primary)||state.contacts[0];
  if(!p){ showToast('No contacts configured'); return; }
  cancelFallAlert();
  if(auto){ logDebug('SOS: auto-calling primary contact '+p.name); }
  showToast('Calling '+p.name+'...');
  openPhoneAction('tel:'+cleanPhone(p.phone));
}

// DEVICE
function pickLED(btn) { document.querySelectorAll('.led-swatch').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); state.ledColor=btn.dataset.color; updateDeviceLED(state.ledColor); showToast('LED color updated'); }
function updateDeviceLED(color) { ['dev-led','pairing-led'].forEach(id=>{ const e=el(id); if(!e) return; e.style.background=color; e.style.boxShadow='0 0 10px '+color; }); }
function confirmUnpair() { el('modal-unpair')?.classList.remove('hidden'); }
function unpairDevice() {
  closeModal('modal-unpair');
  document.querySelectorAll('.scroll-area').forEach(sa => { sa.scrollTop = 0; });
  if (isNative) {
    try {
      Capacitor.Plugins.ViharaBackground?.stopService().catch(() => {});
    } catch(e) {}
  }
  if (state.simulationMode) {
    state.simulationMode = false;
    const savedRaw = getStorageItem(USER_PROFILE_KEY);
    let realProfile = null;
    if (savedRaw) {
      try { realProfile = JSON.parse(savedRaw); } catch(e) {}
    }
    if (!realProfile && state.preDemoProfile) {
      realProfile = state.preDemoProfile;
    }
    if (realProfile && (realProfile.loggedIn || realProfile.googleLinked)) {
      state.userProfile = realProfile;
    }
    renderUserProfile();
  }
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }
  state.isReconnecting = false;
  state.lastDeviceId = null;
  state.lastDeviceName = null;
  removeStorageItem('vihara_last_device_id');
  removeStorageItem('vihara_last_device_name');

  if (state.bleDevice) {
    if (isNative) {
      BleClient.disconnect(state.bleDevice.deviceId).catch(console.error);
    } else if (state.bleDevice.gatt && state.bleDevice.gatt.connected) {
      state.bleDevice.gatt.disconnect();
    }
  }
  
  state.connected = false; 
  state.bleDevice = null; 
  state.todayBaselineSteps = null; 
  removeStorageItem('vihara_today_baseline'); 
  removeStorageItem('vihara_today_baseline_' + getLocalDateString()); 
  
  // Reset screen so subsequent connection lands on main dashboard, not Settings
  state.currentScreen = 'dashboard';
  showScreen('dashboard', true);

  updateConnectionUI();
  const app = el('main-app'); 
  if (app) {
    app.classList.add('hidden'); 
    app.style.opacity = '';
  }
  const pairing = el('screen-pairing'); 
  if (pairing) {
    pairing.classList.remove('hidden'); 
    pairing.classList.add('active'); 
    pairing.style.opacity = '1';
    pairing.style.pointerEvents = 'all';
    pairing.style.transition = '';
  }
  
  const pairScan = el('pair-state-scan');
  const pairConnecting = el('pair-state-connecting');
  if (pairScan) pairScan.classList.remove('hidden');
  if (pairConnecting) pairConnecting.classList.add('hidden');
  
  startPairingSequence(); 
}

// THEME
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('vihara-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#F2F3F7' : '#0A0A0F');
  el('theme-dark-btn')?.classList.toggle('active', theme === 'dark');
  el('theme-light-btn')?.classList.toggle('active', theme === 'light');
  showToast(theme === 'dark' ? 'Dark theme' : 'Light theme');
}
function loadTheme() {
  const saved = localStorage.getItem('vihara-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', saved === 'light' ? '#F2F3F7' : '#0A0A0F');
  requestAnimationFrame(() => {
    el('theme-dark-btn')?.classList.toggle('active', saved === 'dark');
    el('theme-light-btn')?.classList.toggle('active', saved === 'light');
  });
}

// SETTINGS
function setUnit(unit) { state.unit=unit; el('u-km')?.classList.toggle('active',unit==='km'); el('u-mi')?.classList.toggle('active',unit==='mi'); renderDashboard(); showToast('Units: '+(unit==='km'?'Metric':'Imperial')); }
function updateGoal(val) { const g=Math.max(1000,Math.min(50000,parseInt(val)||10000)); state.stepGoal=g; setText('ring-step-goal','/ '+fmt(g)+' goal'); renderDashboard(); animateRings(); showToast('Step goal: '+fmt(g)); }
async function exportCSV() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let csv = 'Day,Steps,Distance (km),Calories (kcal),Active Time (min)\n';

  if (Array.isArray(state.weeklySteps) && state.weeklySteps.length > 0) {
    state.weeklySteps.forEach((s, i) => {
      const dayName = days[i] || `Day ${i + 1}`;
      const km = (s * 0.000762).toFixed(2);
      const kcal = Math.round(s * 0.04);
      const mins = Math.round(s * 0.005);
      csv += `${dayName},${s},${km},${kcal},${mins}\n`;
    });
  } else {
    const km = (state.steps * 0.000762).toFixed(2);
    const kcal = Math.round(state.steps * 0.04);
    const mins = Math.round(state.steps * 0.005);
    csv += `Today,${state.steps},${km},${kcal},${mins}\n`;
  }

  const fileName = `vihara_activity_${getLocalDateString()}.csv`;

  if (isNative) {
    try {
      showToast('Preparing activity CSV...');

      // 1. Write file to Cache directory (allows sharing cleanly without scoped storage limits)
      const fileResult = await Filesystem.writeFile({
        path: fileName,
        data: csv,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      // 2. Also save to Documents directory so it persists on user's device
      try {
        await Filesystem.writeFile({
          path: fileName,
          data: csv,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
      } catch (docErr) {
        logDebug('Documents dir write notice: ' + docErr.message);
      }

      // 3. Open Android Native Share Sheet (Save to Downloads, Drive, WhatsApp, Files, etc.)
      await Share.share({
        title: 'Vihara Band Activity Data',
        text: 'Vihara Band fitness activity export',
        url: fileResult.uri,
        dialogTitle: 'Save or Share Activity CSV'
      });

      showToast('Activity CSV ready to save or share!');
    } catch (err) {
      logDebug('Native CSV export notice: ' + (err && err.message ? err.message : err));
      const msg = err && err.message ? err.message.toLowerCase() : '';
      if (msg.includes('cancel') || msg.includes('abort') || msg.includes('dismiss')) {
        showToast('Activity CSV saved to device.');
      } else {
        showToast('CSV export saved to device documents.');
      }
    }
  } else {
    // Web Browser fallback
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Activity exported as CSV');
  }
}

// MODALS & TOAST
function closeModal(id) {
  el(id)?.classList.add('hidden');
  if (id === 'modal-profile' && (!state.userProfile || !state.userProfile.completedSetup)) {
    state.isOnboarding = false;
    showWelcomeScreen();
  }
}
function overlayClose(event,id) { if(event.target===el(id)) closeModal(id); }
function showToast(msg) {
  const toast=el('toast'), text=el('toast-msg'); if(!toast||!text) return;
  clearTimeout(state.toastTimer); text.textContent=msg;
  toast.classList.remove('hidden'); requestAnimationFrame(()=>toast.classList.add('show'));
  state.toastTimer=setTimeout(()=>{ toast.classList.remove('show'); setTimeout(()=>toast.classList.add('hidden'),300); },2600);
}

// UTILS
function el(id) { return document.getElementById(id); }
function setText(id,v) { const e=el(id); if(e) e.textContent=v; }
function setHTML(id,v) { const e=el(id); if(e) e.innerHTML=v; }
function cssVar(id,p,v){ const e=el(id); if(e) e.style.setProperty(p,v); }
function fmt(n) { return String(Math.round(n)); }
function pct(v,max) { return Math.min(Math.round((v/max)*100),100); }
function randInt(min,max) { return Math.floor(Math.random()*(max-min+1))+min; }

let tapCount = 0;
function handleLogoTap() {
  tapCount++;
  if (tapCount >= 5) {
    tapCount = 0;
    const consoleEl = el('debug-console');
    if (consoleEl) {
      consoleEl.style.display = consoleEl.style.display === 'none' ? 'block' : 'none';
      logDebug('Developer Debug Console toggled.');
    }
  }
}
function logDebug(msg) {
  console.log('[DEBUG]', msg);
  const container = el('debug-logs');
  if (container) {
    const time = new Date().toLocaleTimeString('en-IN', { hour12: false });
    container.insertAdjacentHTML('beforeend', `<div style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 2px;">[${time}] ${msg}</div>`);
    const consoleEl = el('debug-console');
    if (consoleEl) consoleEl.scrollTop = consoleEl.scrollHeight;
  }
}

// Expose functions globally to window so that index.html's inline event handlers work with ES module scoping
window.addContact = addContact;
window.callEmergency = callEmergency;
window.sendSmsAll = sendSmsAll;
window.pickFromContacts = pickFromContacts;
window.cancelFallAlert = cancelFallAlert;
window.cancelSOS = cancelSOS;
window.closeModal = closeModal;
window.closeSosOverlay = closeSosOverlay;
window.confirmUnpair = confirmUnpair;
window.startInlineScan = startInlineScan;
window.connectToScannedDevice = connectToScannedDevice;
window.exportCSV = exportCSV;
window.overlayClose = overlayClose;
window.pickLED = pickLED;
window.saveSosMessage = saveSosMessage;
window.sendTestAlert = sendTestAlert;
window.setSens = setSens;
window.setTheme = setTheme;
window.setUnit = setUnit;
window.showAddContact = showAddContact;
window.showScreen = showScreen;
window.showToast = showToast;
window.simulateFall = simulateFall;
window.startSOS = startSOS;
window.switchTab = switchTab;
window.syncData = syncData;
window.toggleFall = toggleFall;
window.unpairDevice = unpairDevice;
window.updateGoal = updateGoal;
window.handleLogoTap = handleLogoTap;
window.logDebug = logDebug;
window.launchMainApp = launchMainApp;
window.removeContact = removeContact;
window.requestEnableBluetooth = requestEnableBluetooth;
window.openProfileModal = openProfileModal;
window.saveProfileFromModal = saveProfileFromModal;
window.jumpToProfileSection = jumpToProfileSection;
window.setAgePreset = setAgePreset;

window.onProfileInputChange = onProfileInputChange;
window.onBodyMetricsChange = onBodyMetricsChange;
window.setGoalPreset = setGoalPreset;
window.adjustStepGoal = adjustStepGoal;
window.onStepGoalInputChange = onStepGoalInputChange;
window.loginWithGoogle = loginWithGoogle;
window.loginAsGuest = loginAsGuest;
window.proceedToOnboarding = proceedToOnboarding;
window.signOutUser = signOutUser;
window.navigateToDashboard = navigateToDashboard;
window.showWelcomeScreen = showWelcomeScreen;
window.showPairingScreen = showPairingScreen;
window.enterDemoMode = enterDemoMode;
window.onNotificationToggleChange = onNotificationToggleChange;
window.requestBatteryOptimization = requestBatteryOptimization;
