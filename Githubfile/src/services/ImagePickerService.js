import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { Alert } from 'react-native';
import { requestCameraPermission, requestGalleryPermission } from '../utils/permissions';

const imagePickerOptions = {
  mediaType: 'photo',
  quality: 0.8,
  maxWidth: 1024,
  maxHeight: 1024,
  includeBase64: false,
  saveToPhotos: false,
};

/**
 * Take photo using camera
 */
export async function takePhoto() {
  try {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Izin Ditolak', 'Aplikasi memerlukan akses kamera untuk mengambil foto produk');
      return null;
    }

    const result = await launchCamera(imagePickerOptions);

    if (result.didCancel) {
      return null;
    }

    if (result.errorCode) {
      Alert.alert('Error', 'Gagal mengambil foto: ' + result.errorMessage);
      return null;
    }

    if (result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }

    return null;
  } catch (error) {
    console.error('Error taking photo:', error);
    Alert.alert('Error', 'Gagal mengambil foto');
    return null;
  }
}

/**
 * Choose photo from gallery
 */
export async function chooseFromGallery() {
  try {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) {
      Alert.alert('Izin Ditolak', 'Aplikasi memerlukan akses galeri untuk memilih foto produk');
      return null;
    }

    const result = await launchImageLibrary(imagePickerOptions);

    if (result.didCancel) {
      return null;
    }

    if (result.errorCode) {
      Alert.alert('Error', 'Gagal memilih foto: ' + result.errorMessage);
      return null;
    }

    if (result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }

    return null;
  } catch (error) {
    console.error('Error choosing photo:', error);
    Alert.alert('Error', 'Gagal memilih foto');
    return null;
  }
}

/**
 * Show action sheet to choose camera or gallery
 */
export function showImagePickerOptions(onPhotoSelected) {
  Alert.alert(
    'Pilih Foto Produk',
    'Ambil foto baru atau pilih dari galeri?',
    [
      {
        text: 'Batal',
        style: 'cancel',
      },
      {
        text: '📷 Ambil Foto',
        onPress: async () => {
          const uri = await takePhoto();
          if (uri) onPhotoSelected(uri);
        },
      },
      {
        text: '🖼️ Pilih dari Galeri',
        onPress: async () => {
          const uri = await chooseFromGallery();
          if (uri) onPhotoSelected(uri);
        },
      },
    ],
    { cancelable: true }
  );
}
