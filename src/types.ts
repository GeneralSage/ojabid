export type AuctionStatus = "Live now" | "Closing soon" | "Upcoming";

export type Auction = {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  location: string;
  organiser: string;
  status: AuctionStatus;
  endsIn: string;
  bids: number;
  watchers: number;
  category: string;
  verified: boolean;
  yourStatus?: "Bidding" | "Watching" | "Not joined";
  signal: string;
};
