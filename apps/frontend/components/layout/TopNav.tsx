"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface TopNavProps {
  user: { name: string | null; email: string } | null;
  notificationCount?: number;
  onNotificationsOpen?: () => void;
  onLogout: () => void;
  onMenuClick?: () => void;
}

export function TopNav({ user, notificationCount, onNotificationsOpen, onLogout, onMenuClick }: TopNavProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user ? (user.name || user.email).charAt(0).toUpperCase() : "?";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-neutral-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 px-4 lg:px-6">
      {/* Mobile menu trigger */}
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-all duration-fast hover:bg-neutral-100 hover:text-neutral-700 lg:hidden active:scale-90"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Search */}
      <div className="flex flex-1 items-center gap-4 min-w-0">
        <div className="relative flex-1 max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search automations…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50/80 py-2 pl-9 pr-4 text-body-sm text-neutral-800 placeholder:text-neutral-400 transition-all duration-normal focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 hover:border-neutral-300"
            aria-label="Search"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Notifications bell */}
        {typeof notificationCount === "number" && onNotificationsOpen && (
          <button
            type="button"
            onClick={onNotificationsOpen}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-500 transition-all duration-fast hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-700 active:scale-90"
            aria-label="Open notifications"
          >
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0h6z" />
            </svg>
            {notificationCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand-600 px-1 text-[9px] font-bold leading-none text-white">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </button>
        )}

        {/* Profile dropdown */}
        {user ? (
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-body-sm transition-all duration-fast hover:bg-neutral-100 active:scale-95"
              aria-expanded={profileOpen}
              aria-haspopup="true"
            >
              <span className="hidden sm:inline font-medium text-neutral-700">
                {user.name || user.email}
              </span>
              {/* Avatar */}
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-b from-brand-400 to-brand-600 text-white text-caption font-bold shadow-[0_1px_3px_0_rgb(99_102_241_/_0.4)]">
                {initials}
              </span>
              <svg
                className={`h-3.5 w-3.5 text-neutral-400 transition-transform duration-fast ${profileOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {profileOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 w-56 overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-[0_8px_24px_-4px_rgb(0_0_0_/_0.12),0_0_0_1px_rgb(0_0_0_/_0.04)] animate-modal-in"
                role="menu"
              >
                {/* User info */}
                <div className="border-b border-neutral-100 px-4 py-3">
                  <p className="text-body-sm font-semibold text-neutral-900 truncate">
                    {user.name || "User"}
                  </p>
                  <p className="mt-0.5 text-caption text-neutral-500 truncate">{user.email}</p>
                </div>
                {/* Sign out */}
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-body-sm text-neutral-700 transition-colors duration-fast hover:bg-neutral-50 hover:text-neutral-900"
                  role="menuitem"
                >
                  <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={() => router.push("/login")}>
              Log in
            </Button>
            <Button variant="primary" size="sm" onClick={() => router.push("/signup")}>
              Sign up
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
