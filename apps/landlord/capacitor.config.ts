import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mzanzihomes.landlord',
  appName: 'MzanziHomes Landlord',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT_CONTENT",
      backgroundColor: "#1E40AF",
    },
    Keyboard: {
      resize: "native",
      style: "dark",
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Camera: {
      permissions: {
        camera: "Camera access is required to take photos of properties and documents.",
        photos: "Photo library access is required to select images."
      }
    },
    Geolocation: {
      permissions: {
        location: "Location access is required to find properties near you."
      }
    }
  }
};

export default config;
