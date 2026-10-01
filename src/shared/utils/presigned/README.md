# Presigned Upload Utility

This directory contains the client-side utility for uploading files to Cloudinary through a backend-generated presigned upload request.

The client does not generate Cloudinary signatures and does not send Cloudinary credentials from the browser. Instead, it:

1. Requests a presigned upload payload from the backend.
2. Uploads the file directly to Cloudinary.
3. Notifies the backend that the upload has completed.

## Directory structure

| File | Responsibility |
| --- | --- |
| `uploader.ts` | Exposes the `presignedUpload` client and coordinates signing, Cloudinary upload, confirmation, progress reporting, cancellation, caching, and retries. |
| `http.ts` | Calls the backend signing and confirmation endpoints and normalizes backend errors. |
| `types.ts` | Defines request, response, entity, progress, and upload option types. |
| `errors.ts` | Defines `PresignedUploadError`, error codes, and the `isPresignedUploadError` type guard. |
| `index.ts` | Public barrel export for the utility. |

## Public API

Import the utility from the directory index:

```ts
import {
  isPresignedUploadError,
  PRESIGNED_UPLOAD_ERROR_CODES,
  PresignedUploadError,
  presignedUpload,
} from "@/shared/utils/presigned"
```

### `presignedUpload.upload(options)`

Uploads a browser `File` and returns the Cloudinary `publicId` when the backend confirms the upload.

```ts
const publicId = await presignedUpload.upload({
  file,
  entity: "attachment",
  onProgress: ({ stage, percent }) => {
    console.log(`${stage}: ${percent}%`)
  },
})

console.log("Uploaded public ID:", publicId)
```

`UploadFileOptions` contains:

- `file: File` – the file selected in the browser.
- `entity: PresignedUploadEntity` – the upload purpose. Currently, only `"attachment"` is supported.
- `signal?: AbortSignal` – optionally cancels the signing, upload, confirmation, or retry delay.
- `onProgress?: (progress) => void` – receives the current upload stage and an approximate percentage.

### Cancelling an upload

Use `AbortController` when the user leaves a form or clicks a cancel button:

```ts
const controller = new AbortController()

const uploadPromise = presignedUpload.upload({
  file,
  entity: "attachment",
  signal: controller.signal,
})

// Cancel the operation when needed.
controller.abort()

try {
  await uploadPromise
} catch (error) {
  if (isPresignedUploadError(error) && error.code === PRESIGNED_UPLOAD_ERROR_CODES.UPLOAD_CANCELLED) {
    // Handle cancellation separately from a failed upload.
  }
}
```

### Progress stages

The progress callback reports these stages:

| Stage | Percentage | Meaning |
| --- | ---: | --- |
| `signing` | `0` | Requesting a presigned upload payload from the backend. |
| `uploading` | `25` | Sending the file to Cloudinary. |
| `confirming` | `75` | Asking the backend to confirm the Cloudinary upload. |
| `completed` | `100` | The upload has been confirmed successfully. |

The percentages represent lifecycle milestones, not byte-level upload progress. The current implementation uses `fetch`, so it does not report the actual number of bytes uploaded to Cloudinary.

### Presigned response cache

`presignedUpload.get(file, entity, signal?)` is available for retrieving a presigned response, and `refresh(file, entity, signal?)` forces a new request. Responses are cached per `File` and entity for 60 seconds, and identical concurrent requests share the same pending promise.

```ts
const presigned = await presignedUpload.get(file, "attachment")

// Force the cached response to be discarded and request a new one.
const refreshed = await presignedUpload.refresh(file, "attachment")

// Clear one entity or every cached entity for the file.
presignedUpload.clear(file, "attachment")
presignedUpload.clear(file)
```

In most cases, call `upload()` directly. The cache methods are useful when a screen needs to prepare or explicitly invalidate a presigned request.

## Backend contract

The HTTP layer uses the configured `apiClient` and expects these endpoints:

### Request a signature

`POST /uploads/signature`

Request body:

```json
{
  "entity": "attachment",
  "contentType": "image/png",
  "sizeBytes": 123456
}
```

The response must contain a `publicId` and an upload payload:

```json
{
  "publicId": "attachments/example-file",
  "upload": {
    "url": "https://api.cloudinary.com/v1_1/<cloud-name>/auto/upload",
    "params": {
      "api_key": "...",
      "timestamp": "...",
      "signature": "..."
    }
  }
}
```

The response may be wrapped by the API client in either `{ "value": ... }` or `{ "data": ... }`; `http.ts` unwraps both forms. The upload URL must use HTTPS and the `api.cloudinary.com` hostname.

### Confirm the upload

`POST /uploads/confirm`

Request body:

```json
{
  "publicId": "attachments/example-file"
}
```

The backend should verify that the Cloudinary asset exists and that the returned `publicId` is valid for the requested upload.

## Error handling

Upload failures are represented by `PresignedUploadError` when they can be classified by the utility or the backend.

```ts
try {
  const publicId = await presignedUpload.upload({
    file,
    entity: "attachment",
  })
} catch (error) {
  if (!isPresignedUploadError(error)) throw error

  switch (error.code) {
    case PRESIGNED_UPLOAD_ERROR_CODES.FILE_REJECTED:
      // Show a validation message to the user.
      break
    case PRESIGNED_UPLOAD_ERROR_CODES.UPLOAD_CANCELLED:
      // The user or application cancelled the upload.
      break
    case PRESIGNED_UPLOAD_ERROR_CODES.TOO_MANY_REQUESTS:
      // Ask the user to try again later.
      break
    default:
      // Handle an unexpected or infrastructure failure.
      console.error(error.code, error.status)
  }
}
```

Available error codes are:

- `FILE_NOT_FOUND_ON_CLOUD`
- `FILE_REJECTED`
- `UPLOAD_EXPIRED`
- `PURPOSE_NOT_ALLOWED`
- `PUBLIC_ID_MISMATCH`
- `TOO_MANY_REQUESTS`
- `CLOUDINARY_SIGNATURE_INVALID`
- `CLOUDINARY_UPLOAD_FAILED`
- `PRESIGNED_URL_INVALID`
- `UPLOAD_CANCELLED`
- `UNKNOWN`

`error.status` contains the HTTP status when one is available. `error.retryable` indicates whether the confirmation request can be retried.

## Retry behavior

- Confirmation requests retry up to three total attempts for retryable failures.
- Retry delays are 500 ms and 1 second.
- A Cloudinary signature failure causes the cached presigned response to be cleared and the upload to be attempted again with a fresh response.
- If confirmation reports `FILE_NOT_FOUND_ON_CLOUD`, the cache is cleared and the complete signing/upload/confirmation flow is retried once.
- Successful uploads clear the cached presigned response.

## Adding another upload entity

Add the new value to `PRESIGNED_UPLOAD_ENTITIES` in `types.ts`:

```ts
export const PRESIGNED_UPLOAD_ENTITIES = ["attachment", "avatar"] as const
```

The backend must also accept the new entity and apply the appropriate validation and storage rules.

## Security notes

- Keep Cloudinary API secrets on the backend. The browser should only receive the short-lived, scoped upload parameters needed for one upload.
- Do not commit `.env` secrets or include them in client-side documentation.
- The utility uses `credentials: "omit"` for the direct Cloudinary request; application authentication is handled by the backend API calls through `apiClient`.
