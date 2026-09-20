import { useState } from "react";

import { extractCode } from "@/lib/inviteCode";

interface JoinFormProps {
  initialCode: string;
  serverError: string | null;
  disabled: boolean;
  onJoin: (code: string) => void;
  onEdit: () => void;
}

export function JoinForm({ initialCode, serverError, disabled, onJoin, onEdit }: JoinFormProps) {
  const [value, setValue] = useState(initialCode);
  const [localError, setLocalError] = useState<string | null>(null);
  const error = localError ?? serverError;

  const submit = () => {
    const code = extractCode(value);
    if (!code) {
      setLocalError("That doesn't look like an invite code.");
      return;
    }
    setLocalError(null);
    onJoin(code);
  };

  return (
    <form
      className="join"
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled) submit();
      }}
    >
      <p className="join-title">Got an invite?</p>
      <div className={`join-row${error ? " has-error" : ""}`}>
        <label htmlFor="join-code" className="sr-only">
          Invite code or link
        </label>
        <input
          id="join-code"
          className="join-input"
          value={value}
          placeholder="Code or link"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={error !== null}
          aria-describedby="join-error"
          onChange={(event) => {
            setValue(event.target.value);
            setLocalError(null);
            onEdit();
          }}
        />
        <button className="pen-button" type="submit" disabled={disabled || value.trim() === ""}>
          Join
        </button>
      </div>
      <p className="join-error" id="join-error" role="alert">
        {error}
      </p>
    </form>
  );
}
