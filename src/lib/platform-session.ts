import { createPseudonymousBidderId } from "./fhevm-bid";

export type BidderSession = {
  name: string;
  organisation?: string;
  contact: string;
  sessionId: string;
  bidderId: string;
  audience: "Dealer" | "Consumer";
};

export function createBidderSession(input: {
  name: string;
  organisation?: string;
  contact: string;
  audience: "Dealer" | "Consumer";
}): BidderSession {
  const name = input.name.trim();
  const organisation = input.organisation?.trim();
  const contact = input.contact.trim();

  if (name.length < 2) throw new Error("Enter your name.");
  if (input.audience === "Dealer" && (!organisation || organisation.length < 2)) throw new Error("Enter the dealership name.");
  if (contact.length < 5) throw new Error("Enter a phone number or email.");

  const entropy = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(16).slice(2, 10);

  return {
    name,
    organisation,
    contact,
    audience: input.audience,
    sessionId: `${input.audience.toLowerCase()}-${entropy}`,
    bidderId: createPseudonymousBidderId(),
  };
}
