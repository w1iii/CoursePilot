import SyncProvider from "./SyncProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <SyncProvider>{children}</SyncProvider>;
}
