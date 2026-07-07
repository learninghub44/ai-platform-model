import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { imageBase64 } = await req.json();
  if (!imageBase64) {
    return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
  }

  try {
    const result = await uploadImage(imageBase64, `avatars/${user.id}`);

    await supabase.from("files").insert({
      user_id: user.id,
      bucket: "cloudinary",
      path: result.public_id,
      cloudinary_public_id: result.public_id,
      cloudinary_url: result.secure_url,
      size_bytes: result.bytes,
      mime_type: `image/${result.format}`,
    });

    await supabase.from("profiles").update({ avatar_url: result.secure_url }).eq("id", user.id);

    return NextResponse.json({ url: result.secure_url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 502 }
    );
  }
}
