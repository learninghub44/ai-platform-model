import type { ChatMessage } from "@/lib/types/chat";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportConversationAsMarkdown(title: string, messages: ChatMessage[]) {
  const lines = [`# ${title}`, ""];
  for (const m of messages) {
    lines.push(m.role === "user" ? "### You" : "### Assistant", "", m.content, "");
  }
  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  triggerDownload(blob, `${slugify(title)}.md`);
}

export async function exportConversationAsPDF(title: string, messages: ChatMessage[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;
  const maxWidth = 595 - marginX * 2; // A4 width in pt minus margins
  let y = 56;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, marginX, y);
  y += 28;

  for (const m of messages) {
    if (y > 760) {
      doc.addPage();
      y = 56;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(m.role === "user" ? "#1d4ed8" : "#111111");
    doc.text(m.role === "user" ? "You" : "Assistant", marginX, y);
    y += 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor("#222222");
    const plain = m.content.replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*\n?/g, ""));
    const wrapped = doc.splitTextToSize(plain, maxWidth);
    for (const line of wrapped) {
      if (y > 780) {
        doc.addPage();
        y = 56;
      }
      doc.text(line, marginX, y);
      y += 14;
    }
    y += 12;
  }

  doc.save(`${slugify(title)}.pdf`);
}

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "conversation"
  );
}
