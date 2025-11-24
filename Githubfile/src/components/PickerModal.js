/**
 * PickerModal Component
 * Reusable modal for selecting from a list of options
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import Colors from '../styles/colors';

const { height } = Dimensions.get('window');

export default function PickerModal({
  visible,
  onClose,
  onSelect,
  options,
  selectedValue,
  title,
  showIcon = false,
}) {
  const handleSelect = (option) => {
    onSelect(option);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Options List */}
          <ScrollView style={styles.optionsList}>
            {options.map((option, index) => {
              const isSelected = showIcon
                ? selectedValue === option.id
                : selectedValue === option.value;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionItem,
                    isSelected && styles.optionItemSelected,
                  ]}
                  onPress={() => handleSelect(option)}
                  activeOpacity={0.7}
                >
                  {showIcon && option.icon && (
                    <Text style={styles.optionIcon}>{option.icon}</Text>
                  )}
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}
                  >
                    {showIcon ? option.name : option.label}
                  </Text>
                  {isSelected && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.7,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: Colors.textLight,
    fontWeight: '600',
  },
  optionsList: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 4,
    backgroundColor: Colors.bg,
  },
  optionItemSelected: {
    backgroundColor: Colors.cardBlue,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: Colors.textDark,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: Colors.white,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 20,
    color: Colors.white,
    fontWeight: '700',
    marginLeft: 8,
  },
});
