import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { PushNotifications } from '@capacitor/push-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Network } from '@capacitor/network';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';

export class MobileServices {
  static isNative = Capacitor.isNativePlatform();

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
          console.log('Push registration success, token: ' + token.value);
          // Store token in your backend
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

        // Listen for notification actions
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push action performed: ', notification);
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

    Keyboard.addListener('keyboardWillShow', info => {
      document.body.style.transform = `translateY(-${info.keyboardHeight}px)`;
    });

    Keyboard.addListener('keyboardWillHide', () => {
      document.body.style.transform = 'translateY(0px)';
    });
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
}