import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadImage(fileBase64OrUrl: string, folder = "uploads") {
  return cloudinary.uploader.upload(fileBase64OrUrl, {
    folder,
    resource_type: "image",
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  });
}

/**
 * Uploads any file type (images, PDFs, docs, zips, ...) via Cloudinary's
 * `resource_type: "auto"`, which is how non-image files land there without
 * a separate Supabase Storage bucket. Images still get the auto quality /
 * format transform; everything else is stored as-is.
 */
export async function uploadFile(fileBase64: string, folder = "uploads", filename?: string) {
  return cloudinary.uploader.upload(fileBase64, {
    folder,
    resource_type: "auto",
    use_filename: Boolean(filename),
    unique_filename: true,
    filename_override: filename,
  });
}

export function getOptimizedUrl(publicId: string, opts: { width?: number; height?: number } = {}) {
  return cloudinary.url(publicId, {
    quality: "auto",
    fetch_format: "auto",
    width: opts.width,
    height: opts.height,
    crop: opts.width || opts.height ? "fill" : undefined,
  });
}

export default cloudinary;
