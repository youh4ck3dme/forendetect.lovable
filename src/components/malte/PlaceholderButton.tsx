import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const placeholderVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 rounded-full font-medium transition-all duration-150 active:scale-[0.97] cursor-default",
  {
    variants: {
      variant: {
        primary:
          "gradient-brand text-foreground shadow-card hover:brightness-110",
        soft: "bg-secondary text-secondary-foreground hover:bg-accent",
        outline: "border border-border bg-card text-foreground hover:bg-accent",
        ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
        link: "text-primary hover:underline underline-offset-4 px-0",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-sm",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: { variant: "soft", size: "md" },
  },
);

type Props = VariantProps<typeof placeholderVariants> & {
  children: ReactNode;
  className?: string;
  label?: string;
};

/** Vizuálny placeholder — nespúšťa žiadnu akciu. */
export function PlaceholderButton({
  children,
  className,
  variant,
  size,
  label,
}: Props) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-disabled="true"
      aria-label={label}
      title="Ukážkové rozhranie — bez funkcie"
      className={cn(placeholderVariants({ variant, size }), className)}
    >
      {children}
    </span>
  );
}
