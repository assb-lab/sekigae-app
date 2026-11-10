/** 必須ルールをすべて満たしたときの控えめなお祝い表示（trigger が変わるたびに再生）。#119 */
import { motion, useReducedMotion } from "motion/react";
import { Sparkles } from "lucide-react";

export function Celebration({ trigger }: { trigger: number }) {
  const reduce = useReducedMotion();
  if (!trigger || reduce) return null;
  return (
    <div
      key={trigger}
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
    >
      {Array.from({ length: 10 }, (_, i) => (
        <motion.span
          key={i}
          className="text-primary absolute"
          initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
          animate={{
            x: Math.cos((i / 10) * Math.PI * 2) * 140,
            y: Math.sin((i / 10) * Math.PI * 2) * 90,
            scale: 1.1,
            opacity: 0,
          }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        >
          <Sparkles className="size-6" />
        </motion.span>
      ))}
    </div>
  );
}
