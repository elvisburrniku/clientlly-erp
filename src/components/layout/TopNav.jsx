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
import GlobalSearch from './GlobalSearch';
import { useLanguage } from "@/lib/useLanguage";

export default function TopNav() {
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      loadUnreadAnnouncements(u);
    }).catch(() => {});
  }, []);

  const loadUnreadAnnouncements = async (currentUser) => {
    if (!currentUser?.tenant_id) return;
    try {
      const announcements = await base44.entities.Announcement.filter({ tenant_id: currentUser.tenant_id }, "-created_date", 100);
      const unread = announcements.filter(a => {
        const readBy = Array.isArray(a.read_by) ? a.read_by : [];
        return !readBy.includes(currentUser.id);
      });
      setUnreadCount(unread.length);
    } catch (err) {}
  };

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <header className="h-16 border-b border-border bg-white/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-testid="button-user-menu"
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-accent transition-colors"
            >
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium leading-none" data-testid="text-user-name">{user?.full_name || "User"}</p>
                <p className="text-xs text-muted-foreground capitalize mt-0.5" data-testid="text-user-role">{user?.role || "staff"}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
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
