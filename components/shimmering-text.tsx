"use client"

import * as React from "react"
import type { Variants } from "motion/react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"

export type ShimmeringTextProps = Omit<
  React.ComponentProps<typeof motion.span>,
  "children"
> & {
  /** The text to render with the shimmering effect. */
  text: string
  /**
   * Duration in seconds for one shimmer cycle.
   * @defaultValue 1 */
  duration?: number
  /**
   * Whether the shimmer animation is paused.
   * @defaultValue false */
  isStopped?: boolean
}

export function ShimmeringText({
  text,
  duration = 1,
  isStopped = false,
  className,
  ...props
}: ShimmeringTextProps) {
  const createCharVariants = React.useCallback(
    (charIndex: number): Variants => ({
      running: {
        color: ["var(--color)", "var(--shimmering-color)", "var(--color)"],
        transition: {
          duration,
          repeat: Infinity,
          repeatType: "loop" as const,
          repeatDelay: text.length * 0.05,
          delay: (charIndex * duration) / text.length,
          ease: "easeInOut",
        },
      },
      stopped: {
        color: "var(--color)",
        transition: {
          duration: duration * 0.5,
          ease: "easeOut",
        },
      },
    }),
    [duration, text.length]
  )

  // Agent Market adaptation: group characters by word so lines can only
  // break at spaces — per-character inline-blocks wrap mid-word otherwise.
  const words = React.useMemo(() => {
    const out: { chars: string[]; startIndex: number }[] = []
    let index = 0
    for (const word of text.split(" ")) {
      out.push({ chars: word.split(""), startIndex: index })
      index += word.length + 1
    }
    return out
  }, [text])

  return (
    <motion.span
      className={cn(
        "inline-block select-none",
        "[--color:hsl(var(--muted-foreground))] [--shimmering-color:hsl(var(--foreground))]",
        className
      )}
      {...props}
    >
      {words.map((word, w) => (
        <React.Fragment key={w}>
          <span className="inline-block whitespace-nowrap" aria-hidden>
            {word.chars.map((char, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial="stopped"
                animate={isStopped ? "stopped" : "running"}
                variants={createCharVariants(word.startIndex + i)}
              >
                {char}
              </motion.span>
            ))}
          </span>
          {/* Space lives between the word blocks so lines break here. */}
          {w < words.length - 1 && " "}
        </React.Fragment>
      ))}
      <span className="sr-only">{text}</span>
    </motion.span>
  )
}
