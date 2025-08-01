// import { NextRequest, NextResponse } from "next/server";

// export async function GET(req: NextRequest) {
//   const tokenId = req.nextUrl.searchParams.get("id");

//   const SECRET_TOKEN = 'af5edce9-8fd7-443a-b238-32223ae3420c'; //important! todo: put this in env file
//   const SUBDOMAIN = 'olivefi-pythnet-b3f5';//important! todo: put this in env file

//   if (!tokenId) {
//     return NextResponse.json({ error: "Missing price feed ID" }, { status: 400 });
//   }

//   //https://<unique-subdomain>.mainnet.pythnet.rpcpool.com/hermes/

//   const url = `https://${SUBDOMAIN}.mainnet.pythnet.rpcpool.com/${SECRET_TOKEN}/hermes/v2/updates/price/latest?ids[]=${tokenId}&parsed=true&ignore_invalid_price_ids=true`;

//   try {
//     const res = await fetch(url);
//     if (!res.ok) {
//       return NextResponse.json({ error: `Hermes error ${res.status}` }, { status: res.status });
//     }

//     const data = await res.json();
//     return NextResponse.json(data);
//   } catch (error: any) {
//     return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
//   }
// }


import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

// Configuration
const SECRET_TOKEN = 'af5edce9-8fd7-443a-b238-32223ae3420c'; // TODO: put this in env file
const SUBDOMAIN = 'olivefi-pythnet-b3f5'; // TODO: put this in env file

const isDevnet = true;

// Solana connection for devnet
const solanaConnection = new Connection(
 'https://solana-devnet.core.chainstack.com/427baf02dd7b845762e485489b5d7b9f',
  'confirmed'
);

// Price feed configurations
const PRICE_FEEDS: Record<string, {
  feedId: string;
  accountAddress?: string;
  symbol: string;
  description: string;
  decimals: number;
  minPrice?: number;
  maxPrice?: number;
}> = {
  '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d': {
    feedId: 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
    accountAddress: isDevnet ? '7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE' : undefined,
    symbol: 'SOL/USD',
    description: 'Solana USD Price',
    decimals: 8,
    minPrice: 0.01,
    maxPrice: 10000,
  },
};

async function fetchDevnetAccountPrice(accountAddress: string): Promise<{
  price: number;
  confidence: number;
  publishTime: number;
  expo: number;
} | null> {
  try {
    const accountPublicKey = new PublicKey(accountAddress);
    const accountInfo = await solanaConnection.getAccountInfo(accountPublicKey, 'confirmed');
    
    if (!accountInfo || !accountInfo.data) {
      console.warn(`Failed to get account info for ${accountAddress}`);
      return null;
    }

    const data = accountInfo.data;
    const ownerString = accountInfo.owner.toBase58();
    
    console.log(`Fetching account ${accountAddress}: size=${data.length}, owner=${ownerString}`);
    
    if (data.length === 134 && ownerString === 'rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ') {
      // New Pyth Receiver format (PriceUpdateV2)
      return parsePythReceiverAccount(data, accountAddress);
    } else if (data.length === 3312 && ownerString === 'gSbePebfvPy7tRqimPoVecS2UsBvYv46ynrzWocc92s') {
      // Old Pyth format (legacy PriceAccount)
      return parseLegacyPythAccount(data, accountAddress);
    } else {
      console.warn(`Unknown account format for ${accountAddress}: size=${data.length}, owner=${ownerString}`);
      return null;
    }

  } catch (error) {
    console.error(`Error fetching devnet account price for ${accountAddress}`, error);
    return null;
  }
}

function parsePythReceiverAccount(data: Buffer, accountAddress: string): {
  price: number;
  confidence: number;
  publishTime: number;
  expo: number;
} | null {
  try {
    if (data.length !== 134) {
      console.warn(`Invalid Pyth receiver account size for ${accountAddress}: expected 134, got ${data.length}`);
      return null;
    }
    
    // Look for the SOL feed ID pattern in the data
    const solFeedId = 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d';
    const hexData = data.toString('hex');
    const feedIdIndex = hexData.indexOf(solFeedId);
    
    if (feedIdIndex === -1) {
      console.warn(`SOL feed ID not found in account ${accountAddress}`);
      return null;
    }
    
    // Calculate byte offset (hex index / 2)
    const feedIdByteOffset = feedIdIndex / 2;
    
    // Price data starts after the 32-byte feed ID
    let offset = feedIdByteOffset + 32;
    
    if (offset + 20 > data.length) {
      console.warn(`Insufficient data after feed ID in account ${accountAddress}`);
      return null;
    }
    
    // Parse price data structure:
    // price: i64 (8 bytes)
    const price = data.readBigInt64LE(offset);
    offset += 8;
    
    // conf: u64 (8 bytes) 
    const conf = data.readBigUInt64LE(offset);
    offset += 8;
    
    // exponent: i32 (4 bytes)
    const exponent = data.readInt32LE(offset);
    offset += 4;
    
    // publish_time: i64 (8 bytes)
    let publishTime = BigInt(0);
    if (offset + 8 <= data.length) {
      publishTime = data.readBigInt64LE(offset);
    }
    
    // Validate the parsed data
    if (price === BigInt(0)) {
      console.warn(`Zero price in Pyth receiver account ${accountAddress}`);
      return null;
    }
    
    if (exponent > 10 || exponent < -20) {
      console.warn(`Invalid exponent in Pyth receiver account ${accountAddress}: ${exponent}`);
      return null;
    }
    
    // Calculate human-readable price for validation
    const humanPrice = Number(price) * Math.pow(10, exponent);
    if (humanPrice < 0.01 || humanPrice > 10000) {
      console.warn(`SOL price out of reasonable range: $${humanPrice.toFixed(6)}`);
      return null;
    }
    
    const publishTimeSeconds = Number(publishTime);
    
    console.log(`Parsed Pyth receiver account ${accountAddress}:`, {
      feedIdOffset: feedIdByteOffset,
      price: price.toString(),
      humanPrice: `$${humanPrice.toFixed(6)}`,
      exponent,
      confidence: conf.toString(),
      publishTime: publishTimeSeconds,
      publishDate: publishTimeSeconds > 0 ? new Date(publishTimeSeconds * 1000).toISOString() : 'N/A'
    });

    return {
      price: Number(price),
      confidence: Number(conf),
      expo: exponent,
      publishTime: publishTimeSeconds
    };

  } catch (error) {
    console.error(`Error parsing Pyth receiver account ${accountAddress}`, error);
    return null;
  }
}

