/**
 * Financial Analysis Screen
 * Detailed revenue and profit analysis with calendar and graphs
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Colors from '../styles/colors';
import {
  getFinancialStatsByDateRange,
  getDailyFinancialBreakdown,
  getCategoryFinancialBreakdown,
} from '../database/queries/transactions';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function FinancialAnalysisScreen({ route, navigation }) {
  const { initialType } = route.params || {}; // 'revenue' or 'profit'
  
  const [analysisType, setAnalysisType] = useState(initialType || 'revenue');
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // week, month, year
  const [chartType, setChartType] = useState('bar'); // bar, pie, line
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    average: 0,
    highest: 0,
    lowest: 0,
    trend: 0, // percentage change
  });
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    loadData();
  }, [selectedPeriod, analysisType]);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [selectedPeriod, analysisType])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on selected period
      const endDate = new Date();
      const startDate = new Date();
      
      if (selectedPeriod === 'week') {
        startDate.setDate(endDate.getDate() - 7);
      } else if (selectedPeriod === 'month') {
        startDate.setDate(endDate.getDate() - 30);
      } else if (selectedPeriod === 'year') {
        startDate.setDate(endDate.getDate() - 365);
      }

      // Get daily breakdown and category breakdown
      const [daily, categories] = await Promise.all([
        getDailyFinancialBreakdown(formatDate(startDate), formatDate(endDate)),
        getCategoryFinancialBreakdown(formatDate(startDate), formatDate(endDate)),
      ]);

      setDailyData(daily);
      setCategoryData(categories);
      calculateStats(daily);
    } catch (error) {
      console.error('Error loading financial analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    if (data.length === 0) {
      setStats({ total: 0, average: 0, highest: 0, lowest: 0, trend: 0 });
      return;
    }

    const field = analysisType === 'revenue' ? 'revenue' : 'profit';
    const values = data.map(d => d[field]);
    
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = total / values.length;
    const highest = Math.max(...values);
    const lowest = Math.min(...values);

    // Calculate trend (compare first half vs second half)
    const midPoint = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, midPoint);
    const secondHalf = values.slice(midPoint);
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const trend = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg * 100) : 0;

    setStats({ total, average, highest, lowest, trend });
  };

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hari ini';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Kemarin';
    }

    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  };

  const formatCurrency = (value) => {
    return `Rp ${parseFloat(value).toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  // Simple Bar Chart Component
  const renderChart = () => {
    if (chartType === 'pie') {
      return renderPieChart();
    } else if (chartType === 'line') {
      return renderLineChart();
    }

    // Default: Bar chart
    if (dailyData.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>Belum ada data untuk periode ini</Text>
        </View>
      );
    }

    const field = analysisType === 'revenue' ? 'revenue' : 'profit';
    const maxValue = Math.max(...dailyData.map(d => d[field]), 1);
    const chartHeight = 200;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chart}>
          {dailyData.map((item, index) => {
            const value = item[field];
            const barHeight = (value / maxValue) * chartHeight;
            const isSelected = selectedDate === item.date;

            return (
              <TouchableOpacity
                key={index}
                style={styles.barContainer}
                onPress={() => setSelectedDate(isSelected ? null : item.date)}
              >
                <View style={styles.barWrapper}>
                  {value > 0 && (
                    <Text style={styles.barValue}>
                      {value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                    </Text>
                  )}
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(barHeight, 2),
                        backgroundColor: isSelected
                          ? Colors.cardBlue
                          : analysisType === 'revenue'
                          ? '#3B82F6'
                          : '#10B981',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, isSelected && styles.barLabelSelected]}>
                  {new Date(item.date).getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // Pie Chart for Category Breakdown
  const renderPieChart = () => {
    if (categoryData.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>Belum ada data kategori</Text>
        </View>
      );
    }

    const field = analysisType === 'revenue' ? 'revenue' : 'profit';
    const total = categoryData.reduce((sum, cat) => sum + cat[field], 0);
    
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    return (
      <View style={styles.chartContainer}>
        <View style={styles.pieChartContainer}>
          {/* Simple pie chart representation using bars */}
          {categoryData.map((cat, index) => {
            const percentage = total > 0 ? (cat[field] / total * 100).toFixed(1) : 0;
            const color = colors[index % colors.length];

            return (
              <View key={index} style={styles.pieItem}>
                <View style={styles.pieItemLeft}>
                  <View style={[styles.pieColor, { backgroundColor: color }]} />
                  <Text style={styles.pieIcon}>{cat.icon}</Text>
                  <Text style={styles.pieCategory}>{cat.category}</Text>
                </View>
                <View style={styles.pieItemRight}>
                  <Text style={styles.pieValue}>{formatCurrency(cat[field])}</Text>
                  <Text style={styles.piePercentage}>{percentage}%</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Line Chart for Trend Visualization
  const renderLineChart = () => {
    if (dailyData.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>Belum ada data untuk periode ini</Text>
        </View>
      );
    }

    const field = analysisType === 'revenue' ? 'revenue' : 'profit';
    const maxValue = Math.max(...dailyData.map(d => d[field]), 1);
    const chartHeight = 200;
    const chartWidth = SCREEN_WIDTH - 64;

    return (
      <View style={styles.chartContainer}>
        <View style={[styles.lineChartContainer, { height: chartHeight + 40 }]}>
          {/* Grid lines */}
          <View style={styles.gridLines}>
            {[0, 1, 2, 3, 4].map(i => (
              <View key={i} style={styles.gridLine} />
            ))}
          </View>

          {/* Line path points */}
          <View style={styles.lineChart}>
            {dailyData.map((item, index) => {
              const value = item[field];
              const x = (index / (dailyData.length - 1)) * chartWidth;
              const y = chartHeight - (value / maxValue) * chartHeight;
              const isSelected = selectedDate === item.date;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.linePoint,
                    {
                      left: x - 6,
                      top: y - 6,
                      backgroundColor: isSelected ? Colors.cardBlue : '#3B82F6',
                    },
                  ]}
                  onPress={() => setSelectedDate(isSelected ? null : item.date)}
                >
                  {isSelected && <View style={styles.linePointHighlight} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Date labels */}
          <View style={styles.lineLabels}>
            {dailyData.filter((_, i) => i % Math.ceil(dailyData.length / 7) === 0).map((item, index) => (
              <Text key={index} style={styles.lineLabelText}>
                {new Date(item.date).getDate()}
              </Text>
            ))}
          </View>
        </View>
      </View>
    );
  };

  // Selected Date Detail
  const renderSelectedDateDetail = () => {
    if (!selectedDate) return null;

    const dayData = dailyData.find(d => d.date === selectedDate);
    if (!dayData) return null;

    return (
      <View style={styles.selectedDateCard}>
        <Text style={styles.selectedDateTitle}>{formatDisplayDate(selectedDate)}</Text>
        <View style={styles.selectedDateStats}>
          <View style={styles.selectedStat}>
            <Text style={styles.selectedStatLabel}>Pendapatan</Text>
            <Text style={styles.selectedStatValue}>{formatCurrency(dayData.revenue)}</Text>
          </View>
          <View style={styles.selectedStat}>
            <Text style={styles.selectedStatLabel}>Untung</Text>
            <Text style={[styles.selectedStatValue, { color: '#10B981' }]}>
              {formatCurrency(dayData.profit)}
            </Text>
          </View>
          <View style={styles.selectedStat}>
            <Text style={styles.selectedStatLabel}>Margin</Text>
            <Text style={styles.selectedStatValue}>
              {dayData.revenue > 0
                ? `${((dayData.profit / dayData.revenue) * 100).toFixed(1)}%`
                : '0%'}
            </Text>
          </View>
        </View>
        <View style={styles.selectedDateDetails}>
          <Text style={styles.detailText}>📦 Transaksi: {dayData.transaction_count}</Text>
          <Text style={styles.detailText}>💰 Rata-rata: {formatCurrency(dayData.revenue / dayData.transaction_count)}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.cardBlue} />
          <Text style={styles.loadingText}>Memuat analisis...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Kembali</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analisis Keuangan</Text>
          <Text style={styles.headerSubtitle}>Laporan detail pendapatan & keuntungan</Text>
        </View>

        {/* Analysis Type Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, analysisType === 'revenue' && styles.toggleButtonActive]}
            onPress={() => setAnalysisType('revenue')}
          >
            <Text style={[styles.toggleText, analysisType === 'revenue' && styles.toggleTextActive]}>
              💵 Pendapatan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, analysisType === 'profit' && styles.toggleButtonActive]}
            onPress={() => setAnalysisType('profit')}
          >
            <Text style={[styles.toggleText, analysisType === 'profit' && styles.toggleTextActive]}>
              💎 Keuntungan
            </Text>
          </TouchableOpacity>
        </View>

        {/* Period Selector */}
        <View style={styles.periodContainer}>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'week' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('week')}
          >
            <Text style={[styles.periodText, selectedPeriod === 'week' && styles.periodTextActive]}>
              7 Hari
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'month' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('month')}
          >
            <Text style={[styles.periodText, selectedPeriod === 'month' && styles.periodTextActive]}>
              30 Hari
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'year' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('year')}
          >
            <Text style={[styles.periodText, selectedPeriod === 'year' && styles.periodTextActive]}>
              1 Tahun
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chart Type Selector */}
        <View style={styles.chartTypeContainer}>
          <Text style={styles.chartTypeLabel}>Tipe Grafik:</Text>
          <View style={styles.chartTypeButtons}>
            <TouchableOpacity
              style={[styles.chartTypeButton, chartType === 'bar' && styles.chartTypeButtonActive]}
              onPress={() => setChartType('bar')}
            >
              <Text style={[styles.chartTypeText, chartType === 'bar' && styles.chartTypeTextActive]}>
                📊 Batang
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chartTypeButton, chartType === 'pie' && styles.chartTypeButtonActive]}
              onPress={() => setChartType('pie')}
            >
              <Text style={[styles.chartTypeText, chartType === 'pie' && styles.chartTypeTextActive]}>
                🥧 Kategori
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chartTypeButton, chartType === 'line' && styles.chartTypeButtonActive]}
              onPress={() => setChartType('line')}
            >
              <Text style={[styles.chartTypeText, chartType === 'line' && styles.chartTypeTextActive]}>
                📈 Tren
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Stats */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>{formatCurrency(stats.total)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Rata-rata/Hari</Text>
            <Text style={styles.summaryValue}>{formatCurrency(stats.average)}</Text>
          </View>
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Tertinggi</Text>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>
              {formatCurrency(stats.highest)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Terendah</Text>
            <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
              {formatCurrency(stats.lowest)}
            </Text>
          </View>
        </View>

        {/* Trend Indicator */}
        <View style={styles.trendContainer}>
          <Text style={styles.trendLabel}>Tren Pertumbuhan:</Text>
          <View style={[styles.trendBadge, stats.trend >= 0 ? styles.trendUp : styles.trendDown]}>
            <Text style={styles.trendIcon}>{stats.trend >= 0 ? '📈' : '📉'}</Text>
            <Text style={styles.trendText}>
              {stats.trend >= 0 ? '+' : ''}{stats.trend.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {chartType === 'pie' 
              ? `${analysisType === 'revenue' ? 'Pendapatan' : 'Keuntungan'} per Kategori`
              : chartType === 'line'
              ? `Tren ${analysisType === 'revenue' ? 'Pendapatan' : 'Keuntungan'}`
              : `Grafik ${analysisType === 'revenue' ? 'Pendapatan' : 'Keuntungan'} Harian`
            }
          </Text>
          <Text style={styles.sectionSubtitle}>
            {chartType === 'pie' 
              ? 'Rincian berdasarkan kategori produk'
              : chartType === 'line'
              ? 'Visualisasi tren dari waktu ke waktu'
              : 'Ketuk batang untuk lihat detail'
            }
          </Text>
          {renderChart()}
        </View>

        {/* Selected Date Detail */}
        {renderSelectedDateDetail()}

        {/* Daily Breakdown List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rincian Harian</Text>
          {dailyData.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyText}>Belum ada transaksi untuk periode ini</Text>
            </View>
          ) : (
            dailyData.map((item, index) => {
              const value = analysisType === 'revenue' ? item.revenue : item.profit;
              const isPositive = value > 0;

              return (
                <View key={index} style={styles.dailyCard}>
                  <View style={styles.dailyLeft}>
                    <Text style={styles.dailyDate}>{formatDisplayDate(item.date)}</Text>
                    <Text style={styles.dailyCount}>
                      {item.transaction_count} transaksi
                    </Text>
                  </View>
                  <View style={styles.dailyRight}>
                    <Text style={[styles.dailyValue, !isPositive && styles.dailyValueZero]}>
                      {formatCurrency(value)}
                    </Text>
                    {item.revenue > 0 && (
                      <Text style={styles.dailyMargin}>
                        Margin: {((item.profit / item.revenue) * 100).toFixed(1)}%
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>
            {analysisType === 'revenue' ? '💵 Tentang Pendapatan' : '💎 Tentang Keuntungan'}
          </Text>
          <Text style={styles.infoText}>
            {analysisType === 'revenue'
              ? 'Pendapatan adalah total uang yang masuk dari penjualan. Ini menunjukkan seberapa banyak barang yang terjual.'
              : 'Keuntungan adalah uang yang Anda simpan setelah dikurangi modal. Ini menunjukkan berapa banyak Anda benar-benar menghasilkan.'}
          </Text>
          {analysisType === 'revenue' && (
            <Text style={styles.infoFormula}>
              Rumus: Harga Jual × Jumlah Terjual
            </Text>
          )}
          {analysisType === 'profit' && (
            <Text style={styles.infoFormula}>
              Rumus: (Harga Jual - Harga Beli) × Jumlah
            </Text>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textLight,
  },

  // Header
  header: {
    backgroundColor: Colors.white,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.cardBlue,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textDark,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 4,
  },

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: Colors.cardBlue,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
  },
  toggleTextActive: {
    color: Colors.white,
  },

  // Period
  periodContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#E0F2FE',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  periodTextActive: {
    color: Colors.cardBlue,
  },

  // Summary
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
  },

  // Trend
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  trendLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  trendUp: {
    backgroundColor: '#10B98120',
  },
  trendDown: {
    backgroundColor: '#EF444420',
  },
  trendIcon: {
    fontSize: 16,
  },
  trendText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
  },

  // Section
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 16,
  },

  // Chart
  chartContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 220,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
    width: '100%',
  },
  bar: {
    width: '80%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 2,
  },
  barValue: {
    fontSize: 9,
    color: Colors.textLight,
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 6,
  },
  barLabelSelected: {
    fontWeight: '700',
    color: Colors.cardBlue,
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 14,
    color: Colors.textLight,
  },

  // Selected Date
  selectedDateCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.cardBlue,
  },
  selectedDateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 12,
  },
  selectedDateStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  selectedStat: {
    flex: 1,
  },
  selectedStatLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 4,
  },
  selectedStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  selectedDateDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  detailText: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 4,
  },

  // Daily List
  dailyCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailyLeft: {
    flex: 1,
  },
  dailyDate: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 4,
  },
  dailyCount: {
    fontSize: 12,
    color: Colors.textLight,
  },
  dailyRight: {
    alignItems: 'flex-end',
  },
  dailyValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 2,
  },
  dailyValueZero: {
    color: Colors.textLight,
  },
  dailyMargin: {
    fontSize: 11,
    color: Colors.textLight,
  },

  // Chart Type Selector
  chartTypeContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  chartTypeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 8,
  },
  chartTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  chartTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chartTypeButtonActive: {
    backgroundColor: '#E0F2FE',
    borderColor: Colors.cardBlue,
  },
  chartTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textLight,
  },
  chartTypeTextActive: {
    color: Colors.cardBlue,
  },

  // Pie Chart
  pieChartContainer: {
    paddingVertical: 16,
  },
  pieItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  pieItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  pieColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  pieIcon: {
    fontSize: 20,
  },
  pieCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
    flex: 1,
  },
  pieItemRight: {
    alignItems: 'flex-end',
  },
  pieValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  piePercentage: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },

  // Line Chart
  lineChartContainer: {
    position: 'relative',
    marginTop: 10,
  },
  gridLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 40,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  lineChart: {
    position: 'relative',
    height: 200,
  },
  linePoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  linePointHighlight: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.cardBlue,
    opacity: 0.2,
    top: -6,
    left: -6,
  },
  lineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  lineLabelText: {
    fontSize: 11,
    color: Colors.textLight,
  },

  // Info Box
  infoBox: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textDark,
    lineHeight: 20,
    marginBottom: 8,
  },
  infoFormula: {
    fontSize: 13,
    color: Colors.textLight,
    fontStyle: 'italic',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textLight,
  },
});