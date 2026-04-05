import { ChevronDown, LogOut, Settings as SettingsIcon, User as UserIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import NotificationBell from './NotificationBell';
import { useLanguage } from "@/lib/useLanguage";

export default function TopNav() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
    }).catch(() => {});
  }, []);

  const initials = user?.full_name
    ? user.full_name.split(" ")[0][0].toUpperCase()
    : "U";

  return (
    <header className="h-16 border-b border-border bg-white/80 backdrop-blur-md flex items-center justify-end px-6 sticky top-0 z-20">
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-testid="button-user-menu"
              className="flex items-center gap-2 h-9 pl-1.5 pr-2.5 rounded-xl border border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50 transition-all duration-200 shadow-sm group"
            >
              <Avatar className="w-6 h-6 shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-[11px] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <p className="text-[13px] font-semibold text-slate-800 hidden sm:block" data-testid="text-user-name">
                {user?.full_name || "User"}
              </p>
              <span data-testid="text-user-role" className="hidden">{user?.role || "staff"}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-violet-500 transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/settings')} data-testid="menu-item-profile">
              <UserIcon className="w-4 h-4 mr-2" />
              {t('profile') || 'Profile'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')} data-testid="menu-item-settings">
              <SettingsIcon className="w-4 h-4 mr-2" />
              {t('settings') || 'Settings'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => base44.auth.logout()} className="text-destructive" data-testid="menu-item-logout">
              <LogOut className="w-4 h-4 mr-2" />
              {t('logout') || 'Log out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
