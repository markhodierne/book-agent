"use client"

import React from "react"
import { BookWizard, UserPromptStep, validateUserPrompt, validateOutline, BookGenerationStep } from "@/components/wizard"
import { DetailedRequirementsStep } from "@/components/wizard/steps/DetailedRequirementsStep"
import { OutlineReviewStep } from "@/components/wizard/steps/OutlineReviewStep"
import type { WizardStepConfig } from "@/components/wizard"


// Validation for detailed requirements step
const validateDetailedRequirements = (data: any): boolean => {
  return Boolean(data.conversationComplete && data.chatMessages?.length >= 2)
}

// Validation for book generation step
const validateBookGeneration = (data: any): boolean => {
  // Step is valid when PDF is ready for download
  return Boolean(data.pdfReady === true)
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
    description: "Generate and download your book",
    component: BookGenerationStep,
    validate: validateBookGeneration,
    required: true
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
            outline: undefined,
            pdfReady: false
          }}
        />
      </div>
    </div>
  )
}
