"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const Field = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(function Field({ className, ...props }, ref) {
  return (
    <div
      className={cn("flex w-full flex-col gap-2", className)}
      data-slot="field"
      ref={ref}
      role="group"
      {...props}
    />
  );
});

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  return (
    <Label
      className={cn("text-sm font-medium leading-snug", className)}
      data-slot="field-label"
      {...props}
    />
  );
}

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentProps<"p">
>(function FieldDescription({ className, ...props }, ref) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      data-slot="field-description"
      ref={ref}
      {...props}
    />
  );
});

export { Field, FieldLabel, FieldDescription };
