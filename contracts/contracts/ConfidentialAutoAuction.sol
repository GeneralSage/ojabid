// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, eaddress, ebool, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ConfidentialAutoAuction
/// @notice Multi-organiser sealed-bid auction engine for OjaBid.
/// @dev Bid and reserve values are integer kobo (1 NGN = 100 kobo). Bids remain encrypted while
///      the auction is active. This contract intentionally does not custody naira or settle payments.
/// @author OjaBid
contract ConfidentialAutoAuction is ZamaEthereumConfig {
    enum Status {
        Draft,
        Active,
        Closed,
        Resolving,
        Settled,
        Cancelled
    }

    struct Auction {
        address organiser;
        uint64 startAt;
        uint64 endAt;
        uint64 minimumBid;
        uint64 reservePrice;
        uint32 bidderCount;
        Status status;
        euint64 highestBid;
        eaddress highestBidder;
        ebool hasWinner;
    }

    uint256 private _nextAuctionId;
    mapping(uint256 auctionId => Auction auction) private _auctions;
    mapping(uint256 auctionId => mapping(address bidder => bool isApproved)) private _approved;
    mapping(uint256 auctionId => mapping(address bidder => euint64 bid)) private _bids;
    mapping(uint256 auctionId => mapping(address bidder => bool hasBid)) private _hasBid;
    mapping(uint256 auctionId => euint64 winningBid) private _publicWinningBid;
    mapping(uint256 auctionId => address winner) private _publicWinner;
    mapping(uint256 auctionId => uint64 winningAmount) private _publicWinningAmount;
    mapping(uint256 auctionId => bool reserveWasMet) private _reserveMet;
    mapping(uint256 auctionId => bool resultIsReady) private _resultReady;

    error InvalidAuction();
    error NotOrganiser();
    error NotApprovedBidder();
    error InvalidStatus();
    error InvalidTiming();
    error InvalidBid();
    error AlreadyBid();
    error InvalidReserve();

    /// @notice Emitted when an organiser creates a lot.
    /// @param auctionId The identifier of the new lot.
    /// @param organiser The lot organiser.
    /// @param startAt The auction opening timestamp.
    /// @param endAt The auction closing timestamp.
    /// @param minimumBid The public minimum bid in kobo.
    /// @param reservePrice The public reserve price in kobo, if configured.
    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed organiser,
        uint64 startAt,
        uint64 endAt,
        uint64 minimumBid,
        uint64 reservePrice
    );
    /// @notice Emitted after an organiser approves a bidder without disclosing their address in the event.
    /// @param auctionId The lot identifier.
    event BidderApproved(uint256 indexed auctionId);
    /// @notice Emitted after an encrypted bid is accepted.
    /// @param auctionId The lot identifier.
    /// @param encryptedBid The encrypted bid handle, never the plaintext amount.
    event BidSubmitted(uint256 indexed auctionId, bytes32 encryptedBid);
    /// @notice Emitted when an ended lot is closed.
    /// @param auctionId The lot identifier.
    event AuctionClosed(uint256 indexed auctionId);
    /// @notice Emitted once encrypted result handles are ready for proof-backed public decryption.
    /// @param auctionId The lot identifier.
    /// @param encryptedWinningBid The encrypted winning-bid handle.
    /// @param encryptedWinner The encrypted winner-address handle.
    event ResultReady(uint256 indexed auctionId, bytes32 encryptedWinningBid, bytes32 encryptedWinner);
    /// @notice Emitted after a result is settled.
    /// @param auctionId The lot identifier.
    /// @param winner The winner when the reserve was met, otherwise zero address.
    /// @param winningBid The resolved winning bid in kobo.
    /// @param reserveMet Whether the public reserve was met.
    event AuctionSettled(uint256 indexed auctionId, address winner, uint64 winningBid, bool reserveMet);
    /// @notice Emitted when a draft lot is cancelled before it can accept bids.
    /// @param auctionId The lot identifier.
    event AuctionCancelled(uint256 indexed auctionId);

    modifier auctionExists(uint256 auctionId) {
        if (auctionId >= _nextAuctionId) revert InvalidAuction();
        _;
    }

    modifier onlyOrganiser(uint256 auctionId) {
        if (_auctions[auctionId].organiser != msg.sender) revert NotOrganiser();
        _;
    }

    /// @notice Creates one auction lot. The contract can host many organisers and concurrent lots.
    /// @param startAt The scheduled opening timestamp.
    /// @param endAt The scheduled closing timestamp.
    /// @param minimumBid The public minimum bid in kobo.
    /// @param reservePrice The public reserve price in kobo, or zero for no reserve.
    /// @return auctionId The identifier of the newly created lot.
    function createAuction(
        uint64 startAt,
        uint64 endAt,
        uint64 minimumBid,
        uint64 reservePrice
    ) external returns (uint256 auctionId) {
        if (startAt < block.timestamp || endAt <= startAt || minimumBid == 0) revert InvalidTiming();
        if (reservePrice != 0 && reservePrice < minimumBid) revert InvalidReserve();

        auctionId = _nextAuctionId++;
        Auction storage auction = _auctions[auctionId];
        auction.organiser = msg.sender;
        auction.startAt = startAt;
        auction.endAt = endAt;
        auction.minimumBid = minimumBid;
        auction.reservePrice = reservePrice;
        auction.status = Status.Draft;

        emit AuctionCreated(auctionId, msg.sender, startAt, endAt, minimumBid, reservePrice);
    }

    /// @notice Opens a prepared lot once its scheduled time has arrived.
    /// @dev Permissionless progression prevents a dormant organiser from blocking a valid auction.
    /// @param auctionId The lot identifier.
    function openAuction(uint256 auctionId) external auctionExists(auctionId) {
        Auction storage auction = _auctions[auctionId];
        if (auction.status != Status.Draft || block.timestamp < auction.startAt) revert InvalidStatus();
        auction.status = Status.Active;
    }

    /// @notice Approves a dealer before the lot opens without revealing the address in the emitted event.
    /// @param auctionId The lot identifier.
    /// @param bidder The dealer address authorised to submit one encrypted bid.
    function approveBidder(
        uint256 auctionId,
        address bidder
    ) external auctionExists(auctionId) onlyOrganiser(auctionId) {
        Auction storage auction = _auctions[auctionId];
        if (bidder == address(0)) revert NotApprovedBidder();
        if (auction.status != Status.Draft || block.timestamp >= auction.startAt) revert InvalidStatus();
        _approved[auctionId][bidder] = true;
        emit BidderApproved(auctionId);
    }

    /// @notice Submits an encrypted maximum bid. Bid values never enter public event data.
    /// @param auctionId The lot identifier.
    /// @param encryptedBid The dealer's encrypted maximum bid handle.
    /// @param inputProof The Zama input proof for the encrypted bid.
    function submitBid(
        uint256 auctionId,
        externalEuint64 encryptedBid,
        bytes calldata inputProof
    ) external auctionExists(auctionId) {
        Auction storage auction = _auctions[auctionId];
        if (auction.status != Status.Active || block.timestamp < auction.startAt || block.timestamp >= auction.endAt) {
            revert InvalidStatus();
        }
        if (!_approved[auctionId][msg.sender]) revert NotApprovedBidder();
        if (_hasBid[auctionId][msg.sender]) revert AlreadyBid();

        euint64 bid = FHE.fromExternal(encryptedBid, inputProof);
        euint64 minimum = FHE.asEuint64(auction.minimumBid);
        ebool isValid = FHE.ge(bid, minimum);

        eaddress bidder = FHE.asEaddress(msg.sender);
        if (!FHE.isInitialized(auction.highestBid)) {
            // A below-minimum first offer must initialise to zero, never to that invalid offer.
            auction.highestBid = FHE.select(isValid, bid, FHE.asEuint64(0));
            auction.highestBidder = FHE.select(isValid, bidder, FHE.asEaddress(address(0)));
        } else {
            // Strictly greater means an exact tie deterministically stays with the first valid offer.
            ebool shouldReplace = FHE.and(isValid, FHE.gt(bid, auction.highestBid));
            auction.highestBid = FHE.select(shouldReplace, bid, auction.highestBid);
            auction.highestBidder = FHE.select(shouldReplace, bidder, auction.highestBidder);
        }
        auction.hasWinner = FHE.or(auction.hasWinner, isValid);
        _bids[auctionId][msg.sender] = bid;
        _hasBid[auctionId][msg.sender] = true;
        auction.bidderCount += 1;

        FHE.allowThis(auction.highestBid);
        FHE.allowThis(auction.highestBidder);
        FHE.allowThis(auction.hasWinner);
        FHE.allowThis(bid);
        FHE.allow(bid, msg.sender);
        emit BidSubmitted(auctionId, euint64.unwrap(bid));
    }

    /// @notice Closes an ended lot. Anyone may advance the lifecycle after its deadline.
    /// @param auctionId The lot identifier.
    function closeAuction(uint256 auctionId) external auctionExists(auctionId) {
        Auction storage auction = _auctions[auctionId];
        if (auction.status != Status.Active || block.timestamp < auction.endAt) revert InvalidStatus();
        auction.status = Status.Closed;
        emit AuctionClosed(auctionId);
    }

    /// @notice Marks encrypted bid and winner handles for public decryption after the auction has closed.
    /// @param auctionId The lot identifier.
    function beginResolution(uint256 auctionId) external auctionExists(auctionId) {
        Auction storage auction = _auctions[auctionId];
        if (auction.status != Status.Closed || _resultReady[auctionId]) revert InvalidStatus();

        // No ciphertext exists if nobody submitted an offer, so settle this outcome directly.
        if (auction.bidderCount == 0) {
            auction.status = Status.Settled;
            emit AuctionSettled(auctionId, address(0), 0, false);
            return;
        }

        _publicWinningBid[auctionId] = auction.highestBid;
        _resultReady[auctionId] = true;
        auction.status = Status.Resolving;
        FHE.makePubliclyDecryptable(auction.highestBid);
        FHE.makePubliclyDecryptable(auction.highestBidder);
        emit ResultReady(auctionId, euint64.unwrap(auction.highestBid), eaddress.unwrap(auction.highestBidder));
    }

    /// @notice Verifies the KMS result and stores the public settlement outcome.
    /// @dev The cleartext order must match [highestBid, highestBidder]. Status is the replay guard.
    /// @param auctionId The lot identifier.
    /// @param abiEncodedCleartexts The KMS-decoded bid and winner values.
    /// @param decryptionProof The proof that authenticates those cleartexts.
    function settleResult(
        uint256 auctionId,
        bytes calldata abiEncodedCleartexts,
        bytes calldata decryptionProof
    ) external auctionExists(auctionId) {
        Auction storage auction = _auctions[auctionId];
        if (auction.status != Status.Resolving || !_resultReady[auctionId]) revert InvalidStatus();

        bytes32[] memory handles = new bytes32[](2);
        handles[0] = euint64.unwrap(_publicWinningBid[auctionId]);
        handles[1] = eaddress.unwrap(auction.highestBidder);
        FHE.checkSignatures(handles, abiEncodedCleartexts, decryptionProof);

        (uint64 winningBid, address winner) = abi.decode(abiEncodedCleartexts, (uint64, address));
        bool reserveMet = winningBid >= auction.reservePrice && winner != address(0);
        _publicWinningAmount[auctionId] = winningBid;
        _publicWinner[auctionId] = reserveMet ? winner : address(0);
        _reserveMet[auctionId] = reserveMet;
        _resultReady[auctionId] = false;
        auction.status = Status.Settled;
        emit AuctionSettled(auctionId, _publicWinner[auctionId], winningBid, reserveMet);
    }

    /// @notice Cancellation is allowed only before bidding can open.
    /// @dev Active auctions must resolve by their published rules; exceptional cancellations belong in
    ///      the off-chain dispute process and a future multi-party governance policy.
    /// @param auctionId The lot identifier.
    function cancelAuction(uint256 auctionId) external auctionExists(auctionId) onlyOrganiser(auctionId) {
        Auction storage auction = _auctions[auctionId];
        if (auction.status != Status.Draft) revert InvalidStatus();
        auction.status = Status.Cancelled;
        emit AuctionCancelled(auctionId);
    }

    /// @notice Returns the public configuration and lifecycle state of a lot.
    /// @param auctionId The lot identifier.
    /// @return organiser The lot organiser.
    /// @return startAt The scheduled opening timestamp.
    /// @return endAt The scheduled closing timestamp.
    /// @return minimumBid The public minimum bid in kobo.
    /// @return reservePrice The public reserve price in kobo.
    /// @return bidderCount The number of submitted encrypted bids.
    /// @return status The auction lifecycle status.
    function getAuction(
        uint256 auctionId
    )
        external
        view
        auctionExists(auctionId)
        returns (
            address organiser,
            uint64 startAt,
            uint64 endAt,
            uint64 minimumBid,
            uint64 reservePrice,
            uint32 bidderCount,
            Status status
        )
    {
        Auction storage auction = _auctions[auctionId];
        return (
            auction.organiser,
            auction.startAt,
            auction.endAt,
            auction.minimumBid,
            auction.reservePrice,
            auction.bidderCount,
            auction.status
        );
    }

    /// @notice Returns a dealer's encrypted bid handle to that same dealer.
    /// @param auctionId The lot identifier.
    /// @param bidder The bidder that owns the encrypted handle.
    /// @return The encrypted bid handle.
    function getBid(uint256 auctionId, address bidder) external view auctionExists(auctionId) returns (euint64) {
        if (msg.sender != bidder) revert NotApprovedBidder();
        return _bids[auctionId][bidder];
    }

    /// @notice Returns the public result after settlement.
    /// @param auctionId The lot identifier.
    /// @return winner The winner when the reserve was met, otherwise zero address.
    /// @return winningBid The resolved winning bid in kobo.
    /// @return reserveMet Whether the public reserve was met.
    /// @return settled Whether this lot has completed settlement.
    function getPublicResult(
        uint256 auctionId
    )
        external
        view
        auctionExists(auctionId)
        returns (address winner, uint64 winningBid, bool reserveMet, bool settled)
    {
        return (
            _publicWinner[auctionId],
            _publicWinningAmount[auctionId],
            _reserveMet[auctionId],
            _auctions[auctionId].status == Status.Settled
        );
    }

    /// @notice Returns the number of lots created by this contract.
    /// @return The number of created lots.
    function auctionCount() external view returns (uint256) {
        return _nextAuctionId;
    }
}
