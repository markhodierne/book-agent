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
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [highestReachedStep, setHighestReachedStep] = useState(0)
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

  // Memoize the setIsValid function for the current step
  const currentStepSetIsValid = useCallback((isValid: boolean) => {
    setStepValid(currentStep.id, isValid)
  }, [currentStep.id, setStepValid])

  const validateCurrentStep = async (): Promise<boolean> => {
    if (!currentStep.validate) {
      return true
    }

    try {
      console.log('Validating step:', currentStep.id, 'with data:', wizardData)
      const isValid = await currentStep.validate(wizardData)
      console.log('Validation result:', isValid)
      setStepValid(currentStep.id, isValid)
      return isValid
    } catch (error) {
      console.error('Step validation failed:', error)
      setStepValid(currentStep.id, false)
      return false
    }
  }

  const handleNext = async () => {
    console.log('handleNext called')
    if (isProcessing) return

    try {
      const isValid = await validateCurrentStep()
      if (!isValid) {
        console.log('Step validation failed, not proceeding')
        return
      }

      // Mark current step as completed
      setCompletedSteps(prev => new Set([...prev, currentStepIndex]))
      setHighestReachedStep(prev => Math.max(prev, currentStepIndex + 1))

      if (isLastStep) {
        console.log('Completing wizard')
        setIsProcessing(true)
        try {
          await onComplete({ ...wizardData, openaiApiKey })
        } finally {
          setIsProcessing(false)
        }
      } else {
        console.log('Moving to next step from', currentStepIndex, 'to', currentStepIndex + 1)
        setCurrentStepIndex(prev => Math.min(prev + 1, steps.length - 1))
        // Scroll to top after state update
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        })
      }
    } catch (error) {
      console.error('Error in handleNext:', error)
    }
  }

  const handleBack = () => {
    if (isProcessing) return
    setCurrentStepIndex(prev => Math.max(prev - 1, 0))
    // Scroll to top after state update
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  const jumpToStep = async (stepIndex: number) => {
    if (isProcessing || stepIndex < 0 || stepIndex >= steps.length) return

    // If clicking on current step, do nothing
    if (stepIndex === currentStepIndex) {
      return
    }

    // Allow jumping to any completed step
    if (completedSteps.has(stepIndex)) {
      setCurrentStepIndex(stepIndex)
      // Scroll to top after state update
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
    } else if (stepIndex <= highestReachedStep) {
      // Allow moving to the next available step if current step is valid
      const isValid = await validateCurrentStep()
      if (isValid) {
        // Mark current step as completed before moving
        setCompletedSteps(prev => new Set([...prev, currentStepIndex]))
        setHighestReachedStep(prev => Math.max(prev, stepIndex))

        setCurrentStepIndex(stepIndex)
        // Scroll to top after state update
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        })
      }
    }
    // Don't allow jumping forward beyond highest reached step
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
              {steps.map((step, index) => {
                const isCompleted = completedSteps.has(index)
                const isCurrent = index === currentStepIndex
                const isClickable = isCompleted || index <= highestReachedStep

                return (
                  <WizardStep
                    key={step.id}
                    title={step.title}
                    description={step.description}
                    stepNumber={index + 1}
                    isActive={isCurrent}
                    isCompleted={isCompleted}
                    className={cn(
                      "transition-opacity",
                      isClickable && !isCurrent && "cursor-pointer hover:opacity-80",
                      isCurrent && "cursor-default", // Current step is not clickable
                      !isClickable && !isCurrent && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => isClickable && !isCurrent && jumpToStep(index)}
                  />
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {/* Step Content - Direct without wrapper card */}
          <div className="mb-8">
            <CurrentStepComponent
              data={wizardData}
              updateData={updateData}
              onNext={handleNext}
              onBack={handleBack}
              isValid={stepValidation[currentStep.id] || false}
              setIsValid={currentStepSetIsValid}
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
        </div>
      </div>
    </div>
  )
}