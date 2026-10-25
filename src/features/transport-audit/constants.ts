import {
  Archive,
  ClipboardList,
  FileCheck,
  FileText,
  Heart,
  Route,
  ShieldCheck,
} from "lucide-react";
import type {
  AuditSection,
  ExportFormat,
  ExportMode,
  ExportStatus,
} from "./types";
export const AUDIT_SECTIONS: {
  id: AuditSection;
  label: string;
  icon: typeof Archive;
}[] = [
  { id: "booking", label: "Booking", icon: ClipboardList },
  { id: "horses", label: "Horses", icon: Heart },
  { id: "routing", label: "Routing", icon: Route },
  { id: "compliance", label: "Compliance", icon: ShieldCheck },
  { id: "operations", label: "Operations", icon: FileCheck },
  { id: "finance", label: "Finance", icon: FileText },
];
export const EXPORT_FORMAT: Record<ExportFormat, ExportFormat> = {
  ZIP: "ZIP",
  PDF: "PDF",
};
export const EXPORT_MODE: Record<ExportMode, ExportMode> = {
  STANDARD: "STANDARD",
  INSURANCE: "INSURANCE",
};
export const EXPORT_STATUS: Record<ExportStatus, ExportStatus> = {
  QUEUED: "QUEUED",
  PROCESSING: "PROCESSING",
  READY: "READY",
  FAILED: "FAILED",
  EXPIRED: "EXPIRED",
};
export const POLLING_INTERVAL_MS = 3000;
