// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
interface IAuthorizedToken {
  function receiveWithAuthorization(
    address from,
    address to,
    uint256 value,
    uint256 validAfter,
    uint256 validBefore,
    bytes32 nonce,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external;
  function transfer(address, uint256) external returns (bool);
}
/// @notice x402 bids-split-v1 scheme: authorization nonce binds the complete split.
contract BidsInstantRouter {
  IAuthorizedToken public immutable token;
  address public immutable treasury;
  uint16 public immutable feeBps;
  bool private entered;
  mapping(address => mapping(bytes32 => bool)) public settled;
  event Purchased(
    bytes32 indexed requestId,
    address indexed payer,
    address indexed seller,
    uint256 sellerAmount,
    uint256 feeAmount
  );
  constructor(address token_, address treasury_, uint16 feeBps_) {
    require(
      token_.code.length > 0 && treasury_ != address(0) && feeBps_ <= 1000,
      "configuration"
    );
    token = IAuthorizedToken(token_);
    treasury = treasury_;
    feeBps = feeBps_;
  }
  function purchase(
    bytes32 requestId,
    address seller,
    address payer,
    uint256 amount,
    uint256 validBefore,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external {
    require(
      !entered &&
        !settled[payer][requestId] &&
        seller != address(0) &&
        amount > 0,
      "purchase"
    );
    entered = true;
    settled[payer][requestId] = true;
    bytes32 nonce = keccak256(
      abi.encode(requestId, seller, amount, feeBps, treasury)
    );
    token.receiveWithAuthorization(
      payer,
      address(this),
      amount,
      0,
      validBefore,
      nonce,
      v,
      r,
      s
    );
    uint256 fee = (amount * feeBps) / 10000;
    require(token.transfer(seller, amount - fee), "seller transfer");
    if (fee > 0) require(token.transfer(treasury, fee), "fee transfer");
    emit Purchased(requestId, payer, seller, amount - fee, fee);
    entered = false;
  }
}
