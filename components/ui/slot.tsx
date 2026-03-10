import * as React from "react"

import { cn } from "@/lib/utils"

interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode
}

/**
 * Merges props onto its single child element — a minimal "asChild" primitive.
 */
const Slot = React.forwardRef<HTMLElement, SlotProps>(
  ({ children, ...props }, ref) => {
    if (React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        ...props,
        ...(children.props as any),
        className: cn(props.className, (children.props as any).className),
        ref,
      })
    }

    if (React.Children.count(children) > 1) {
      React.Children.only(null) // throws
    }

    return null
  }
)

Slot.displayName = "Slot"

export { Slot }
