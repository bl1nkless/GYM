import { BottomNav, NewWorkoutFAB } from "@/components/layout";
import { TelegramWorkoutProvider } from "@/components/providers/TelegramWorkoutProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TelegramWorkoutProvider>
      {children}
      <NewWorkoutFAB />
      <BottomNav />
    </TelegramWorkoutProvider>
  );
}
