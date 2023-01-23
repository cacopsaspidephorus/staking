//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./USDTTestToken.sol";

contract Staking is Ownable {
    struct StakeInfo {
        uint256 stakerTotalAmount;
        uint256 stakeTimestamp;
        uint256 lastRewardTimestamp;
        uint256 pendingReward;
        uint256 receivedReward;
    }

    uint256 private constant periodCount = 30;
    uint256 private constant periodDuration = 1 days;
    uint256 private constant rewardByPeriod = 1000 * 10**18;

    uint256 private immutable rewardPerSecond = rewardByPeriod / periodDuration;
    uint256 private immutable initialTimestamp;
    
    IERC20 private immutable rewardToken;
    USDTTestToken private immutable stakingToken;

    uint256 private totalStaked;

    mapping(address => StakeInfo) private StakeInfos;

    event Staked(address indexed staker, uint256 amount, uint256 timestamp);
    event Unstaked(address indexed staker, uint256 amount, uint256 timestamp);
    event RewardReceived(address indexed staker, uint256 amount, uint256 timestamp);

    constructor(address _rewardTokenAddress, address _stakingTokenAddress) {
        rewardToken = IERC20(_rewardTokenAddress);
        stakingToken = USDTTestToken(_stakingTokenAddress);
        
        initialTimestamp = block.timestamp;
    }

    modifier amountMoreThenZero(uint256 _amount) {
        require(_amount > 0, "Amount is too small");
        _;
    }

    function stake(uint256 _amount) amountMoreThenZero(_amount) external {
        require(
            stakingToken.allowance(msg.sender, address(this)) >= _amount,
            "Token transfer not approved"
        );

        stakingToken.transferFrom(msg.sender, address(this), _amount);

        totalStaked += _amount;
        StakeInfos[msg.sender].stakerTotalAmount += _amount;
        StakeInfos[msg.sender].stakeTimestamp = block.timestamp;

        emit Staked(msg.sender, _amount, block.timestamp);
    }

    function unstake(uint256 _amount) amountMoreThenZero(_amount) external {
        require(_amount <= StakeInfos[msg.sender].stakerTotalAmount, "Requested too much");

        totalStaked -= _amount;
        StakeInfos[msg.sender].stakerTotalAmount -= _amount;

        stakingToken.transfer(msg.sender, _amount);

        emit Unstaked(msg.sender, _amount, block.timestamp);
    }

    function recalcReward(address stakeholder) public {
        uint256 startTs = (StakeInfos[stakeholder].lastRewardTimestamp != 0) ?
            StakeInfos[stakeholder].lastRewardTimestamp :
            StakeInfos[stakeholder].stakeTimestamp;
        
        uint256 stakePeriod = _getPeriod(startTs);
        uint256 currentPeriod = _getPeriod(block.timestamp);

        uint256 totalReward;

        for (uint256 period = stakePeriod; period < currentPeriod; period++) {
            uint256 periodEndTimestamp = initialTimestamp + periodDuration * (period + 1);

            uint256 rewardForPeriod = _calcRewardForPeriod(stakeholder, startTs, periodEndTimestamp);

            totalReward += rewardForPeriod;
            startTs = periodEndTimestamp;
        }

        StakeInfos[stakeholder].pendingReward = totalReward;
    }

    function getReward() external {
        uint256 startTs = (StakeInfos[msg.sender].lastRewardTimestamp != 0) ?
            StakeInfos[msg.sender].lastRewardTimestamp :
            StakeInfos[msg.sender].stakeTimestamp;

        uint256 stakePeriod = _getPeriod(startTs);
        uint256 currentPeriod = _getPeriod(block.timestamp);
        
        require(stakePeriod < currentPeriod, "Too early");

        uint256 pendingReward = StakeInfos[msg.sender].pendingReward;

        require(pendingReward > 0, "No Pending Rewards Yet");
        require(rewardToken.balanceOf(address(this)) >= pendingReward, "Low contract balance");

        StakeInfos[msg.sender].pendingReward = 0;
        StakeInfos[msg.sender].receivedReward = pendingReward;
        StakeInfos[msg.sender].lastRewardTimestamp = block.timestamp;

        rewardToken.transfer(msg.sender, pendingReward);

        emit RewardReceived(msg.sender, pendingReward, block.timestamp);
    }

    function withdrawToken(address _tokenContract, address _receiver)
        external
        onlyOwner
    {
        IERC20 tokenToWithdraw = IERC20(_tokenContract);
        tokenToWithdraw.transfer(
            _receiver,
            tokenToWithdraw.balanceOf(address(this))
        );
    }

    function getTotalStaked() external view returns (uint256) {
        return totalStaked;
    }

    function getStaked() external view returns (uint256) {
        return StakeInfos[msg.sender].stakerTotalAmount;
    }

    function getPendingReward() external view returns (uint256) {
        return StakeInfos[msg.sender].pendingReward;
    }

    function getReceivedReward() external view returns (uint256) {
        return StakeInfos[msg.sender].receivedReward;
    }

    function _getPeriod(uint256 timestamp) private view returns (uint256) {
        if (timestamp == 0)
            return 0;

        uint256 period = (timestamp - initialTimestamp) / periodDuration;

        if (period > periodCount) 
            period = periodCount;

        return period;
    }

    function _calcRewardForPeriod(address stakeholder, uint256 startTs, uint256 endTs) private view returns (uint256) {
        uint256 staked = StakeInfos[stakeholder].stakerTotalAmount;
        uint256 stakedPercent = (staked * 10_000) / totalStaked;

        return (rewardPerSecond * (endTs - startTs)) * stakedPercent / 10_000;
    }
}