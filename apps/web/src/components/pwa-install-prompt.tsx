"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, Share, X, PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "POCKETLY_PWA_PROMPT_DISMISSED";
const SNOOZE_DAYS = 7;

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const diffMs = Date.now() - parseInt(dismissedAt, 10);
      if (diffMs < SNOOZE_DAYS * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);

    if (isIosDevice && isSafari && !isStandalone) {
      const timer = setTimeout(() => {
        setIsIos(true);
        setIsVisible(true);
      }, 50);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setShowIosGuide(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-[calc(100vw-2.5rem)] rounded-2xl bg-card border border-border/90 p-4 shadow-xl shadow-black/5 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start gap-3.5">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-background shadow-xs">
          <Image
            src="/pocketly-icon.png"
            alt="Pocketly"
            fill
            className="object-cover"
          />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between">
            <h4 className="font-heading text-sm font-semibold text-foreground">
              Install Pocketly App
            </h4>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-md"
              aria-label="Close install prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            {showIosGuide
              ? "Tap Share in Safari, then tap 'Add to Home Screen'."
              : "Get instant ledger access, offline tracking, and full screen experience."}
          </p>

          {showIosGuide ? (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/50 border border-border/60 p-2 text-xs text-foreground">
              <Share className="h-4 w-4 text-primary shrink-0" />
              <span>Tap Share &rarr;</span>
              <PlusSquare className="h-4 w-4 text-primary shrink-0" />
              <span>Add to Home Screen</span>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleInstallClick}
                className="gap-1.5 text-xs h-8 px-3 rounded-lg"
              >
                <Download className="h-3.5 w-3.5" />
                {isIos ? "How to Install" : "Install Now"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground"
              >
                Not now
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
