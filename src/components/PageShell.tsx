"use client";

import { Fragment, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth, type AuthUser } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import ProfileDialog from "@/components/profile-dialog";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarGroup,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarProvider,
    SidebarSeparator,
    SidebarTrigger,
    SidebarInset,
} from "@/components/ui/sidebar";
import { ThemeTogglerButton } from "@/components/animate-ui/components/buttons/theme-toggler";

const NAV_GROUPS = [
    [
        { href: "/", label: "Vehicle" },
        { href: "/mileage", label: "Odometer" },
        { href: "/service-log", label: "Service Log" },
    ],
    [
        { href: "/documents", label: "Documents" },
        { href: "/maintenance", label: "Components" },
        { href: "/diagnostics", label: "Diagnostics" },
    ],
];

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

function PageShellInner({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [profileOpen, setProfileOpen] = useState(false);
    const [profileTab, setProfileTab] = useState<"profile" | "team">("profile");

    function isActive(href: string) {
        return href === "/" ? pathname === "/" : pathname.startsWith(href);
    }

    return (
        <SidebarProvider
            style={{ "--sidebar-width": "13rem" } as React.CSSProperties}
        >
            <Sidebar>
                <SidebarHeader className="px-5 py-5">
                    <h1 className="font-mono text-sm font-bold text-sidebar-primary tracking-tight">
                        shelby.
                    </h1>
                </SidebarHeader>

                <SidebarContent>
                    {NAV_GROUPS.map((group, i) => (
                        <Fragment key={i}>
                            {i > 0 && <SidebarSeparator />}
                            <SidebarGroup className="py-0">
                                <SidebarMenu>
                                    {group.map((item) => (
                                        <SidebarMenuItem key={item.href}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={isActive(item.href)}
                                            >
                                                <Link href={item.href}>
                                                    {item.label}
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroup>
                        </Fragment>
                    ))}
                </SidebarContent>

                <SidebarFooter>
                    <Separator className="bg-sidebar-border" />
                    <div className="px-2 py-1">
                        <button
                            onClick={() => { setProfileTab("profile"); setProfileOpen(true); }}
                            className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity"
                        >
                            <Avatar className="size-6">
                                {user.photoURL && (
                                    <AvatarImage src={user.photoURL} alt={user.displayName ?? ""} />
                                )}
                                <AvatarFallback className="text-[10px] bg-sidebar-accent text-sidebar-accent-foreground">
                                    {getInitials(user.displayName, user.email)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <span className="text-xs text-sidebar-foreground/70 truncate block">
                                    {user.displayName ?? user.email}
                                </span>
                            </div>
                        </button>
                        <button
                            onClick={() => { setProfileTab("team"); setProfileOpen(true); }}
                            className="text-[10px] text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors truncate text-left pl-8 -mt-0.5 mb-1"
                        >
                            {user.teamRole === "owner" ? "Manage team" : "View team"}
                        </button>
                        <div className="flex items-center justify-between">
                            <button
                                onClick={logout}
                                className="text-xs text-sidebar-foreground/70 hover:text-sidebar-primary transition-colors"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </SidebarFooter>
            </Sidebar>

            <SidebarInset>
                <header className="flex items-center justify-between border-b px-4 py-3 lg:px-8">
                    <div className="flex items-center gap-3">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                    <div className="flex items-center gap-1">
                        <ThemeTogglerButton
                            variant="ghost"
                            size="sm"
                            modes={["dark", "light"]}
                        />
                    </div>
                </header>
                <main className="p-4 lg:p-8">{children}</main>
            </SidebarInset>
            <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} defaultTab={profileTab} />
        </SidebarProvider>
    );
}

export function PageShell({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/auth")
            .then((r) => r.json())
            .then((d) => {
                if (d.authenticated) {
                    setUser({
                        uid: d.uid,
                        email: d.email,
                        displayName: d.displayName,
                        photoURL: d.photoURL,
                        sharedUserId: d.sharedUserId,
                        activeTeamId: d.activeTeamId,
                        teamRole: d.teamRole,
                    });
                }
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading || !user) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-background">
                <Skeleton className="h-4 w-24" />
            </div>
        );
    }

    return (
        <AuthProvider user={user}>
            <PageShellInner>{children}</PageShellInner>
        </AuthProvider>
    );
}
