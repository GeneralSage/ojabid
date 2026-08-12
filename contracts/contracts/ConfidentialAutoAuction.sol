// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, eaddress, ebool, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title ConfidentialAutoAuction
/// @notice Multi-organiser sealed-bid auction engine for OjaBid.
/// @dev Testnet-first foundation. Bids are encrypted; lot metadata and lifecycle events are public.
///      The settlement asset is intentionally kept outside this first contract slice.
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
    mapping(uint256 => Auction) private _auctions;
    mapping(uint256 => mapping(address => bool)) private _approved;
    mapping(uint256 => mapping(address => euint64)) private _bids;
    mapping(uint256 => mapping(address => bool)) private _hasBid;
    mapping(uint256 => euint64) private _publicWinningBid;
    mapping(uint256 => address) private _publicWinner;
    mapping(uint256 => uint64) private _publicWinningAmount;
    mapping(uint256 => bool) private _reserveMet;
    mapping(uint256 => bool) private _resultReady;

    error InvalidAuction();
    error NotOrganiser();
    error NotApprovedBidder();
    error InvalidStatus();
    error InvalidTiming();
    error InvalidBid();
    error AlreadyBid();
    error ResultAlreadyPublished();

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed organiser,
        uint64 startAt,
        uint64 endAt,
        uint64 minimumBid,
        uint64 reservePrice
    );
    event BidderApproved(uint256 indexed auctionId, address indexed bidder);
    event BidSubmitted(uint256 indexed auctionId, bytes32 encryptedBid);
    event AuctionClosed(uint256 indexed auctionId);
    event ResultReady(uint256 indexed auctionId, bytes32 encryptedWinningBid, bytes32 encryptedWinner);
    event AuctionSettled(uint256 indexed auctionId, address winner, uint64 winningBid, bool reserveMet);
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
    function createAuction(
        uint64 startAt,
        uint64 endAt,
        uint64 minimumBid,
        uint64 reservePrice
    ) external returns (uint256 auctionId) {
        if (startAt < block.timestamp || endAt <= startAt || minimumBid == 0) revert InvalidTiming();

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

    function openAuction(uint256 auctionId) external auctionExists(auctionId) onlyOrganiser(auctionId) {
        Auction storage auction = _auctions[auctionId];
        if (auction.status != Status.Draft || block.timestamp < auction.startAt) revert InvalidStatus();
        auction.status = Status.Active;
    }

    function approveBidder(uint256 auctionId, address bidder)
        external
        auctionExists(auctionId)
        onlyOrganiser(auctionId)
    {
        if (bidder == address(0)) revert NotApprovedBidder();
        _approved[auctionId][bidder] = true;
        emit BidderApproved(auctionId, bidder);
    }

    /// @notice Submits an encrypted maximum bid. Bid values never enter public event data.
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

        ebool isHigher = FHE.gt(bid, auction.highestBid);
        ebool shouldReplace = FHE.and(isValid, isHigher);
        eaddress bidder = FHE.asEaddress(msg.sender);
        auction.highestBid = _selectBid(shouldReplace, bid, auction.highestBid);
        auction.highestBidder = FHE.select(shouldReplace, bidder, auction.highestBidder);
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

    function _selectBid(ebool isValid, euint64 bid, euint64 current) private returns (euint64) {
        if (!FHE.isInitialized(current)) return FHE.select(isValid, bid, FHE.asEuint64(0));
        return FHE.select(FHE.gt(bid, current), bid, current);
    }

    function closeAuction(uint256 auctionId) external auctionExists(auctionId) onlyOrganiser(auctionId) {
        Auction storage auction = _auctions[auctionId];
        if (auction.status != Status.Active || block.timestamp < auction.endAt) revert InvalidStatus();
        auction.status = Status.Closed;
        emit AuctionClosed(auctionId);
    }

    /// @notice Marks encrypted bid and winner handles for public decryption after the auction has closed.
    function beginResolution(uint256 auctionId) external auctionExists(auctionId) onlyOrganiser(auctionId) {
        Auction storage auction = _auctions[auctionId];
        if (auction.status != Status.Closed || _resultReady[auctionId]) revert InvalidStatus();

        _publicWinningBid[auctionId] = auction.highestBid;
        _resultReady[auctionId] = true;
        auction.status = Status.Resolving;
        FHE.makePubliclyDecryptable(auction.highestBid);
        FHE.makePubliclyDecryptable(auction.highestBidder);
        emit ResultReady(auctionId, euint64.unwrap(auction.highestBid), eaddress.unwrap(auction.highestBidder));
    }

    /// @notice Verifies the KMS result and stores the public settlement outcome.
    /// @dev The cleartext order must match [highestBid, highestBidder]. Status is the replay guard.
    function settleResult(
        uint256 auctionId,
        bytes calldata abiEncodedCleartexts,
        bytes calldata decryptionProof
    ) external auctionExists(auctionId) onlyOrganiser(auctionId) {
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

    function cancelAuction(uint256 auctionId) external auctionExists(auctionId) onlyOrganiser(auctionId) {
        Auction storage auction = _auctions[auctionId];
        if (auction.status == Status.Settled || auction.status == Status.Cancelled) revert InvalidStatus();
        auction.status = Status.Cancelled;
        emit AuctionCancelled(auctionId);
    }

    function getAuction(uint256 auctionId)
        external
        view
        auctionExists(auctionId)
        returns (address organiser, uint64 startAt, uint64 endAt, uint64 minimumBid, uint64 reservePrice, uint32 bidderCount, Status status)
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

    function getBid(uint256 auctionId, address bidder)
        external
        view
        auctionExists(auctionId)
        returns (euint64)
    {
        if (msg.sender != bidder) revert NotApprovedBidder();
        return _bids[auctionId][bidder];
    }

    function getPublicResult(uint256 auctionId)
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

    function auctionCount() external view returns (uint256) {
        return _nextAuctionId;
    }
}
