"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  updateProfile,
  updatePassword,
  verifyBeforeUpdateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth, type TeamRole } from "@/contexts/AuthContext";
import { uploadAvatar } from "@/lib/actions/profile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import {
  Camera,
  Check,
  Loader2,
  X,
  Plus,
  Crown,
  Pencil,
  Eye,
  Trash2,
  UserPlus,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email[0]?.toUpperCase() ?? "?";
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => {
    image.onload = resolve;
  });

  const canvas = document.createElement("canvas");
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.85);
  });
}

const ROLE_ICON: Record<string, React.ReactNode> = {
  owner: <Crown className="size-3" />,
  collaborator: <Pencil className="size-3" />,
  viewer: <Eye className="size-3" />,
};

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  collaborator: "Collaborator",
  viewer: "Viewer",
};

interface TeamInfo {
  id: string;
  name: string;
  role: string;
  memberCount: number;
}

interface TeamMember {
  id: string;
  userId: string;
  role: string;
  user: { displayName: string | null; email: string; photoUrl: string | null };
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

// ─── Profile Tab ──────────────────────────────────────────

function ProfileTab() {
  const { user, refreshUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [savingName, setSavingName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = async () => {
    if (!cropImage || !croppedAreaPixels) return;
    setUploadingAvatar(true);
    setCropImage(null);
    try {
      const blob = await getCroppedImg(cropImage, croppedAreaPixels);
      const formData = new FormData();
      formData.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      await uploadAvatar(formData);
      const auth = getFirebaseAuth();
      if (auth.currentUser) {
        const idToken = await auth.currentUser.getIdToken(true);
        await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
      }
      await refreshUser();
      toast.success("Profile picture updated");
    } catch {
      toast.error("Failed to upload profile picture");
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleUpdateName = async () => {
    setSavingName(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth.currentUser) throw new Error("Not signed in");
      await updateProfile(auth.currentUser, { displayName });
      const idToken = await auth.currentUser.getIdToken(true);
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      await refreshUser();
      toast.success("Display name updated");
    } catch {
      toast.error("Failed to update display name");
    } finally {
      setSavingName(false);
    }
  };

  const handleUpdateEmail = async () => {
    setSavingEmail(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth.currentUser) throw new Error("Not signed in");
      await verifyBeforeUpdateEmail(auth.currentUser, email);
      toast.success("Verification email sent to " + email);
    } catch {
      toast.error("Failed to update email");
    } finally {
      setSavingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword) return;
    setSavingPassword(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth.currentUser || !auth.currentUser.email) throw new Error("Not signed in");
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password updated");
    } catch {
      toast.error("Failed to update password. Check your current password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="size-16">
              {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName ?? ""} />}
              <AvatarFallback className="text-lg">{getInitials(user.displayName, user.email)}</AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-80 transition-opacity"
            >
              {uploadingAvatar ? <Loader2 className="size-3 animate-spin" /> : <Camera className="size-3" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </div>
          <div>
            <p className="text-sm font-medium">{user.displayName ?? "No name set"}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Field>
          <FieldLabel>Display Name</FieldLabel>
          <div className="flex gap-2">
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
            <Button size="sm" onClick={handleUpdateName} disabled={savingName || displayName === (user.displayName ?? "")}>
              {savingName ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            </Button>
          </div>
        </Field>
        <Field>
          <FieldLabel>Email</FieldLabel>
          <FieldDescription>A verification email will be sent to confirm the change.</FieldDescription>
          <div className="flex gap-2">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button size="sm" onClick={handleUpdateEmail} disabled={savingEmail || email === user.email}>
              {savingEmail ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            </Button>
          </div>
        </Field>
        <Field>
          <FieldLabel>Change Password</FieldLabel>
          <div className="space-y-2">
            <Input type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
            <div className="flex gap-2">
              <Input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
              <Button size="sm" onClick={handleUpdatePassword} disabled={savingPassword || !currentPassword || !newPassword}>
                {savingPassword ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              </Button>
            </div>
          </div>
        </Field>
      </div>
      <Dialog open={!!cropImage} onOpenChange={(o) => { if (!o) { setCropImage(null); if (fileRef.current) fileRef.current.value = ""; } }}>
        <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
          <div className="relative h-72 bg-black">
            {cropImage && (
              <Cropper image={cropImage} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
            )}
          </div>
          <div className="flex items-center justify-between p-3">
            <Button variant="ghost" size="sm" onClick={() => { setCropImage(null); if (fileRef.current) fileRef.current.value = ""; }}>
              <X className="size-4 mr-1" /> Cancel
            </Button>
            <div className="flex items-center gap-3">
              <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-24 accent-primary" />
              <Button size="sm" onClick={handleCropSave}>
                <Check className="size-4 mr-1" /> Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Team Tab ─────────────────────────────────────────────

function TeamTab() {
  const { user, refreshUser } = useAuth();
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"collaborator" | "viewer">("collaborator");
  const [sendingInvite, setSendingInvite] = useState(false);

  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);

  const isOwner = user.teamRole === "owner";

  const fetchTeamData = useCallback(async () => {
    try {
      const [teamsRes, membersRes, invitesRes] = await Promise.all([
        fetch("/api/teams"),
        fetch(`/api/teams/${user.activeTeamId}/members`),
        isOwner ? fetch(`/api/teams/${user.activeTeamId}/invites`) : Promise.resolve(null),
      ]);

      const teamsData = await teamsRes.json();
      setTeams(teamsData);

      // Members endpoint doesn't exist yet — parse from teams response
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData);
      }

      if (invitesRes && invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setPendingInvites(invitesData.filter((i: any) => !i.acceptedAt));
      }
    } catch {
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, [user.activeTeamId, isOwner]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const handleSwitchTeam = async (teamId: string) => {
    if (teamId === user.activeTeamId) return;
    try {
      const res = await fetch("/api/teams/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      if (!res.ok) throw new Error();
      await refreshUser();
      toast.success("Switched team");
      window.location.reload();
    } catch {
      toast.error("Failed to switch team");
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setCreatingTeam(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });
      if (!res.ok) throw new Error();
      setNewTeamName("");
      setShowCreateTeam(false);
      await fetchTeamData();
      toast.success("Team created");
    } catch {
      toast.error("Failed to create team");
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setSendingInvite(true);
    try {
      const res = await fetch(`/api/teams/${user.activeTeamId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      setInviteEmail("");
      setShowInvite(false);
      await fetchTeamData();
      toast.success("Invite sent");
    } catch (e: any) {
      toast.error(e.message || "Failed to send invite");
    } finally {
      setSendingInvite(false);
    }
  };

  const handleChangeRole = async (memberId: string, role: string) => {
    try {
      const res = await fetch(`/api/teams/${user.activeTeamId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error();
      await fetchTeamData();
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleRemoveMember = async (memberId: string, isSelf: boolean) => {
    const confirmMsg = isSelf ? "Leave this team?" : "Remove this member?";
    if (!confirm(confirmMsg)) return;
    try {
      const res = await fetch(`/api/teams/${user.activeTeamId}/members/${memberId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      if (isSelf) {
        await refreshUser();
        window.location.reload();
      } else {
        await fetchTeamData();
        toast.success("Member removed");
      }
    } catch {
      toast.error("Failed to remove member");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Team Switcher */}
      {teams.length > 1 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Teams</p>
          <div className="space-y-1">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => handleSwitchTeam(team.id)}
                className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                  team.id === user.activeTeamId
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted"
                }`}
              >
                <span className="truncate">{team.name}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {ROLE_ICON[team.role]}
                  {ROLE_LABEL[team.role]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create Team */}
      {showCreateTeam ? (
        <div className="flex gap-2">
          <Input
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="Team name"
            onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
            autoFocus
          />
          <Button size="sm" onClick={handleCreateTeam} disabled={creatingTeam || !newTeamName.trim()}>
            {creatingTeam ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setShowCreateTeam(false); setNewTeamName(""); }}>
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setShowCreateTeam(true)}>
          <Plus className="size-4 mr-1" /> Create Team
        </Button>
      )}

      {/* Members */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Members</p>
        <div className="space-y-1">
          {members.map((member) => {
            const isSelf = member.userId === user.sharedUserId;
            const name = member.user.displayName ?? member.user.email;
            return (
              <div
                key={member.id}
                className="flex items-center gap-2 rounded-md px-3 py-2"
              >
                <Avatar className="size-6">
                  {member.user.photoUrl && <AvatarImage src={member.user.photoUrl} />}
                  <AvatarFallback className="text-[10px]">
                    {getInitials(member.user.displayName, member.user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    {name}
                    {isSelf && <span className="text-muted-foreground ml-1">(you)</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {isOwner && !isSelf && member.role !== "owner" ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.id, e.target.value)}
                      className="text-xs border rounded px-1.5 py-0.5 bg-background"
                    >
                      <option value="collaborator">Collaborator</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {ROLE_ICON[member.role]}
                      {ROLE_LABEL[member.role]}
                    </span>
                  )}
                  {isOwner && !isSelf && member.role !== "owner" && (
                    <button
                      onClick={() => handleRemoveMember(member.id, false)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                  {!isOwner && isSelf && (
                    <button
                      onClick={() => handleRemoveMember(member.id, true)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      title="Leave team"
                    >
                      <LogOut className="size-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Invites */}
      {isOwner && pendingInvites.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Pending Invites</p>
          <div className="space-y-1">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between rounded-md px-3 py-2 text-sm">
                <span className="truncate text-muted-foreground">{invite.email}</span>
                <span className="text-xs text-muted-foreground">{ROLE_LABEL[invite.role]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Member */}
      {isOwner && (
        showInvite ? (
          <div className="space-y-2">
            <Input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address"
              type="email"
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="invite-role"
                  checked={inviteRole === "collaborator"}
                  onChange={() => setInviteRole("collaborator")}
                  className="accent-primary"
                />
                Collaborator
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="invite-role"
                  checked={inviteRole === "viewer"}
                  onChange={() => setInviteRole("viewer")}
                  className="accent-primary"
                />
                Viewer
              </label>
              <div className="flex-1" />
              <Button size="sm" variant="ghost" onClick={() => { setShowInvite(false); setInviteEmail(""); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleInvite} disabled={sendingInvite || !inviteEmail.trim()}>
                {sendingInvite ? <Loader2 className="size-4 animate-spin" /> : "Send"}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="w-full" onClick={() => setShowInvite(true)}>
            <UserPlus className="size-4 mr-1" /> Invite Member
          </Button>
        )
      )}
    </div>
  );
}

// ─── Main Dialog ──────────────────────────────────────────

export default function ProfileDialog({
  open,
  onOpenChange,
  defaultTab = "profile",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "profile" | "team";
}) {
  const [tab, setTab] = useState<"profile" | "team">(defaultTab);

  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            <div className="flex gap-1">
              <button
                onClick={() => setTab("profile")}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  tab === "profile"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setTab("team")}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  tab === "team"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Team
              </button>
            </div>
          </DialogTitle>
        </DialogHeader>
        {tab === "profile" ? <ProfileTab /> : <TeamTab />}
      </DialogContent>
    </Dialog>
  );
}
