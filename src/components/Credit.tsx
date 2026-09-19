import { CREDIT } from "@/copy";

export function Credit() {
  return (
    <p className="credit">
      Made with{" "}
      <span className="heart" role="img" aria-label="love">
        ♥
      </span>{" "}
      by{" "}
      <a href={CREDIT.repoUrl} target="_blank" rel="noopener noreferrer">
        {CREDIT.author}
      </a>
    </p>
  );
}
