import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { PushNotifications } from '@capacitor/push-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Network } from '@capacitor/network';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@mzanzihomes/supabase/client';

export class MobileServices {
  static isNative = Capacitor.isNativePlatform();
  private static pendingPushToken: string | null = null;

  // Upsert the FCM device token against the signed-in user. If nobody is
  // signed in yet (registration fires at app boot), the token is held and
  // synced on the next sign-in.
  static async savePushToken(token: string) {
    this.pendingPushToken = token;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // push_tokens is newer than the generated Database types
      await (supabase as any).from('push_tokens').upsert(
        {
          user_id: user.id,
          token,
          platform: Capacitor.getPlatform(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      );
      console.log('Push token saved for user', user.id);
    } catch (error) {
      console.error('Failed to save push token:', error);
    }
  }

  // Initialize mobile services
  static async initialize() {
    if (!this.isNative) return;

    try {
      // Hide splash screen after app loads
      await SplashScreen.hide();

      // Initialize status bar
      await this.initializeStatusBar();

      // Initialize push notifications
      await this.initializePushNotifications();

      // Initialize keyboard handling
      this.initializeKeyboard();

      console.log('Mobile services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize mobile services:', error);
    }
  }

  // Camera Services
  static async takePhoto(source: CameraSource = CameraSource.Camera) {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: source,
        saveToGallery: source === CameraSource.Camera,
      });

