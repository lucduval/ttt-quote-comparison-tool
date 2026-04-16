"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  Plus,
  Trash2,
  Search,
  Loader2,
  UserPlus,
  Crown,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface SearchUser {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
}

export default function TeamPage() {
  const { user } = useUser();
  const teams = useQuery(api.teams.list);
  const createTeam = useMutation(api.teams.create);
  const removeTeam = useMutation(api.teams.remove);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreateTeam() {
    if (!teamName.trim()) return;
    setIsCreating(true);
    try {
      await createTeam({
        name: teamName.trim(),
        description: teamDescription.trim() || undefined,
      });
      toast.success("Team created");
      setTeamName("");
      setTeamDescription("");
      setCreateDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteTeam(teamId: Id<"teams">, teamName: string) {
    if (!confirm(`Are you sure you want to delete "${teamName}"? This cannot be undone.`)) return;
    try {
      await removeTeam({ id: teamId });
      toast.success("Team deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete team");
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your teams to easily share comparisons and renewals.
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a Team</DialogTitle>
              <DialogDescription>
                Teams let you organize your colleagues for easy sharing.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Team Name</Label>
                <Input
                  placeholder="e.g. Commercial Lines Team"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  placeholder="e.g. Handles all commercial insurance"
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                />
              </div>
              <Button
                onClick={handleCreateTeam}
                disabled={!teamName.trim() || isCreating}
                className="w-full gap-2"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create Team
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {teams === undefined ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-sm font-medium">No teams yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Create a team and add your colleagues so you can share comparisons
              and renewals with them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => {
            if (!team) return null;
            return (
              <TeamCard
                key={team._id}
                teamId={team._id}
                name={team.name}
                description={team.description}
                myRole={team.myRole}
                onDelete={() => handleDeleteTeam(team._id, team.name)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function TeamCard({
  teamId,
  name,
  description,
  myRole,
  onDelete,
}: {
  teamId: Id<"teams">;
  name: string;
  description?: string;
  myRole: "owner" | "member";
  onDelete: () => void;
}) {
  const members = useQuery(api.teams.listMembers, { teamId });
  const addMember = useMutation(api.teams.addMember);
  const removeMember = useMutation(api.teams.removeMember);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const isOwner = myRole === "owner";
  const memberUserIds = new Set(members?.map((m) => m.userId) ?? []);

  async function searchUsers(q: string) {
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const users: SearchUser[] = await res.json();
        setSearchResults(users.filter((u) => !memberUserIds.has(u.id)));
      }
    } finally {
      setIsSearching(false);
    }
  }

  async function handleAddMember(user: SearchUser) {
    try {
      await addMember({
        teamId,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
      });
      toast.success(`Added ${user.name} to the team`);
      setSearchQuery("");
      setSearchResults([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add member");
    }
  }

  async function handleRemoveMember(userId: string, userName?: string) {
    if (!confirm(`Remove ${userName ?? "this member"} from the team?`)) return;
    try {
      await removeMember({ teamId, userId });
      toast.success(`Removed ${userName ?? "member"} from the team`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              {name}
              <Badge variant="secondary" className="text-xs">
                {members?.length ?? 0} member{(members?.length ?? 0) !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {isOwner && (
            <div className="flex items-center gap-1">
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <UserPlus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                    <DialogDescription>
                      Search for a user to add to {name}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          searchUsers(e.target.value);
                        }}
                        className="pl-9"
                      />
                      {isSearching && (
                        <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>

                    {searchResults.length > 0 && (
                      <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
                        {searchResults.map((user) => (
                          <button
                            key={user.id}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                            onClick={() => handleAddMember(user)}
                          >
                            <Avatar size="sm">
                              <AvatarImage src={user.imageUrl} />
                              <AvatarFallback>
                                {user.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{user.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                            <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}

                    {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No users found
                      </p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {members === undefined ? (
          <div className="h-12 animate-pulse bg-muted rounded" />
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member._id}
                className="flex items-center gap-3 p-2 rounded-md"
              >
                <Avatar size="sm">
                  <AvatarFallback>
                    {(member.userName ?? "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {member.userName ?? "Unknown"}
                    </p>
                    {member.role === "owner" && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Crown className="h-3 w-3" />
                        Owner
                      </Badge>
                    )}
                  </div>
                  {member.userEmail && (
                    <p className="text-xs text-muted-foreground truncate">
                      {member.userEmail}
                    </p>
                  )}
                </div>
                {isOwner && member.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      handleRemoveMember(member.userId, member.userName ?? undefined)
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
