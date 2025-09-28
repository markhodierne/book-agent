"use client"

import React from "react"
import { BookWizard, UserPromptStep, validateUserPrompt, validateOutline } from "@/components/wizard"
import { DetailedRequirementsStep } from "@/components/wizard/steps/DetailedRequirementsStep"
import { OutlineReviewStep } from "@/components/wizard/steps/OutlineReviewStep"
import type { WizardStepConfig } from "@/components/wizard"

// Demo step component for future steps
const DemoStep: React.FC<any> = ({ data, setIsValid }) => {
  React.useEffect(() => {
    setIsValid(true) // Always valid for demo
  }, [setIsValid])

  return (
    <div className="space-y-4 text-center">
      <h3 className="text-lg font-semibold">Coming Soon</h3>
      <p className="text-muted-foreground">
        This step will be implemented in future tasks.
      </p>
      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm">Current data: {JSON.stringify(data, null, 2)}</p>
      </div>
    </div>
  )
}

// Validation for detailed requirements step
const validateDetailedRequirements = (data: any): boolean => {
  return Boolean(data.conversationComplete && data.chatMessages?.length >= 2)
}

const wizardSteps: WizardStepConfig[] = [
  {
    id: "user-prompt",
    title: "Idea",
    description: "Tell us what book you want to create",
    component: UserPromptStep,
    validate: validateUserPrompt,
    required: true
  },
  {
    id: "detailed-requirements",
    title: "Details",
    description: "Gather details about scope, audience and style",
    component: DetailedRequirementsStep,
    validate: validateDetailedRequirements,
    required: true
  },
  {
    id: "outline",
    title: "Outline",
    description: "Review and customize your book structure",
    component: OutlineReviewStep,
    validate: validateOutline,
    required: true
  },
  {
    id: "generation",
    title: "Book",
    description: "We'll create your book",
    component: DemoStep,
    required: false
  }
]

export default function Home() {
  const handleComplete = async (data: any) => {
    console.log("Wizard completed with data:", data)
    alert("Wizard completed! Check console for data.")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <BookWizard
          steps={wizardSteps}
          onComplete={handleComplete}
          initialData={{
            prompt: "",
            author: "",
            pdfFile: undefined,
            chatMessages: [],
            requirementsGathered: false,
            conversationComplete: false,
            outline: undefined
          }}
        />
      </div>
    </div>
  )
}
