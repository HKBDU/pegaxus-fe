import { UPLOAD_MAX_BYTES, UPLOAD_MAX_MB } from "@/shared/constants/upload";

export function getAvatarFileError(
  file: Pick<File, "type" | "size">,
): string | null {
  if (!["image/jpeg", "image/png"].includes(file.type))
    return "Only JPEG and PNG avatars are accepted.";
  if (file.size === 0) return "Avatar must not be empty.";
  if (file.size > UPLOAD_MAX_BYTES)
    return `Avatar must be ${UPLOAD_MAX_MB} MiB or smaller.`;
  return null;
}
