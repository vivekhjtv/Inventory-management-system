import { z } from "zod";

/**
 * Zod Validation Schemas for Dispatch and Delivery Challan
 */

// Phone number regex: accepts Indian 10-digit mobile numbers (optionally prefixed with +91 or 0)
const phoneRegex = /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6-9]\d{9}$/;

export const challanHeaderSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, "Customer name is required")
    .min(2, "Customer name must be at least 2 characters"),
  customerPhone: z
    .string()
    .trim()
    .refine(
      (val) => !val || phoneRegex.test(val.replace(/\s+/g, "")),
      "Please enter a valid 10-digit mobile number (e.g. 9876543210)"
    )
    .optional(),
  customerAddress: z
    .string()
    .trim()
    .max(300, "Site address cannot exceed 300 characters")
    .optional(),
  challanNo: z
    .string()
    .trim()
    .max(50, "Challan number cannot exceed 50 characters")
    .optional(),
  workerId: z
    .string()
    .trim()
    .min(1, "Please assign a site technician or worker"),
  remarks: z
    .string()
    .trim()
    .max(500, "Remarks cannot exceed 500 characters")
    .optional(),
});

export type ChallanHeaderInput = z.infer<typeof challanHeaderSchema>;

// Schema for component quantity and stock check
export const componentItemValidationSchema = z
  .object({
    itemId: z.string().optional(),
    quantity: z
      .number({ message: "Quantity must be a valid number" })
      .int("Quantity must be a whole number")
      .min(0, "Quantity cannot be negative"),
    availableStock: z.number(),
    locationName: z.string(),
    itemName: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.quantity > 0) {
      if (!data.itemId) {
        ctx.addIssue({
          code: "custom",
          message: "Please select an item model for this component",
          path: ["itemId"],
        });
      } else if (data.availableStock <= 0) {
        ctx.addIssue({
          code: "custom",
          message: `Out of stock in ${data.locationName} (0 available). Switch warehouse or select another model.`,
          path: ["quantity"],
        });
      } else if (data.quantity > data.availableStock) {
        ctx.addIssue({
          code: "custom",
          message: `Requested ${data.quantity} exceeds available stock (${data.availableStock} in ${data.locationName}).`,
          path: ["quantity"],
        });
      }
    }
  });

// Schema for extra custom item rows
export const extraChallanRowValidationSchema = z
  .object({
    rowId: z.string(),
    itemId: z.string().trim().min(1, "Please select an item or delete this row"),
    quantity: z
      .number({ message: "Quantity must be a number" })
      .int("Quantity must be a whole number")
      .min(1, "Quantity must be at least 1"),
    availableStock: z.number(),
    locationName: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.itemId && data.quantity > 0) {
      if (data.availableStock <= 0) {
        ctx.addIssue({
          code: "custom",
          message: `0 stock available in ${data.locationName}. Switch location or delete this row.`,
          path: ["quantity"],
        });
      } else if (data.quantity > data.availableStock) {
        ctx.addIssue({
          code: "custom",
          message: `Exceeds stock: only ${data.availableStock} available in ${data.locationName}.`,
          path: ["quantity"],
        });
      }
    }
  });

// Single Item Direct Dispatch Schema
export const singleDispatchSchema = z
  .object({
    itemId: z.string().trim().min(1, "Please select a solar item to dispatch"),
    quantity: z
      .number({ message: "Quantity must be a number" })
      .int("Quantity must be a whole number")
      .min(1, "Quantity must be at least 1"),
    availableStock: z.number(),
    locationName: z.string(),
    siteOrCustomer: z
      .string()
      .trim()
      .min(1, "Customer or site reference is required")
      .min(2, "Customer name must be at least 2 characters"),
    customerPhone: z
      .string()
      .trim()
      .refine(
        (val) => !val || phoneRegex.test(val.replace(/\s+/g, "")),
        "Please enter a valid 10-digit mobile number"
      )
      .optional(),
    customerAddress: z.string().trim().max(300).optional(),
    docNo: z.string().trim().max(50).optional(),
    workerId: z.string().trim().min(1, "Please select an assigned technician"),
    remarks: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.availableStock <= 0) {
      ctx.addIssue({
        code: "custom",
        message: `Out of stock: 0 available in ${data.locationName}.`,
        path: ["quantity"],
      });
    } else if (data.quantity > data.availableStock) {
      ctx.addIssue({
        code: "custom",
        message: `Requested ${data.quantity} exceeds available ${data.availableStock} in ${data.locationName}.`,
        path: ["quantity"],
      });
    }
  });

// Batch Dispatch Staging Schema
export const batchStagingItemSchema = z
  .object({
    itemId: z.string().trim().min(1, "Please select an item to stage"),
    quantity: z
      .number({ message: "Quantity must be a number" })
      .int("Quantity must be a whole number")
      .min(1, "Quantity must be at least 1"),
    availableStock: z.number(),
    locationName: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.availableStock <= 0) {
      ctx.addIssue({
        code: "custom",
        message: `Out of stock in ${data.locationName}.`,
        path: ["quantity"],
      });
    } else if (data.quantity > data.availableStock) {
      ctx.addIssue({
        code: "custom",
        message: `Requested ${data.quantity} exceeds available stock (${data.availableStock} in ${data.locationName}).`,
        path: ["quantity"],
      });
    }
  });

// Batch Header Details Schema
export const batchDispatchHeaderSchema = z.object({
  siteOrCustomer: z
    .string()
    .trim()
    .min(1, "Customer or site reference is required")
    .min(2, "Customer name must be at least 2 characters"),
  customerPhone: z
    .string()
    .trim()
    .refine(
      (val) => !val || phoneRegex.test(val.replace(/\s+/g, "")),
      "Please enter a valid 10-digit mobile number"
    )
    .optional(),
  customerAddress: z.string().trim().max(300).optional(),
  docNo: z.string().trim().max(50).optional(),
  workerId: z.string().trim().min(1, "Please select an assigned technician"),
  remarks: z.string().trim().max(500).optional(),
});
