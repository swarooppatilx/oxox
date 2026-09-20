import { PLAYER_NAME_MAX, draftPlayerName } from "#shared/multi";

import { MultiAvatar } from "@/components/MultiAvatar";

interface NameFieldProps {
  seed: string;
  value: string;
  autoFocus: boolean;
  locked: boolean;
  onChange: (value: string) => void;
  onCommit: () => void;
}

export function NameField({ seed, value, autoFocus, locked, onChange, onCommit }: NameFieldProps) {
  return (
    <div className="name-field">
      <MultiAvatar seed={seed} size={40} />
      <label htmlFor="player-name" className="sr-only">
        Your name, up to {PLAYER_NAME_MAX} characters
      </label>
      <input
        id="player-name"
        name="player-name"
        className="name-input"
        value={value}
        placeholder="Your name"
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        autoFocus={autoFocus}
        readOnly={locked}
        onChange={(event) => onChange(draftPlayerName(event.target.value))}
        onBlur={onCommit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
      <span className="name-count" aria-hidden="true">
        {value.length}/{PLAYER_NAME_MAX}
      </span>
    </div>
  );
}
