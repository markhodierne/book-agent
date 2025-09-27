import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface ProgressCardProps {
  title: string
  description?: string
  progress: number
  status: "pending" | "in_progress" | "completed" | "error"
  statusText?: string
  className?: string
  details?: string[]
}

const ProgressCard = React.forwardRef<HTMLDivElement, ProgressCardProps>(
  ({ title, description, progress, status, statusText, className, details, ...props }, ref) => {
    const statusConfig = {
      pending: {
        badge: <Badge variant="secondary">Pending</Badge>,
        showSpinner: false
      },
      in_progress: {
        badge: <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">In Progress</Badge>,
        showSpinner: true
      },
      completed: {
        badge: <Badge className="bg-green-100 text-green-700 hover:bg-green-200">Completed</Badge>,
        showSpinner: false
      },
      error: {
        badge: <Badge variant="destructive">Error</Badge>,
        showSpinner: false
      }
    }

    const config = statusConfig[status]

    return (
      <Card
        ref={ref}
        className={cn(
          "transition-all duration-200",
          status === "in_progress" && "ring-2 ring-primary/20",
          className
        )}
        {...props}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {config.showSpinner && <LoadingSpinner size="sm" />}
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
            {config.badge}
          </div>
          {description && (
            <CardDescription>{description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {statusText && (
            <p className="text-sm text-muted-foreground">{statusText}</p>
          )}

          {details && details.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Details:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {details.map((detail, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
)
ProgressCard.displayName = "ProgressCard"

export { ProgressCard }