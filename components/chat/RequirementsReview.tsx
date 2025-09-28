"use client"

import React from "react"
import { CheckCircle, AlertCircle, FileText, User, Target, Palette, Edit3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export interface BookRequirements {
  topic: string
  purpose?: string
  audience?: {
    demographics: string
    expertiseLevel: string
    readingContext: string
  }
  author?: {
    name: string
    credentials?: string
    experience?: string
  }
  style?: {
    tone: string
    complexity: string
    approach: string
    sample?: string
  }
  scope?: {
    estimatedWordCount: number
    chapterCount: number
    depth: string
  }
  contentOrientation?: string[]
  additionalNotes?: string
}

interface RequirementsReviewProps {
  requirements: BookRequirements
  uploadedFile?: File | null
  onEdit: () => void
  onConfirm: () => void
  className?: string
}

export const RequirementsReview: React.FC<RequirementsReviewProps> = ({
  requirements,
  uploadedFile,
  onEdit,
  onConfirm,
  className
}) => {
  const isComplete = requirements.topic && requirements.audience && requirements.author && requirements.style

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-semibold">Review Your Book Requirements</h3>
          <p className="text-muted-foreground">
            Please review the gathered requirements. You can edit any section before proceeding.
          </p>
        </div>

        {/* Status Indicator */}
        <Card className={`border-2 ${isComplete ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {isComplete ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600" />
              )}
              <div>
                <p className="font-medium">
                  {isComplete ? "Requirements Complete" : "Some requirements missing"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isComplete
                    ? "All essential information has been gathered"
                    : "Continue the conversation to complete missing details"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Book Topic & Purpose */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Book Concept
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-medium mb-1">Topic</h4>
              <p className="text-muted-foreground">
                {requirements.topic || "Not specified"}
              </p>
            </div>
            {requirements.purpose && (
              <div>
                <h4 className="font-medium mb-1">Purpose</h4>
                <p className="text-muted-foreground">{requirements.purpose}</p>
              </div>
            )}
            {requirements.contentOrientation && requirements.contentOrientation.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Content Approach</h4>
                <div className="flex flex-wrap gap-2">
                  {requirements.contentOrientation.map((orientation, index) => (
                    <Badge key={index} variant="secondary">
                      {orientation}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Author Information */}
        {requirements.author && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Author Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-1">Name</h4>
                <p className="text-muted-foreground">{requirements.author.name}</p>
              </div>
              {requirements.author.credentials && (
                <div>
                  <h4 className="font-medium mb-1">Credentials</h4>
                  <p className="text-muted-foreground">{requirements.author.credentials}</p>
                </div>
              )}
              {requirements.author.experience && (
                <div>
                  <h4 className="font-medium mb-1">Experience</h4>
                  <p className="text-muted-foreground">{requirements.author.experience}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Target Audience */}
        {requirements.audience && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Target Audience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-1">Demographics</h4>
                <p className="text-muted-foreground">{requirements.audience.demographics}</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Expertise Level</h4>
                <p className="text-muted-foreground">{requirements.audience.expertiseLevel}</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Reading Context</h4>
                <p className="text-muted-foreground">{requirements.audience.readingContext}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Writing Style */}
        {requirements.style && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Writing Style
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium mb-1">Tone</h4>
                <p className="text-muted-foreground">{requirements.style.tone}</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Complexity</h4>
                <p className="text-muted-foreground">{requirements.style.complexity}</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Approach</h4>
                <p className="text-muted-foreground">{requirements.style.approach}</p>
              </div>
              {requirements.style.sample && (
                <div>
                  <h4 className="font-medium mb-1">Style Sample</h4>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm italic">{requirements.style.sample}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Book Scope */}
        {requirements.scope && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                Book Scope
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {requirements.scope.estimatedWordCount && (
                <div>
                  <h4 className="font-medium mb-1">Estimated Word Count</h4>
                  <p className="text-muted-foreground">
                    {requirements.scope.estimatedWordCount.toLocaleString()} words
                  </p>
                </div>
              )}
              {requirements.scope.chapterCount && (
                <div>
                  <h4 className="font-medium mb-1">Chapter Count</h4>
                  <p className="text-muted-foreground">{requirements.scope.chapterCount} chapters</p>
                </div>
              )}
              {requirements.scope.depth && (
                <div>
                  <h4 className="font-medium mb-1">Content Depth</h4>
                  <p className="text-muted-foreground">{requirements.scope.depth}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reference Material */}
        {uploadedFile && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Reference Material
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
                <FileText className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-medium">{uploadedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional Notes */}
        {requirements.additionalNotes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{requirements.additionalNotes}</p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onEdit}
            className="flex-1 sm:flex-none"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Continue Conversation
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!isComplete}
            className="flex-1"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirm & Create Outline
          </Button>
        </div>

        {!isComplete && (
          <p className="text-sm text-muted-foreground text-center">
            Complete all required sections to proceed with outline creation
          </p>
        )}
      </div>
    </div>
  )
}