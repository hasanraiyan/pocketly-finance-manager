import React, { useEffect, useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { PasswordInput } from "@/components/PasswordInput";
import { theme } from "@/lib/theme";
import { useChangePassword } from "./hooks";

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({
  visible,
  onClose,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const changePassword = useChangePassword();

  useEffect(() => {
    if (visible) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setSuccess(false);
    }
  }, [visible]);

  async function handleSubmit() {
    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setError(null);
    try {
      await changePassword.mutateAsync({
        currentPassword,
        newPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to change password.",
      );
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/50"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="max-h-[90%] rounded-t-3xl bg-background px-6 pb-8 pt-6 border-t border-border">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-heading text-xl text-foreground">
              Change Password
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="h-8 w-8 items-center justify-center rounded-full bg-muted"
            >
              <Feather name="x" size={18} color={theme.foreground} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className="gap-5 py-2">
              {success ? (
                <View className="items-center justify-center py-6 gap-2">
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-positive/10">
                    <Feather name="check" size={24} color={theme.positive} />
                  </View>
                  <Text className="font-heading text-base text-foreground">
                    Password Changed!
                  </Text>
                  <Text className="text-xs text-muted-foreground text-center">
                    Your password has been securely updated.
                  </Text>
                </View>
              ) : (
                <>
                  <PasswordInput
                    label="Current Password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChangeText={(t) => {
                      setCurrentPassword(t);
                      if (error) setError(null);
                    }}
                  />

                  <PasswordInput
                    label="New Password (min 8 characters)"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChangeText={(t) => {
                      setNewPassword(t);
                      if (error) setError(null);
                    }}
                  />

                  <PasswordInput
                    label="Confirm New Password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChangeText={(t) => {
                      setConfirmPassword(t);
                      if (error) setError(null);
                    }}
                  />

                  {error && (
                    <View className="rounded-lg bg-negative/10 border border-negative/20 p-3">
                      <Text className="text-xs text-negative text-center">{error}</Text>
                    </View>
                  )}

                  <View className="mt-4 gap-2">
                    <Button loading={changePassword.isPending} onPress={handleSubmit}>
                      Update Password
                    </Button>
                    <Button
                      variant="ghost"
                      onPress={onClose}
                      disabled={changePassword.isPending}
                    >
                      Cancel
                    </Button>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
