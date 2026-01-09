import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        blue: "border-transparent",
        green: "border-transparent",
        yellow: "border-transparent",
        red: "border-transparent",
        purple: "border-transparent",
        orange: "border-transparent",
        gray: "border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const colorVariantStyles: Record<string, React.CSSProperties> = {
  blue: { backgroundColor: "var(--badge-blue-bg)", color: "var(--badge-blue-text)" },
  green: { backgroundColor: "var(--badge-green-bg)", color: "var(--badge-green-text)" },
  yellow: { backgroundColor: "var(--badge-yellow-bg)", color: "var(--badge-yellow-text)" },
  red: { backgroundColor: "var(--badge-red-bg)", color: "var(--badge-red-text)" },
  purple: { backgroundColor: "var(--badge-purple-bg)", color: "var(--badge-purple-text)" },
  orange: { backgroundColor: "var(--badge-orange-bg)", color: "var(--badge-orange-text)" },
  gray: { backgroundColor: "var(--badge-gray-bg)", color: "var(--badge-gray-text)" },
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, style, ...props }: BadgeProps) {
  const colorStyle = variant && colorVariantStyles[variant]
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      style={colorStyle ? { ...colorStyle, ...style } : style}
      {...props}
    />
  )
}

export { Badge, badgeVariants }