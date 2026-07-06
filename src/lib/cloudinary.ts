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
