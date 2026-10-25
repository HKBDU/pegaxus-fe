import { isAxiosError } from "axios";
import { z } from "zod";
import apiClient from "@/lib/axios";
import {
  reportParams,
  incidentReportParams,
  transitReportParams,
} from "./filters";
import {
  envelopeSchema,
  type ExportFormat,
  type ReportFilters,
  type IncidentFilters,
  type TransitFilters,
} from "./schemas";
import {
  assertReportAccess,
  envelopeError,
  ReportError,
  reportError,
} from "./services";

const binarySchema = z.object({
  binary: z.instanceof(Blob),
  contentType: z.string(),
  disposition: z.string(),
  status: z.number().int(),
});
const mime = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

function downloadName(
  disposition: string,
  fallback: string,
  format: ExportFormat,
) {
  const extended = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disposition)?.[1];
  const plain = /filename\s*=\s*(?:"([^"]+)"|([^;]+))/i.exec(disposition);
  let name = plain?.[1] ?? plain?.[2]?.trim();
  if (extended) {
    try {
      name = decodeURIComponent(extended.trim());
    } catch {
      return fallback;
    }
  }
  if (
    !name ||
    name.length > 180 ||
    Array.from(name).some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    ) ||
    /[<>:"/\\|?*]/.test(name) ||
    !name.toLowerCase().endsWith(`.${format}`) ||
    name.startsWith(".")
  )
    return fallback;
  return name;
}

async function binaryError(payload: unknown): Promise<ReportError | null> {
  const parsed = binarySchema.safeParse(payload);
  if (
    !parsed.success ||
    !/json/i.test(parsed.data.contentType || parsed.data.binary.type)
  )
    return null;
  try {
    const envelope = envelopeSchema.safeParse(
      JSON.parse(await parsed.data.binary.text()),
    );
    return envelope.success
      ? envelopeError(envelope.data, parsed.data.status)
      : new ReportError(
          "INVALID_EXPORT",
          "The export service returned an unexpected JSON response.",
        );
  } catch {
    return new ReportError(
      "INVALID_EXPORT",
      "The export service returned unreadable error data.",
    );
  }
}

async function exportReport(
  selection:
    | { reportType: "on-time-delivery"; filters: ReportFilters }
    | { reportType: "incident-claim-frequency"; filters: IncidentFilters }
    | { reportType: "transit-time"; filters: TransitFilters },
  format: ExportFormat,
  scope: string,
  signal: AbortSignal,
) {
  const { filters, reportType } = selection;
  try {
    assertReportAccess(scope, signal);
    // Capture binary metadata before the shared response interceptor unwraps response.data.
    const payload = await apiClient.get<unknown, unknown>(
      `/reports/${reportType}/export`,
      {
        params:
          selection.reportType === "on-time-delivery"
            ? reportParams(selection.filters, format)
            : selection.reportType === "incident-claim-frequency"
              ? incidentReportParams(selection.filters, format)
              : transitReportParams(selection.filters, format),
        responseType: "blob",
        signal,
        transformResponse: [
          (data: unknown, headers, status) => ({
            binary: data,
            contentType: String(headers["content-type"] ?? ""),
            disposition: String(headers["content-disposition"] ?? ""),
            status,
          }),
        ],
      },
    );
    assertReportAccess(scope, signal);
    const failure = await binaryError(payload);
    if (failure) throw failure;
    const result = binarySchema.parse(payload);
    if (
      result.status < 200 ||
      result.status >= 300 ||
      result.contentType.split(";")[0].trim().toLowerCase() !== mime[format]
    )
      throw new ReportError(
        "INVALID_EXPORT",
        "The service did not return the requested file type. No file was downloaded.",
      );
    const bytes = new Uint8Array(await result.binary.slice(0, 8).arrayBuffer());
    const signature =
      format === "pdf"
        ? String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-"
        : bytes[0] === 0x50 &&
          bytes[1] === 0x4b &&
          bytes[2] === 3 &&
          bytes[3] === 4;
    if (!signature)
      throw new ReportError(
        "INVALID_EXPORT",
        "The downloaded content has an invalid file signature. No file was downloaded.",
      );
    assertReportAccess(scope, signal);
    return {
      blob: result.binary,
      filename: downloadName(
        result.disposition,
        `${reportType}-${filters.dateFrom}_${filters.dateTo}.${format}`,
        format,
      ),
    };
  } catch (error) {
    if (isAxiosError(error)) {
      const parsed = await binaryError(error.response?.data);
      if (parsed) throw parsed;
    }
    throw reportError(error);
  }
}

export function exportOnTimeReport(
  filters: ReportFilters,
  format: ExportFormat,
  scope: string,
  signal: AbortSignal,
) {
  return exportReport(
    { reportType: "on-time-delivery", filters },
    format,
    scope,
    signal,
  );
}
export function exportIncidentClaimReport(
  filters: IncidentFilters,
  format: ExportFormat,
  scope: string,
  signal: AbortSignal,
) {
  return exportReport(
    { reportType: "incident-claim-frequency", filters },
    format,
    scope,
    signal,
  );
}

export function exportTransitTimeReport(
  filters: TransitFilters,
  format: ExportFormat,
  scope: string,
  signal: AbortSignal,
) {
  return exportReport(
    { reportType: "transit-time", filters },
    format,
    scope,
    signal,
  );
}

export function saveReportFile(file: { blob: Blob; filename: string }) {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  try {
    link.href = url;
    link.download = file.filename;
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
