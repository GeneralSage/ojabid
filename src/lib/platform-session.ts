export type DealerSession = {
  dealerName: string;
  businessName: string;
  contact: string;
  sessionId: string;
  mode: "preview";
};

export function createDealerSession(input: {
  dealerName: string;
  businessName: string;
  contact: string;
}): DealerSession {
  const dealerName = input.dealerName.trim();
  const businessName = input.businessName.trim();
  const contact = input.contact.trim();

  if (dealerName.length < 2) throw new Error("Enter the dealer's name.");
  if (businessName.length < 2) throw new Error("Enter the dealership name.");
  if (contact.length < 5) throw new Error("Enter a phone number or email.");

  const entropy = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(16).slice(2, 10);

  return {
    dealerName,
    businessName,
    contact,
    sessionId: `dealer-${entropy}`,
    mode: "preview",
  };
}
