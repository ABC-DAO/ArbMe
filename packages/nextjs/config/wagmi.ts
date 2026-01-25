import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'ArbMe',
  projectId: '2efb2aeae04a72cb733a24ae9efaaf0e',
  chains: [base],
  ssr: true,
});
