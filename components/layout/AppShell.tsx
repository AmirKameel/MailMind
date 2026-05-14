import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";
import { MailMindLogo } from "@/components/brand/MailMindLogo";
import { Inbox, Search, Settings2, Sparkles, LogOut } from "lucide-react";

interface AppShellProps {
  user: { email?: string | null; name?: string | null } | null;
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 min-h-14 border-b border-border/60 bg-background/90 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
        <div className="container flex min-h-14 items-center gap-2 py-2 md:gap-3">
          <Link
            href="/inbox"
            className="flex min-h-11 min-w-11 shrink-0 items-center gap-2 rounded-pill py-1.5 pl-1 pr-3 text-foreground transition-colors duration-hover ease-out hover:bg-muted/80"
          >
            <span className="grid size-9 place-items-center rounded-pill bg-gradient-hero text-primary-foreground shadow-md">
              <MailMindLogo className="size-[22px] text-primary-foreground" />
            </span>
            <span className="font-serif text-lg tracking-[-0.02em] md:text-xl">MailMind</span>
          </Link>

          <Link
            href="/search"
            className="mx-auto hidden min-h-11 max-w-md flex-1 items-center gap-2 rounded-pill border border-border/60 bg-muted/50 px-4 text-sm text-muted-foreground transition-colors duration-hover ease-out hover:border-border hover:bg-muted hover:text-foreground md:flex"
          >
            <Search className="size-4 shrink-0 opacity-70" aria-hidden />
            <span className="truncate">search across all accounts</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <Button asChild variant="ghost" size="sm" className="rounded-pill">
              <Link href="/inbox">
                <Inbox className="size-4" /> inbox
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="rounded-pill">
              <Link href="/search">
                <Search className="size-4" /> search
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="rounded-pill">
              <Link href="/settings/accounts">
                <Settings2 className="size-4" /> accounts
              </Link>
            </Button>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Button
              asChild
              size="sm"
              className="hidden min-h-11 rounded-pill px-4 shadow-md transition-[filter,box-shadow] duration-hover ease-out hover:brightness-105 sm:inline-flex"
            >
              <Link href="/compose">
                <Sparkles className="size-4" /> compose
              </Link>
            </Button>
            <span className="hidden max-w-[10rem] truncate text-meta text-muted-foreground lg:inline">
              {user?.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="min-h-11 min-w-11 rounded-pill"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="container py-4 pb-24 md:py-6 md:pb-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-card/95 p-2 shadow-lg backdrop-blur-md md:hidden">
        <div className="container grid grid-cols-4 gap-1 rounded-xl border border-border/40 bg-muted/30 p-1.5">
          <MobileLink href="/inbox" icon={<Inbox className="size-5" />} label="inbox" />
          <MobileLink href="/search" icon={<Search className="size-5" />} label="search" />
          <MobileLink href="/compose" icon={<Sparkles className="size-5" />} label="compose" />
          <MobileLink href="/settings/accounts" icon={<Settings2 className="size-5" />} label="accounts" />
        </div>
      </nav>
    </div>
  );
}

function MobileLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-meta text-muted-foreground transition-colors duration-hover ease-out hover:bg-background hover:text-foreground"
    >
      {icon}
      <span className="max-w-full truncate px-0.5 normal-case">{label}</span>
    </Link>
  );
}
