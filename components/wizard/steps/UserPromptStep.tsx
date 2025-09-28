"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Upload, FileText, X, AlertCircle, Key, PenTool } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { userPromptSchema, type UserPromptData } from "../validation"
import type { WizardStepProps } from "../BookWizard"

interface UserPromptStepProps extends WizardStepProps {
  openaiApiKey?: string
  setOpenaiApiKey?: (key: string) => void
}

export const UserPromptStep: React.FC<UserPromptStepProps> = ({
  data,
  updateData,
  setIsValid,
  openaiApiKey = "",
  setOpenaiApiKey
}) => {
  const [dragOver, setDragOver] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(
    data.pdfFile || null
  )

  const form = useForm<UserPromptData>({
    resolver: zodResolver(userPromptSchema),
    defaultValues: {
      prompt: data.prompt || "",
      author: data.author || "",
      pdfFile: data.pdfFile || undefined
    },
    mode: "onChange"
  })

  const { watch, formState: { isValid, errors } } = form
  const watchedValues = watch()

  // Memoize step data to prevent infinite re-renders
  const stepData = useMemo(() => ({
    prompt: watchedValues.prompt,
    author: watchedValues.author,
    pdfFile: uploadedFile
  }), [watchedValues.prompt, watchedValues.author, uploadedFile])

  // Update wizard data when form changes
  useEffect(() => {
    updateData(stepData)
  }, [stepData, updateData])

  // Set step validity
  useEffect(() => {
    const stepIsValid = Boolean(watchedValues.prompt?.trim() && watchedValues.author?.trim())
    setIsValid(stepIsValid)
  }, [watchedValues.prompt, watchedValues.author, setIsValid])

  const handleFileUpload = (file: File) => {
    if (file.type === "application/pdf" || file.name.endsWith('.pdf')) {
      if (file.size <= 50 * 1024 * 1024) { // 50MB limit
        setUploadedFile(file)
        form.setValue('pdfFile', file, { shouldValidate: true })
      } else {
        form.setError('pdfFile', {
          type: 'manual',
          message: 'File size must be less than 50MB'
        })
      }
    } else {
      form.setError('pdfFile', {
        type: 'manual',
        message: 'Please upload a PDF file'
      })
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const removeFile = () => {
    setUploadedFile(null)
    form.setValue('pdfFile', undefined, { shouldValidate: true })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <PenTool className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Tell Us About Your Book</h2>
        </div>
        <p className="text-muted-foreground">
          Describe what you want to write about and we'll help you create it
        </p>
      </div>

      <Card>
        <CardContent className="px-6 py-6">
          <Form {...form}>
            <form className="space-y-6">
          {/* User Prompt Field */}
          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base leading-none font-semibold">What book would you like to create?</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe your book in a few sentences or paragraphs. The more detail you provide, the better your book will be."
                    className="min-h-[120px] resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Author Field */}
          <FormField
            control={form.control}
            name="author"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base leading-none font-semibold">Author Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your name or pen name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* PDF Upload Section */}
          <div className="space-y-4">
            <Label className="text-base leading-none font-semibold">Reference Material (Optional)</Label>
            <Card
              className={cn(
                "border-2 border-dashed transition-colors cursor-pointer",
                dragOver && "border-primary bg-primary/5",
                !dragOver && "border-muted-foreground/25 hover:border-muted-foreground/50"
              )}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
            >
              <CardContent className="p-6">
                {uploadedFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-primary" />
                      <div>
                        <p className="font-medium">{uploadedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
                    <div className="space-y-2">
                      <p className="text-lg font-medium">
                        Upload a PDF as reference material to enhance your book content
                      </p>
                      <p className="text-muted-foreground">
                        Drag and drop a PDF file here, or click to browse
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Maximum file size: 50MB
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileInputChange}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('pdf-upload')?.click()}
                    >
                      Choose File
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {errors.pdfFile && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {errors.pdfFile.message}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* OpenAI API Key Section */}
          {setOpenaiApiKey && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <Label htmlFor="openai-key" className="text-base leading-none font-semibold">
                    OpenAI API Key
                  </Label>
                  <Input
                    id="openai-key"
                    type="password"
                    placeholder="sk-..."
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Your key is not stored and only used for this session.
                  </p>
                </div>
              </div>
            </div>
          )}
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Validation Summary */}
      {!isValid && Object.keys(errors).length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please fill in all required fields to continue.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}