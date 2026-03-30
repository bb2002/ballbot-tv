"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/lib/session-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sidebar } from "./Sidebar";
import { Menu, Search, Radio, LogOut, User } from "lucide-react";
import type { ApiResponse } from "@/types/api";

export function Navbar() {
  const { user, logout } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 flex items-center gap-2 border-b border-border bg-background px-4 h-14">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu />
            </Button>
          }
        />
        <SheetContent side="left" className="p-0 w-60">
          <SheetTitle className="sr-only">네비게이션</SheetTitle>
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
        <Radio className="text-primary" />
        <span className="hidden sm:inline">ballbot-tv</span>
      </Link>

      {/* Search bar - desktop */}
      <form
        onSubmit={handleSearch}
        className="hidden sm:flex flex-1 max-w-lg mx-auto"
      >
        <div className="flex w-full">
          <Input
            placeholder="방송 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-r-none"
          />
          <Button type="submit" variant="secondary" className="rounded-l-none">
            <Search />
          </Button>
        </div>
      </form>

      {/* Mobile search toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden ml-auto"
        onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
      >
        <Search />
      </Button>

      {/* Right side */}
      <div className="flex items-center gap-2 ml-auto sm:ml-0">
        {user ? (
          <>
            <Link href="/studio">
              <Button variant="outline" size="sm">
                <Radio data-icon="inline-start" />
                방송하기
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="size-8">
                      {user.profileImageKey && (
                        <AvatarImage src={user.profileImageKey} />
                      )}
                      <AvatarFallback>
                        {user.channelName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => router.push("/mypage")}>
                    <User data-icon="inline-start" />
                    마이페이지
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>
                    <LogOut data-icon="inline-start" />
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            <Link href="/signin">
              <Button variant="ghost" size="sm">
                로그인
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">회원가입</Button>
            </Link>
          </>
        )}
      </div>

      {/* Mobile search bar */}
      {mobileSearchOpen && (
        <form
          onSubmit={handleSearch}
          className="absolute top-14 left-0 right-0 p-2 bg-background border-b border-border sm:hidden"
        >
          <div className="flex gap-2">
            <Input
              placeholder="방송 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <Button type="submit" size="sm">
              <Search />
            </Button>
          </div>
        </form>
      )}
    </header>
  );
}
