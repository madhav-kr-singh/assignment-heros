import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const leadStatusEnum = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] as const;

export const createLeadSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
  phone: z.string().trim().optional(),
  company: z.string().trim().optional(),
  source: z.string().trim().default('web'),
});

export const updateLeadSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email('Invalid email address').optional(),
  phone: z.string().trim().optional(),
  company: z.string().trim().optional(),
  source: z.string().trim().optional(),
  status: z.enum(leadStatusEnum).optional(),
  assignedTo: z
    .string()
    .regex(objectIdRegex, 'Invalid User ID format')
    .nullable()
    .optional(),
});

export const addNoteSchema = z.object({
  text: z.string().trim().min(1, 'Note text is required').max(1000, 'Note cannot exceed 1000 characters'),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type AddNoteInput = z.infer<typeof addNoteSchema>;
