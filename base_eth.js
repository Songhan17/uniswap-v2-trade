const ethers = require('ethers');

// 配置项
const provider = new ethers.providers.JsonRpcProvider('https://developer-access-mainnet.base.org');

const mainAccountAddress = ''; // 替换为你的主账户地址

const fromPrivateKey = 'fromPrivateKey'; // 替换为你的私钥



// 归集ETH的函数

async function collectETH(fromPrivateKey, retryCount = 0) {
    const wallet = new ethers.Wallet(fromPrivateKey, provider);
    const balance = await wallet.getBalance();
    let gasPrice = await provider.getGasPrice();
    if (retryCount !== 0) {
        gasPrice = gasPrice.add(gasPrice.div(5)); // Increase by 20% as a starting point
        console.log("增加gas一次 => " + gasPrice)
    }

    const baseGasLimit = 21000; // Standard gas limit for ETH transfer
    let gasLimit = ethers.utils.hexlify(baseGasLimit);
    let txCost = gasPrice.mul(gasLimit).add(30000000000);

    while (retryCount < 3) {
        if (balance.sub(txCost).gt(0)) {
            const amountToSend = balance.sub(txCost);
            const tx = {
                to: mainAccountAddress,
                value: amountToSend,
                gasPrice: gasPrice,
                gasLimit: baseGasLimit,
            };

            try {
                const transaction = await wallet.sendTransaction(tx);
                await transaction.wait();
                console.log(`Transaction successful with hash: ${transaction.hash}`);
                updateDb(wallet.address);
                await new Promise((resolve) => setTimeout(resolve, 2000));
                break; // If transaction is successful, break out of the loop
            } catch (error) {
                console.error(`Transaction failed for account ${wallet.address}: ${error.message}`);
                if (error.message.includes("insufficient funds for gas * price + value")) {
                    // Increase gas price by a certain percentage for the next retry
                    gasPrice = gasPrice.add(gasPrice.div(10)); // Increase by 10%
                    txCost = gasPrice.mul(gasLimit);
                    console.log(`Retrying with increased gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} Gwei`);
                    retryCount += 1;
                    await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for 3 seconds before retrying
                } else {
                    console.log(`Unhandled error: ${error.message}`);
                    break; // If it's a different type of error, break out of the loop
                }
            }
        } else {
            console.log(`Balance of ${wallet.address} not sufficient to cover gas costs.`);
            break; // If balance is not sufficient, break out of the loop
        }
    }
}


collectETH(fromPrivateKey)


