"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Circle, Clock, AlertCircle } from "lucide-react"

export interface ProgressStepInfo {
  id: string
  title: string
  status: "pending" | "active" | "completed" | "error"
  description?: string
  estimatedTime?: string
}

interface WizardProgressProps {
  steps: ProgressStepInfo[]
  currentStepIndex: number
  totalProgress: number
  className?: string
  showEstimates?: boolean
}

export const WizardProgress: React.FC<WizardProgressProps> = ({
  steps,
  currentStepIndex,
  totalProgress,
  className,
  showEstimates = true
}) => {
  const getStepIcon = (status: ProgressStepInfo["status"], isActive: boolean) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case "active":
        return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-600" />
      default:
        return <Circle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: ProgressStepInfo["status"]) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-200">Completed</Badge>
      case "active":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">In Progress</Badge>
      case "error":
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Progress</span>
          <span className="text-sm font-normal text-muted-foreground">
            {Math.round(totalProgress)}% Complete
          </span>
        </CardTitle>
        <Progress value={totalProgress} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex
          const isCompleted = step.status === "completed"
          const isError = step.status === "error"

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg transition-colors",
                isActive && "bg-primary/5 border border-primary/20",
                isCompleted && "bg-green-50 border border-green-200",
                isError && "bg-red-50 border border-red-200"
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getStepIcon(step.status, isActive)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={cn(
                    "font-medium",
                    isActive && "text-primary",
                    isCompleted && "text-green-700",
                    isError && "text-red-700"
                  )}>
                    {step.title}
                  </h4>
                  {getStatusBadge(step.status)}
                </div>

                {step.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {step.description}
                  </p>
                )}

                {showEstimates && step.estimatedTime && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Estimated time: {step.estimatedTime}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// Alternative compact progress indicator for smaller spaces
interface CompactProgressProps {
  currentStep: number
  totalSteps: number
  stepTitles: string[]
  className?: string
}

export const CompactProgress: React.FC<CompactProgressProps> = ({
  currentStep,
  totalSteps,
  stepTitles,
  className
}) => {
  const progress = ((currentStep + 1) / totalSteps) * 100

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex justify-between text-sm">
        <span className="font-medium">Step {currentStep + 1} of {totalSteps}</span>
        <span className="text-muted-foreground">{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-2" />
      <p className="text-sm text-muted-foreground">
        {stepTitles[currentStep] || "Unknown step"}
      </p>
    </div>
  )
}