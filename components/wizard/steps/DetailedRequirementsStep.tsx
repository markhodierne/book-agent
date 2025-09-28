"use client"

import React, { useState, useCallback } from "react"
import { CheckCircle, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ChatInterface, type ChatMessage } from "@/components/chat/ChatInterface"
import type { WizardStepProps } from "../BookWizard"

interface DetailedRequirementsData {
  chatMessages: ChatMessage[]
  requirementsGathered: boolean
  conversationComplete: boolean
}

export const DetailedRequirementsStep: React.FC<WizardStepProps> = ({
  data,
  updateData,
  setIsValid
}) => {
  const [isLoading, setIsLoading] = useState(false)

  // Initialize step data
  const stepData: DetailedRequirementsData = {
    chatMessages: data.chatMessages || [],
    requirementsGathered: data.requirementsGathered || false,
    conversationComplete: data.conversationComplete || false,
    ...data
  }

  // Validate step - requires some conversation and completion flag
  React.useEffect(() => {
    const isValid = stepData.conversationComplete && stepData.chatMessages.length >= 2
    setIsValid(isValid)
  }, [stepData, setIsValid])

  // Handle chat message sending
  const handleSendMessage = useCallback(async (message: string) => {
    setIsLoading(true)

    try {
      // Create user message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: message,
        timestamp: new Date()
      }

      const updatedMessages = [...stepData.chatMessages, userMessage]

      // Simulate AI response for requirements gathering
      const aiResponse = await simulateRequirementsConversation(message, stepData, data)

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse.content,
        timestamp: new Date()
      }

      const finalMessages = [...updatedMessages, aiMessage]

      // Update data with conversation progress
      updateData({
        ...data,
        chatMessages: finalMessages,
        requirementsGathered: aiResponse.requirementsGathered,
        conversationComplete: aiResponse.conversationComplete
      })

    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to get AI response. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [stepData, data, updateData])

  return (
    <div className="space-y-6">
      {/* Direct ChatInterface without extra card wrapper */}
      <div className="h-[500px]">
        <ChatInterface
          messages={stepData.chatMessages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          placeholder="Tell me about scope, audience and writing style..."
          className="h-full"
        />
      </div>

      {/* Progress indicator */}
      {stepData.chatMessages.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          {stepData.conversationComplete ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-600">Requirements gathering complete</span>
            </>
          ) : stepData.requirementsGathered ? (
            <>
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-amber-600">Almost done - please confirm your requirements</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <span className="text-blue-600">Gathering requirements...</span>
            </>
          )}
        </div>
      )}


      {stepData.chatMessages.length > 0 && !stepData.conversationComplete && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Continue the conversation until all requirements are gathered to proceed.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// Simulate AI conversation for requirements gathering
async function simulateRequirementsConversation(
  message: string,
  stepData: DetailedRequirementsData,
  wizardData: any
) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

  const messageCount = stepData.chatMessages.length

  // Progressive conversation flow
  if (messageCount === 0) {
    return {
      content: `Great! I can see you want to write about "${wizardData.prompt || 'your topic'}". Let's dive deeper into the requirements.

First, who is your target audience? Are you writing for:
- Complete beginners who need everything explained
- People with some knowledge who want to go deeper
- Professionals or experts in the field
- A general audience with mixed backgrounds

Tell me about your ideal reader!`,
      requirementsGathered: false,
      conversationComplete: false
    }
  } else if (messageCount === 2) {
    return {
      content: `Perfect! Now let's talk about writing style. What tone and approach do you prefer?

For example:
- **Conversational & friendly** - Like talking to a knowledgeable friend
- **Professional & authoritative** - More formal, expert tone
- **Academic & detailed** - Thorough, research-heavy approach
- **Practical & hands-on** - Focus on actionable steps and examples

What feels right for your book and audience?`,
      requirementsGathered: false,
      conversationComplete: false
    }
  } else if (messageCount === 4) {
    return {
      content: `Excellent choice! Now let's discuss the scope and structure:

How comprehensive do you want this book to be?
- **Quick guide** (10,000-15,000 words, 8-10 chapters) - Focused on essentials
- **Comprehensive guide** (20,000-30,000 words, 12-15 chapters) - Thorough coverage
- **In-depth reference** (30,000+ words, 15+ chapters) - Complete resource

Also, do you want to include:
- Step-by-step tutorials?
- Real-world examples and case studies?
- Practical exercises or worksheets?
- Resource lists and references?

What scope feels right for your vision?`,
      requirementsGathered: true,
      conversationComplete: false
    }
  } else if (messageCount >= 6) {
    return {
      content: `Perfect! I now have a comprehensive understanding of your book requirements:

**Summary of Your Book:**
- **Topic:** ${wizardData.prompt || 'Your chosen topic'}
- **Author:** ${wizardData.author || 'Your name'}
- **Target Audience:** Based on our conversation
- **Writing Style:** The tone and approach we discussed
- **Scope:** The comprehensive level you selected
- **Special Features:** Any extras like tutorials, examples, etc.

Your requirements are now complete! You can proceed to the next step where we'll create a detailed outline based on these requirements.

Ready to move forward?`,
      requirementsGathered: true,
      conversationComplete: true
    }
  }

  // Default fallback
  return {
    content: "I'd love to hear more about that! Can you tell me more details about your preferences?",
    requirementsGathered: false,
    conversationComplete: false
  }
}