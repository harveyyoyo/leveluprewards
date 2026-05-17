/**
 * Shared raffle math (keep in sync with Admin raffle tab / wheel).
 * 0 points-per-ticket = general raffle (no point-based ticket count).
 */

export function parseRafflePointsPerTicket(raw: unknown): {
  isGeneralRaffle: boolean;
  pointsPerTicket: number;
} {
  const rawPointsPerTicket = Number(raw);
  const isGeneralRaffle = Number.isFinite(rawPointsPerTicket) && Math.floor(rawPointsPerTicket) === 0;
  const pointsPerTicket = isGeneralRaffle
    ? 0
    : Math.max(1, Math.floor(Number.isFinite(rawPointsPerTicket) ? rawPointsPerTicket : 25));
  return { isGeneralRaffle, pointsPerTicket };
}

export function floorRaffleFullTickets(points: number, pointsPerTicket: number): number {
  return Math.max(0, Math.floor(Number(points || 0) / pointsPerTicket));
}
