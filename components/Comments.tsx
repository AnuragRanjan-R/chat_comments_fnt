"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Card, CardContent, Input, Separator, Textarea } from "@/components/ui";
import { Comment as CommentType, createComment, getComments, upvoteComment, deleteComment as apiDeleteComment } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { PAGE_SIZE } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";

export default function Comments() {
  const { token, user } = useAuth();
  const [comments, setComments] = useState<CommentType[]>([]);
  const [visibleTop, setVisibleTop] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [postingIds, setPostingIds] = useState<Record<number, boolean>>({});
  const [rootText, setRootText] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      if (!token) {
        setComments([]);
        setLoading(false);
        return;
      }
      try {
        const data = await getComments();
        setComments(data);
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [token]);

  // Reset page size when auth status changes to authenticated
  useEffect(() => {
    if (token) setVisibleTop(PAGE_SIZE);
  }, [token]);

  const sortedTopLevel = useMemo(() => {
    // Always sort newest-first by created_at
    return [...comments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [comments]);

  const topToRender = useMemo(() => {
    return sortedTopLevel.slice(0, Math.min(sortedTopLevel.length, visibleTop));
  }, [sortedTopLevel, visibleTop]);

  const canLoadMore = !!token && visibleTop < comments.length;

  const handleUpvote = async (id: number) => {
    if (!token) return;
    setComments((prev) => updateComment(prev, id, (c) => ({ ...c, upvotes: c.upvotes + 1 })));
    try {
      await upvoteComment(id);
    } catch {
      setComments((prev) => updateComment(prev, id, (c) => ({ ...c, upvotes: Math.max(0, c.upvotes - 1) })));
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    const confirmDelete = window.confirm("Delete this comment and its replies?");
    if (!confirmDelete) return;
    try {
      await apiDeleteComment(id);
      setComments((prev) => removeCommentSubtree(prev, id));
    } catch {
      // no-op; optionally show toast
    }
  };

  const handleReply = async (parentId: number, text: string) => {
    if (!token) {
      window.alert("Please login or register to reply.");
      return;
    }
    setPostingIds((m) => ({ ...m, [parentId]: true }));
    try {
      const created = await createComment(text, parentId);
      setComments((prev) => insertReply(prev, parentId, created));
    } finally {
      setPostingIds((m) => ({ ...m, [parentId]: false }));
    }
  };

  const handleCreateRoot = async () => {
    if (!token) {
      window.alert("Please login or register to comment.");
      return;
    }
    if (!rootText.trim()) return;
    setLoading(true);
    try {
      const created = await createComment(rootText.trim(), null);
      setComments((prev) => [created, ...prev]);
      setRootText("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card>
        <CardContent className="p-4 grid gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Sample Post</h1>
            <p className="text-sm text-gray-600">This is a placeholder post. Replace with your image or article content.</p>
          </div>
          <Separator />

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Discussion</h2>
            <Badge variant="secondary">{countComments(comments)} comments</Badge>
          </div>
          <Separator />

          {token && (
            <div className="grid gap-2">
              <Textarea placeholder="Write a comment..." value={rootText} onChange={(e) => setRootText(e.target.value)} />
              <div className="flex justify-end">
                <Button onClick={handleCreateRoot} disabled={loading || !rootText.trim()}>Post</Button>
              </div>
            </div>
          )}

          {loading ? (
            <p>Loading...</p>
          ) : token ? (
            <div className="space-y-4">
              {topToRender.map((c) => (
                <CommentNode
                  key={c.id}
                  c={c}
                  onUpvote={handleUpvote}
                  onReply={handleReply}
                  onDelete={handleDelete}
                  busyMap={postingIds}
                  canInteract={!!token}
                  currentUserId={user?.id}
                  depth={0}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Login to view comments, upvote, and reply.</p>
          )}

          {token && canLoadMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setVisibleTop((n) => n + PAGE_SIZE);
                }}
              >
                Load more comments
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function countComments(list: CommentType[]): number {
  let total = 0;
  for (const c of list) {
    total += 1 + (c.replies ? countComments(c.replies) : 0);
  }
  return total;
}

function updateComment(list: CommentType[], id: number, mut: (c: CommentType) => CommentType): CommentType[] {
  return list.map((c) => {
    if (c.id === id) return mut(c);
    if (c.replies?.length) return { ...c, replies: updateComment(c.replies, id, mut) };
    return c;
  });
}

function insertReply(list: CommentType[], parentId: number, newReply: CommentType): CommentType[] {
  return list.map((c) => {
    if (c.id === parentId) {
      const replies = Array.isArray(c.replies) ? c.replies : [];
      return { ...c, replies: [...replies, newReply] };
    }
    if (c.replies?.length) return { ...c, replies: insertReply(c.replies, parentId, newReply) };
    return c;
  });
}

function removeCommentSubtree(list: CommentType[], id: number): CommentType[] {
  const recur = (arr: CommentType[]): CommentType[] => {
    const out: CommentType[] = [];
    for (const c of arr) {
      if (c.id === id) continue; // drop this subtree
      let next = c;
      if (c.replies?.length) {
        next = { ...c, replies: recur(c.replies) };
      }
      out.push(next);
    }
    return out;
  };
  return recur(list);
}

function CommentNode({ c, depth, onUpvote, onReply, onDelete, busyMap, canInteract, currentUserId }: { c: CommentType; depth: number; onUpvote: (id: number) => void; onReply: (parentId: number, text: string) => void; onDelete: (id: number) => void; busyMap: Record<number, boolean>; canInteract: boolean; currentUserId?: number; }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [text, setText] = useState("");
  const [collapsed, setCollapsed] = useState(true);
  const initials = (c.user?.name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("");

  const submit = async () => {
    if (!text.trim()) return;
    await onReply(c.id, text.trim());
    setText("");
    setReplyOpen(false);
  };

  return (
    <div className="grid gap-2" style={{ marginLeft: depth * 16 }}>
      <div className="flex items-start gap-3">
        <Avatar>
          <AvatarImage src={c.user?.avatar || ""} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{c.user?.name || "User"}</span>
            <span className="text-xs text-gray-500">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
          </div>
          <div className="mt-1 whitespace-pre-wrap">{c.text}</div>
          <div className="flex items-center gap-3 mt-2">
            <Button size="sm" variant="outline" onClick={() => onUpvote(c.id)} disabled={!canInteract}>▲ {c.upvotes}</Button>
            <Button size="sm" variant="ghost" onClick={() => setReplyOpen((o) => !o)}>Reply</Button>
            {currentUserId === c.user.id && (
              <Button size="sm" variant="destructive" onClick={() => onDelete(c.id)}>Delete</Button>
            )}
            {c.replies?.length ? (
              <Button size="sm" variant="ghost" onClick={() => setCollapsed((x) => !x)}>
                {collapsed ? "Open thread" : "Collapse thread"}
              </Button>
            ) : null}
          </div>
          {replyOpen && (
            <div className="mt-2 grid gap-2">
              <Input placeholder="Write a reply..." value={text} onChange={(e) => setText(e.target.value)} disabled={!!busyMap[c.id]} />
              <div className="flex gap-2">
                <Button size="sm" onClick={submit} disabled={!!busyMap[c.id] || !text.trim()}>Post</Button>
                <Button size="sm" variant="ghost" onClick={() => { setText(""); setReplyOpen(false); }}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {!collapsed && c.replies?.length ? (
        <div className="grid gap-3">
          {c.replies.map((r) => (
            <CommentNode key={r.id} c={r} depth={depth + 1} onUpvote={onUpvote} onReply={onReply} onDelete={onDelete} busyMap={busyMap} canInteract={canInteract} currentUserId={currentUserId} />
          ))}
        </div>
      ) : null}
    </div>
  );
}


