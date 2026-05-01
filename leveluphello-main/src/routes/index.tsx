import { createFileRoute } from "@tanstack/react-router";
import { WelcomeGreeting } from "@/components/WelcomeGreeting";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Welcome back!" },
      { name: "description", content: "A warm, playful welcome with confetti." },
    ],
  }),
});

function Index() {
  // Mock signed-in user — swap with real auth later.
  return <WelcomeGreeting name="Alex" />;
}
