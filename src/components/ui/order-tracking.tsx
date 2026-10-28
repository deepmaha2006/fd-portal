"use client"

import * as React from "react"
import { CheckCircle2, Circle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TrackingStep {
  name: string
  timestamp: string
  isCompleted: boolean
  isCurrent?: boolean
  description?: string
}

export interface OrderTrackingProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: TrackingStep[]
}

const OrderTracking = React.forwardRef<HTMLDivElement, OrderTrackingProps>(
  ({ steps = [], className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {steps.length > 0 ? (
          <div>
            {steps.map((step, index) => (
              <div key={index} className="flex">
                <div className="flex flex-col items-center">
                  {step.isCompleted ? (
                    <CheckCircle2 className="h-6 w-6 shrink-0 text-blue-600" />
                  ) : step.isCurrent ? (
                    <Clock className="h-6 w-6 shrink-0 text-amber-500 animate-pulse" />
                  ) : (
                    <Circle className="h-6 w-6 shrink-0 text-slate-300" />
                  )}
                  {index < steps.length - 1 && (
                    <div
                      className={cn("w-[2px] grow my-1 rounded-full", {
                        "bg-blue-600": steps[index + 1].isCompleted || steps[index + 1].isCurrent,
                        "bg-slate-200": !steps[index + 1].isCompleted && !steps[index + 1].isCurrent,
                      })}
                    />
                  )}
                </div>
                <div className="ml-4 pb-8">
                  <p className={cn("text-sm font-semibold", {
                    "text-blue-600": step.isCompleted,
                    "text-amber-600": step.isCurrent,
                    "text-slate-400": !step.isCompleted && !step.isCurrent,
                  })}>
                    {step.name}
                  </p>
                  {step.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">{step.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No tracking information available.</p>
        )}
      </div>
    )
  }
)
OrderTracking.displayName = "OrderTracking"

export { OrderTracking }
