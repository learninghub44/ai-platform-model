import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadFile } from "@/lib/cloudinary";

// Anything bigger than this fails fast with a clear error instead of a
// timeout or an opaque Cloudinary rejection.
const MAX_BYTES = 20 * 1024 * 1024; // 20MB

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const conversationId = form.get("conversationId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is larger than 20MB" }, { status: 413 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type || "application/octet-stream"};base64,${buf.toString("base64")}`;

    const result = await uploadFile(base64, `chat-attachments/${user.id}`, file.name);
    const isImage = (file.type || "").startsWith("image/");

    const { data: fileRow, error: fileError } = await supabase
      .from("files")
      .insert({
        user_id: user.id,
        bucket: "cloudinary",
        path: result.public_id,
        cloudinary_public_id: result.public_id,
        cloudinary_url: result.secure_url,
        size_bytes: result.bytes,
        mime_type: file.type || "application/octet-stream",
        conversation_id: typeof conversationId === "string" && conversationId ? conversationId : null,
      })
      .select("id")
      .single();

    if (fileError) {
      return NextResponse.json({ error: fileError.message }, { status: 500 });
    }

    return NextResponse.json({
      id: fileRow.id,
      name: file.name,
      url: result.secure_url,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: result.bytes,
      kind: isImage ? "image" : "file",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 502 }
    );
  }
}
