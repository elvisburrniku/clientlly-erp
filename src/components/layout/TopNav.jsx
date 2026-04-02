import { Bell, Search, ChevronDown, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import LanguageSwitcher from './LanguageSwitcher';
import { Search, Bell, ChevronDown, LogOut } from 'lucide-react';

export default function TopNav() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <header className="h-16 border-b border-border bg-white/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Kërko..."
            className="w-full h-9 pl-9 pr-4 rounded-xl border border-border bg-muted/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Language Switcher */}
        <LanguageSwitcher />
        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-accent transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium leading-none">{user?.full_name || "User"}</p>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">{user?.role || "staff"}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>Profili</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => base44.auth.logout()} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Dil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}