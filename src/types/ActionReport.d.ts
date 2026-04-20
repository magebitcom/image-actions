import type { ProcessedImagesResult } from './ProcessedImage'

export interface ActionSummaryReport {
  processingResults: ProcessedImagesResult
  commitSha?: string
}
