import { useState, type ReactNode } from "react";
/** Keep optional game setup out of the initial flow, including the preview renderer. */
export default function EntryDisclosure({
  compact,
  title,
  children,
}: {
  compact: boolean;
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (!compact) return <>{children}</>;
  return (
    <details
      className="entry-disclosure"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>{title}</summary>
      {open && <div className="entry-disclosure-body">{children}</div>}
    </details>
  );
}
