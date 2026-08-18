export type AuctionStatus = "Open" | "Closing soon" | "Opening soon";
export type AuctionAudience = "Dealer" | "Consumer";

export type AuctionImage = {
  url: string;
  alt: string;
  sourceLabel: string;
  sourceUrl: string;
};

export type AuctionDocument = {
  name: string;
  access: string;
};

export type VehicleDetail = {
  label: string;
  value: string;
};

export type Auction = {
  id: string;
  audience: AuctionAudience;
  images: AuctionImage[];
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
  vehicleDetails: VehicleDetail[];
  conditionHighlights: string[];
  documents: AuctionDocument[];
  collectionWindow: string;
};
