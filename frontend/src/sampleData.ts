import paywalls from '../../data/paywalls.json';
import flows from '../../data/flows.json';
import pricingRules from '../../data/pricing-rules.json';
import type { FlowConfig, Game, PaywallTemplate, PricingRule } from './types';

export const samplePaywalls = paywalls as PaywallTemplate[];
export const sampleFlows = flows as unknown as FlowConfig[];
export const samplePricingRules = pricingRules as PricingRule[];

export const sampleGames: Game[] = [
  { id: 'galaxy-karts', title: 'Galaxy Karts', category: 'Racing', description: 'Drift across neon planets with four-player table controls.', trailer: 'https://cdn.example.com/trailers/galaxy-karts.mp4', screenshots: ['turn-one.png', 'nebula-cup.png'], art: 'linear-gradient(135deg,#7c3cff,#10f7ff)' },
  { id: 'neon-darts', title: 'Neon Darts', category: 'Skill', description: 'A high-accuracy darts remix with glowing team challenges.', trailer: 'https://cdn.example.com/trailers/neon-darts.mp4', screenshots: ['board.png', 'score.png'], art: 'linear-gradient(135deg,#ff2fb3,#ffb000)' },
  { id: 'pixel-putt', title: 'Pixel Putt', category: 'Sports', description: 'Mini-golf puzzles with animated hazards and table-wide bonuses.', trailer: 'https://cdn.example.com/trailers/pixel-putt.mp4', screenshots: ['windmill.png', 'lava.png'], art: 'linear-gradient(135deg,#22c55e,#84cc16)' },
  { id: 'haunted-hoops', title: 'Haunted Hoops', category: 'Arcade', description: 'Basketball meets ghost-hunting in a fast party mode.', trailer: 'https://cdn.example.com/trailers/haunted-hoops.mp4', screenshots: ['court.png', 'boss.png'], art: 'linear-gradient(135deg,#111827,#a855f7)' }
];
