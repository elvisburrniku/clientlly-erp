import {
  ChevronDown, LogOut, Settings as SettingsIcon, User as UserIcon,
  LogIn, Coffee, PowerOff, Timer, Briefcase
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import LanguageSwitcher from './LanguageSwitcher';
import NotificationBell from './NotificationBell';
import { useLanguage } from "@/lib/useLanguage";
import { cn } from "@/lib/utils";

/* ── Storage keys ─────────────────────────────────────────────── */
const SK_STATUS    = "att_status";
const SK_CHECKIN   = "att_checkin_at";
const SK_PAUSE_ST  = "att_pause_start";
const SK_PAUSED_MS = "att_paused_ms";

/* ── Time formatter HH:MM:SS ──────────────────────────────────── */
function fmt(ms) {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sc = s % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sc).padStart(2,"0")}`;
}

export default function TopNav() {
  const [user, setUser]           = useState(null);
  const navigate                  = useNavigate();
  const { t }                     = useLanguage();

  /* ── Attendance state ─────────────────────────────────────── */
  const [status, setStatusState]  = useState(() => localStorage.getItem(SK_STATUS) || "idle");
  const [workMs, setWorkMs]       = useState(0);   // elapsed work time
  const [breakMs, setBreakMs]     = useState(0);   // elapsed break time
  const [summary, setSummary]     = useState(null); // post-checkout summary
  const tickRef                   = useRef(null);

  /* Persist + update */
  const commit = (s) => {
    setStatusState(s);
    localStorage.setItem(SK_STATUS, s);
  };

  const handleCheckIn = () => {
    localStorage.setItem(SK_CHECKIN,   Date.now());
    localStorage.setItem(SK_PAUSED_MS, 0);
    localStorage.removeItem(SK_PAUSE_ST);
    commit("checked_in");
    setWorkMs(0);
    setBreakMs(0);
  };

  const handlePause = () => {
    localStorage.setItem(SK_PAUSE_ST, Date.now());
    commit("on_break");
  };

  const handleResume = () => {
    const pStart  = parseInt(localStorage.getItem(SK_PAUSE_ST) || Date.now());
    const prevMs  = parseInt(localStorage.getItem(SK_PAUSED_MS) || 0);
    localStorage.setItem(SK_PAUSED_MS, prevMs + (Date.now() - pStart));
    localStorage.removeItem(SK_PAUSE_ST);
    commit("checked_in");
    setBreakMs(0);
  };

  const handleCheckOut = () => {
    const checkinAt = parseInt(localStorage.getItem(SK_CHECKIN) || Date.now());
    const pausedMs  = parseInt(localStorage.getItem(SK_PAUSED_MS) || 0);
    const worked    = Math.max(0, Date.now() - checkinAt - pausedMs);
    setSummary(fmt(worked));
    commit("idle");
    localStorage.removeItem(SK_CHECKIN);
    localStorage.removeItem(SK_PAUSE_ST);
    localStorage.removeItem(SK_PAUSED_MS);
    setWorkMs(0);
    setBreakMs(0);
    /* clear summary after 5s */
    setTimeout(() => setSummary(null), 5000);
  };

  /* ── Tick every second ───────────────────────────────────── */
  useEffect(() => {
    const tick = () => {
      const s = localStorage.getItem(SK_STATUS) || "idle";
      if (s === "checked_in") {
        const checkinAt = parseInt(localStorage.getItem(SK_CHECKIN) || Date.now());
        const pausedMs  = parseInt(localStorage.getItem(SK_PAUSED_MS) || 0);
        setWorkMs(Math.max(0, Date.now() - checkinAt - pausedMs));
      } else if (s === "on_break") {
        const pStart = parseInt(localStorage.getItem(SK_PAUSE_ST) || Date.now());
        setBreakMs(Math.max(0, Date.now() - pStart));
        /* also keep work time visible */
        const checkinAt = parseInt(localStorage.getItem(SK_CHECKIN) || Date.now());
        const pausedMs  = parseInt(localStorage.getItem(SK_PAUSED_MS) || 0);
        setWorkMs(Math.max(0, pStart - checkinAt - pausedMs));
      }
    };
    tick();
    tickRef.current = setInterval(tick, 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => {});
  }, []);

  const initials = user?.full_name ? user.full_name.split(" ")[0][0].toUpperCase() : "U";

  /* ── Derived display ─────────────────────────────────────── */
  const isIdle       = status === "idle";
  const isActive     = status === "checked_in";
  const isBreak      = status === "on_break";

  const statusLabel  = isActive ? "AKTIV" : isBreak ? "PAUZË" : "JASHTË";
  const statusDot    = isActive ? "#34d399" : isBreak ? "#fbbf24" : "#cbd5e1";
  const statusText   = isActive ? "#059669" : isBreak ? "#d97706" : "#94a3b8";

  /* container border style — blinks amber when idle, solid when active */
  const containerStyle = isIdle && !summary
    ? { animation: "attBlink 1.6s ease-in-out infinite" }
    : isActive
    ? { border: "1.5px solid #bbf7d0", boxShadow: "0 0 0 2px rgba(52,211,153,0.1)" }
    : isBreak
    ? { border: "1.5px solid #fde68a", boxShadow: "0 0 0 2px rgba(251,191,36,0.1)" }
    : { border: "1.5px solid #e2e8f0" };

  return (
    <>
    <style>{`
      @keyframes attBlink {
        0%,100% { border-color: #fbbf24; box-shadow: 0 0 0 3px rgba(251,191,36,0.18); }
        50%      { border-color: #e2e8f0; box-shadow: none; }
      }
      @keyframes dotPulse {
        0%,100% { transform: scale(1);   opacity: 1; }
        50%      { transform: scale(1.5); opacity: 0.7; }
      }
      @keyframes summaryIn {
        from { opacity:0; transform: scale(0.96); }
        to   { opacity:1; transform: scale(1); }
      }
      @keyframes coffeeRock {
        0%,100% { transform: rotate(0deg); }
        25%      { transform: rotate(-12deg); }
        75%      { transform: rotate(12deg); }
      }
    `}</style>

    <header className="h-16 border-b border-border bg-white/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">

      {/* ═══════════ ATTENDANCE WIDGET ═══════════ */}
      <div className="relative" style={{ width: 380 }}>

        {/* ── CHECKOUT SUMMARY overlay ── */}
        {summary && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center gap-3 bg-white rounded-xl px-4"
            style={{ animation: "summaryIn 0.25s ease", border: "1.5px solid #e2e8f0" }}
          >
            <div className="flex items-center gap-1.5 text-indigo-600">
              <Briefcase className="w-4 h-4" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">Totali i punës</span>
            </div>
            <span className="font-mono text-[15px] font-bold text-slate-800">{summary}</span>
          </div>
        )}

        {/* ── MAIN WIDGET ── */}
        <div
          className="flex items-stretch bg-white rounded-xl overflow-hidden"
          style={{ height: 42, border: "1.5px solid #e2e8f0", ...containerStyle, transition: "border-color 0.3s, box-shadow 0.3s" }}
        >

          {/* Status label — left block */}
          <div
            className="flex flex-col items-center justify-center px-3 gap-0.5 shrink-0"
            style={{ borderRight: "1px solid #f1f5f9", minWidth: 72 }}
          >
            <span
              className="w-[7px] h-[7px] rounded-full shrink-0"
              style={{
                background: statusDot,
                animation: (isActive || isBreak) ? "dotPulse 2s ease-in-out infinite" : undefined,
              }}
            />
            <span className="text-[9px] font-black tracking-widest" style={{ color: statusText }}>
              {statusLabel}
            </span>
          </div>

          {/* Buttons — center block */}
          <div className="flex flex-1 items-center px-1.5 gap-0.5">

            {/* Hyrje */}
            <button
              onClick={handleCheckIn}
              disabled={!isIdle}
              data-testid="button-attendance-checkin"
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 select-none",
                "h-7",
                isIdle
                  ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm"
                  : isActive
                  ? "bg-emerald-50 text-emerald-300 cursor-default"
                  : "text-slate-300 cursor-not-allowed"
              )}
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span>Hyrje</span>
            </button>

            {/* divider */}
            <div className="w-px h-5 bg-slate-100 shrink-0" />

            {/* Pauzë / Vazhdo */}
            <button
              onClick={isBreak ? handleResume : handlePause}
              disabled={isIdle}
              data-testid="button-attendance-pause"
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 select-none",
                "h-7",
                isBreak
                  ? "bg-amber-400 text-white hover:bg-amber-500 shadow-sm"
                  : isActive
                  ? "text-amber-600 hover:bg-amber-50"
                  : "text-slate-300 cursor-not-allowed"
              )}
            >
              <Coffee
                className="w-3.5 h-3.5 shrink-0"
                style={isBreak ? { animation: "coffeeRock 1.4s ease-in-out infinite" } : undefined}
              />
              <span>{isBreak ? "Vazhdo" : "Pauzë"}</span>
            </button>

            {/* divider */}
            <div className="w-px h-5 bg-slate-100 shrink-0" />

            {/* Dalje */}
            <button
              onClick={handleCheckOut}
              disabled={isIdle}
              data-testid="button-attendance-checkout"
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 select-none",
                "h-7",
                !isIdle
                  ? "text-rose-500 hover:bg-rose-50"
                  : "text-slate-300 cursor-not-allowed"
              )}
            >
              <PowerOff className="w-3.5 h-3.5 shrink-0" />
              <span>Dalje</span>
            </button>
          </div>

          {/* Timer — right block */}
          <div
            className="flex items-center justify-center px-3 shrink-0 gap-1"
            style={{ borderLeft: "1px solid #f1f5f9", minWidth: 90 }}
          >
            <Timer className="w-3 h-3 shrink-0" style={{ color: isActive ? "#10b981" : isBreak ? "#f59e0b" : "#cbd5e1" }} />
            <span
              className="font-mono text-[12px] font-bold tabular-nums"
              style={{ color: isActive ? "#047857" : isBreak ? "#b45309" : "#cbd5e1", letterSpacing: "0.05em" }}
            >
              {isActive ? fmt(workMs) : isBreak ? fmt(breakMs) : "00:00:00"}
            </span>
          </div>

        </div>
      </div>

      {/* ═══════════ RIGHT SIDE ═══════════ */}
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
    </>
  );
}