      return {
        success: true,
        imageUrl: image.webPath,
        format: image.format
      };
    } catch (error) {
      console.error('Camera error:', error);
      return { success: false, error: error };
    }
  }

  static async selectFromGallery() {
    return this.takePhoto(CameraSource.Photos);
  }

  // Geolocation Services
  static async getCurrentLocation() {
    try {
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      return {
        success: true,
        latitude: coordinates.coords.latitude,
        longitude: coordinates.coords.longitude,
        accuracy: coordinates.coords.accuracy
      };
    } catch (error) {
      console.error('Geolocation error:', error);
      return { success: false, error: error };
    }
  }

  static async watchLocation(callback: (position: any) => void) {
    try {
      const watchId = await Geolocation.watchPosition({
        enableHighAccuracy: true,
        timeout: 10000
      }, callback);

      return watchId;
    } catch (error) {
      console.error('Watch location error:', error);
      return null;
    }
  }

  // Push Notifications
  static async initializePushNotifications() {
    if (!this.isNative) return;

    try {
      // Request permission
      const permission = await PushNotifications.requestPermissions();
      
      if (permission.receive === 'granted') {
        // Register for push notifications
        await PushNotifications.register();

        // Listen for registration
        PushNotifications.addListener('registration', (token) => {
          console.log('Push registration success');
          void this.savePushToken(token.value);
        });

        // Listen for registration errors
        PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error: ', error);
        });

        // Listen for push notifications
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push received: ', notification);
          this.vibrate();
        });

        // Tapping a chat notification opens that conversation
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const data: any = action.notification?.data || {};
          if (data.type === 'chat_message' && data.conversation_id) {
            window.location.href = `/messages?c=${encodeURIComponent(data.conversation_id)}`;
          }
        });

        // Registration can beat sign-in at app boot: sync the held token
        // whenever a user signs in, and drop their token on sign-out.
        supabase.auth.onAuthStateChange((event) => {
          if (event === 'SIGNED_IN' && this.pendingPushToken) {
            void this.savePushToken(this.pendingPushToken);
          }
          if (event === 'SIGNED_OUT' && this.pendingPushToken) {
            void (supabase as any).from('push_tokens').delete().eq('token', this.pendingPushToken);
          }
        });
      }
    } catch (error) {
      console.error('Push notification initialization error:', error);
    }
  }

  // Status Bar
  static async initializeStatusBar() {
    if (!this.isNative) return;

    try {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#1E40AF' });
      await StatusBar.show();
    } catch (error) {
      console.error('Status bar error:', error);
    }
  }

  static async setStatusBarLight() {
    if (!this.isNative) return;
    await StatusBar.setStyle({ style: Style.Light });
  }

  static async setStatusBarDark() {
    if (!this.isNative) return;
    await StatusBar.setStyle({ style: Style.Dark });
  }

  // Keyboard
  static initializeKeyboard() {
    if (!this.isNative) return;

    // The Capacitor Keyboard plugin is configured with resize: "body", which
    // already shrinks the viewport to make room for the keyboard. We must NOT
    // also translate the body up — that double-compensates and pushes fixed
    // headers (e.g. the chat name bar) off the top of the screen. Layouts that
    // need to react to the keyboard use the visualViewport API instead.
  }

  // Haptic Feedback
  static async vibrate(style: ImpactStyle = ImpactStyle.Medium) {
    if (!this.isNative) return;

    try {
      await Haptics.impact({ style });
    } catch (error) {
      console.error('Haptic feedback error:', error);
    }
  }

  static async vibrateLight() {
    await this.vibrate(ImpactStyle.Light);
  }

  static async vibrateHeavy() {
    await this.vibrate(ImpactStyle.Heavy);
  }

  // Network Status
  static async getNetworkStatus() {
    try {
      const status = await Network.getStatus();
      return {
        connected: status.connected,
        connectionType: status.connectionType
      };
    } catch (error) {
      console.error('Network status error:', error);
      return { connected: true, connectionType: 'unknown' };
    }
  }

  static onNetworkChange(callback: (status: any) => void) {
    Network.addListener('networkStatusChange', callback);
  }

  // Check if running on mobile device
  static isMobile() {
    return this.isNative;
  }

  // Check platform
  static getPlatform() {
    return Capacitor.getPlatform();
  }

  static isIOS() {
    return Capacitor.getPlatform() === 'ios';
  }

  static isAndroid() {
    return Capacitor.getPlatform() === 'android';
  }

  // Convert URL to File object
  static async urlToFile(url: string, filename: string): Promise<File> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new File([blob], filename, { type: blob.type });
    } catch (error) {
      console.error('URL to File conversion error:', error);
      throw error;
    }
  }

  // Biometric Authentication
  static async isBiometricAvailable(): Promise<boolean> {
    if (!this.isNative) return false;
    
    try {
      // Simplified check - in production, use @capacitor-community/biometric-auth
      return this.isIOS() || this.isAndroid();
    } catch (error) {
      console.error('Biometric availability check failed:', error);
      return false;
    }
  }

  static async authenticateWithBiometric(): Promise<{ success: boolean; error?: string }> {
    if (!this.isNative) return { success: false, error: 'Not on native platform' };
    
    try {
      // Simplified implementation - in production, use @capacitor-community/biometric-auth
      // For now, simulate success on native platforms
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    } catch (error: any) {
      console.error('Biometric authentication failed:', error);
      return { success: false, error: error.message || 'Authentication failed' };
    }
  }

  // Enhanced Permissions
  static async requestCameraPermissions(): Promise<boolean> {
    if (!this.isNative) return true;
    
    try {
      const permissions = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
      return permissions.camera === 'granted' && permissions.photos === 'granted';
    } catch (error) {
      console.error('Camera permission request failed:', error);
      return false;
    }
  }

  static async requestNotificationPermissions(): Promise<boolean> {
    if (!this.isNative) return true;
    
    try {
      const result = await PushNotifications.requestPermissions();
      return result.receive === 'granted';
    } catch (error) {
      console.error('Notification permission request failed:', error);
      return false;
    }
  }

  // Status Bar Enhancements
  static async setStatusBarBackground(color: string) {
    if (!this.isNative) return;
    
    try {
      await StatusBar.setBackgroundColor({ color });
    } catch (error) {
      console.error('Failed to set status bar background:', error);
    }
  }

  // Keyboard Events
  static onKeyboardShow(callback: (info: any) => void) {
    if (this.isNative) {
      Keyboard.addListener('keyboardWillShow', callback);
    }
  }

  static onKeyboardHide(callback: () => void) {
    if (this.isNative) {
      Keyboard.addListener('keyboardWillHide', callback);
    }
  }
}