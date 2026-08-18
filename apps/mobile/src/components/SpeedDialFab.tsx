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
          hitSlop={16}
          style={({ pressed }) => [
            styles.fabButtonOuter,
            {
              backgroundColor: isOpen ? "#1e293b" : "#10b981",
              borderColor: isOpen ? "#475569" : "#059669",
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
          ]}
        >
          <View
            style={[
              styles.fabInnerCircle,
              {
                backgroundColor: isOpen ? "#0f172a" : "#047857",
              },
            ]}
          >
            <Feather
              name={isOpen ? "x" : "plus"}
              size={28}
              color="#ffffff"
            />
          </View>
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
                  <Feather name="arrow-down-right" size={24} color="#ffffff" />
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
                  <Feather name="arrow-up-right" size={24} color="#ffffff" />
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
                  <Feather name="repeat" size={22} color="#ffffff" />
                </View>
              </Pressable>

              {/* Close Anchor in Modal */}
              <Pressable
                onPress={() => setIsOpen(false)}
                style={[
                  styles.fabButtonOuter,
                  { backgroundColor: "#1e293b", borderColor: "#475569", marginTop: 4 },
                ]}
              >
                <View style={[styles.fabInnerCircle, { backgroundColor: "#0f172a" }]}>
                  <Feather name="x" size={28} color="#ffffff" />
                </View>
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
  fabButtonOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 20,
    borderWidth: 2.5,
    padding: 4,
  },
  fabInnerCircle: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  speedDialMenu: {
    position: "absolute",
    alignItems: "flex-end",
    gap: 16,
    zIndex: 100000,
  },
  speedDialItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  labelBadge: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  labelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  miniFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
