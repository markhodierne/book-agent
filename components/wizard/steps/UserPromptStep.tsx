"use client"

import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Upload, FileText, X, AlertCircle } from "lucide-react"
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

export const UserPromptStep: React.FC<WizardStepProps> = ({
  data,
  updateData,
  setIsValid
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

  // Update wizard data when form changes
  useEffect(() => {
    if (isValid) {
      updateData({
        prompt: watchedValues.prompt,
        author: watchedValues.author,
        pdfFile: uploadedFile
      })
    }
    setIsValid(isValid)
  }, [watchedValues, uploadedFile, isValid, updateData, setIsValid])

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
      <Form {...form}>
        <form className="space-y-6">
          {/* User Prompt Field */}
          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What book would you like to create?</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe your book idea in a few words or sentences... (e.g., 'A beginner's guide to machine learning', 'History of ancient Rome', 'Python programming tutorial')"
                    className="min-h-[120px] resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Provide at least 3 characters. The more detail you provide, the better your book will be.
                </FormDescription>
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
                <FormLabel>Author Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your name or pen name"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  This will appear as the author of your book.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* PDF Upload Section */}
          <div className="space-y-4">
            <Label>Reference Material (Optional)</Label>
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
                        Upload a PDF for reference (Optional)
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

            <p className="text-sm text-muted-foreground">
              If you upload a PDF, we&apos;ll use it as reference material to enhance your book content.
            </p>
          </div>
        </form>
      </Form>

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