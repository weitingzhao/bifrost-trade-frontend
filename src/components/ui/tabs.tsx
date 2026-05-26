import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  // Shared base — variant-specific overrides below
  "group/tabs-list inline-flex items-center text-muted-foreground data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        // ── Pill (compact, inline) ──────────────────────────────────────────
        // Rounded container with muted background; triggers float inside it.
        // Use for account selectors, modal tabs, tight sub-navigation.
        default: [
          "w-fit justify-center rounded-lg bg-muted p-[3px]",
          "group-data-horizontal/tabs:h-8",
          "group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
        ],
        // ── Line (page-level section tabs) ─────────────────────────────────
        // Full-width horizontal bar with border-b; active trigger gets a
        // 2-px primary underline that overlaps the container border via -mb-px.
        // Use for page-level category tabs (API Services, Positions, etc.).
        line: [
          "w-full justify-start gap-0 bg-transparent",
          "border-b border-border",
          "h-auto",                   // don't constrain height — triggers set their own
        ],
        // ── Segment (elevated chip group) ───────────────────────────────────
        // macOS-style segmented control: translucent tinted container;
        // active chip floats above with bg-card + shadow-sm + border.
        // Use when tabs carry inline status indicators (lamps, badges)
        // or when a settings / dashboard panel needs a premium compact control.
        segment: [
          "w-fit justify-start gap-0.5",
          "bg-muted/30 dark:bg-muted/20",
          "border border-border/60",
          "rounded-xl p-[3px]",
          "h-auto",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // ── Shared base ───────────────────────────────────────────────────────
        "relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium transition-colors",
        "text-muted-foreground hover:text-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",

        // ── Default (pill) variant ────────────────────────────────────────────
        "group-data-[variant=default]/tabs-list:h-[calc(100%-1px)]",
        "group-data-[variant=default]/tabs-list:flex-1",
        "group-data-[variant=default]/tabs-list:rounded-md",
        "group-data-[variant=default]/tabs-list:border group-data-[variant=default]/tabs-list:border-transparent",
        "group-data-[variant=default]/tabs-list:px-1.5 group-data-[variant=default]/tabs-list:py-0.5",
        "group-data-[variant=default]/tabs-list:data-active:bg-background",
        "group-data-[variant=default]/tabs-list:data-active:text-foreground",
        "group-data-[variant=default]/tabs-list:data-active:shadow-sm",
        "dark:group-data-[variant=default]/tabs-list:data-active:border-input",
        "dark:group-data-[variant=default]/tabs-list:data-active:bg-input/30",

        // ── Line variant ──────────────────────────────────────────────────────
        // Standard underline tabs: 2-px bottom border that appears on active.
        // The -mb-px trick makes the active underline sit on top of the
        // container's border-b, creating a seamless connected look.
        // When used inside a bordered card wrapper, the card's overflow-hidden
        // clips the container cleanly and the active indicator bridges the
        // tab header / content divider line.
        "group-data-[variant=line]/tabs-list:h-11",
        "group-data-[variant=line]/tabs-list:flex-none",
        "group-data-[variant=line]/tabs-list:rounded-none",
        "group-data-[variant=line]/tabs-list:px-4",
        "group-data-[variant=line]/tabs-list:py-0",
        "group-data-[variant=line]/tabs-list:border-b-2",
        "group-data-[variant=line]/tabs-list:border-b-transparent",
        "group-data-[variant=line]/tabs-list:-mb-px",
        "group-data-[variant=line]/tabs-list:bg-transparent",
        "group-data-[variant=line]/tabs-list:hover:bg-background/50",
        "group-data-[variant=line]/tabs-list:data-active:border-b-primary",
        "group-data-[variant=line]/tabs-list:data-active:text-foreground",
        "group-data-[variant=line]/tabs-list:data-active:bg-background/60",
        "group-data-[variant=line]/tabs-list:data-active:shadow-none",
        "group-data-[variant=line]/tabs-list:transition-colors",
        "group-data-[variant=line]/tabs-list:duration-150",

        // ── Segment variant ───────────────────────────────────────────────────
        // Each chip is transparent by default; active chip gets an elevated
        // card-like surface (bg-background / dark:bg-card), a subtle border,
        // and a shadow to make it appear lifted.  Smooth 150 ms transition on
        // background and shadow keeps the switch feel snappy but not jarring.
        "group-data-[variant=segment]/tabs-list:flex-none",
        "group-data-[variant=segment]/tabs-list:rounded-lg",
        "group-data-[variant=segment]/tabs-list:px-3.5",
        "group-data-[variant=segment]/tabs-list:py-1.5",
        "group-data-[variant=segment]/tabs-list:h-auto",
        "group-data-[variant=segment]/tabs-list:text-sm",
        "group-data-[variant=segment]/tabs-list:border",
        "group-data-[variant=segment]/tabs-list:border-transparent",
        "group-data-[variant=segment]/tabs-list:transition-all",
        "group-data-[variant=segment]/tabs-list:duration-150",
        "group-data-[variant=segment]/tabs-list:hover:text-foreground/80",
        "group-data-[variant=segment]/tabs-list:data-active:bg-background",
        "dark:group-data-[variant=segment]/tabs-list:data-active:bg-card",
        "group-data-[variant=segment]/tabs-list:data-active:text-foreground",
        "group-data-[variant=segment]/tabs-list:data-active:font-semibold",
        "group-data-[variant=segment]/tabs-list:data-active:shadow-sm",
        "group-data-[variant=segment]/tabs-list:data-active:border-border/50",
        "dark:group-data-[variant=segment]/tabs-list:data-active:border-border/40",

        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

// ── Card panel wrappers ───────────────────────────────────────────────────────
// Wrap <Tabs> children to get the "card panel" pattern:
//
//   <Tabs defaultValue="…">
//     <TabsPanel>
//       <TabsList variant="line" className="bg-muted/20 px-2">…</TabsList>
//       <TabsPanelContent>
//         <TabsContent value="…">…</TabsContent>
//       </TabsPanelContent>
//     </TabsPanel>
//   </Tabs>
//
// TabsPanel   — `rounded-xl border overflow-hidden` card that visually scopes
//               the tab group; the TabsList border-b becomes the header divider.
// TabsPanelContent — padded body (p-5 by default); swap for p-4 in modals.

function TabsPanel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-border overflow-hidden", className)}
      {...props}
    />
  )
}

function TabsPanelContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("p-5", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, TabsPanel, TabsPanelContent, tabsListVariants }
