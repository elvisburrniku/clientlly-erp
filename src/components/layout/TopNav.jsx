import { ChevronDown, LogOut, Settings as SettingsIcon, User as UserIcon, LogIn, Coffee, CircleStop } from "lucide-react";
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
import { cn } from "@/lib/utils";

/* ── Attendance states: idle | checked_in | on_break ── */
const STORAGE_KEY = "attendance_status";

export default function TopNav() {
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const { t } = useLanguage();

  /* ── attendance ── */
  const [attendance, setAttendance] = useState(
    () => localStorage.getItem(STORAGE_KEY) || "idle"
  );
  const setStatus = (s) => { setAttendance(s); localStorage.setItem(STORAGE_KEY, s); };

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
    ? user.full_name.split(" ")[0][0].toUpperCase()
    : "U";

  return (
    <header className="h-16 border-b border-border bg-white/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">
      {/* ── Attendance widget ── */}
      <div className="flex items-center gap-1 mx-4 bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-sm">
        {/* Check In */}
        <button
          onClick={() => setStatus("checked_in")}
          disabled={attendance !== "idle"}
          title="Check In"
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200",
            attendance === "idle"
              ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200 hover:bg-emerald-600"
              : attendance === "checked_in"
              ? "bg-emerald-100 text-emerald-600 cursor-default"
              : "text-slate-400 cursor-not-allowed"
          )}
        >
          <LogIn className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Hyrje</span>
        </button>

        {/* Pause */}
        <button
          onClick={() => setStatus(attendance === "on_break" ? "checked_in" : "on_break")}
          disabled={attendance === "idle"}
          title={attendance === "on_break" ? "Vazhdo" : "Pauzë"}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200",
            attendance === "on_break"
              ? "bg-amber-500 text-white shadow-sm shadow-amber-200 hover:bg-amber-600"
              : attendance === "checked_in"
              ? "text-amber-600 hover:bg-amber-50"
              : "text-slate-300 cursor-not-allowed"
          )}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{attendance === "on_break" ? "Vazhdo" : "Pauzë"}</span>
        </button>

        {/* Check Out */}
        <button
          onClick={() => setStatus("idle")}
          disabled={attendance === "idle"}
          title="Check Out"
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200",
            attendance !== "idle"
              ? "text-rose-600 hover:bg-rose-50"
              : "text-slate-300 cursor-not-allowed"
          )}
        >
          <CircleStop className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Dalje</span>
        </button>
      </div>

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
