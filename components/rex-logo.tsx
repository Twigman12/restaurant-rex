import { cn } from "@/lib/utils"

interface RexLogoProps {
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
}

export function RexLogo({ className, size = "md" }: RexLogoProps) {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl",
  }

  return (
    <div className={cn("font-black tracking-tighter", sizeClasses[size], className)}>
      <span className="text-rex-red">Restaurant</span>
      <span className="text-rex-black dark:text-rex-cream">-REX</span>
    </div>
  )
}
