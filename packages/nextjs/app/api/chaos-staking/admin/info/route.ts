import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, formatUnits } from 'viem'
import { base } from 'viem/chains'
import { CHAOS_STAKING_ADDRESS, CHAOS_GAUGES } from '@/utils/constants'

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const

const GAUGE_ABI = [
  { name: 'rewardRate', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'periodFinish', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'rewardsDuration', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const

function getClient() {
  return createPublicClient({
    chain: base,
    transport: http(
      process.env.ALCHEMY_API_KEY
        ? `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
        : 'https://mainnet.base.org'
    ),
  })
}

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')
    if (!wallet) return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })

    if (CHAOS_STAKING_ADDRESS === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({
        gauges: CHAOS_GAUGES.map(g => ({
          symbol: g.symbol,
          pool: g.pool,
          decimals: g.decimals,
          deployed: false,
          walletBalance: '0',
          allowance: '0',
          rewardRate: '0',
          periodFinish: 0,
          rewardsDuration: 0,
        })),
      })
    }

    const client = getClient()
    const walletAddr = wallet as `0x${string}`

    const gauges = await Promise.all(
      CHAOS_GAUGES.map(async (g) => {
        const tokenAddr = g.tokenAddress as `0x${string}`
        const deployed = g.gaugeAddress !== '0x0000000000000000000000000000000000000000'

        // Always fetch the multisig's balance of the reward token
        const walletBalance = await client.readContract({
          address: tokenAddr,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [walletAddr],
        })

        if (!deployed) {
          return {
            symbol: g.symbol,
            pool: g.pool,
            decimals: g.decimals,
            deployed: false,
            walletBalance: walletBalance.toString(),
            allowance: '0',
            rewardRate: '0',
            periodFinish: 0,
            rewardsDuration: 0,
          }
        }

        const gaugeAddr = g.gaugeAddress as `0x${string}`
        const [allowance, rewardRate, periodFinish, rewardsDuration] = await Promise.all([
          client.readContract({ address: tokenAddr, abi: ERC20_ABI, functionName: 'allowance', args: [walletAddr, gaugeAddr] }),
          client.readContract({ address: gaugeAddr, abi: GAUGE_ABI, functionName: 'rewardRate' }),
          client.readContract({ address: gaugeAddr, abi: GAUGE_ABI, functionName: 'periodFinish' }),
          client.readContract({ address: gaugeAddr, abi: GAUGE_ABI, functionName: 'rewardsDuration' }),
        ])

        return {
          symbol: g.symbol,
          pool: g.pool,
          decimals: g.decimals,
          deployed: true,
          walletBalance: walletBalance.toString(),
          allowance: allowance.toString(),
          rewardRate: rewardRate.toString(),
          periodFinish: Number(periodFinish),
          rewardsDuration: Number(rewardsDuration),
        }
      })
    )

    return NextResponse.json({ gauges })
  } catch (error: any) {
    console.error('[chaos-staking/admin/info] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch admin info' }, { status: 500 })
  }
}
