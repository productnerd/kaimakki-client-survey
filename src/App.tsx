import Survey from "./components/Survey";
import Admin from "./components/Admin";

/**
 * Path routing without a router dependency. Three routes only:
 *   /        landing
 *   /admin   dashboard
 *   /:slug   a client's survey
 * BASE_URL is "/" in dev and "/kaimakki-client-survey/" on GitHub Pages.
 */
function currentRoute(): string {
  const base = import.meta.env.BASE_URL;
  const path = window.location.pathname;
  const rest = path.startsWith(base) ? path.slice(base.length) : path.replace(/^\//, "");
  return rest.replace(/\/+$/, "");
}

export default function App() {
  const route = currentRoute();

  if (route === "admin") return <Admin />;
  if (route !== "") return <Survey slug={route} />;

  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col justify-center px-6 py-16 text-center">
      <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-accent">
        Kaimakki
      </p>
      <h1 className="q-title mt-4">This one's personal.</h1>
      <p className="mt-4 text-cream-61">
        Client surveys live at their own private link. Check the message we sent you, or
        ping your account manager and they'll send it again.
      </p>
    </main>
  );
}
