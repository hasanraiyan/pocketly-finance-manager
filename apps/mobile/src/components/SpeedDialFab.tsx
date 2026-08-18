import React, { useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TransactionModal } from "@/features/transactions/TransactionModal";
import type { Transaction } from "@/features/transactions/hooks";

export function SpeedDialFab() {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<Transaction["type"]>("expense");

  // Dynamic bottom calculation to ensure FAB floats cleanly above the bottom navigation bar
  const bottomPosition = Math.max(insets.bottom + 65, 75);

  function handleOpenAction(type: Transaction["type"]) {
    setIsOpen(false);
    setModalType(type);
    setModalVisible(true);
  }

  return (
    <>
      {/* 1. Closed State: Main Floating Action Button (+) */}
      {!isOpen && (
        <View
          pointerEvents="box-none"
          style={[
            styles.fabWrapper,
            {
              bottom: bottomPosition,
              right: 20,
            },
          ]}
        >
          <Pressable
            onPress={() => setIsOpen(true)}
            hitSlop={14}
            style={({ pressed }) => [
              styles.mainFab,
              {
                opacity: pressed ? 0.88 : 1,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}
          >
            <View style={styles.mainFabInner}>
              <Feather name="plus" size={28} color="#ffffff" />
            </View>
          </Pressable>
        </View>
      )}

      {/* 2. Open State: Speed-Dial Overlay (Decreased sub-buttons & fixed circular X) */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View style={styles.backdrop}>
            <View
              style={[
                styles.speedDialMenu,
                {
                  bottom: bottomPosition,
                  right: 20,
                },
              ]}
            >
              {/* Quick Expense */}
              <Pressable
                onPress={() => handleOpenAction("expense")}
                style={styles.speedDialItem}
              >
                <View style={styles.labelBadge}>
                  <Text style={styles.labelText}>Log Expense</Text>
                </View>
                <View style={[styles.subFab, { backgroundColor: "#f43f5e" }]}>
                  <Feather name="arrow-down-right" size={20} color="#ffffff" />
                </View>
              </Pressable>

              {/* Quick Income */}
              <Pressable
                onPress={() => handleOpenAction("income")}
                style={styles.speedDialItem}
              >
                <View style={styles.labelBadge}>
                  <Text style={styles.labelText}>Add Income</Text>
                </View>
                <View style={[styles.subFab, { backgroundColor: "#10b981" }]}>
                  <Feather name="arrow-up-right" size={20} color="#ffffff" />
                </View>
              </Pressable>

              {/* Transfer */}
              <Pressable
                onPress={() => handleOpenAction("transfer")}
                style={styles.speedDialItem}
              >
                <View style={styles.labelBadge}>
                  <Text style={styles.labelText}>Transfer Money</Text>
                </View>
                <View style={[styles.subFab, { backgroundColor: "#3b82f6" }]}>
                  <Feather name="repeat" size={18} color="#ffffff" />
                </View>
              </Pressable>

              {/* Single Perfectly-Round Close Button (X) */}
              <Pressable
                onPress={() => setIsOpen(false)}
                hitSlop={14}
                style={({ pressed }) => [
                  styles.closeFab,
                  {
                    opacity: pressed ? 0.88 : 1,
                    transform: [{ scale: pressed ? 0.94 : 1 }],
                  },
                ]}
              >
                <Feather name="x" size={26} color="#ffffff" />
              </Pressable>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Transaction Modal triggered by SpeedDial */}
      <TransactionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        defaultType={modalType}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fabWrapper: {
    position: "absolute",
    zIndex: 99999,
    elevation: 30,
  },
  // Main FAB (+) in closed state
  mainFab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#10b981",
    borderWidth: 2.5,
    borderColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 16,
    overflow: "hidden",
  },
  mainFabInner: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
    backgroundColor: "#047857",
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  speedDialMenu: {
    position: "absolute",
    alignItems: "flex-end",
    gap: 12,
    zIndex: 100000,
  },
  speedDialItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    alignSelf: "flex-end",
    flexShrink: 0,
  },
  labelBadge: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
  },
  labelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  // Sub-action buttons (decreased to 48px)
  subFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
    flexShrink: 0,
  },
  // Close Button (Fixed 56px circle - will NOT stretch)
  closeFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0f172a",
    borderWidth: 2,
    borderColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
    flexShrink: 0,
    marginTop: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 12,
    overflow: "hidden",
  },
});
