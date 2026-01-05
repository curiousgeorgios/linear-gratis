'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export function FormMockup() {
  return (
    <div className="p-6 bg-background min-h-[320px]">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-1">Submit feedback</h3>
        <p className="text-sm text-muted-foreground">
          Help us improve by sharing your thoughts
        </p>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="mock-name" className="text-sm">
              Your name
            </Label>
            <Input
              id="mock-name"
              placeholder="Jane Smith"
              className="h-9 text-sm"
              disabled
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mock-email" className="text-sm">
              Email
            </Label>
            <Input
              id="mock-email"
              type="email"
              placeholder="jane@company.com"
              className="h-9 text-sm"
              disabled
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mock-title" className="text-sm">
            Issue title
          </Label>
          <Input
            id="mock-title"
            placeholder="Brief description of your feedback"
            className="h-9 text-sm"
            disabled
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mock-description" className="text-sm">
            Description
          </Label>
          <Textarea
            id="mock-description"
            placeholder="Provide more details..."
            className="min-h-[80px] text-sm resize-none"
            disabled
          />
        </div>

        <Button className="w-full" disabled>
          Submit feedback
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        Submissions create issues directly in Linear
      </p>
    </div>
  )
}
