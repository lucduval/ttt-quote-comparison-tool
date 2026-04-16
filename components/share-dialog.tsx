"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Share2,
  Search,
  X,
  Eye,
  Pencil,
  Loader2,
  UserPlus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
}

interface ShareDialogProps {
  resourceType: "comparison" | "renewal";
  resourceId: Id<"comparisons">;
}

export function ShareDialog({ resourceType, resourceId }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [note, setNote] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  const existingShares = useQuery(
    api.shares.listByResource,
    open ? { resourceId } : "skip"
  );
  const shareMutation = useMutation(api.shares.share);
  const revokeMutation = useMutation(api.shares.revoke);
  const updatePermissionMutation = useMutation(api.shares.updatePermission);

  const searchUsers = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/users/search?q=${encodeURIComponent(q)}`
      );
      if (res.ok) {
        const users: User[] = await res.json();
        setSearchResults(users);
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  async function handleShare() {
    if (!selectedUser) return;
    setIsSharing(true);
    try {
      await shareMutation({
        resourceType,
        resourceId,
        sharedWithUserId: selectedUser.id,
        sharedWithName: selectedUser.name,
        permission,
        note: note.trim() || undefined,
      });
      toast.success(`Shared with ${selectedUser.name}`);
      setSelectedUser(null);
      setNote("");
      setSearchQuery("");
      setPermission("view");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to share"
      );
    } finally {
      setIsSharing(false);
    }
  }

  async function handleRevoke(shareId: Id<"shares">, name?: string) {
    try {
      await revokeMutation({ shareId });
      toast.success(`Revoked access${name ? ` for ${name}` : ""}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to revoke"
      );
    }
  }

  async function handlePermissionChange(
    shareId: Id<"shares">,
    newPermission: "view" | "edit"
  ) {
    try {
      await updatePermissionMutation({ shareId, permission: newPermission });
      toast.success("Permission updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update"
      );
    }
  }

  // Filter out already-shared users from search results
  const sharedUserIds = new Set(existingShares?.map((s) => s.sharedWithUserId) ?? []);
  const filteredResults = searchResults.filter(
    (u) => !sharedUserIds.has(u.id)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share {resourceType === "renewal" ? "Renewal" : "Comparison"}</DialogTitle>
          <DialogDescription>
            Share with a team member so they can access this while you&apos;re away.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User search */}
          {!selectedUser ? (
            <div className="space-y-2">
              <Label>Find a team member</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
                {isSearching && (
                  <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {filteredResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-md border">
                  {filteredResults.map((user) => (
                    <button
                      key={user.id}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        setSelectedUser(user);
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                    >
                      <Avatar size="sm">
                        <AvatarImage src={user.imageUrl} />
                        <AvatarFallback>
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                      <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 &&
                !isSearching &&
                filteredResults.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    No users found
                  </p>
                )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected user */}
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <Avatar size="sm">
                  <AvatarImage src={selectedUser.imageUrl} />
                  <AvatarFallback>
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {selectedUser.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedUser.email}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setSelectedUser(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Permission */}
              <div className="space-y-2">
                <Label>Permission</Label>
                <Select
                  value={permission}
                  onValueChange={(v) => setPermission(v as "view" | "edit")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">
                      <div className="flex items-center gap-2">
                        <Eye className="h-3.5 w-3.5" />
                        View only
                      </div>
                    </SelectItem>
                    <SelectItem value="edit">
                      <div className="flex items-center gap-2">
                        <Pencil className="h-3.5 w-3.5" />
                        View & Edit
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {permission === "view"
                    ? "They can view the comparison but cannot refine it."
                    : "They can view and refine the comparison using AI."}
                </p>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label>Note (optional)</Label>
                <Textarea
                  placeholder="e.g. Please review this for John Smith — I'm off tomorrow and he needs a response by end of day."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <Button
                onClick={handleShare}
                disabled={isSharing}
                className="w-full gap-2"
              >
                {isSharing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                Share
              </Button>
            </div>
          )}

          {/* Existing shares */}
          {existingShares && existingShares.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Currently shared with</Label>
              <div className="space-y-2">
                {existingShares.map((share) => (
                  <div
                    key={share._id}
                    className="flex items-center gap-3 p-2.5 rounded-lg border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {share.sharedWithName ?? "Unknown"}
                      </p>
                      {share.note && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          Note: {share.note}
                        </p>
                      )}
                    </div>
                    <Select
                      value={share.permission}
                      onValueChange={(v) =>
                        handlePermissionChange(
                          share._id,
                          v as "view" | "edit"
                        )
                      }
                    >
                      <SelectTrigger className="w-[110px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">
                          <span className="flex items-center gap-1.5">
                            <Eye className="h-3 w-3" /> View
                          </span>
                        </SelectItem>
                        <SelectItem value="edit">
                          <span className="flex items-center gap-1.5">
                            <Pencil className="h-3 w-3" /> Edit
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                      onClick={() =>
                        handleRevoke(share._id, share.sharedWithName ?? undefined)
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
