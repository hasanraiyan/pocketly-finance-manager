import React, { useEffect, useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { theme } from "@/lib/theme";
import {
  ACCOUNT_ICONS,
  ACCOUNT_TYPE_OPTIONS,
  defaultAccountIcon,
  isAccountIconKey,
  resolveAccountIconKey,
  type AccountIconKey,
  type AccountType,
} from "./account-icons";
import {
  useCreateAccount,
  useUpdateAccount,
  type Account,
} from "./hooks";

interface AccountModalProps {
  visible: boolean;
  onClose: () => void;
  account?: Account | null;
  defaultCurrency?: string;
  onSuccess?: (account: Account) => void;
}

export function AccountModal({
  visible,
  onClose,
  account,
  defaultCurrency = "USD",
  onSuccess,
}: AccountModalProps) {
  const isEditing = Boolean(account);
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [balance, setBalance] = useState("0");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [icon, setIcon] = useState<AccountIconKey>("landmark");
  const [iconTouched, setIconTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (account) {
        setName(account.name);
        setType(account.type as AccountType);
        const initialAmt = account.initialBalance ?? (account as any).balance ?? 0;
        setBalance(String(initialAmt / 100));
        setCurrency(account.currency || defaultCurrency);
        setIcon(
          account.icon && isAccountIconKey(account.icon)
            ? account.icon
            : defaultAccountIcon((account.type as AccountType) || "bank"),
        );
        setIconTouched(true);
      } else {
        setName("");
        setType("bank");
        setBalance("0");
        setCurrency(defaultCurrency);
        setIcon(defaultAccountIcon("bank"));
        setIconTouched(false);
      }
      setError(null);
    }
  }, [visible, account, defaultCurrency]);

  function handleTypeChange(nextType: AccountType) {
    setType(nextType);
    if (!iconTouched) {
      setIcon(defaultAccountIcon(nextType));
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Please provide an account name.");
      return;
    }
    const numBalance = parseFloat(balance);
    if (isNaN(numBalance)) {
      setError("Please enter a valid balance number.");
      return;
    }

    const payload = {
      name: name.trim(),
      type,
      icon,
      initialBalance: Math.round(numBalance * 100),
      currency: (currency.trim() || defaultCurrency).toUpperCase(),
    };

    setError(null);
    try {
      if (isEditing && account) {
        const updated = await updateAccount.mutateAsync({
          id: account._id,
          input: payload,
        });
        onSuccess?.(updated as unknown as Account);
      } else {
        const created = await createAccount.mutateAsync(payload);
        onSuccess?.(created as unknown as Account);
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save account details.",
      );
    }
  }

  const isPending = createAccount.isPending || updateAccount.isPending;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1 justify-end md:justify-center md:items-center bg-black/60 md:p-6"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="w-full md:max-w-xl max-h-[90%] rounded-t-3xl md:rounded-3xl bg-background px-6 pb-8 pt-6 border-t md:border border-border">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-heading text-xl text-foreground">
              {isEditing ? "Edit Account" : "Add Account"}
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
              {/* Account Icon selection */}
              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">
                  Account Icon
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="-mx-1"
                >
                  <View className="flex-row gap-2 px-1">
                    {(
                      Object.entries(ACCOUNT_ICONS) as [
                        AccountIconKey,
                        (typeof ACCOUNT_ICONS)[AccountIconKey],
                      ][]
                    ).map(([key, { icon: iconName, label }]) => {
                      const isSelected = icon === key;
                      return (
                        <Pressable
                          key={key}
                          onPress={() => {
                            setIcon(key);
                            setIconTouched(true);
                          }}
                          className={`min-w-[60px] items-center justify-center rounded-xl py-2 px-2 border ${
                            isSelected
                              ? "bg-primary border-primary"
                              : "bg-card border-border"
                          }`}
                        >
                          <Feather
                            name={iconName}
                            size={20}
                            color={
                              isSelected
                                ? theme.primaryForeground
                                : theme.foreground
                            }
                          />
                          <Text
                            numberOfLines={1}
                            className={`mt-1 text-[10px] font-medium ${
                              isSelected
                                ? "text-primary-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Name */}
              <TextField
                label="Account Name"
                placeholder="e.g. Main Checking, Cash Wallet"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (error) setError(null);
                }}
              />

              {/* Account Type */}
              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">
                  Account Type
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {ACCOUNT_TYPE_OPTIONS.map((opt) => {
                    const isSelected = type === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => handleTypeChange(opt.value)}
                        className={`rounded-lg px-3.5 py-2 border ${
                          isSelected
                            ? "bg-primary border-primary"
                            : "bg-card border-border"
                        }`}
                      >
                        <Text
                          className={`text-xs font-medium ${
                            isSelected
                              ? "text-primary-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Starting balance and currency */}
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <TextField
                    label={isEditing ? "Starting Balance" : "Opening Balance"}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    value={balance}
                    onChangeText={(text) => {
                      setBalance(text);
                      if (error) setError(null);
                    }}
                  />
                </View>
                <View className="w-28">
                  <TextField
                    label="Currency"
                    autoCapitalize="characters"
                    maxLength={3}
                    placeholder="USD"
                    value={currency}
                    onChangeText={(text) => setCurrency(text.toUpperCase())}
                  />
                </View>
              </View>

              {error && (
                <View className="rounded-lg bg-negative/10 border border-negative/20 p-3">
                  <Text className="text-xs text-negative text-center">{error}</Text>
                </View>
              )}

              <View className="mt-4 gap-2">
                <Button loading={isPending} onPress={handleSubmit}>
                  {isEditing ? "Save Changes" : "Create Account"}
                </Button>
                <Button variant="ghost" onPress={onClose} disabled={isPending}>
                  Cancel
                </Button>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
