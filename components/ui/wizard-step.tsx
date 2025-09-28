import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface WizardStepProps {
  title: string
  description?: string
  isActive?: boolean
  isCompleted?: boolean
  stepNumber: number
  className?: string
}

const WizardStep = React.forwardRef<HTMLDivElement, WizardStepProps>(
  ({ title, description, isActive, isCompleted, stepNumber, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center space-x-4 p-4 rounded-lg transition-colors",
          isActive && "bg-primary/5 border border-primary/20",
          !isActive && !isCompleted && "opacity-50",
          className
        )}
        {...props}
      >
        <div className={cn(
          "flex items-center justify-center rounded-full border-2 text-sm font-medium transition-colors flex-shrink-0",
          "w-8 h-8 min-w-[2rem] min-h-[2rem]",
          isCompleted && "bg-primary text-primary-foreground border-primary",
          isActive && !isCompleted && "bg-primary text-primary-foreground border-primary",
          !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
        )}>
          {isCompleted ? (
            <Check className="w-4 h-4" />
          ) : (
            stepNumber
          )}
        </div>
        <div className="flex-1">
          <h3 className={cn(
            "font-medium leading-tight break-words",
            isActive && "text-foreground",
            !isActive && "text-muted-foreground"
          )}>
            {title}
          </h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1 leading-tight">
              {description}
            </p>
          )}
        </div>
      </div>
    )
  }
)
WizardStep.displayName = "WizardStep"

export { WizardStep }