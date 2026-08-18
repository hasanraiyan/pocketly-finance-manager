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
import { TransactionModal } from "@/features/transactions/TransactionModal";
import type { Transaction } from "@/features/transactions/hooks";
import { theme } from "@/lib/theme";

export function SpeedDialFab() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<Transaction["type"]>("expense");

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
        style={styles.fabContainer}
      >
        <Pressable
          onPress={() => setIsOpen((prev) => !prev)}
          hitSlop={8}
          style={({ pressed }) => [
            styles.fabButton,
            {
              backgroundColor: isOpen ? theme.card : theme.primary,
              borderColor: isOpen ? theme.border : theme.primary,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Feather
            name={isOpen ? "x" : "plus"}
            size={24}
            color={isOpen ? theme.foreground : theme.primaryForeground}
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
            <View style={styles.speedDialMenu}>
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
                    { backgroundColor: "#f43f5e", borderColor: "#e11d48" },
                  ]}
                >
                  <Feather name="arrow-down-right" size={18} color="#ffffff" />
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
                    { backgroundColor: "#10b981", borderColor: "#059669" },
                  ]}
                >
                  <Feather name="arrow-up-right" size={18} color="#ffffff" />
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
                    { backgroundColor: "#3b82f6", borderColor: "#2563eb" },
                  ]}
                >
                  <Feather name="repeat" size={17} color="#ffffff" />
                </View>
              </Pressable>

              {/* Close / Main Action Anchor in Modal */}
              <Pressable
                onPress={() => setIsOpen(false)}
                style={[
                  styles.fabButtonInModal,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Feather name="x" size={24} color={theme.foreground} />
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
  fabContainer: {
    position: "absolute",
    right: 20,
    bottom: 80, // Above bottom tab bar
    zIndex: 999,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  speedDialMenu: {
    position: "absolute",
    right: 20,
    bottom: 80,
    alignItems: "flex-end",
    gap: 14,
  },
  speedDialItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  labelBadge: {
    backgroundColor: theme.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  labelText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.foreground,
  },
  miniFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: 1,
  },
  fabButtonInModal: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    marginTop: 2,
  },
});
