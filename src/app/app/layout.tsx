import { BottomNav, NewWorkoutFAB } from "@/components/layout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <NewWorkoutFAB />
      <BottomNav />
    </>
  );
}
