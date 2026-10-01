import * as z from 'zod'

// Shared by the browser and submission route so accepted inputs agree.
// Embedded forms use the current page URL as the reference.
export const publicFormSchema = z.object({
  customerName: z.string().min(1, 'Your name is required').max(200, 'Your name must be 200 characters or fewer'),
  customerEmail: z.string().email('Valid email is required'),
  externalId: z.string().max(2048, 'Reference must be 2,048 characters or fewer').optional(),
  issueTitle: z.string().min(1, 'Issue title is required').max(300, 'Issue title must be 300 characters or fewer'),
  issueBody: z.string().min(1, 'Issue description is required').max(10000, 'Description must be 10,000 characters or fewer'),
  attachmentUrl: z.string().url('Enter a valid attachment URL').optional().or(z.literal('')),
  templateId: z.string().max(100, 'Invalid request type').optional().or(z.literal('')),
})

export type PublicFormValues = z.infer<typeof publicFormSchema>