function parseLegacyPythAccount(data: Buffer, accountAddress: string): {
  price: number;
  confidence: number;
  publishTime: number;
  expo: number;
} | null {
  try {
    // Legacy Pyth account structure (3312 bytes)
    const PRICE_OFFSET = 208;        // Price value offset
    const CONF_OFFSET = 216;         // Confidence offset  
    const EXPO_OFFSET = 224;         // Exponent offset
    const PUBLISH_TIME_OFFSET = 248; // Publish time offset
    
    // Read price data using proper byte offsets
    const price = Number(data.readBigInt64LE(PRICE_OFFSET));
    const conf = Number(data.readBigUInt64LE(CONF_OFFSET));
    const expo = data.readInt32LE(EXPO_OFFSET);
    const publishTime = Number(data.readBigUInt64LE(PUBLISH_TIME_OFFSET));

    // Validate the data makes sense
    if (price === 0 || expo > 10 || expo < -20) {
      console.warn(`Invalid legacy Pyth price data for ${accountAddress}: price=${price}, expo=${expo}`);
      return null;
    }

    console.log(`Parsed legacy Pyth account ${accountAddress}: price=${price}, expo=${expo}, conf=${conf}`);

    return {
      price,
      confidence: conf,
      expo,
      publishTime
    };

  } catch (error) {
    console.error(`Error parsing legacy Pyth account ${accountAddress}`, error);
    return null;
  }
}

async function fetchMainnetPrice(tokenId: string) {
  const url = `https://${SUBDOMAIN}.mainnet.pythnet.rpcpool.com/${SECRET_TOKEN}/hermes/v2/updates/price/latest?ids[]=${tokenId}&parsed=true&ignore_invalid_price_ids=true`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Hermes error ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error: any) {
    throw new Error(error.message || "Unknown error");
  }
}

export async function GET(req: NextRequest) {
  const tokenId = req.nextUrl.searchParams.get("id");

  if (!tokenId) {
    return NextResponse.json({ error: "Missing price feed ID" }, { status: 400 });
  }

  try {
    // Check if this is a devnet request and we have account address
    const feedConfig = PRICE_FEEDS[tokenId];
    
    if (isDevnet && feedConfig?.accountAddress) {
      console.log(`Fetching devnet price for ${feedConfig.symbol} from account ${feedConfig.accountAddress}`);
      
      const priceData = await fetchDevnetAccountPrice(feedConfig.accountAddress);
      
      if (!priceData) {
        return NextResponse.json({ 
          error: "Failed to fetch devnet price data" 
        }, { status: 500 });
      }

      // Convert price using exponent to get human-readable price
      const price = priceData.price * Math.pow(10, priceData.expo);
      const confidence = priceData.confidence * Math.pow(10, priceData.expo);

      // Sanity check price bounds
      if (feedConfig.minPrice && price < feedConfig.minPrice) {
        return NextResponse.json({ 
          error: `Price too low for ${feedConfig.symbol}: ${price}` 
        }, { status: 400 });
      }

      if (feedConfig.maxPrice && price > feedConfig.maxPrice) {
        return NextResponse.json({ 
          error: `Price too high for ${feedConfig.symbol}: ${price}` 
        }, { status: 400 });
      }

      // Return in a format similar to Hermes API
      const response = {
        parsed: [{
          id: tokenId,
          price: {
            price: priceData.price.toString(),
            conf: priceData.confidence.toString(),
            expo: priceData.expo,
            publish_time: priceData.publishTime
          },
          ema_price: {
            price: priceData.price.toString(),
            conf: priceData.confidence.toString(),
            expo: priceData.expo,
            publish_time: priceData.publishTime
          }
        }],
        // Include human-readable data
        processed: {
          symbol: feedConfig.symbol,
          price: price,
          confidence: confidence,
          timestamp: new Date().toISOString(),
          publishTime: priceData.publishTime,
          source: 'devnet_account',
          accountAddress: feedConfig.accountAddress
        }
      };

      console.log(`✅ Devnet price fetched: ${feedConfig.symbol} = $${price.toFixed(6)}`);
      return NextResponse.json(response);

    } else {
      // Use mainnet Hermes API
      console.log(`Fetching mainnet price for ${tokenId}`);
      const data = await fetchMainnetPrice(tokenId);
      return NextResponse.json(data);
    }

  } catch (error: any) {
    console.error('Error in price fetch:', error);
    return NextResponse.json({ 
      error: error.message || "Unknown error",
      network: isDevnet ? 'devnet' : 'mainnet',
      tokenId 
    }, { status: 500 });
  }
}