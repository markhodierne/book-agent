"use client"

import React, { useState, useCallback, useMemo } from "react"
import { CheckCircle, AlertCircle, MessageSquare } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ChatInterface, type ChatMessage } from "@/components/chat/ChatInterface"
import type { WizardStepProps } from "../BookWizard"

interface DetailedRequirementsData {
  chatMessages: ChatMessage[]
  requirementsGathered: boolean
  conversationComplete: boolean
  planningComplete?: boolean
  planningContext?: any
  planningAnalysis?: any
}

export const DetailedRequirementsStep: React.FC<WizardStepProps> = ({
  data,
  updateData,
  setIsValid
}) => {
  const [isLoading, setIsLoading] = useState(false)

  // Initialize step data with useMemo to prevent infinite re-renders
  const stepData: DetailedRequirementsData = useMemo(() => ({
    chatMessages: data.chatMessages || [],
    requirementsGathered: data.requirementsGathered || false,
    conversationComplete: data.conversationComplete || false,
    ...data
  }), [data])

  // Validate step - requires some conversation and completion flag
  React.useEffect(() => {
    const isValid = stepData.conversationComplete && stepData.chatMessages.length >= 2
    setIsValid(isValid)
  }, [stepData.conversationComplete, stepData.chatMessages.length, setIsValid])

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

      // Call the LangGraph workflow
      const aiResponse = await callLangGraphWorkflow(message, stepData, data)

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse.content,
        timestamp: new Date()
      }

      const finalMessages = [...updatedMessages, aiMessage]

      // Update data with conversation progress and planning results
      updateData({
        ...data,
        chatMessages: finalMessages,
        requirementsGathered: aiResponse.requirementsGathered,
        conversationComplete: aiResponse.conversationComplete,
        planningComplete: aiResponse.planningAnalysis ? true : (data.planningComplete || false),
        planningAnalysis: aiResponse.planningAnalysis || data.planningAnalysis,
        planningContext: aiResponse.planningContext || data.planningContext,
        requirements: aiResponse.requirements || data.requirements,
        styleGuide: aiResponse.styleGuide || data.styleGuide,
        sessionId: aiResponse.sessionId || data.sessionId
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
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Let's Plan Your Book Together</h2>
        </div>
        <p className="text-muted-foreground">
          Chat with our AI to refine your concept and gather detailed requirements
        </p>
      </div>

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

// LangGraph workflow execution agent
async function callLangGraphWorkflow(
  message: string,
  stepData: DetailedRequirementsData,
  wizardData: any
) {
  try {
    console.log('🤖 Calling LangGraph workflow...');

    // First, execute planning stage if not already done
    if (!stepData.planningComplete) {
      console.log('📊 Executing planning stage...');
      const planningResponse = await fetch('/api/workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrompt: wizardData.prompt,
          action: 'planning',
          sessionId: wizardData.sessionId
        })
      });

      if (!planningResponse.ok) {
        throw new Error(`Planning stage failed: ${planningResponse.status}`);
      }

      const planningData = await planningResponse.json();
      if (!planningData.success) {
        throw new Error(planningData.error || 'Planning stage failed');
      }

      console.log('✅ Planning stage completed:', {
        complexity: planningData.planningContext?.complexity,
        strategy: planningData.planningContext?.strategy,
        nextStage: planningData.nextStage
      });

      // If planning recommends skipping detailed conversation, complete immediately
      if (planningData.nextStage === 'outline') {
        return {
          content: `🎯 **Planning Analysis Complete!**

Based on your request, I've determined this is a ${planningData.planningContext.complexity} complexity project that can proceed directly to outline creation.

**📊 Analysis Results:**
• **Complexity Level**: ${planningData.planningContext.complexity.toUpperCase()}
• **Generation Strategy**: ${planningData.planningContext.strategy.toUpperCase()}
• **Content Approach**: ${planningData.planningContext.approach.replace('_', ' ').toUpperCase()}
• **Recommended Scope**: ${planningData.planningContext.estimatedWordCount.toLocaleString()} words across ${planningData.planningContext.chapterCount} chapters
• **Research Level**: ${planningData.planningContext.researchIntensity.toUpperCase()}
• **Time Estimate**: ~${planningData.planningContext.estimatedDuration} minutes

Ready to proceed to outline creation!`,
          requirementsGathered: true,
          conversationComplete: true,
          planningAnalysis: planningData.planningAnalysis,
          planningContext: planningData.planningContext,
          sessionId: planningData.sessionId
        };
      }

      // Store planning results for conversation stage
      stepData.planningComplete = true;
      stepData.planningContext = planningData.planningContext;
      stepData.planningAnalysis = planningData.planningAnalysis;
    }

    // Execute conversation stage
    console.log('💬 Executing conversation stage...');
    const conversationResponse = await fetch('/api/workflow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userPrompt: wizardData.prompt,
        action: 'conversation',
        sessionId: wizardData.sessionId
      })
    });

    if (!conversationResponse.ok) {
      throw new Error(`Conversation stage failed: ${conversationResponse.status}`);
    }

    const conversationData = await conversationResponse.json();
    if (!conversationData.success) {
      throw new Error(conversationData.error || 'Conversation stage failed');
    }

    console.log('✅ Conversation stage completed');

    // Format the response content based on conversation results
    const content = `🎯 **Requirements Gathering Complete!**

I've collected comprehensive requirements for your book through our structured conversation process.

**📊 Collected Information:**
• **Topic**: ${conversationData.requirements?.topic}
• **Target Audience**: ${conversationData.requirements?.audience?.demographics} (${conversationData.requirements?.audience?.expertiseLevel} level)
• **Author**: ${conversationData.requirements?.author?.name}
• **Word Count Target**: ${conversationData.requirements?.wordCountTarget?.toLocaleString()} words
• **Writing Style**: ${conversationData.styleGuide?.tone} tone, ${conversationData.styleGuide?.formality} formality

Your requirements are complete! Ready to proceed to outline creation.`;

    return {
      content,
      requirementsGathered: true,
      conversationComplete: true,
      requirements: conversationData.requirements,
      styleGuide: conversationData.styleGuide,
      conversationHistory: conversationData.conversationHistory,
      planningAnalysis: stepData.planningAnalysis,
      planningContext: stepData.planningContext,
      sessionId: conversationData.sessionId
    };

  } catch (error) {
    console.error('❌ LangGraph workflow failed:', error);

    // Fallback response
    return {
      content: "I'm sorry, I'm having trouble processing that right now. The workflow system encountered an error. Please try again.",
      requirementsGathered: false,
      conversationComplete: false
    };
  }
}

// Helper function to describe complexity levels
function getComplexityDescription(complexity: string): string {
  switch (complexity) {
    case 'simple': return 'straightforward content, easy to follow';
    case 'moderate': return 'balanced depth, requires some expertise';
    case 'complex': return 'advanced concepts, significant research needed';
    case 'expert': return 'highly specialized, comprehensive coverage required';
    default: return 'well-structured content';
  }
}