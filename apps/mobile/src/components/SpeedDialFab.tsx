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
import { theme } from "@/lib/theme";

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
      {/* Floating Action Button (Always Visible in Bottom Corner) */}
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
          onPress={() => setIsOpen((prev) => !prev)}
          hitSlop={14}
          style={({ pressed }) => [
            styles.fabButton,
            {
              backgroundColor: isOpen ? "#1c251d" : "#0d3b1e",
              borderColor: isOpen ? "#4ade80" : "#22c55e",
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
          ]}
        >
          <Feather
            name={isOpen ? "x" : "plus"}
            size={28}
            color="#ffffff"
          />
        </Pressable>
      </View>

      {/* Expanded SpeedDial Overlay */}
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
              {/* 1. Quick Expense */}
              <Pressable
                onPress={() => handleOpenAction("expense")}
                style={styles.speedDialItem}
              >
                <View style={styles.labelBadge}>
                  <Text style={styles.labelText}>Log Expense</Text>
                </View>
                <View
                  style={[
                    styles.miniFab,
                    { backgroundColor: "#e11d48", borderColor: "#f43f5e" },
                  ]}
                >
                  <Feather name="arrow-down-right" size={22} color="#ffffff" />
                </View>
              </Pressable>

              {/* 2. Quick Income */}
              <Pressable
                onPress={() => handleOpenAction("income")}
                style={styles.speedDialItem}
              >
                <View style={styles.labelBadge}>
                  <Text style={styles.labelText}>Add Income</Text>
                </View>
                <View
                  style={[
                    styles.miniFab,
                    { backgroundColor: "#059669", borderColor: "#10b981" },
                  ]}
                >
                  <Feather name="arrow-up-right" size={22} color="#ffffff" />
                </View>
              </Pressable>

              {/* 3. Transfer */}
              <Pressable
                onPress={() => handleOpenAction("transfer")}
                style={styles.speedDialItem}
              >
                <View style={styles.labelBadge}>
                  <Text style={styles.labelText}>Transfer Money</Text>
                </View>
                <View
                  style={[
                    styles.miniFab,
                    { backgroundColor: "#2563eb", borderColor: "#3b82f6" },
                  ]}
                >
                  <Feather name="repeat" size={20} color="#ffffff" />
                </View>
              </Pressable>

              {/* Close Anchor in Modal */}
              <Pressable
                onPress={() => setIsOpen(false)}
                style={[
                  styles.fabButton,
                  { backgroundColor: "#1c251d", borderColor: "#4ade80", marginTop: 4 },
                ]}
              >
                <Feather name="x" size={28} color="#ffffff" />
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
    elevation: 25,
  },
  fabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 16,
    borderWidth: 2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  speedDialMenu: {
    position: "absolute",
    alignItems: "flex-end",
    gap: 14,
    zIndex: 100000,
  },
  speedDialItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  labelBadge: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  labelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  miniFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 7,
    elevation: 10,
    borderWidth: 2,
  },
});
