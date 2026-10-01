# Presigned Cloudinary upload

Use the shared `presignedUpload` instance. It requests a signature from the API, uploads the file to the exact Cloudinary URL and params returned by the API, confirms the upload, and returns the confirmed `publicId`.

```ts
import { presignedUpload } from "@/shared/utils/presigned"

const publicId = await presignedUpload.upload({
  file,
  entity: "attachment",
  onProgress: console.log,
})
```

`presignedUpload.get(file, entity)` returns a memory-only cached presigned response. `presignedUpload.refresh(file, entity)` invalidates that entry and requests a new signature. The cache is automatically cleared after a successful upload.

The utility never stores tokens or presigned data in persistent storage, never sends the application `Authorization` header to Cloudinary, and never constructs or modifies Cloudinary upload params.
