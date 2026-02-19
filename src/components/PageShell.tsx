"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
    { href: "/", label: "Vehicle" },
    { href: "/mileage", label: "Odometer" },
    { href: "/documents", label: "Documents" },
    { href: "/service-log", label: "Service Log" },
    { href: "/maintenance", label: "Components" },
    { href: "/diagnostics", label: "Diagnostics" },
];

export function PageShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-[#060606] px-4 py-6">
            <nav className="max-w-2xl mx-auto mb-8">
                <div className="flex items-center justify-center gap-1">
                    {NAV_ITEMS.map((item, i) => (
                        <span
                            key={item.href}
                            className="flex items-center gap-1"
                        >
                            {i > 0 && (
                                <span className="text-neutral-800 text-[10px] mx-1">
                                    /
                                </span>
                            )}
                            <Link
                                href={item.href}
                                className={`text-[10px] font-mono tracking-[0.2em] uppercase transition-colors ${
                                    pathname === item.href
                                        ? "text-white"
                                        : "text-neutral-600 hover:text-neutral-400"
                                }`}
                            >
                                {item.label}
                            </Link>
                        </span>
                    ))}
                </div>
            </nav>
            <main className="max-w-2xl mx-auto pb-16">{children}</main>
        </div>
    );
}
