import sharp from "sharp";

// .rotate() with no args auto-orients from the EXIF Orientation tag, then
// drops it — and sharp's .webp() output carries no metadata by default
// (confirmed empirically: no .withMetadata() call needed), so GPS/EXIF data
// never survives into the stored file. 512x512 cover-crop keeps every
// avatar surface (nav, lists, profile hero) square regardless of the
// source photo's aspect ratio.
export async function processAvatarImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize(512, 512, { fit: "cover" })
    .webp()
    .toBuffer();
}
