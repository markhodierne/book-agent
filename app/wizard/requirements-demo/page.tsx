"use client"

import React from "react"
import { BookWizard } from "@/components/wizard"
import { RequirementsStep } from "@/components/wizard/steps/RequirementsStep"
import type { WizardStepConfig } from "@/components/wizard"

// Simple validation for requirements step
const validateRequirements = (data: any): boolean => {
  return Boolean(
    data.prompt?.trim() &&
    data.author?.trim() &&
    data.requirements &&
    data.requirementsConfirmed
  )
}

// Demo completion step
const CompletionStep: React.FC<any> = ({ data, setIsValid }) => {
  React.useEffect(() => {
    setIsValid(true)
  }, [setIsValid])

  return (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <h3 className="text-2xl font-semibold">Requirements Complete!</h3>
        <p className="text-muted-foreground">
          Your book requirements have been successfully gathered.
        </p>
      </div>

      <div className="text-left max-w-2xl mx-auto">
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Gathered Data:</h4>
          <pre className="text-xs overflow-auto max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        In a real implementation, this would proceed to outline generation.
      </div>
    </div>
  )
}

const requirementsWizardSteps: WizardStepConfig[] = [
  {
    id: "requirements",
    title: "Requirements Gathering",
    description: "Tell us about your book and gather detailed requirements",
    component: RequirementsStep,
    validate: validateRequirements,
    required: true
  },
  {
    id: "completion",
    title: "Complete",
    description: "Requirements gathered successfully",
    component: CompletionStep,
    required: false
  }
]

export default function RequirementsDemoPage() {
  const handleComplete = async (data: any) => {
    console.log("Requirements wizard completed with data:", data)
    alert("Requirements gathering completed! Check console for full data.")
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Requirements Gathering Demo</h1>
        <p className="text-muted-foreground">
          Test the AI-powered conversation interface for gathering book requirements
        </p>
      </div>

      <BookWizard
        steps={requirementsWizardSteps}
        onComplete={handleComplete}
        initialData={{
          prompt: "",
          author: "",
          pdfFile: undefined,
          chatMessages: [],
          requirements: undefined,
          requirementsConfirmed: false
        }}
      />
    </div>
  )
}