"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "./utils";

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & { size?: "default" | "lg" }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[#1db954] data-[state=checked]:to-[#1ed760] data-[state=unchecked]:bg-white/20 focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-white/20 inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        size === "lg" 
          ? "h-5 w-9" 
          : "h-3.5 w-6 sm:h-5 sm:w-9",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-white pointer-events-none block rounded-md ring-0 transition-transform shadow-md",
          size === "lg"
            ? "h-4 w-4 data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-[2px]"
            : "h-2.5 w-2.5 sm:h-4 sm:w-4 data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-[2px]",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
