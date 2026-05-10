import { MainNav } from "@/components/MainNav";
import { pageStyle, h1Style } from "@/components/ui/layoutStyles";

export default function HomePage() {
  return (
    <main style={pageStyle}>
      <MainNav />

      <h1 style={h1Style}>📊 Project Operations System</h1>

      <p>Welcome. Use the navigation to manage projects and configuration.</p>
    </main>
  );
}