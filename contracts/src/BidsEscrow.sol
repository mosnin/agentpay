// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
interface IERC20Bids {
  function transfer(address, uint256) external returns (bool);
  function transferFrom(address, address, uint256) external returns (bool);
  function balanceOf(address) external view returns (uint256);
}
/// @notice Non-upgradeable, single-token job escrow. No administrator withdrawal.
/// @dev Independent security review required before configuring a live deployment.
contract BidsEscrow {
  enum State {
    None,
    Funded,
    Submitted,
    Disputed,
    Released,
    Refunded
  }
  struct Job {
    address buyer;
    address seller;
    uint256 amount;
    uint64 deliverBy;
    uint64 reviewSeconds;
    uint64 submittedAt;
    uint64 disputedAt;
    State state;
    bytes32 termsHash;
    bytes32 artifactHash;
  }
  IERC20Bids public immutable token;
  address public immutable treasury;
  address public immutable arbiter;
  uint16 public immutable feeBps;
  uint64 public constant DISPUTE_SECONDS = 14 days;
  mapping(bytes32 => Job) public jobs;
  bool private entered;
  event Funded(
    bytes32 indexed jobId,
    address indexed buyer,
    address indexed seller,
    uint256 amount,
    bytes32 termsHash
  );
  event Submitted(bytes32 indexed jobId, bytes32 artifactHash);
  event Disputed(bytes32 indexed jobId, address by);
  event Settled(
    bytes32 indexed jobId,
    uint256 sellerAmount,
    uint256 feeAmount,
    uint256 buyerRefund
  );
  modifier lock() {
    require(!entered, "reentrancy");
    entered = true;
    _;
    entered = false;
  }
  constructor(
    address token_,
    address treasury_,
    address arbiter_,
    uint16 feeBps_
  ) {
    require(
      token_.code.length > 0 &&
        treasury_ != address(0) &&
        arbiter_ != address(0) &&
        feeBps_ <= 1000,
      "configuration"
    );
    token = IERC20Bids(token_);
    treasury = treasury_;
    arbiter = arbiter_;
    feeBps = feeBps_;
  }
  function fund(
    bytes32 id,
    address seller,
    uint256 amount,
    uint64 deliverBy,
    uint64 reviewSeconds,
    bytes32 termsHash
  ) external lock {
    require(
      id == keccak256(abi.encode(msg.sender, termsHash)) &&
        jobs[id].state == State.None,
      "job exists or invalid key"
    );
    require(
      seller != address(0) &&
        seller != msg.sender &&
        amount > 0 &&
        termsHash != bytes32(0),
      "agreement"
    );
    require(
      deliverBy > block.timestamp &&
        deliverBy <= block.timestamp + 90 days &&
        reviewSeconds >= 1 days &&
        reviewSeconds <= 30 days,
      "terms"
    );
    jobs[id] = Job(
      msg.sender,
      seller,
      amount,
      deliverBy,
      reviewSeconds,
      0,
      0,
      State.Funded,
      termsHash,
      bytes32(0)
    );
    uint256 beforeBalance = token.balanceOf(address(this));
    require(
      token.transferFrom(msg.sender, address(this), amount),
      "funding transfer"
    );
    require(
      token.balanceOf(address(this)) - beforeBalance == amount,
      "unsupported token"
    );
    emit Funded(id, msg.sender, seller, amount, termsHash);
  }
  function submit(bytes32 id, bytes32 artifactHash) external lock {
    Job storage j = jobs[id];
    require(
      msg.sender == j.seller &&
        j.state == State.Funded &&
        block.timestamp <= j.deliverBy &&
        artifactHash != bytes32(0),
      "submission"
    );
    j.artifactHash = artifactHash;
    j.submittedAt = uint64(block.timestamp);
    j.state = State.Submitted;
    emit Submitted(id, artifactHash);
  }
  function approve(bytes32 id) external lock {
    Job storage j = jobs[id];
    require(msg.sender == j.buyer && j.state == State.Submitted, "approval");
    settle(id, j, j.amount);
  }
  function claimAfterReview(bytes32 id) external lock {
    Job storage j = jobs[id];
    require(
      msg.sender == j.seller &&
        j.state == State.Submitted &&
        block.timestamp > j.submittedAt + j.reviewSeconds,
      "review active"
    );
    settle(id, j, j.amount);
  }
  function dispute(bytes32 id) external lock {
    Job storage j = jobs[id];
    require(
      (msg.sender == j.buyer || msg.sender == j.seller) &&
        j.state == State.Submitted &&
        block.timestamp <= j.submittedAt + j.reviewSeconds,
      "dispute window"
    );
    j.disputedAt = uint64(block.timestamp);
    j.state = State.Disputed;
    emit Disputed(id, msg.sender);
  }
  function refundExpired(bytes32 id) external lock {
    Job storage j = jobs[id];
    require(
      msg.sender == j.buyer &&
        j.state == State.Funded &&
        block.timestamp > j.deliverBy,
      "delivery active"
    );
    settle(id, j, 0);
  }
  function sellerRefund(bytes32 id) external lock {
    Job storage j = jobs[id];
    require(
      msg.sender == j.seller &&
        (j.state == State.Funded || j.state == State.Submitted),
      "refund"
    );
    settle(id, j, 0);
  }
  function resolve(bytes32 id, uint256 grossSellerAmount) external lock {
    Job storage j = jobs[id];
    require(
      msg.sender == arbiter &&
        j.state == State.Disputed &&
        block.timestamp <= j.disputedAt + DISPUTE_SECONDS,
      "arbitration"
    );
    require(grossSellerAmount <= j.amount, "amount");
    settle(id, j, grossSellerAmount);
  }
  function refundUnresolved(bytes32 id) external lock {
    Job storage j = jobs[id];
    require(
      msg.sender == j.buyer &&
        j.state == State.Disputed &&
        block.timestamp > j.disputedAt + DISPUTE_SECONDS,
      "arbitration active"
    );
    settle(id, j, 0);
  }
  function settle(bytes32 id, Job storage j, uint256 gross) private {
    uint256 fee = (gross * feeBps) / 10000;
    uint256 sellerAmount = gross - fee;
    uint256 refund = j.amount - gross;
    j.state = gross == 0 ? State.Refunded : State.Released;
    if (sellerAmount > 0)
      require(token.transfer(j.seller, sellerAmount), "seller transfer");
    if (fee > 0) require(token.transfer(treasury, fee), "fee transfer");
    if (refund > 0) require(token.transfer(j.buyer, refund), "refund transfer");
    emit Settled(id, sellerAmount, fee, refund);
  }
}
