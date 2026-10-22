// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockStablecoin (cUSD)
 * @notice Activo estable ERC-20 simulado para los Círculos de Ahorro Comunitario (Natilleras / Cadenas).
 *         Incluye función de Faucet público para pruebas y acuñación autorizada para el simulador de rendimientos.
 */
contract MockStablecoin {
    string public constant name = "Stablecoin Comunitaria USD";
    string public constant symbol = "cUSD";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    address public owner;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => bool) public authorizedMinters;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event MinterUpdated(address indexed minter, bool allowed);

    error InsufficientBalance();
    error InsufficientAllowance();
    error Unauthorized();
    error ZeroAddress();

    constructor() {
        owner = msg.sender;
        authorizedMinters[msg.sender] = true;
        // Mint inicial para la cuenta desplegadora
        _mint(msg.sender, 1_000_000 * 1e18);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    function setAuthorizedMinter(address minter, bool allowed) external onlyOwner {
        if (minter == address(0)) revert ZeroAddress();
        authorizedMinters[minter] = allowed;
        emit MinterUpdated(minter, allowed);
    }

    /**
     * @notice Permite a cualquier participante obtener saldo estable de prueba para aportar en los círculos.
     */
    function faucet(address to, uint256 amount) external {
        if (to == address(0)) revert ZeroAddress();
        _mint(to, amount);
    }

    /**
     * @notice Usado por el MockYieldVault para acreditar rendimientos base generados sobre el saldo bloqueado.
     */
    function mintYield(address to, uint256 amount) external {
        if (!authorizedMinters[msg.sender] && msg.sender != owner) revert Unauthorized();
        _mint(to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < amount) revert InsufficientAllowance();
            unchecked {
                allowance[from][msg.sender] = currentAllowance - amount;
            }
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        if (to == address(0)) revert ZeroAddress();
        uint256 fromBalance = balanceOf[from];
        if (fromBalance < amount) revert InsufficientBalance();
        unchecked {
            balanceOf[from] = fromBalance - amount;
            balanceOf[to] += amount;
        }
        emit Transfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal {
        if (to == address(0)) revert ZeroAddress();
        totalSupply += amount;
        unchecked {
            balanceOf[to] += amount;
        }
        emit Transfer(address(0), to, amount);
    }
}
