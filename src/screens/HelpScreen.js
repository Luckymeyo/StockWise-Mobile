/**
 * Help & FAQ Screen - StockWise Mobile
 * Comprehensive help documentation for UMKM users in Indonesian
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import Colors from '../styles/colors';

export default function HelpScreen({ navigation }) {
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const faqData = [
    {
      id: 'getting-started',
      icon: '🚀',
      title: 'Memulai',
      questions: [
        {
          q: 'Bagaimana cara menambah produk baru?',
          a: '1. Buka tab Inventory (🏬)\n2. Tekan tombol + di kanan bawah\n3. Isi informasi produk (nama, harga, stok minimum)\n4. Opsional: Ambil foto produk dengan kamera\n5. Tekan "Simpan Produk"',
        },
        {
          q: 'Apa itu stok minimum?',
          a: 'Stok minimum adalah batas terendah jumlah stok produk. Jika stok produk Anda turun di bawah angka ini, sistem akan mengirim notifikasi peringatan agar Anda bisa restok tepat waktu.',
        },
        {
          q: 'Apakah aplikasi perlu internet?',
          a: 'TIDAK! StockWise bekerja 100% offline. Semua data tersimpan di HP Anda. Anda hanya perlu internet jika ingin berbagi file backup ke cloud (Google Drive, WhatsApp, dll).',
        },
      ],
    },
    {
      id: 'stock-management',
      icon: '📦',
      title: 'Kelola Stok',
      questions: [
        {
          q: 'Bagaimana cara stok masuk (restok)?',
          a: '1. Buka detail produk yang ingin di-restok\n2. Tekan tombol "Stok Masuk"\n3. Masukkan jumlah dan harga beli\n4. Opsional: Tambahkan tanggal kadaluarsa untuk produk makanan/minuman\n5. Tekan "Simpan"',
        },
        {
          q: 'Bagaimana cara stok keluar (jual)?',
          a: '1. Buka detail produk\n2. Tekan tombol "Stok Keluar"\n3. Masukkan jumlah barang yang terjual dan harga jual\n4. Tekan "Simpan"\n\nTip: Sistem otomatis menghitung profit dari setiap penjualan!',
        },
        {
          q: 'Apa itu batch tracking?',
          a: 'Batch tracking membantu Anda melacak produk berdasarkan tanggal masuk dan tanggal kadaluarsa. Ini sangat berguna untuk produk makanan/minuman agar Anda tahu batch mana yang harus dijual duluan (sistem FIFO - First In First Out).',
        },
        {
          q: 'Bagaimana melihat riwayat transaksi produk?',
          a: 'Buka detail produk, lalu scroll ke bawah. Anda akan melihat semua riwayat stok masuk dan keluar untuk produk tersebut, lengkap dengan tanggal, jumlah, dan saldo stok.',
        },
      ],
    },
    {
      id: 'barcode',
      icon: '📱',
      title: 'Barcode',
      questions: [
        {
          q: 'Bagaimana cara scan barcode?',
          a: '1. Saat menambah produk baru, tekan ikon kamera/scan di kolom barcode\n2. Arahkan kamera ke barcode produk\n3. Sistem akan otomatis membaca dan mengisi kode barcode\n4. Tekan "Gunakan Kode" untuk menyimpan',
        },
        {
          q: 'Bisa bikin label barcode sendiri?',
          a: 'YA! Untuk produk tanpa barcode:\n1. Buka detail produk\n2. Tekan tombol "Label Barcode"\n3. Aplikasi akan membuat barcode unik\n4. Screenshot atau print label tersebut\n5. Tempel di produk Anda',
        },
        {
          q: 'Kamera tidak bisa buka, kenapa?',
          a: 'Pastikan Anda sudah mengizinkan akses kamera:\n1. Buka Pengaturan HP → Apps → StockWise\n2. Pilih Permissions/Izin\n3. Aktifkan Camera/Kamera\n4. Restart aplikasi',
        },
      ],
    },
    {
      id: 'notifications',
      icon: '🔔',
      title: 'Notifikasi',
      questions: [
        {
          q: 'Apa saja jenis notifikasi yang ada?',
          a: '1. Stok Rendah - Peringatan jika stok produk di bawah minimum\n2. Hampir Kadaluarsa - Peringatan 7 hari sebelum produk kadaluarsa\n3. Sudah Kadaluarsa - Peringatan produk yang sudah lewat tanggal kadaluarsa',
        },
        {
          q: 'Bagaimana mengatur notifikasi?',
          a: 'Buka menu Pengaturan (⚙️) → Pengaturan Notifikasi\n\nAnda bisa aktif/nonaktifkan:\n- Notifikasi Stok Rendah\n- Notifikasi Kadaluarsa',
        },
        {
          q: 'Notifikasi tidak muncul, kenapa?',
          a: 'Pastikan:\n1. Notifikasi sudah diaktifkan di Settings aplikasi\n2. Notifikasi StockWise tidak diblokir di pengaturan HP\n3. Mode hemat baterai tidak membatasi aplikasi\n\nCara cek: Pengaturan HP → Apps → StockWise → Notifications → Izinkan semua',
        },
      ],
    },
    {
      id: 'backup',
      icon: '💾',
      title: 'Backup & Restore',
      questions: [
        {
          q: 'Bagaimana cara backup data?',
          a: '1. Buka tab Management (📋)\n2. Tekan tombol menu (⋮) di kanan atas\n3. Pilih "Backup Database"\n4. File backup akan tersimpan di folder aplikasi\n5. Anda bisa share file ini ke Google Drive, WhatsApp, dll untuk backup online',
        },
        {
          q: 'Seberapa sering harus backup?',
          a: 'REKOMENDASI:\n- Backup MINGGUAN jika transaksi banyak (>50/hari)\n- Backup BULANAN jika transaksi sedikit\n- Backup SEGERA sebelum ganti HP atau reset HP\n\nTip: Simpan file backup di Google Drive atau cloud lain untuk keamanan ekstra!',
        },
        {
          q: 'Bagaimana cara restore backup?',
          a: '1. Pastikan file backup (.db) sudah ada di HP\n2. Buka tab Management → Menu (⋮)\n3. Pilih "Restore Database"\n4. Pilih file backup yang ingin di-restore\n5. PERHATIAN: Data saat ini akan diganti dengan data backup!\n6. Tekan "Ya, Restore"',
        },
        {
          q: 'Ganti HP baru, gimana pindahin data?',
          a: 'MUDAH! Ikuti langkah ini:\n\nDI HP LAMA:\n1. Backup database\n2. Share file backup ke WhatsApp/email/Google Drive\n\nDI HP BARU:\n1. Install StockWise\n2. Download file backup dari cloud\n3. Restore database\n\nSelesai! Semua data Anda pindah ke HP baru! 🎉',
        },
      ],
    },
    {
      id: 'reports',
      icon: '📊',
      title: 'Laporan & Export',
      questions: [
        {
          q: 'Bagaimana export laporan?',
          a: '1. Buka tab Management\n2. Tekan tombol menu (⋮) → "Export Laporan"\n3. Pilih format:\n   • Excel (.xlsx) - untuk diedit di Excel/Sheets\n   • HTML - untuk di-convert ke PDF\n4. File akan tersimpan di folder aplikasi',
        },
        {
          q: 'Bagaimana lihat analisis keuangan?',
          a: 'Buka tab Management → Tekan "Analisis Keuangan"\n\nAnda bisa melihat:\n- Total Pendapatan (Revenue)\n- Total Keuntungan (Profit)\n- Grafik penjualan per hari\n- Produk terlaris\n- Trend bisnis Anda',
        },
        {
          q: 'Cara convert laporan HTML ke PDF?',
          a: '1. Buka File Manager di HP\n2. Masuk ke: Android/data/com.stockwisemobile/files\n3. Cari file laporan .html\n4. Tap file → Buka dengan Browser (Chrome/Firefox)\n5. Di browser: Menu (⋮) → Print\n6. Pilih "Save as PDF"\n7. Selesai! 📄',
        },
      ],
    },
    {
      id: 'troubleshooting',
      icon: '🔧',
      title: 'Troubleshooting',
      questions: [
        {
          q: 'Aplikasi error/crash, apa yang harus dilakukan?',
          a: '1. JANGAN panik! Data Anda aman\n2. Tutup paksa aplikasi (Force Stop)\n3. Buka kembali aplikasi\n4. Jika masih error, restart HP\n5. Jika masih bermasalah, uninstall dan install ulang (data tidak akan hilang)',
        },
        {
          q: 'Data hilang setelah update aplikasi?',
          a: 'Data TIDAK akan hilang saat update! Database tersimpan terpisah.\n\nJika data "hilang":\n1. Cek apakah Anda login dengan akun yang sama\n2. Pastikan backup terakhir tersedia\n3. Restore dari backup jika perlu',
        },
        {
          q: 'Aplikasi lemot/lag, kenapa?',
          a: 'Kemungkinan penyebab:\n1. Data transaksi terlalu banyak (>10,000)\n2. HP kehabisan storage\n3. Banyak aplikasi berjalan bersamaan\n\nSolusi:\n1. Export dan arsipkan data lama\n2. Hapus transaksi yang tidak perlu\n3. Clear cache HP\n4. Restart HP',
        },
        {
          q: 'Lupa harga beli produk, gimana?',
          a: 'Buka detail produk → Scroll ke bawah ke "Riwayat Transaksi"\n\nLihat transaksi "Stok Masuk" terakhir untuk mengetahui harga beli terakhir produk tersebut.',
        },
      ],
    },
    {
      id: 'tips',
      icon: '💡',
      title: 'Tips & Trik',
      questions: [
        {
          q: 'Tips menggunakan StockWise dengan efektif?',
          a: '✅ INPUT STOK SEGERA setelah terima barang\n✅ CATAT HARGA BELI dan JUAL dengan benar\n✅ SET STOK MINIMUM yang realistis\n✅ BACKUP data setiap minggu\n✅ CEK LAPORAN secara berkala (minimal sebulan sekali)\n✅ MONITOR produk hampir kadaluarsa\n✅ GUNAKAN BARCODE untuk produk yang sering dijual',
        },
        {
          q: 'Cara mengelola produk musiman?',
          a: '1. Tandai produk musiman di catatan\n2. Atur stok minimum = 0 saat off-season\n3. Update stok minimum saat musim dimulai\n4. Monitor tanggal kadaluarsa lebih ketat\n5. Siapkan promo untuk produk mendekati kadaluarsa',
        },
        {
          q: 'Strategi restok yang baik?',
          a: '📊 ANALISA DATA:\n1. Lihat produk mana yang sering stok habis\n2. Cek berapa lama 1 batch habis\n3. Restok sebelum stok benar-benar habis\n\n💰 KELOLA MODAL:\n1. Jangan restok terlalu banyak sekaligus\n2. Prioritaskan produk best-seller\n3. Diversifikasi produk\n\n⏰ TIMING:\n1. Restok saat harga supplier turun\n2. Manfaatkan diskon grosir\n3. Hindari overstok menjelang musim sepi',
        },
      ],
    },
    {
      id: 'data-safety',
      icon: '🔒',
      title: 'Keamanan Data',
      questions: [
        {
          q: 'Apakah data saya aman?',
          a: 'YA! 100% AMAN karena:\n✅ Data tersimpan OFFLINE di HP Anda\n✅ Tidak ada upload ke server online\n✅ Hanya Anda yang bisa akses data\n✅ Aplikasi tidak meminta akses internet\n\nData Anda PRIVATE dan aman!',
        },
        {
          q: 'Siapa yang bisa lihat data saya?',
          a: 'HANYA ANDA!\n\nStockWise adalah aplikasi offline-first. Data tersimpan lokal di HP Anda, tidak di-upload ke cloud atau server manapun.\n\nJika Anda share file backup, maka penerima file bisa restore dan lihat data tersebut.',
        },
        {
          q: 'Bagaimana jika HP hilang/dicuri?',
          a: '🚨 INI PENTINGNYA BACKUP RUTIN!\n\nJika HP hilang:\n1. Data hilang bersama HP (kecuali ada backup)\n2. Restore backup terakhir di HP baru\n\nCARA MELINDUNGI DATA:\n✅ Backup MINGGUAN ke cloud\n✅ Gunakan lock screen/PIN HP\n✅ Simpan backup di Google Drive\n✅ Jangan share file backup sembarangan',
        },
      ],
    },
    {
      id: 'contact',
      icon: '📞',
      title: 'Bantuan Lebih Lanjut',
      questions: [
        {
          q: 'Masih ada pertanyaan?',
          a: 'Silakan hubungi kami:\n\n📧 Email: support@stockwise.app\n💬 WhatsApp: +62 821-5160-6001\n\nAtau kunjungi:\n🌐 www.stockwise.app/help\n\nKami siap membantu! 😊',
        },
        {
          q: 'Bisa request fitur baru?',
          a: 'TENTU! Kami sangat terbuka dengan saran dari pengguna.\n\nKirim request fitur ke:\nsupport@stockwise.app\n\nSertakan:\n- Deskripsi fitur yang diinginkan\n- Kenapa fitur ini penting untuk bisnis Anda\n- Screenshot/contoh jika ada',
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bantuan & FAQ</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeIcon}>👋</Text>
          <Text style={styles.welcomeTitle}>Selamat Datang!</Text>
          <Text style={styles.welcomeText}>
            Temukan jawaban untuk pertanyaan umum tentang StockWise. 
            Pilih kategori di bawah untuk melihat panduan lengkap.
          </Text>
        </View>

        {/* FAQ Sections */}
        {faqData.map((section) => (
          <View key={section.id} style={styles.section}>
            {/* Section Header */}
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection(section.id)}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionIcon}>{section.icon}</Text>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <Text style={styles.expandIcon}>
                {expandedSection === section.id ? '−' : '+'}
              </Text>
            </TouchableOpacity>

            {/* Questions & Answers */}
            {expandedSection === section.id && (
              <View style={styles.questionsContainer}>
                {section.questions.map((item, index) => (
                  <View key={index} style={styles.qaItem}>
                    <View style={styles.questionContainer}>
                      <Text style={styles.questionIcon}>❓</Text>
                      <Text style={styles.questionText}>{item.q}</Text>
                    </View>
                    <View style={styles.answerContainer}>
                      <Text style={styles.answerIcon}>💡</Text>
                      <Text style={styles.answerText}>{item.a}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerIcon}>💚</Text>
          <Text style={styles.footerTitle}>Terima kasih telah menggunakan StockWise!</Text>
          <Text style={styles.footerText}>
            Aplikasi manajemen stok untuk UMKM Indonesia
          </Text>
          <Text style={styles.footerVersion}>Versi 1.0.0</Text>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: Colors.white,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  headerSpacer: {
    width: 40,
  },

  // Content
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },

  // Welcome Card
  welcomeCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  welcomeIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Section
  section: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.bgSecondary,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textDark,
    flex: 1,
  },
  expandIcon: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.primary,
    marginLeft: 12,
  },

  // Questions Container
  questionsContainer: {
    padding: 16,
    paddingTop: 8,
  },

  // Q&A Item
  qaItem: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  questionContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  questionIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    lineHeight: 24,
  },
  answerContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.bgSecondary,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  answerIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  answerText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  // Footer
  footer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  footerIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 6,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  footerVersion: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },

  // Bottom Spacing
  bottomSpacing: {
    height: 40,
  },
});
