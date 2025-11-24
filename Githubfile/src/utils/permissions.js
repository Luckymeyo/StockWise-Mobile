import { Platform, PermissionsAndroid, Alert } from 'react-native';

export async function requestCameraPermission() {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Izin Kamera',
          message: 'StockWise memerlukan akses kamera untuk mengambil foto produk',
          buttonNeutral: 'Tanya Nanti',
          buttonNegative: 'Tolak',
          buttonPositive: 'Izinkan',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  return true;
}

export async function requestGalleryPermission() {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 33) {
      // Android 13+ uses READ_MEDIA_IMAGES
      try {
        const granted = await PermissionsAndroid.request(
          'android.permission.READ_MEDIA_IMAGES',
          {
            title: 'Izin Galeri',
            message: 'StockWise memerlukan akses galeri untuk memilih foto produk',
            buttonNeutral: 'Tanya Nanti',
            buttonNegative: 'Tolak',
            buttonPositive: 'Izinkan',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else {
      // Android 12 and below use READ_EXTERNAL_STORAGE
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Izin Galeri',
            message: 'StockWise memerlukan akses galeri untuk memilih foto produk',
            buttonNeutral: 'Tanya Nanti',
            buttonNegative: 'Tolak',
            buttonPositive: 'Izinkan',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
  }
  return true;
}
