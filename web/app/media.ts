const developmentApiBaseUrl =
  "https://kiyoyo-dev-api-kwlb74l7uq-ew.a.run.app";
const developmentMediaBucket = "kiyoyo-dev-media";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? developmentApiBaseUrl;
const mediaBucket =
  process.env.NEXT_PUBLIC_MEDIA_BUCKET ?? developmentMediaBucket;

const encodeObjectKey = (objectKey: string) =>
  btoa(objectKey)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

export function mediaUrlFromBucketPath(
  imageKey: string | null | undefined,
  baseUrl = apiBaseUrl,
) {
  if (!imageKey) return "";
  if (!imageKey.startsWith("gcs://")) return imageKey;
  const objectKey = imageKey.split("/").slice(3).join("/");
  return objectKey ? `${baseUrl}/v1/media/${encodeObjectKey(objectKey)}` : "";
}

export function seededProductMedia(objectKey: string) {
  const imageKey = `gcs://${mediaBucket}/${objectKey}`;
  return { imageKey, image: mediaUrlFromBucketPath(imageKey) };
}
