import { SERIES_LENGTH } from "#shared/config";
import type { Board, Line } from "#shared/game";
import { GRID_PATHS, crossPaths, noughtPath, winLinePath } from "#shared/markGeometry";
import type { Opponent } from "#shared/moves";
import { palette } from "#shared/palette";
import { gamesPlayed, isSeriesOver, seriesResult, type Outcome, type Series } from "#shared/series";

import { OPPONENT_CHIP, opponentLabel, opponentName, shareHeadline } from "@/copy";

interface CardInput {
  board: Board;
  outcome: Outcome;
  winLine: Line | null;
  round: number;
  series: Series;
  opponent: Opponent;
}

const WIDTH = 1080;
const HEIGHT = 1350;
const PAGE = { x: 70, y: 70, width: WIDTH - 140, height: HEIGHT - 140 };
const RULE_SPACING = 44;
const TEXT_X = PAGE.x + 170;
const BOARD_SIZE = 620;
const BOARD_Y = PAGE.y + 340;
const BOARD_X = TEXT_X + (PAGE.width - 170 - 50 - BOARD_SIZE) / 2;
const HOLES = 7;

type Ctx = CanvasRenderingContext2D;

function drawDesk(ctx: Ctx) {
  ctx.fillStyle = palette.desk;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "rgba(0, 0, 0, 0.035)";
  for (let x = 0; x < WIDTH; x += 7) ctx.fillRect(x, 0, 2, HEIGHT);
}

function drawPage(ctx: Ctx) {
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = palette.paper;
  ctx.fillRect(PAGE.x, PAGE.y, PAGE.width, PAGE.height);
  ctx.shadowColor = "transparent";

  ctx.strokeStyle = palette.ruleBlue;
  ctx.lineWidth = 2;
  for (let y = PAGE.y + RULE_SPACING; y < PAGE.y + PAGE.height; y += RULE_SPACING) {
    ctx.beginPath();
    ctx.moveTo(PAGE.x, y);
    ctx.lineTo(PAGE.x + PAGE.width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = palette.marginRed;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(PAGE.x + 120, PAGE.y);
  ctx.lineTo(PAGE.x + 120, PAGE.y + PAGE.height);
  ctx.stroke();

  ctx.fillStyle = palette.desk;
  for (let hole = 0; hole < HOLES; hole++) {
    ctx.beginPath();
    ctx.arc(PAGE.x + 50, PAGE.y + 110 + hole * 165, 20, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHeadline(ctx: Ctx, { outcome, series, opponent }: CardInput) {
  ctx.fillStyle = palette.inkBlue;
  ctx.font = "700 84px Caveat, cursive";
  ctx.fillText("Noughts & Crosses", TEXT_X, PAGE.y + 120);

  const lost = isSeriesOver(series) ? seriesResult(series) === "loss" : outcome === "loss";
  ctx.fillStyle = lost ? palette.inkRed : palette.inkBlue;
  ctx.font = "700 120px Caveat, cursive";
  ctx.fillText(shareHeadline(outcome, series, opponent), TEXT_X, PAGE.y + 275);
}

function withinSquare(
  ctx: Ctx,
  x: number,
  y: number,
  size: number,
  space: number,
  draw: () => void,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / space, size / space);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  draw();
  ctx.restore();
}

function drawBoard(ctx: Ctx, { board, winLine, round }: CardInput) {
  withinSquare(ctx, BOARD_X, BOARD_Y, BOARD_SIZE, 300, () => {
    ctx.strokeStyle = "rgba(59, 58, 56, 0.85)";
    ctx.lineWidth = 3.2;
    for (const path of GRID_PATHS) ctx.stroke(new Path2D(path));
  });

  if (winLine) {
    withinSquare(ctx, BOARD_X, BOARD_Y, BOARD_SIZE, 300, () => {
      ctx.globalCompositeOperation = "multiply";
      ctx.strokeStyle = palette.highlighter;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 24;
      ctx.stroke(new Path2D(winLinePath(winLine)));
    });
  }

  const cellSize = BOARD_SIZE / 3;
  board.forEach((cell, index) => {
    if (!cell) return;
    const x = BOARD_X + (index % 3) * cellSize;
    const y = BOARD_Y + Math.floor(index / 3) * cellSize;
    const seed = index + round * 9;

    withinSquare(ctx, x, y, cellSize, 100, () => {
      ctx.lineWidth = 7;
      if (cell === "X") {
        ctx.strokeStyle = palette.inkBlue;
        for (const path of crossPaths(seed)) ctx.stroke(new Path2D(path));
      } else {
        ctx.strokeStyle = palette.inkRed;
        ctx.stroke(new Path2D(noughtPath(seed)));
      }
    });
  });
}

function drawFooter(ctx: Ctx, { series, opponent }: CardInput) {
  const scoreY = BOARD_Y + BOARD_SIZE + 80;

  ctx.fillStyle = palette.pencil;
  ctx.font = "48px 'Patrick Hand', cursive";
  const score = `You ${series.you}  ·  Draws ${series.draws}  ·  ${opponentLabel(opponent)} ${series.opponent}`;
  ctx.fillText(`${score}   (game ${gamesPlayed(series)} of ${SERIES_LENGTH})`, TEXT_X, scoreY);
  ctx.fillText(OPPONENT_CHIP[opponent].label, TEXT_X, scoreY + 56);

  ctx.fillStyle = palette.inkBlue;
  ctx.font = "700 64px Caveat, cursive";
  ctx.fillText(`Can you beat ${opponentName(opponent)}?`, TEXT_X, scoreY + 130);
}

export async function buildCard(input: CardInput): Promise<Blob> {
  await Promise.all([
    document.fonts.load("700 96px Caveat"),
    document.fonts.load("48px 'Patrick Hand'"),
  ]).catch(() => undefined);

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");

  drawDesk(ctx);
  ctx.save();
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.rotate(-0.012);
  ctx.translate(-WIDTH / 2, -HEIGHT / 2);
  drawPage(ctx);
  drawHeadline(ctx, input);
  drawBoard(ctx, input);
  drawFooter(ctx, input);
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });
}

type ShareResult = "shared" | "downloaded" | "cancelled";

const FILE_NAME = "noughts-and-crosses.png";

export async function shareCard(image: Blob, text: string, url: string): Promise<ShareResult> {
  const file = new File([image], FILE_NAME, { type: "image/png" });

  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text, url });
      return "shared";
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
  }

  const link = document.createElement("a");
  link.href = URL.createObjectURL(image);
  link.download = FILE_NAME;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 5000);

  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
  } catch {}
  return "downloaded";
}
