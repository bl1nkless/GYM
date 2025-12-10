import { BottomNav, NewWorkoutFAB } from "@/components/layout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-container">
      <main className="page-content">{children}</main>
      <NewWorkoutFAB />
      <BottomNav />
    </div>
  );
}
