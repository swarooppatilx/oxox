import { ModeToggle, type ModeToggleProps } from "@/components/ModeToggle";

export function PageHeader({ modeSwitch }: { modeSwitch: ModeToggleProps }) {
  return (
    <header className="page-head">
      <h1>
        Noughts <span>&amp;</span> Crosses
      </h1>
      <ModeToggle {...modeSwitch} />
    </header>
  );
}
