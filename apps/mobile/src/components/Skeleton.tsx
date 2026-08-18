import React, { useEffect, useRef } from "react";
import { Animated, type ViewStyle } from "react-native";

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: ViewStyle;
}) {
  const opacityRef = useRef<Animated.Value | null>(null);
  if (!opacityRef.current) {
    opacityRef.current = new Animated.Value(0.4);
  }
  const opacity = opacityRef.current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ opacity }, style]}
      className={`rounded-lg bg-muted ${className ?? ""}`}
    />
  );
}
