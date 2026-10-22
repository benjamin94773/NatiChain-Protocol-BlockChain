// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MockStablecoin} from "../src/MockStablecoin.sol";
import {MockYieldVault} from "../src/MockYieldVault.sol";
import {ReputationRegistry} from "../src/ReputationRegistry.sol";
import {SavingsCircle} from "../src/SavingsCircle.sol";
import {SavingsCircleFactory} from "../src/SavingsCircleFactory.sol";

interface VmScript {
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
    function envOr(string calldata name, uint256 defaultValue) external view returns (uint256);
}

contract DeployScript {
    VmScript constant vm = VmScript(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run()
        external
        returns (
            MockStablecoin stablecoin,
            MockYieldVault yieldVault,
            ReputationRegistry reputation,
            SavingsCircleFactory factory
        )
    {
        // Clave privada por defecto de la cuenta #0 de Anvil
        uint256 deployerPrivateKey = vm.envOr(
            "PRIVATE_KEY",
            0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
        );

        vm.startBroadcast(deployerPrivateKey);

        stablecoin = new MockStablecoin();
        yieldVault = new MockYieldVault(address(stablecoin));
        reputation = new ReputationRegistry();
        factory = new SavingsCircleFactory(address(stablecoin), address(yieldVault), address(reputation));

        stablecoin.setAuthorizedMinter(address(yieldVault), true);
        reputation.setFactory(address(factory));

        // Fondear las primeras 5 cuentas de Anvil con 5,000 cUSD cada una para demos inmediatas
        address[5] memory demoAccounts = [
            0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266,
            0x70997970C51812dc3A010C7d01b50e0d17dc79C8,
            0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC,
            0x90F79bf6EB2c4f870365E785982E1f101E93b906,
            0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
        ];

        for (uint256 i = 0; i < demoAccounts.length; i++) {
            stablecoin.faucet(demoAccounts[i], 5_000e18);
        }

        // Crear 2 círculos iniciales de ejemplo (1 Cadena ROSCA y 1 Natillera ASCA)
        factory.createCircle(
            SavingsCircle.CircleParams({
                name: "Cadena Emprendedores (Turnos)",
                contributionAmount: 100e18,
                collateralAmount: 150e18,
                maxParticipants: 3,
                roundDuration: 7 days,
                gracePeriod: 3 days,
                latePenaltyBps: 1000, // 10%
                yieldRateBps: 200,    // 2% por ronda
                payoutMode: SavingsCircle.PayoutMode.ROSCA
            })
        );

        factory.createCircle(
            SavingsCircle.CircleParams({
                name: "Natillera Fin de Ano (Cierre)",
                contributionAmount: 200e18,
                collateralAmount: 250e18,
                maxParticipants: 4,
                roundDuration: 15 days,
                gracePeriod: 5 days,
                latePenaltyBps: 500, // 5%
                yieldRateBps: 300,   // 3% por ronda
                payoutMode: SavingsCircle.PayoutMode.ASCA
            })
        );

        vm.stopBroadcast();
    }
}
