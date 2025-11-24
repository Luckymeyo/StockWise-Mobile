/**
 * Barcode Scanner Screen
 * Uses react-native-vision-camera with code scanner
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../styles/colors';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';

export default function BarcodeScannerScreen({ navigation, route }) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(true);

  const { onScan } = route.params || {};

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    try {
      const permission = await Camera.requestCameraPermission();
      
      if (permission === 'granted') {
        setHasPermission(true);
      } else if (permission === 'denied') {
        Alert.alert(
          'Izin Kamera Ditolak',
          'Aplikasi membutuhkan akses kamera untuk scan barcode. Silakan aktifkan di pengaturan.',
          [
            { text: 'Batal', onPress: () => navigation.goBack() },
            { 
              text: 'Buka Pengaturan', 
              onPress: () => Linking.openSettings() 
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      Alert.alert(
        'Error',
        'Gagal meminta izin kamera',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  const handleBarcodeScanned = (barcode) => {
    if (!isScanning) return;

    setIsScanning(false);

    Alert.alert(
      'Barcode Terdeteksi',
      `Barcode: ${barcode}`,
      [
        {
          text: 'Scan Ulang',
          onPress: () => setIsScanning(true),
        },
        {
          text: 'Gunakan',
          onPress: () => {
            if (onScan) {
              onScan(barcode);
            }
            navigation.goBack();
          },
        },
      ]
    );
  };

  // Code scanner configuration
  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8', 'code-128', 'code-39', 'code-93', 'codabar', 'itf', 'upc-a', 'upc-e'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && isScanning) {
        handleBarcodeScanned(codes[0].value);
      }
    },
  });

  const device = useCameraDevice('back');

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.cardBlue} />
          <Text style={styles.loadingText}>Meminta izin kamera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>❌ Kamera tidak tersedia</Text>
          <Text style={styles.errorSubtext}>Perangkat tidak memiliki kamera belakang</Text>
          <TouchableOpacity
            style={styles.backButtonError}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonErrorText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        {/* Actual Camera View */}
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          codeScanner={codeScanner}
        />

        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backIcon}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Scan Barcode</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Scanning frame */}
          <View style={styles.scanFrame}>
            <View style={styles.frameCorner}  styles ={[styles.frameCorner, styles.topLeft]} />
            <View style={[styles.frameCorner, styles.topRight]} />
            <View style={[styles.frameCorner, styles.bottomLeft]} />
            <View style={[styles.frameCorner, styles.bottomRight]} />
            
            {isScanning && (
              <View style={styles.scanLine} />
            )}
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructions}>
              Arahkan kamera ke barcode produk
            </Text>
            <Text style={styles.subInstructions}>
              Pastikan barcode terlihat jelas dan tidak buram
            </Text>
          </View>

          {/* Manual input option */}
          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => {
              navigation.goBack();
            }}
          >
            <Text style={styles.manualText}>Input Manual</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorSubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButtonError: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: Colors.cardBlue,
    borderRadius: 8,
    marginTop: 16,
  },
  backButtonErrorText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  placeholderText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  placeholderSubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '300',
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  scanFrame: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    width: '80%',
    height: 250,
  },
  frameCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.cardBlue,
    shadowColor: Colors.cardBlue,
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  instructions: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subInstructions: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  manualButton: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  manualText: {
    color: Colors.textDark,
    fontSize: 16,
    fontWeight: '600',
  },
});