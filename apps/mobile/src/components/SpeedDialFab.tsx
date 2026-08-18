import React, { useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  Modal,
  Platform,
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

  // Dynamic bottom calculation to ensure FAB is above bottom navigation bar
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
          hitSlop={12}
          style={({ pressed }) => [
            styles.fabButton,
            {
              backgroundColor: isOpen ? theme.card : theme.primary,
              borderColor: isOpen ? theme.border : theme.primary,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
        >
          <Feather
            name={isOpen ? "x" : "plus"}
            size={26}
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
                    { backgroundColor: "#f43f5e", borderColor: "#e11d48" },
                  ]}
                >
                  <Feather name="arrow-down-right" size={20} color="#ffffff" />
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
                  <Feather name="arrow-up-right" size={20} color="#ffffff" />
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
                  <Feather name="repeat" size={18} color="#ffffff" />
                </View>
              </Pressable>

              {/* Close Anchor in Modal */}
              <Pressable
                onPress={() => setIsOpen(false)}
                style={[
                  styles.fabButton,
                  { backgroundColor: theme.card, borderColor: theme.border, marginTop: 4 },
                ]}
              >
                <Feather name="x" size={26} color={theme.foreground} />
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
    elevation: 20,
  },
  fabButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 12,
    borderWidth: 1.5,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
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
    backgroundColor: theme.card,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  labelText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.foreground,
  },
  miniFab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1.5,
  },
});
