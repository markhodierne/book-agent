"use client"

import React from "react"
import { BookWizard, UserPromptStep, validateUserPrompt } from "@/components/wizard"
import type { WizardStepConfig } from "@/components/wizard"

// Demo step component for testing
const DemoStep: React.FC<any> = ({ data, setIsValid }) => {
  React.useEffect(() => {
    setIsValid(true) // Always valid for demo
  }, [setIsValid])

  return (
    <div className="space-y-4 text-center">
      <h3 className="text-lg font-semibold">Demo Step</h3>
      <p className="text-muted-foreground">
        This is a placeholder step for testing wizard navigation.
      </p>
      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm">Current data: {JSON.stringify(data, null, 2)}</p>
      </div>
    </div>
  )
}

const wizardSteps: WizardStepConfig[] = [
  {
    id: "user-prompt",
    title: "Book Idea",
    description: "Tell us what book you want to create",
    component: UserPromptStep,
    validate: validateUserPrompt,
    required: true
  },
  {
    id: "requirements",
    title: "Requirements",
    description: "Define your book's audience and style",
    component: DemoStep,
    required: true
  },
  {
    id: "outline",
    title: "Outline",
    description: "Review and customize your book structure",
    component: DemoStep,
    required: true
  },
  {
    id: "generation",
    title: "Generation",
    description: "We'll create your book",
    component: DemoStep,
    required: false
  }
]

export default function WizardDemoPage() {
  const handleComplete = async (data: any) => {
    console.log("Wizard completed with data:", data)
    alert("Wizard completed! Check console for data.")
  }

  return (
    <div className="container mx-auto py-8">
      <BookWizard
        steps={wizardSteps}
        onComplete={handleComplete}
        initialData={{
          prompt: "",
          author: "",
          pdfFile: undefined
        }}
      />
    </div>
  )
}