"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ACCOUNT_ICONS, type AccountIconKey } from "./account-icons";

export function AccountIconPicker({
  value,
  onChange,
}: {
  value: AccountIconKey;
  onChange: (icon: AccountIconKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const SelectedIcon = ACCOUNT_ICONS[value].icon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`Icon: ${ACCOUNT_ICONS[value].label}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none border border-input bg-transparent text-foreground outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 md:h-8 md:w-8"
          />
        }
      >
        <SelectedIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto">
        <div className="grid grid-cols-5 gap-1">
          {(Object.entries(ACCOUNT_ICONS) as [
            AccountIconKey,
            (typeof ACCOUNT_ICONS)[AccountIconKey],
          ][]).map(([key, { icon: Icon, label }]) => (
            <button
              key={key}
              type="button"
              aria-label={label}
              aria-pressed={key === value}
              onClick={() => {
                onChange(key);
                setOpen(false);
              }}
              className={cn(
                "flex size-9 items-center justify-center rounded-none outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50",
                key === value
                  ? "bg-primary text-primary-foreground hover:bg-primary"
                  : "text-foreground",
              )}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
