import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Min height 44px on the touch-sized variants: this UI is used on phones and
  // on a POS tablet by staff working fast.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors duration-200 cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-gold text-ink-strong hover:bg-gold-soft active:bg-gold-soft",
        secondary:
          "bg-surface-3 text-ink hover:bg-line-strong border border-line-strong",
        outline:
          "border border-line-strong text-ink hover:bg-surface-2 hover:border-gold-dim",
        ghost: "text-ink-muted hover:text-ink hover:bg-surface-2",
        danger: "bg-bad-solid text-white hover:bg-bad",
      },
      size: {
        sm: "h-9 px-3 text-xs [&_svg]:size-4",
        md: "h-11 px-4 [&_svg]:size-4",
        lg: "h-12 px-6 text-base [&_svg]:size-5",
        icon: "size-11 [&_svg]:size-5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
