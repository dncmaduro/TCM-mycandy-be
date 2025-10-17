import { Document, Schema, model } from "mongoose"

export interface Sprint extends Document {
  name: string
  startDate: Date
  endDate: Date
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export const SprintSchema = new Schema<Sprint>({
  name: { type: String, required: true, trim: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null }
})

export const SprintModel = model<Sprint>("Sprint", SprintSchema)
