"use client"

import React, { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { WizardStep } from "@/components/ui/wizard-step"
import { ChevronLeft, ChevronRight, FileText } from "lucide-react"

export interface WizardStepConfig {
  id: string
  title: string
  description: string
  component: React.ComponentType<WizardStepProps>
  validate?: (data: any) => Promise<boolean> | boolean
  required?: boolean
}

export interface WizardStepProps {
  data: any
  updateData: (data: any) => void
  onNext: () => void
  onBack: () => void
  isValid: boolean
  setIsValid: (valid: boolean) => void
}

interface BookWizardProps {
  steps: WizardStepConfig[]
  onComplete: (data: any) => Promise<void>
  initialData?: any
  className?: string
}

export const BookWizard: React.FC<BookWizardProps> = ({
  steps,
  onComplete,
  initialData = {},
  className
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [wizardData, setWizardData] = useState(initialData)
  const [stepValidation, setStepValidation] = useState<Record<string, boolean>>(
    steps.reduce((acc, step) => ({ ...acc, [step.id]: !step.required }), {})
  )
  const [isProcessing, setIsProcessing] = useState(false)
  const [openaiApiKey, setOpenaiApiKey] = useState("")

  const currentStep = steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  const updateData = useCallback((newData: any) => {
    setWizardData(prevData => ({ ...prevData, ...newData }))
  }, [])

  const setStepValid = useCallback((stepId: string, isValid: boolean) => {
    setStepValidation(prev => ({ ...prev, [stepId]: isValid }))
  }, [])

  const validateCurrentStep = async (): Promise<boolean> => {
    if (!currentStep.validate) {
      return true
    }

    try {
      const isValid = await currentStep.validate(wizardData)
      setStepValid(currentStep.id, isValid)
      return isValid
    } catch (error) {
      console.error('Step validation failed:', error)
      setStepValid(currentStep.id, false)
      return false
    }
  }

  const handleNext = async () => {
    if (isProcessing) return

    const isValid = await validateCurrentStep()
    if (!isValid) return

    if (isLastStep) {
      setIsProcessing(true)
      try {
        await onComplete({ ...wizardData, openaiApiKey })
      } finally {
        setIsProcessing(false)
      }
    } else {
      setCurrentStepIndex(prev => Math.min(prev + 1, steps.length - 1))
    }
  }

  const handleBack = () => {
    if (isProcessing) return
    setCurrentStepIndex(prev => Math.max(prev - 1, 0))
  }

  const jumpToStep = async (stepIndex: number) => {
    if (isProcessing || stepIndex < 0 || stepIndex >= steps.length) return

    // Only allow jumping to previous steps or next step if current is valid
    if (stepIndex < currentStepIndex) {
      setCurrentStepIndex(stepIndex)
    } else if (stepIndex === currentStepIndex + 1) {
      const isValid = await validateCurrentStep()
      if (isValid) {
        setCurrentStepIndex(stepIndex)
      }
    }
  }

  const CurrentStepComponent = currentStep.component

  return (
    <div className={cn("max-w-4xl mx-auto space-y-4", className)}>
      {/* Header with Title and Progress */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <FileText className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Create Your Book</h1>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {currentStepIndex + 1} of {steps.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Step Navigation Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="px-6 py-6 space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">
                Steps
              </h3>
              {steps.map((step, index) => (
                <WizardStep
                  key={step.id}
                  title={step.title}
                  description={step.description}
                  stepNumber={index + 1}
                  isActive={index === currentStepIndex}
                  isCompleted={index < currentStepIndex || stepValidation[step.id]}
                  className={cn(
                    "cursor-pointer transition-opacity hover:opacity-80",
                    index > currentStepIndex + 1 && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => jumpToStep(index)}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <Card className="min-h-[500px]">
            <CardContent className="px-6 py-6">
              {/* Step Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2">{currentStep.title}</h2>
                <p className="text-muted-foreground">{currentStep.description}</p>
              </div>

              {/* Step Content */}
              <div className="mb-8">
                <CurrentStepComponent
                  data={wizardData}
                  updateData={updateData}
                  onNext={handleNext}
                  onBack={handleBack}
                  isValid={stepValidation[currentStep.id] || false}
                  setIsValid={(isValid) => setStepValid(currentStep.id, isValid)}
                  {...(currentStep.id === 'user-prompt' && {
                    openaiApiKey,
                    setOpenaiApiKey
                  })}
                />
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={isFirstStep || isProcessing}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>

                <Button
                  onClick={handleNext}
                  disabled={!stepValidation[currentStep.id] || isProcessing}
                  className="flex items-center gap-2"
                >
                  {isLastStep ? (
                    isProcessing ? (
                      "Creating Book..."
                    ) : (
                      "Create Book"
                    )
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}