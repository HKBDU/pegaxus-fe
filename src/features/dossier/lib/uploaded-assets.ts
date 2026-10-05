import { dossierUploadedAssetSchema } from "../schemas";
import type { DossierUploadedAssetRef } from "../types";

export function createDossierUploadedAsset(publicId: string, file: File): DossierUploadedAssetRef {
  return dossierUploadedAssetSchema.parse({
    publicId, fileName: file.name, mimeType: file.type, fileSizeBytes: file.size,
  });
}

// onChange IDs follow the shared uploader's displayed selection order, not completion order.
export function getUploadedAssetReferences(publicIds: readonly string[], assets: ReadonlyMap<string, DossierUploadedAssetRef>) {
  return publicIds.map((publicId) => dossierUploadedAssetSchema.parse(assets.get(publicId)));
}
