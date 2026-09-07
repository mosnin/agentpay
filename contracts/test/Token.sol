// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
/// Test-only token. Never deploy as a payment asset.
contract TestToken {
  uint8 public constant decimals = 6;
  mapping(address => uint256) public balanceOf;
  mapping(address => mapping(address => uint256)) public allowance;
  function mint(address to, uint256 v) external {
    balanceOf[to] += v;
  }
  function approve(address to, uint256 v) external returns (bool) {
    allowance[msg.sender][to] = v;
    return true;
  }
  function transfer(address to, uint256 v) external returns (bool) {
    require(balanceOf[msg.sender] >= v, "balance");
    balanceOf[msg.sender] -= v;
    balanceOf[to] += v;
    return true;
  }
  function transferFrom(
    address from,
    address to,
    uint256 v
  ) external returns (bool) {
    require(
      balanceOf[from] >= v && allowance[from][msg.sender] >= v,
      "allowance"
    );
    balanceOf[from] -= v;
    allowance[from][msg.sender] -= v;
    balanceOf[to] += v;
    return true;
  }
  mapping(address => mapping(bytes32 => bool)) public used;
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
  ) external {
    require(
      to == msg.sender &&
        block.timestamp > validAfter &&
        block.timestamp < validBefore &&
        !used[from][nonce],
      "authorization"
    );
    bytes32 domain = keccak256(
      abi.encode(
        keccak256(
          "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        ),
        keccak256("USD Coin"),
        keccak256("2"),
        block.chainid,
        address(this)
      )
    );
    bytes32 message = keccak256(
      abi.encode(
        keccak256(
          "ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
        ),
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce
      )
    );
    require(
      from != address(0) &&
        ecrecover(
          keccak256(abi.encodePacked("\x19\x01", domain, message)),
          v,
          r,
          s
        ) ==
          from,
      "signature"
    );
    used[from][nonce] = true;
    require(balanceOf[from] >= value, "balance");
    balanceOf[from] -= value;
    balanceOf[to] += value;
  }
}
