export type AuctionStatus = "Open" | "Closing soon" | "Opening soon";

export type Auction = {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  location: string;
  organiser: string;
  status: AuctionStatus;
  endsIn: string;
  sealedOfferCount: number;
  category: "Cars" | "Motorcycles" | "Trucks";
  openingBidNaira: number;
  bidIncrementNaira: number;
  inspectionSummary: string;
};
