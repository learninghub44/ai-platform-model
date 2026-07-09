"use client";

import { useMemo, useState } from "react";
import {
  Pin,
  PinOff,
  Pencil,
  Share2,
  Trash2,
  MoreHorizontal,
  MessageSquare,
  Check,
  X,
  Folder as FolderIcon,
  FolderPlus,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Conversation, Folder } from "@/lib/types/chat";

interface ConversationSidebarProps {
  conversations: Conversation[];
  folders: Folder[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveToFolder: (id: string, folderId: string | null) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
}

function groupConversations(conversations: Conversation[]) {
  const pinned: Conversation[] = [];
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const last7Days: Conversation[] = [];
  const older: Conversation[] = [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  for (const conversation of conversations) {
    if (conversation.pinned) {
      pinned.push(conversation);
      continue;
    }
    const lastMessageDate = new Date(conversation.last_message_at);
    if (lastMessageDate >= startOfToday) today.push(conversation);
    else if (lastMessageDate >= startOfYesterday) yesterday.push(conversation);
    else if (lastMessageDate >= sevenDaysAgo) last7Days.push(conversation);
    else older.push(conversation);
  }

  return [
    { label: "Pinned", items: pinned },
    { label: "Today", items: today },
    { label: "Yesterday", items: yesterday },
    { label: "Previous 7 days", items: last7Days },
    { label: "Older", items: older },
  ].filter((group) => group.items.length > 0);
}

function ConversationRow({
  conversation,
  active,
  editing,
  draftTitle,
  onDraftTitleChange,
  onCommitRename,
  onCancelRename,
  onSelect,
  onStartRename,
  onTogglePin,
  onShare,
  onDuplicate,
  onDelete,
  confirmDelete,
  onRequestDeleteConfirm,
  folders,
  onMoveToFolder,
}: {
  conversation: Conversation;
  active: boolean;
  editing: boolean;
  draftTitle: string;
  onDraftTitleChange: (v: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onSelect: () => void;
  onStartRename: () => void;
  onTogglePin: () => void;
  onShare: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  confirmDelete: boolean;
  onRequestDeleteConfirm: () => void;
  folders: Folder[];
  onMoveToFolder: (folderId: string | null) => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex items-center rounded-xl",
        active ? "bg-accent" : "hover:bg-accent/60"
      )}
    >
      {editing ? (
        <div className="flex w-full items-center gap-1 px-2 py-1">
          <Input
            autoFocus
            value={draftTitle}
            onChange={(e) => onDraftTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommitRename();
              if (e.key === "Escape") onCancelRename();
            }}
            className="h-8 rounded-lg text-sm"
          />
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onCommitRename}>
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onCancelRename}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <>
          <button onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left text-sm">
            {conversation.pinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
            <span className="truncate">{conversation.title}</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="mr-1 h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={onTogglePin}>
                {conversation.pinned ? (
                  <>
                    <PinOff className="h-4 w-4" /> Unpin
                  </>
                ) : (
                  <>
                    <Pin className="h-4 w-4" /> Pin
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onStartRename}>
                <Pencil className="h-4 w-4" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onDuplicate}>
                <Copy className="h-4 w-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onShare}>
                <Share2 className="h-4 w-4" /> Share
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderIcon className="h-4 w-4" /> Move to folder
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {conversation.folder_id && (
                    <>
                      <DropdownMenuItem onSelect={() => onMoveToFolder(null)}>No folder</DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {folders.length === 0 ? (
                    <DropdownMenuItem disabled>No folders yet</DropdownMenuItem>
                  ) : (
                    folders.map((f) => (
                      <DropdownMenuItem key={f.id} onSelect={() => onMoveToFolder(f.id)}>
                        <FolderIcon className="h-4 w-4" /> {f.name}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              {confirmDelete ? (
                <DropdownMenuItem
                  destructive
                  onSelect={(e) => {
                    e.preventDefault();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Confirm delete?
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  destructive
                  onSelect={(e) => {
                    e.preventDefault();
                    onRequestDeleteConfirm();
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
}

export function ConversationSidebar({
  conversations,
  folders,
  activeId,
  onSelect,
  onRename,
  onTogglePin,
  onShare,
  onDelete,
  onDuplicate,
  onMoveToFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: ConversationSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [folderDraftName, setFolderDraftName] = useState("");

  const unfiledConversations = useMemo(
    () => conversations.filter((c) => !c.folder_id),
    [conversations]
  );
  const groups = useMemo(() => groupConversations(unfiledConversations), [unfiledConversations]);

  function startRename(conversation: Conversation) {
    setEditingId(conversation.id);
    setDraftTitle(conversation.title);
  }

  function commitRename(id: string) {
    const trimmed = draftTitle.trim();
    if (trimmed) onRename(id, trimmed);
    setEditingId(null);
  }

  function toggleFolderCollapse(id: string) {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submitNewFolder() {
    const trimmed = newFolderName.trim();
    if (trimmed) onCreateFolder(trimmed);
    setNewFolderName("");
    setCreatingFolder(false);
  }

  function commitFolderRename(id: string) {
    const trimmed = folderDraftName.trim();
    if (trimmed) onRenameFolder(id, trimmed);
    setEditingFolderId(null);
  }

  const rowProps = (conversation: Conversation) => ({
    conversation,
    active: activeId === conversation.id,
    editing: editingId === conversation.id,
    draftTitle,
    onDraftTitleChange: setDraftTitle,
    onCommitRename: () => commitRename(conversation.id),
    onCancelRename: () => setEditingId(null),
    onSelect: () => onSelect(conversation.id),
    onStartRename: () => startRename(conversation),
    onTogglePin: () => onTogglePin(conversation.id, !conversation.pinned),
    onShare: () => onShare(conversation.id),
    onDuplicate: () => onDuplicate(conversation.id),
    onDelete: () => {
      onDelete(conversation.id);
      setConfirmDeleteId(null);
    },
    confirmDelete: confirmDeleteId === conversation.id,
    onRequestDeleteConfirm: () => setConfirmDeleteId(conversation.id),
    folders,
    onMoveToFolder: (folderId: string | null) => onMoveToFolder(conversation.id, folderId),
  });

  return (
    <div className="space-y-4">
      {/* Folders */}
      <div>
        <div className="mb-1 flex items-center justify-between px-3">
          <p className="text-xs font-medium text-muted-foreground">Folders</p>
          <button
            onClick={() => setCreatingFolder(true)}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="New folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>

        {creatingFolder && (
          <div className="mb-1 flex items-center gap-1 px-2">
            <Input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitNewFolder();
                if (e.key === "Escape") {
                  setCreatingFolder(false);
                  setNewFolderName("");
                }
              }}
              placeholder="Folder name"
              className="h-8 rounded-lg text-sm"
            />
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={submitNewFolder}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0"
              onClick={() => {
                setCreatingFolder(false);
                setNewFolderName("");
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {folders.map((folder) => {
          const items = conversations.filter((c) => c.folder_id === folder.id);
          const collapsed = collapsedFolders.has(folder.id);
          return (
            <div key={folder.id} className="mb-1">
              <div className="group flex items-center rounded-xl hover:bg-accent/60">
                {editingFolderId === folder.id ? (
                  <div className="flex w-full items-center gap-1 px-2 py-1">
                    <Input
                      autoFocus
                      value={folderDraftName}
                      onChange={(e) => setFolderDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitFolderRename(folder.id);
                        if (e.key === "Escape") setEditingFolderId(null);
                      }}
                      className="h-8 rounded-lg text-sm"
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => commitFolderRename(folder.id)}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingFolderId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => toggleFolderCollapse(folder.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm font-medium"
                    >
                      {collapsed ? (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      {collapsed ? (
                        <FolderIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                      ) : (
                        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
                      )}
                      <span className="truncate">{folder.name}</span>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">{items.length}</span>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="mr-1 h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onSelect={() => {
                            setEditingFolderId(folder.id);
                            setFolderDraftName(folder.name);
                          }}
                        >
                          <Pencil className="h-4 w-4" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem destructive onSelect={() => onDeleteFolder(folder.id)}>
                          <Trash2 className="h-4 w-4" /> Delete folder
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>

              {!collapsed && (
                <div className="ml-2 space-y-0.5 border-l border-border/40 pl-2">
                  {items.length === 0 ? (
                    <p className="px-3 py-1.5 text-xs text-muted-foreground">Empty — move a chat here</p>
                  ) : (
                    items.map((conversation) => <ConversationRow key={conversation.id} {...rowProps(conversation)} />)
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Unfiled conversations, grouped by pin / recency as before */}
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
          <MessageSquare className="h-6 w-6 opacity-50" />
          <p>No conversations yet. Start a new chat to see it here.</p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-3 text-xs font-medium text-muted-foreground">{group.label}</p>
            {group.items.map((conversation) => (
              <ConversationRow key={conversation.id} {...rowProps(conversation)} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
